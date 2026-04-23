import { OrderRepository } from '../repositories/order.repository.js';
import type { CreateOrderDTO, UpdateOrderDTO } from '../types/order.types.js';
import { stockTransactionService } from './stockTransaction.service.js';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export class OrderService {
  constructor(private orderRepository: OrderRepository) {}

  async getAllOrders() {
    return this.orderRepository.findAll();
  }

  async getOrderById(id: string) {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  async getOrderByOrderNumber(orderNumber: string) {
    const order = await this.orderRepository.findByOrderNumber(orderNumber);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  async getOrdersByDeviceId(deviceId: string, limit: number = 20) {
    return this.orderRepository.findByDeviceId(deviceId, limit);
  }

  async createOrder(data: CreateOrderDTO) {
    // Validate items
    if (!data.items || data.items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    // Validate quantities
    for (const item of data.items) {
      if (item.quantity <= 0) {
        throw new Error('Item quantity must be greater than 0');
      }
    }

    return this.orderRepository.create(data);
  }

  async updateOrder(id: string, data: UpdateOrderDTO) {
    // Check if order exists
    await this.getOrderById(id);
    return this.orderRepository.update(id, data);
  }

  async deleteOrder(id: string) {
    await this.getOrderById(id);
    return this.orderRepository.delete(id);
  }

  async getOrdersByStatus(status: string) {
    const validStatuses = ['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid order status');
    }
    return this.orderRepository.findByStatus(status);
  }

  async updateOrderStatus(id: string, status: string, processedBy?: string | null) {
    const validStatuses = ['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid order status');
    }
    
    // Get the order to check if status is changing to COMPLETED
    const order = await this.getOrderById(id);
    const isCompletingOrder = status === 'COMPLETED' && order.status !== 'COMPLETED';
    
    // Prepare update data - set processedBy when order is marked as COMPLETED
    const updateData: any = { status: status as any };
    if (isCompletingOrder && processedBy) {
      updateData.processedBy = processedBy;
    }
    
    // Update the order status
    const updatedOrder = await this.orderRepository.update(id, updateData);

    // If order is being moved to COMPLETED, deduct inventory (permanent deduction)
    if (isCompletingOrder) {
      await this.deductInventoryForCompletedOrder(id);
    }

    return updatedOrder;
  }

  async markOrderAsPaid(id: string, paymentMethod: string) {
    // Get the order first to get customer info for loyalty
    const order = await this.getOrderById(id);
    
    const updatedOrder = await this.orderRepository.update(id, {
      paymentStatus: 'PAID',
      paymentMethod
    });

    return updatedOrder;
  }

  async getLinkedOrders(orderId: string) {
    return this.orderRepository.findLinkedOrders(orderId);
  }

  /**
   * Void an order - sets payment status to VOIDED and status to CANCELLED
   * If order was COMPLETED, also replenishes stock since the order didn't actually happen
   */
  async voidOrder(orderId: string, params: {
    reason: string;
    authorizedBy: string;
    processedBy?: string | null;
  }) {
    // Get the order first to check its status
    const order = await this.getOrderById(orderId);
    const wasCompleted = order.status === 'COMPLETED';
    
    // Update the order status to CANCELLED and paymentStatus to VOIDED
    const updatedOrder = await this.orderRepository.update(orderId, {
      status: 'CANCELLED',
      paymentStatus: 'VOIDED',
      notes: params.reason,
      authorizedBy: params.authorizedBy,
      processedBy: params.processedBy
    });
    
    // If the order was completed, we need to replenish the stock
    if (wasCompleted) {
      await this.replenishInventoryForVoidedOrder(orderId, params.reason);
    }
    
    return updatedOrder;
  }

  /**
   * Replenish inventory when a COMPLETED order is voided
   * Returns the ingredients that were deducted when the order was completed
   */
  private async replenishInventoryForVoidedOrder(orderId: string, reason: string): Promise<void> {
    // Get order with items
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        order_items: {
          include: {
            menu_items: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Get all menu item IDs from the order
    const menuItemIds = order.order_items.map((item) => item.menuItemId);

    // Get recipes for all menu items in the order
    const recipes = await prisma.menu_item_ingredients.findMany({
      where: {
        menuItemId: { in: menuItemIds },
      },
      include: {
        inventory_item: true,
        menu_item: true,
      },
    });

    // Group recipes by inventory item and calculate total required quantity
    const inventoryRequirements = new Map<string, {
      inventoryItemId: string;
      inventoryItemName: string;
      unit: string;
      totalRequired: number;
    }>();

    for (const orderItem of order.order_items) {
      const menuItemRecipes = recipes.filter(
        (recipe) => recipe.menuItemId === orderItem.menuItemId
      );

      for (const recipe of menuItemRecipes) {
        const key = recipe.inventoryItemId;
        const existingReq = inventoryRequirements.get(key);

        if (existingReq) {
          existingReq.totalRequired += recipe.quantity * orderItem.quantity;
        } else {
          inventoryRequirements.set(key, {
            inventoryItemId: recipe.inventoryItemId,
            inventoryItemName: recipe.inventory_item.name,
            unit: recipe.inventory_item.unit,
            totalRequired: recipe.quantity * orderItem.quantity,
          });
        }
      }
    }

    // Replenish inventory for each ingredient (stock IN with VOID reason)
    for (const [_, requirement] of inventoryRequirements) {
      try {
        await stockTransactionService.stockIn({
          inventoryItemId: requirement.inventoryItemId,
          quantity: requirement.totalRequired,
          reason: 'VOID',
          referenceId: `void_${orderId}`,
          notes: `Stock replenished - voided order ${order.orderNumber}: ${reason}`,
        });

      } catch (error: any) {
        console.error(
          `✗ Failed to replenish ${requirement.inventoryItemName}: ${error.message}`
        );
      }
    }
  }

  /**
   * Automatically deduct inventory when an order moves to COMPLETED status
   * Uses menu item recipes to calculate required ingredients
   * Creates stock-out transactions for auditability
   * Ensures idempotency using order ID as reference
   */
  private async deductInventoryForCompletedOrder(orderId: string): Promise<void> {
    // Check if inventory has already been deducted for this order (idempotency)
    const alreadyProcessed = await stockTransactionService.isReferenceProcessed(orderId);
    if (alreadyProcessed) {
      return;
    }

    // Get order with items
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        order_items: {
          include: {
            menu_items: true,
            variant: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Get all menu item IDs from the order
    const menuItemIds = order.order_items.map((item) => item.menuItemId);

    // Get all recipes (base + variant-specific) for menu items in the order
    const recipes = await prisma.menu_item_ingredients.findMany({
      where: {
        menuItemId: { in: menuItemIds },
      },
      include: {
        inventory_item: true,
        menu_item: true,
        variant: true,
      },
    });

    // Group recipes by inventory item and calculate total required quantity
    // Using effective recipe logic: variant-specific overrides base
    const inventoryRequirements = new Map<string, {
      inventoryItemId: string;
      inventoryItemName: string;
      unit: string;
      totalRequired: number;
    }>();

    for (const orderItem of order.order_items) {
      // Get base recipes (variantId = null) and variant-specific recipes
      const baseRecipes = recipes.filter(
        (recipe) => recipe.menuItemId === orderItem.menuItemId && recipe.variantId === null
      );
      const variantRecipes = orderItem.variantId
        ? recipes.filter(
            (recipe) => recipe.menuItemId === orderItem.menuItemId && recipe.variantId === orderItem.variantId
          )
        : [];

      // Build effective recipe: variant overrides base for same inventory item
      const variantInventoryIds = new Set(variantRecipes.map(r => r.inventoryItemId));
      const effectiveRecipes = [
        ...baseRecipes.filter(r => !variantInventoryIds.has(r.inventoryItemId)),
        ...variantRecipes,
      ];

      for (const recipe of effectiveRecipes) {
        const key = recipe.inventoryItemId;
        const existingReq = inventoryRequirements.get(key);

        if (existingReq) {
          existingReq.totalRequired += recipe.quantity * orderItem.quantity;
        } else {
          inventoryRequirements.set(key, {
            inventoryItemId: recipe.inventoryItemId,
            inventoryItemName: recipe.inventory_item.name,
            unit: recipe.inventory_item.unit,
            // Round to 2 decimal places to avoid floating point precision issues
            totalRequired: Math.round(recipe.quantity * orderItem.quantity * 100) / 100,
          });
        }
      }
    }

    // Deduct inventory for each required ingredient
    // allowNegative: true - allows orders to go through even if stock is insufficient
    // This records a RECONCILIATION transaction to track the discrepancy
    const deductionResults: Array<{
      success: boolean;
      inventoryItem: string;
      quantity: number;
      error?: string;
      discrepancy?: number;
    }> = [];

    for (const [_, requirement] of inventoryRequirements) {
      try {
        const result = await stockTransactionService.stockOut({
          inventoryItemId: requirement.inventoryItemId,
          quantity: requirement.totalRequired,
          reason: 'ORDER',
          referenceId: orderId,
          notes: `Auto-deducted for order ${order.orderNumber}`,
          allowNegative: true, // Allow orders to exceed stock, record discrepancy
        });

        deductionResults.push({
          success: true,
          inventoryItem: requirement.inventoryItemName,
          quantity: requirement.totalRequired,
          discrepancy: result.discrepancy,
        });
      } catch (error: any) {
        deductionResults.push({
          success: false,
          inventoryItem: requirement.inventoryItemName,
          quantity: requirement.totalRequired,
          error: error.message,
        });

        console.error(
          `✗ Failed to deduct ${requirement.inventoryItemName}: ${error.message}`
        );
      }
    }

    // If some deductions failed, you may want to handle this (e.g., notify admin)
    const failCount = deductionResults.filter((r) => !r.success).length;
    if (failCount > 0) {
      console.warn(`⚠️ Some inventory deductions failed for order ${order.orderNumber}`);
      // You could create a notification or alert here
    }
  }

  /**
   * Merge multiple orders into a single receipt/payment
   * Useful when customer orders multiple times but pays once
   * Returns merged order data for receipt printing
   */
  async mergeOrders(orderIds: string[]) {
    if (orderIds.length < 2) {
      throw new Error('At least 2 orders are required to merge');
    }

    // Fetch all orders
    const orders = await Promise.all(
      orderIds.map(id => this.getOrderById(id))
    );

    // Validate all orders can be merged
    for (const order of orders) {
      if (order.status === 'CANCELLED') {
        throw new Error(`Cannot merge cancelled order: ${order.orderNumber}`);
      }
      if (order.paymentStatus === 'PAID') {
        throw new Error(`Cannot merge already paid order: ${order.orderNumber}`);
      }
    }

    // Combine all items
    const allItems: Array<{
      menuItemId: string;
      name: string;
      quantity: number;
      price: number;
      subtotal: number;
    }> = [];

    for (const order of orders) {
      for (const item of order.order_items) {
        const existingItem = allItems.find(i => i.menuItemId === item.menuItemId);
        if (existingItem) {
          existingItem.quantity += item.quantity;
          existingItem.subtotal += item.subtotal;
        } else {
          allItems.push({
            menuItemId: item.menuItemId,
            name: item.menu_items?.name || item.menuItemId,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal
          });
        }
      }
    }

    // Calculate totals
    const subtotal = allItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * 0.12;
    const totalAmount = subtotal + tax;

    // Get primary order info (use first order)
    const primaryOrder = orders[0];

    return {
      mergedOrderIds: orderIds,
      orderNumbers: orders.map(o => o.orderNumber),
      customerName: primaryOrder.customerName || orders.find(o => o.customerName)?.customerName,
      tableNumber: primaryOrder.tableNumber || orders.find(o => o.tableNumber)?.tableNumber,
      items: allItems,
      subtotal,
      tax,
      totalAmount,
      orderType: primaryOrder.orderType
    };
  }

  /**
   * Mark multiple orders as paid at once (for merged orders)
   * Each paid order awards a loyalty stamp
   */
  async markMergedOrdersAsPaid(orderIds: string[], paymentMethod: string) {
    // Use markOrderAsPaid for each order to include loyalty stamp logic
    const results = await Promise.all(
      orderIds.map(id => this.markOrderAsPaid(id, paymentMethod))
    );
    return results;
  }

  // ============================================
  // TAB ORDER METHODS (Item-level status management)
  // ============================================

  /**
   * Add items to an existing tab order
   * This allows adding more items to an unpaid order without creating a linked order
   */
  async addItemsToOrder(orderId: string, items: Array<{ 
    menuItemId: string; 
    quantity: number; 
    price: number;
    variantId?: string;
    variantPriceDelta?: number;
    notes?: string;
    addons?: Array<{
      addonItemId: string;
      quantity: number;
      unitPrice: number;
    }>;
  }>) {
    // Validate order exists and is unpaid (can only add to tab orders)
    const order = await this.getOrderById(orderId);
    if (order.paymentStatus !== 'UNPAID') {
      throw new Error('Can only add items to unpaid orders (tab orders)');
    }

    // Validate items
    if (!items || items.length === 0) {
      throw new Error('Items array is required');
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        throw new Error('Item quantity must be greater than 0');
      }
    }

    // Add items to the order
    await this.orderRepository.addItemsToOrder(orderId, items);
    
    // Return the updated order
    return this.getOrderById(orderId);
  }

  /**
   * Update individual order item status
   */
  async updateOrderItemStatus(orderItemId: string, status: 'PREPARING' | 'COMPLETED' | 'VOIDED') {
    return this.orderRepository.updateOrderItemStatus(orderItemId, status);
  }

  /**
   * Update all order items status at once
   */
  async updateAllOrderItemsStatus(orderId: string, status: 'PREPARING' | 'COMPLETED' | 'VOIDED') {
    return this.orderRepository.updateAllOrderItemsStatus(orderId, status);
  }

  /**
   * Void a single order item in a tab order
   * This will recalculate the order totals
   */
  async voidOrderItem(orderItemId: string, orderId: string) {
    return this.orderRepository.voidOrderItem(orderItemId, orderId);
  }
}
