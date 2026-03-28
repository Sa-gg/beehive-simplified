import { Request, Response } from 'express';
import { stockTransactionService } from '../services/stockTransaction.service.js';
import { stock_transaction_type, stock_transaction_reason } from '../../generated/prisma/enums.js';

/**
 * Stock-In: Add inventory to stock
 * POST /api/stock-transactions/in
 */
export const stockIn = async (req: Request, res: Response) => {
  try {
    const { inventoryItemId, quantity, reason, referenceId, receiptImage, userId, notes } = req.body;

    if (!inventoryItemId || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'inventoryItemId and quantity are required',
      });
    }

    const result = await stockTransactionService.stockIn({
      inventoryItemId,
      quantity: parseFloat(quantity),
      reason: reason || 'PURCHASE',
      referenceId,
      receiptImage,
      userId,
      notes,
    });

    res.status(200).json({
      success: true,
      data: result,
      message: result.warning || 'Stock added successfully',
    });
  } catch (error: any) {
    console.error('Stock-in error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to add stock',
    });
  }
};

/**
 * Stock-Out: Remove inventory from stock
 * POST /api/stock-transactions/out
 */
export const stockOut = async (req: Request, res: Response) => {
  try {
    const { inventoryItemId, quantity, reason, referenceId, receiptImage, userId, notes } = req.body;

    if (!inventoryItemId || !quantity || !reason) {
      return res.status(400).json({
        success: false,
        error: 'inventoryItemId, quantity, and reason are required',
      });
    }

    const result = await stockTransactionService.stockOut({
      inventoryItemId,
      quantity: parseFloat(quantity),
      reason,
      referenceId,
      receiptImage,
      userId,
      notes,
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Stock removed successfully',
    });
  } catch (error: any) {
    console.error('Stock-out error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to remove stock',
    });
  }
};

/**
 * Adjust Stock: Manual stock adjustment
 * POST /api/stock-transactions/adjust
 */
export const adjustStock = async (req: Request, res: Response) => {
  try {
    const { inventoryItemId, newStock, userId, notes } = req.body;

    if (!inventoryItemId || newStock === undefined) {
      return res.status(400).json({
        success: false,
        error: 'inventoryItemId and newStock are required',
      });
    }

    const result = await stockTransactionService.adjustStock({
      inventoryItemId,
      newStock: parseFloat(newStock),
      userId,
      notes,
    });

    res.status(200).json({
      success: true,
      data: result,
      message: `Stock adjusted by ${result.difference >= 0 ? '+' : ''}${result.difference}`,
    });
  } catch (error: any) {
    console.error('Stock adjustment error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to adjust stock',
    });
  }
};

/**
 * Get transaction history for an inventory item
 * GET /api/stock-transactions/history/:inventoryItemId
 */
export const getTransactionHistory = async (req: Request, res: Response) => {
  try {
    const { inventoryItemId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const transactions = await stockTransactionService.getTransactionHistory(
      inventoryItemId,
      limit
    );

    res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error: any) {
    console.error('Get transaction history error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get transaction history',
    });
  }
};

/**
 * Get all transactions with filters
 * GET /api/stock-transactions
 */
export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const { type, reason, startDate, endDate, limit } = req.query;

    const filters: any = {};
    if (type) filters.type = type as stock_transaction_type;
    if (reason) filters.reason = reason as stock_transaction_reason;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (limit) filters.limit = parseInt(limit as string);

    const transactions = await stockTransactionService.getAllTransactions(filters);

    res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error: any) {
    console.error('Get all transactions error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get transactions',
    });
  }
};

/**
 * Get a single transaction by ID
 * GET /api/stock-transactions/:transactionId
 */
export const getTransaction = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;

    const transaction = await stockTransactionService.getTransaction(transactionId);

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error: any) {
    console.error('Get transaction error:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Transaction not found',
    });
  }
};

/**
 * Update transaction metadata (notes, referenceId, receiptImage)
 * PATCH /api/stock-transactions/:transactionId/metadata
 * Note: This does NOT change inventory quantities - only metadata
 */
export const updateTransactionMetadata = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const { notes, referenceId, receiptImage, userId } = req.body;

    const result = await stockTransactionService.updateTransactionMetadata(transactionId, {
      notes,
      referenceId,
      receiptImage,
      userId,
    });

    res.status(200).json({
      success: true,
      data: result.transaction,
      auditLogs: result.auditLogs,
      message: result.auditLogs.length > 0 
        ? 'Metadata updated. Inventory quantity unchanged.' 
        : 'No changes detected.',
    });
  } catch (error: any) {
    console.error('Update transaction metadata error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update transaction metadata',
    });
  }
};

/**
 * Get audit logs for a transaction
 * GET /api/stock-transactions/:transactionId/audit-logs
 */
export const getTransactionAuditLogs = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;

    const logs = await stockTransactionService.getTransactionAuditLogs(transactionId);

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    console.error('Get transaction audit logs error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get audit logs',
    });
  }
};

/**
 * Bulk Stock-In: Add inventory to multiple items at once
 * POST /api/stock-transactions/bulk/in
 */
export const bulkStockIn = async (req: Request, res: Response) => {
  try {
    const { items, referenceId, receiptImage, userId, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'items array is required and must not be empty',
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.inventoryItemId || !item.quantity) {
        return res.status(400).json({
          success: false,
          error: 'Each item must have inventoryItemId and quantity',
        });
      }
    }

    const results = await stockTransactionService.bulkStockIn({
      items,
      referenceId,
      receiptImage,
      userId,
      notes,
    });

    res.status(200).json({
      success: true,
      data: results,
      message: `Successfully added stock to ${results.successful.length} items`,
    });
  } catch (error: any) {
    console.error('Bulk stock-in error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to bulk add stock',
    });
  }
};

/**
 * Bulk Stock-Out: Remove inventory from multiple items at once
 * POST /api/stock-transactions/bulk/out
 */
export const bulkStockOut = async (req: Request, res: Response) => {
  try {
    const { items, reason, referenceId, receiptImage, userId, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'items array is required and must not be empty',
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'reason is required for stock-out',
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.inventoryItemId || !item.quantity) {
        return res.status(400).json({
          success: false,
          error: 'Each item must have inventoryItemId and quantity',
        });
      }
    }

    const results = await stockTransactionService.bulkStockOut({
      items,
      reason,
      referenceId,
      receiptImage,
      userId,
      notes,
    });

    res.status(200).json({
      success: true,
      data: results,
      message: `Successfully removed stock from ${results.successful.length} items`,
    });
  } catch (error: any) {
    console.error('Bulk stock-out error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to bulk remove stock',
    });
  }
};
