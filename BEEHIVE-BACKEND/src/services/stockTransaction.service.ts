import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { 
  stock_transaction_type, 
  stock_transaction_reason, 
  inventory_status 
} from '../../generated/prisma/enums.js';
import { recipeService } from './recipe.service.js';
import { settingsRepository } from '../repositories/settings.repository.js';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export interface StockInParams {
  inventoryItemId: string;
  quantity: number;
  reason?: stock_transaction_reason;
  referenceId?: string;
  receiptImage?: string;
  userId?: string;
  notes?: string;
}

export interface StockOutParams {
  inventoryItemId: string;
  quantity: number;
  reason: stock_transaction_reason;
  referenceId?: string;
  receiptImage?: string;
  userId?: string;
  notes?: string;
}

export interface UpdateTransactionMetadataParams {
  notes?: string;
  referenceId?: string;
  receiptImage?: string;
  userId?: string;
}

export class StockTransactionService {
  /**
   * Stock-In: Add inventory to stock
   * - Creates IN transaction
   * - Increases currentStock
   * - Warns if exceeding maxStock
   * - Updates lastRestocked date
   */
  async stockIn(params: StockInParams): Promise<{
    transaction: any;
    inventoryItem: any;
    warning?: string;
  }> {
    const { inventoryItemId, quantity, reason = 'PURCHASE', referenceId, receiptImage, userId, notes } = params;

    // Validate quantity
    if (quantity <= 0) {
      throw new Error('Stock-in quantity must be greater than 0');
    }

    // Use Prisma transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get current inventory item
      const inventoryItem = await tx.inventory_items.findUnique({
        where: { id: inventoryItemId },
      });

      if (!inventoryItem) {
        throw new Error(`Inventory item ${inventoryItemId} not found`);
      }

      // Calculate new stock - round to 2 decimal places to avoid floating point precision issues
      const balanceBefore = Math.round(inventoryItem.currentStock * 100) / 100;
      const newStock = Math.round((balanceBefore + quantity) * 100) / 100;
      let warning: string | undefined;

      // Check if exceeding max stock
      if (newStock > inventoryItem.maxStock) {
        warning = `Warning: New stock (${newStock} ${inventoryItem.unit}) exceeds maximum stock (${inventoryItem.maxStock} ${inventoryItem.unit})`;
      }

      // Create stock transaction with balance tracking
      const transaction = await tx.stock_transactions.create({
        data: {
          id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          inventoryItemId,
          type: 'IN' as stock_transaction_type,
          reason,
          quantity,
          balanceBefore,
          balanceAfter: newStock,
          status: 'NORMAL',
          referenceId,
          receiptImage,
          userId,
          notes: warning ? (notes ? `${notes}\n${warning}` : warning) : notes,
        },
      });

      // Determine new status based on stock levels
      let newStatus: inventory_status = 'IN_STOCK';
      if (newStock <= 0) {
        newStatus = 'OUT_OF_STOCK';
      } else if (newStock <= inventoryItem.minStock) {
        newStatus = 'LOW_STOCK';
      }

      // Update inventory item
      const updatedItem = await tx.inventory_items.update({
        where: { id: inventoryItemId },
        data: {
          currentStock: newStock,
          status: newStatus,
          lastRestocked: new Date(),
          updatedAt: new Date(),
        },
      });

      return { transaction, inventoryItem: updatedItem, warning };
    });

    // After successful stock-in, check if any menu items should be auto-marked as in-stock
    // This runs outside the transaction to avoid blocking the stock update
    try {
      const autoOutOfStock = settingsRepository.getAutoOutOfStockWhenIngredientsRunOut();
      const autoInStock = settingsRepository.getAutoMarkInStockWhenAvailable();
      
      if (autoOutOfStock || autoInStock) {
        const stockUpdates = await recipeService.updateMenuItemsStockStatus(
          inventoryItemId,
          autoOutOfStock,
          autoInStock
        );
        
        // Add stock updates info to result
        (result as any).menuItemUpdates = stockUpdates;
      }
    } catch (error) {
      // Log but don't fail the transaction if auto-stock update fails
      console.error('Failed to auto-update menu item stock status:', error);
    }

    return result;
  }

  /**
   * Stock-Out: Remove inventory from stock
   * - Creates OUT transaction
   * - Decreases currentStock
   * - allowNegative: if true, allows exceeding available stock and records discrepancy
   * - Updates inventory status automatically
   */
  async stockOut(params: StockOutParams & { allowNegative?: boolean }): Promise<{
    transaction: any;
    inventoryItem: any;
    discrepancy?: number;
    warning?: string;
  }> {
    const { inventoryItemId, quantity, reason, referenceId, receiptImage, userId, notes, allowNegative = false } = params;

    // Validate quantity
    if (quantity <= 0) {
      throw new Error('Stock-out quantity must be greater than 0');
    }

    // Use Prisma transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get current inventory item
      const inventoryItem = await tx.inventory_items.findUnique({
        where: { id: inventoryItemId },
      });

      if (!inventoryItem) {
        throw new Error(`Inventory item ${inventoryItemId} not found`);
      }

      // Calculate new stock - round to 2 decimal places to avoid floating point precision issues
      const balanceBefore = Math.round(inventoryItem.currentStock * 100) / 100;
      let newStock = Math.round((balanceBefore - quantity) * 100) / 100;
      let discrepancy: number | undefined;
      let warning: string | undefined;
      let transactionStatus: 'NORMAL' | 'DISCREPANCY' = 'NORMAL';

      // Handle insufficient stock
      if (newStock < 0) {
        if (!allowNegative) {
          throw new Error(
            `Insufficient stock for ${inventoryItem.name}. ` +
            `Available: ${inventoryItem.currentStock} ${inventoryItem.unit}, ` +
            `Requested: ${quantity} ${inventoryItem.unit}`
          );
        }
        
        // Record the discrepancy (how much we're going below zero) - round to 2 decimal places
        discrepancy = Math.round(Math.abs(newStock) * 100) / 100;
        warning = `Stock discrepancy: ${discrepancy} ${inventoryItem.unit} exceeded system quantity for ${inventoryItem.name}`;
        transactionStatus = 'DISCREPANCY';
        
        // Keep the negative stock for audit/discrepancy tracking (don't set to 0)
        // newStock stays negative to show actual discrepancy
      }

      // Create stock transaction with balance tracking and discrepancy status
      const transaction = await tx.stock_transactions.create({
        data: {
          id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          inventoryItemId,
          type: 'OUT' as stock_transaction_type,
          reason,
          quantity,
          balanceBefore,
          balanceAfter: newStock,
          status: transactionStatus,
          referenceId,
          receiptImage,
          userId,
          notes: discrepancy 
            ? `${notes || ''}${notes ? '\n' : ''}Stock exceeded system quantity by ${discrepancy} ${inventoryItem.unit}. Balance was ${balanceBefore} ${inventoryItem.unit}, needed ${quantity} ${inventoryItem.unit}.`
            : notes,
        },
      });

      // Determine new status based on stock levels
      // Priority: DISCREPANCY (negative) > OUT_OF_STOCK (0) > LOW_STOCK (below min) > IN_STOCK
      let newStatus: inventory_status = 'IN_STOCK';
      if (newStock < 0) {
        newStatus = 'DISCREPANCY';
      } else if (newStock === 0) {
        newStatus = 'OUT_OF_STOCK';
      } else if (newStock <= inventoryItem.minStock) {
        newStatus = 'LOW_STOCK';
      }

      // Update inventory item
      const updatedItem = await tx.inventory_items.update({
        where: { id: inventoryItemId },
        data: {
          currentStock: newStock,
          status: newStatus,
          updatedAt: new Date(),
        },
      });

      return { transaction, inventoryItem: updatedItem, discrepancy, warning };
    });

    // After successful stock-out, check if any menu items should be auto-marked as out-of-stock
    // This runs outside the transaction to avoid blocking the stock update
    try {
      const autoOutOfStock = settingsRepository.getAutoOutOfStockWhenIngredientsRunOut();
      const autoInStock = settingsRepository.getAutoMarkInStockWhenAvailable();
      
      if (autoOutOfStock || autoInStock) {
        const stockUpdates = await recipeService.updateMenuItemsStockStatus(
          inventoryItemId,
          autoOutOfStock,
          autoInStock
        );
        
        // Add stock updates info to result
        (result as any).menuItemUpdates = stockUpdates;
      }
    } catch (error) {
      // Log but don't fail the transaction if auto-stock update fails
      console.error('Failed to auto-update menu item stock status:', error);
    }

    return result;
  }

  /**
   * Get transaction history for an inventory item
   */
  async getTransactionHistory(inventoryItemId: string, limit: number = 50) {
    return prisma.stock_transactions.findMany({
      where: { inventoryItemId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        inventory_item: {
          select: {
            name: true,
            unit: true,
          },
        },
      },
    });
  }

  /**
   * Get all transactions with filters
   */
  async getAllTransactions(filters?: {
    type?: stock_transaction_type;
    reason?: stock_transaction_reason;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const { type, reason, startDate, endDate, limit = 100 } = filters || {};

    return prisma.stock_transactions.findMany({
      where: {
        ...(type && { type }),
        ...(reason && { reason }),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        inventory_item: {
          select: {
            name: true,
            unit: true,
            category: true,
          },
        },
      },
    });
  }

  /**
   * Check if a reference ID has already been processed (for idempotency)
   */
  async isReferenceProcessed(referenceId: string): Promise<boolean> {
    const count = await prisma.stock_transactions.count({
      where: { referenceId },
    });
    return count > 0;
  }

  /**
   * Adjust stock (for manual corrections)
   * - Calculates difference automatically
   * - Creates ADJUSTMENT transaction
   */
  async adjustStock(params: {
    inventoryItemId: string;
    newStock: number;
    userId?: string;
    notes?: string;
  }): Promise<{
    transaction: any;
    inventoryItem: any;
    difference: number;
  }> {
    const { inventoryItemId, newStock, userId, notes } = params;

    if (newStock < 0) {
      throw new Error('Adjusted stock cannot be negative');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get current inventory item
      const inventoryItem = await tx.inventory_items.findUnique({
        where: { id: inventoryItemId },
      });

      if (!inventoryItem) {
        throw new Error(`Inventory item ${inventoryItemId} not found`);
      }

      // Calculate difference - round to 2 decimal places to avoid floating point precision issues
      const roundedNewStock = Math.round(newStock * 100) / 100;
      const roundedCurrentStock = Math.round(inventoryItem.currentStock * 100) / 100;
      const difference = Math.round((roundedNewStock - roundedCurrentStock) * 100) / 100;
      const adjustmentType: stock_transaction_type = difference >= 0 ? 'IN' : 'OUT';
      const adjustmentQuantity = Math.abs(difference);

      // Create adjustment transaction if there's a difference
      let transaction = null;
      if (difference !== 0) {
        transaction = await tx.stock_transactions.create({
          data: {
            id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            inventoryItemId,
            type: adjustmentType,
            reason: 'ADJUSTMENT',
            quantity: adjustmentQuantity,
            userId,
            notes: notes || `Manual adjustment: ${roundedCurrentStock} → ${roundedNewStock} ${inventoryItem.unit}`,
          },
        });
      }

      // Determine new status based on rounded stock
      let newStatus: inventory_status = 'IN_STOCK';
      if (roundedNewStock <= 0) {
        newStatus = 'OUT_OF_STOCK';
      } else if (roundedNewStock <= inventoryItem.minStock) {
        newStatus = 'LOW_STOCK';
      }

      // Update inventory item with rounded stock
      const updatedItem = await tx.inventory_items.update({
        where: { id: inventoryItemId },
        data: {
          currentStock: roundedNewStock,
          status: newStatus,
          updatedAt: new Date(),
        },
      });

      return { transaction, inventoryItem: updatedItem, difference };
    });

    // After successful stock adjustment, check if any menu items should be auto-updated
    // This runs outside the transaction to avoid blocking the stock update
    try {
      const autoOutOfStock = settingsRepository.getAutoOutOfStockWhenIngredientsRunOut();
      const autoInStock = settingsRepository.getAutoMarkInStockWhenAvailable();
      
      if (autoOutOfStock || autoInStock) {
        const stockUpdates = await recipeService.updateMenuItemsStockStatus(
          inventoryItemId,
          autoOutOfStock,
          autoInStock
        );
        
        // Add stock updates info to result
        (result as any).menuItemUpdates = stockUpdates;
      }
    } catch (error) {
      // Log but don't fail the transaction if auto-stock update fails
      console.error('Failed to auto-update menu item stock status:', error);
    }

    return result;
  }

  /**
   * Get a single transaction by ID
   */
  async getTransaction(transactionId: string): Promise<any> {
    const transaction = await prisma.stock_transactions.findUnique({
      where: { id: transactionId },
      include: {
        inventory_item: true,
      },
    });

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    return transaction;
  }

  /**
   * Update transaction metadata (notes, referenceId, receiptImage)
   * - Does NOT modify inventory quantities (immutable transaction data)
   * - Creates audit log entry for each changed field
   */
  async updateTransactionMetadata(
    transactionId: string,
    params: UpdateTransactionMetadataParams
  ): Promise<{
    transaction: any;
    auditLogs: any[];
  }> {
    const { notes, referenceId, receiptImage, userId } = params;

    const result = await prisma.$transaction(async (tx) => {
      // Get current transaction
      const currentTransaction = await tx.stock_transactions.findUnique({
        where: { id: transactionId },
      });

      if (!currentTransaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      // Build update data and track changes for audit
      const updateData: any = {};
      const auditLogs: any[] = [];

      // Check and track each field change
      if (notes !== undefined && notes !== currentTransaction.notes) {
        auditLogs.push({
          id: `stma_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          stockTransactionId: transactionId,
          field: 'notes',
          oldValue: currentTransaction.notes,
          newValue: notes,
          changedBy: userId,
        });
        updateData.notes = notes;
      }

      if (referenceId !== undefined && referenceId !== currentTransaction.referenceId) {
        auditLogs.push({
          id: `stma_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          stockTransactionId: transactionId,
          field: 'referenceId',
          oldValue: currentTransaction.referenceId,
          newValue: referenceId,
          changedBy: userId,
        });
        updateData.referenceId = referenceId;
      }

      if (receiptImage !== undefined && receiptImage !== currentTransaction.receiptImage) {
        auditLogs.push({
          id: `stma_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          stockTransactionId: transactionId,
          field: 'receiptImage',
          oldValue: currentTransaction.receiptImage,
          newValue: receiptImage,
          changedBy: userId,
        });
        updateData.receiptImage = receiptImage;
      }

      // If nothing to update, return current state
      if (Object.keys(updateData).length === 0) {
        return {
          transaction: currentTransaction,
          auditLogs: [],
        };
      }

      // Create audit log entries
      if (auditLogs.length > 0) {
        await tx.stock_transaction_metadata_audit.createMany({
          data: auditLogs,
        });
      }

      // Update the transaction metadata
      const updatedTransaction = await tx.stock_transactions.update({
        where: { id: transactionId },
        data: updateData,
        include: {
          inventory_item: true,
        },
      });

      return {
        transaction: updatedTransaction,
        auditLogs,
      };
    });

    return result;
  }

  /**
   * Get metadata audit logs for a transaction
   */
  async getTransactionAuditLogs(transactionId: string): Promise<any[]> {
    const logs = await prisma.stock_transaction_metadata_audit.findMany({
      where: { stockTransactionId: transactionId },
      orderBy: { changedAt: 'desc' },
    });
    return logs;
  }

  /**
   * Bulk Stock-In: Add inventory to multiple items at once
   * - Creates IN transactions for each item
   * - Shares referenceId, receiptImage across all transactions
   * - Returns summary of successful and failed operations
   */
  async bulkStockIn(params: {
    items: Array<{ inventoryItemId: string; quantity: number }>;
    referenceId?: string;
    receiptImage?: string;
    userId?: string;
    notes?: string;
  }): Promise<{
    successful: Array<{ inventoryItemId: string; itemName: string; quantity: number; newStock: number }>;
    failed: Array<{ inventoryItemId: string; itemName?: string; error: string }>;
    totalAdded: number;
  }> {
    const { items, referenceId, receiptImage, userId, notes } = params;
    const successful: Array<{ inventoryItemId: string; itemName: string; quantity: number; newStock: number }> = [];
    const failed: Array<{ inventoryItemId: string; itemName?: string; error: string }> = [];
    let totalAdded = 0;

    // Process each item sequentially to avoid race conditions
    for (const item of items) {
      try {
        const result = await this.stockIn({
          inventoryItemId: item.inventoryItemId,
          quantity: item.quantity,
          reason: 'PURCHASE',
          referenceId,
          receiptImage,
          userId,
          notes,
        });

        successful.push({
          inventoryItemId: item.inventoryItemId,
          itemName: result.inventoryItem.name,
          quantity: item.quantity,
          newStock: result.inventoryItem.currentStock,
        });
        totalAdded += item.quantity;
      } catch (error: any) {
        // Try to get item name for better error reporting
        let itemName: string | undefined;
        try {
          const inventoryItem = await prisma.inventory_items.findUnique({
            where: { id: item.inventoryItemId },
            select: { name: true },
          });
          itemName = inventoryItem?.name;
        } catch {
          // Ignore if we can't get the name
        }

        failed.push({
          inventoryItemId: item.inventoryItemId,
          itemName,
          error: error.message || 'Unknown error',
        });
      }
    }

    return { successful, failed, totalAdded };
  }

  /**
   * Bulk Stock-Out: Remove inventory from multiple items at once
   * - Creates OUT transactions for each item
   * - Shares referenceId, receiptImage, reason across all transactions
   * - Returns summary of successful and failed operations
   */
  async bulkStockOut(params: {
    items: Array<{ inventoryItemId: string; quantity: number }>;
    reason: stock_transaction_reason;
    referenceId?: string;
    receiptImage?: string;
    userId?: string;
    notes?: string;
  }): Promise<{
    successful: Array<{ inventoryItemId: string; itemName: string; quantity: number; newStock: number }>;
    failed: Array<{ inventoryItemId: string; itemName?: string; error: string }>;
    totalRemoved: number;
    discrepancies: number;
  }> {
    const { items, reason, referenceId, receiptImage, userId, notes } = params;
    const successful: Array<{ inventoryItemId: string; itemName: string; quantity: number; newStock: number }> = [];
    const failed: Array<{ inventoryItemId: string; itemName?: string; error: string }> = [];
    let totalRemoved = 0;
    let discrepancies = 0;

    // Process each item sequentially to avoid race conditions
    for (const item of items) {
      try {
        const result = await this.stockOut({
          inventoryItemId: item.inventoryItemId,
          quantity: item.quantity,
          reason,
          referenceId,
          receiptImage,
          userId,
          notes,
          allowNegative: true, // Allow negative stock for bulk operations (will record discrepancy)
        });

        successful.push({
          inventoryItemId: item.inventoryItemId,
          itemName: result.inventoryItem.name,
          quantity: item.quantity,
          newStock: result.inventoryItem.currentStock,
        });
        totalRemoved += item.quantity;

        if (result.discrepancy) {
          discrepancies++;
        }
      } catch (error: any) {
        // Try to get item name for better error reporting
        let itemName: string | undefined;
        try {
          const inventoryItem = await prisma.inventory_items.findUnique({
            where: { id: item.inventoryItemId },
            select: { name: true },
          });
          itemName = inventoryItem?.name;
        } catch {
          // Ignore if we can't get the name
        }

        failed.push({
          inventoryItemId: item.inventoryItemId,
          itemName,
          error: error.message || 'Unknown error',
        });
      }
    }

    return { successful, failed, totalRemoved, discrepancies };
  }
}

export const stockTransactionService = new StockTransactionService();
