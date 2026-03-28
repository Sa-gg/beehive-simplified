import { PrismaClient } from '../../generated/prisma/client.js';
import { CreateInventoryItemDTO, UpdateInventoryItemDTO, InventoryFilters } from '../types/inventory.types.js';
import { randomUUID } from 'crypto';

export class InventoryRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findAll(filters?: InventoryFilters) {
    const where: any = {
      archived: false // By default, only show non-archived items
    };

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { supplier: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    return this.prisma.inventory_items.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(id: string) {
    return this.prisma.inventory_items.findUnique({
      where: { id }
    });
  }

  async create(data: CreateInventoryItemDTO) {
    // Check for duplicate name
    const existingItem = await this.prisma.inventory_items.findFirst({
      where: { 
        name: { equals: data.name, mode: 'insensitive' },
        archived: false 
      }
    });
    
    if (existingItem) {
      throw new Error(`An inventory item with the name "${data.name}" already exists`);
    }
    
    // Determine status based on stock levels
    // Priority: DISCREPANCY (negative) > OUT_OF_STOCK (0) > LOW_STOCK (below min) > IN_STOCK
    let status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCREPANCY' = 'IN_STOCK';
    if (data.currentStock < 0) {
      status = 'DISCREPANCY';
    } else if (data.currentStock <= 0) {
      status = 'OUT_OF_STOCK';
    } else if (data.currentStock <= data.minStock) {
      status = 'LOW_STOCK';
    }

    // Use transaction to create item and record initial stock transaction
    return this.prisma.$transaction(async (tx) => {
      const itemId = randomUUID();
      
      // Create the inventory item
      const item = await tx.inventory_items.create({
        data: {
          id: itemId,
          name: data.name,
          category: data.category,
          currentStock: data.currentStock,
          minStock: data.minStock,
          maxStock: data.maxStock,
          unit: data.unit,
          costPerUnit: data.costPerUnit,
          supplier: data.supplier || 'N/A',
          status,
          updatedAt: new Date()
        }
      });
      
      // Record initial stock transaction if there's initial stock (including negative for discrepancy)
      if (data.currentStock !== 0) {
        await tx.stock_transactions.create({
          data: {
            id: `st_${Date.now()}_init_${Math.random().toString(36).substr(2, 9)}`,
            inventoryItemId: itemId,
            type: data.currentStock > 0 ? 'IN' : 'OUT',
            reason: 'CREATED',
            quantity: Math.abs(data.currentStock),
            balanceBefore: 0,
            balanceAfter: data.currentStock,
            status: data.currentStock < 0 ? 'DISCREPANCY' : 'NORMAL',
            notes: `Initial stock on item creation: ${data.currentStock} ${data.unit}${data.currentStock < 0 ? ' (DISCREPANCY - negative stock)' : ''}`,
          }
        });
      }
      
      return item;
    });
  }

  async update(id: string, data: UpdateInventoryItemDTO) {
    const existingItem = await this.findById(id);
    if (!existingItem) {
      throw new Error('Inventory item not found');
    }

    // Check for duplicate name if name is being changed
    if (data.name && data.name.toLowerCase() !== existingItem.name.toLowerCase()) {
      const duplicateItem = await this.prisma.inventory_items.findFirst({
        where: { 
          name: { equals: data.name, mode: 'insensitive' },
          archived: false,
          id: { not: id }
        }
      });
      
      if (duplicateItem) {
        throw new Error(`An inventory item with the name "${data.name}" already exists`);
      }
    }

    // Determine new status if stock is being updated
    // Priority: DISCREPANCY (negative) > OUT_OF_STOCK (0) > LOW_STOCK (below min) > IN_STOCK
    let status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCREPANCY' = existingItem.status as any;
    const newStock = data.currentStock ?? existingItem.currentStock;
    const minStock = data.minStock ?? existingItem.minStock;
    
    if (newStock < 0) {
      status = 'DISCREPANCY';
    } else if (newStock <= 0) {
      status = 'OUT_OF_STOCK';
    } else if (newStock <= minStock) {
      status = 'LOW_STOCK';
    } else {
      status = 'IN_STOCK';
    }

    // Use transaction to update item and record stock change if applicable
    return this.prisma.$transaction(async (tx) => {
      // Record stock transaction if stock changed
      if (data.currentStock !== undefined && data.currentStock !== existingItem.currentStock) {
        const stockDiff = data.currentStock - existingItem.currentStock;
        const isIncrease = stockDiff > 0;
        
        await tx.stock_transactions.create({
          data: {
            id: `st_${Date.now()}_edit_${Math.random().toString(36).substr(2, 9)}`,
            inventoryItemId: id,
            type: isIncrease ? 'IN' : 'OUT',
            reason: 'EDITED',
            quantity: Math.abs(stockDiff),
            balanceBefore: existingItem.currentStock,
            balanceAfter: data.currentStock,
            status: 'NORMAL',
            notes: `Stock ${isIncrease ? 'increased' : 'decreased'} via item edit. Previous: ${existingItem.currentStock} ${existingItem.unit}, New: ${data.currentStock} ${existingItem.unit}`,
          }
        });
      }

      // Update the inventory item
      return tx.inventory_items.update({
        where: { id },
        data: {
          ...data,
          status,
          lastRestocked: data.currentStock !== undefined && data.currentStock > existingItem.currentStock 
            ? new Date() 
            : existingItem.lastRestocked,
          updatedAt: new Date()
        }
      });
    });
  }

  async delete(id: string, reason?: string) {
    const existingItem = await this.findById(id);
    if (!existingItem) {
      throw new Error('Inventory item not found');
    }

    // Archive the inventory item instead of deleting
    // Also remove all recipe ingredients that use this inventory item
    // And create a stock transaction for audit trail
    return this.prisma.$transaction(async (tx) => {
      // Create stock transaction for audit trail (record remaining stock as OUT)
      if (existingItem.currentStock !== 0) {
        await tx.stock_transactions.create({
          data: {
            id: `st_${Date.now()}_del_${Math.random().toString(36).substr(2, 9)}`,
            inventoryItemId: id,
            type: 'OUT',
            reason: 'DELETED',
            quantity: Math.abs(existingItem.currentStock),
            balanceBefore: existingItem.currentStock,
            balanceAfter: 0,
            status: existingItem.currentStock < 0 ? 'DISCREPANCY' : 'NORMAL',
            notes: `Item archived/deleted. Reason: ${reason || 'No reason provided'}. Final stock: ${existingItem.currentStock} ${existingItem.unit}`,
          }
        });
      } else {
        // Even if stock is 0, create a transaction for the deletion event
        await tx.stock_transactions.create({
          data: {
            id: `st_${Date.now()}_del_${Math.random().toString(36).substr(2, 9)}`,
            inventoryItemId: id,
            type: 'OUT',
            reason: 'DELETED',
            quantity: 0,
            balanceBefore: 0,
            balanceAfter: 0,
            status: 'NORMAL',
            notes: `Item archived/deleted. Reason: ${reason || 'No reason provided'}. Stock was already 0.`,
          }
        });
      }

      // Remove all menu_item_ingredients that reference this inventory item
      await tx.menu_item_ingredients.deleteMany({
        where: { inventoryItemId: id }
      });
      
      // Archive the inventory item (soft delete)
      return tx.inventory_items.update({
        where: { id },
        data: { 
          archived: true,
          updatedAt: new Date()
        }
      });
    });
  }

  async updateStock(id: string, newStock: number) {
    const item = await this.findById(id);
    if (!item) {
      throw new Error('Inventory item not found');
    }

    // Determine status - allow negative stock with DISCREPANCY status
    let status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCREPANCY' = 'IN_STOCK';
    if (newStock < 0) {
      status = 'DISCREPANCY';
    } else if (newStock === 0) {
      status = 'OUT_OF_STOCK';
    } else if (newStock <= item.minStock) {
      status = 'LOW_STOCK';
    }

    return this.prisma.inventory_items.update({
      where: { id },
      data: {
        currentStock: newStock,
        status,
        lastRestocked: newStock > item.currentStock ? new Date() : item.lastRestocked,
        updatedAt: new Date()
      }
    });
  }

  async count(filters?: InventoryFilters) {
    const where: any = {
      archived: false // Only count non-archived items
    };

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.inventory_items.count({ where });
  }

  async getStats() {
    const [total, lowStock, outOfStock, discrepancy] = await Promise.all([
      this.count(),
      this.count({ status: 'LOW_STOCK' }),
      this.count({ status: 'OUT_OF_STOCK' }),
      this.count({ status: 'DISCREPANCY' })
    ]);

    const allItems = await this.findAll();
    const totalValue = allItems.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0);

    return {
      totalItems: total,
      lowStock,
      outOfStock,
      discrepancy,
      totalValue
    };
  }
}
