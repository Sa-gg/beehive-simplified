import { PrismaClient } from '../../generated/prisma/client.js';
import type { CreateOrderDTO, UpdateOrderDTO } from '../types/order.types.js';
import { MenuItemRepository } from './menuItem.repository.js';

export class OrderRepository {
  constructor(
    private prisma: PrismaClient,
    private shouldResetOrderNumbers?: () => boolean
  ) {}

  async findAll() {
    return this.prisma.orders.findMany({
      include: {
        order_items: {
          include: {
            menu_items: {
              select: {
                name: true,
                category: true,
                image: true,
                itemType: true  // NEW: Include item type
              }
            },
            variant: {          // NEW: Include selected variant
              select: {
                id: true,
                name: true,
                priceDelta: true
              }
            },
            order_item_addons: true  // NEW: Include selected add-ons
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(id: string) {
    return this.prisma.orders.findUnique({
      where: { id },
      include: {
        order_items: {
          include: {
            menu_items: {
              select: {
                name: true,
                category: true,
                image: true,
                itemType: true  // NEW: Include item type
              }
            },
            variant: {          // NEW: Include selected variant
              select: {
                id: true,
                name: true,
                priceDelta: true
              }
            },
            order_item_addons: true  // NEW: Include selected add-ons
          }
        }
      }
    });
  }

  async findByOrderNumber(orderNumber: string) {
    return this.prisma.orders.findUnique({
      where: { orderNumber },
      include: {
        order_items: {
          include: {
            menu_items: {
              select: {
                name: true,
                category: true,
                image: true,
                itemType: true  // NEW: Include item type
              }
            },
            variant: {          // NEW: Include selected variant
              select: {
                id: true,
                name: true,
                priceDelta: true
              }
            },
            order_item_addons: true  // NEW: Include selected add-ons
          }
        }
      }
    });
  }

  async create(data: CreateOrderDTO) {
    // Check if we should reset order numbers (clears the flag but we still need to check DB)
    const shouldReset = this.shouldResetOrderNumbers ? this.shouldResetOrderNumbers() : false;
    
    // Use date prefix to ensure uniqueness across days: ORD-YYYYMMDD-XXXXX
    const today = new Date();
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    
    let nextOrderNum = 1;
    
    // Always check for existing orders to avoid unique constraint violations
    const lastOrder = await this.prisma.orders.findFirst({
      where: {
        orderNumber: {
          startsWith: `ORD-${datePrefix}-`
        }
      },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true }
    });
    
    if (lastOrder && lastOrder.orderNumber) {
      // Extract number from "ORD-YYYYMMDD-00001" format
      const match = lastOrder.orderNumber.match(/ORD-\d{8}-(\d+)/);
      if (match) {
        nextOrderNum = parseInt(match[1], 10) + 1;
      }
    }
    
    const orderNumber = `ORD-${datePrefix}-${String(nextOrderNum).padStart(5, '0')}`;

    // Calculate totals including variants and add-ons
    // Formula: SUM((basePrice + variantDelta + addonTotal) * quantity)
    const subtotal = data.items.reduce((sum, item) => {
      // Calculate add-on total for this item
      const addonTotal = (item.addons || []).reduce(
        (aSum, addon) => aSum + (addon.unitPrice * addon.quantity),
        0
      );
      // Unit price = base price + variant delta + addon total
      const variantDelta = item.variantPriceDelta || 0;
      const unitPrice = item.price + variantDelta + addonTotal;
      return sum + (unitPrice * item.quantity);
    }, 0);
    
    const tax = 0; // Tax is included in item prices
    const deliveryFee = data.deliveryFee || 0;
    const serviceFee = data.serviceFee || 0;
    const discountAmount = data.discountAmount || 0;
    const totalAmount = subtotal + deliveryFee + serviceFee - discountAmount;

    // Create order with items
    const order = await this.prisma.orders.create({
      data: {
        id: `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        orderNumber,
        customerName: data.customerName || null,
        tableNumber: data.tableNumber || null,
        orderType: data.orderType || 'DINE_IN',
        linkedOrderId: data.linkedOrderId || null,
        createdBy: data.createdBy || (data.deviceId ? 'GUEST' : null),
        deviceId: data.deviceId || null,
        subtotal,
        tax,
        deliveryFee,
        serviceFee,
        discountAmount,
        totalAmount,
        paymentMethod: data.paymentMethod || null,
        status: 'PREPARING',
        paymentStatus: 'UNPAID',
        updatedAt: new Date(),
        order_items: {
          create: data.items.map(item => {
            // Calculate item subtotal including variant delta and add-ons
            const addonTotal = (item.addons || []).reduce(
              (aSum, addon) => aSum + (addon.unitPrice * addon.quantity),
              0
            );
            const variantDelta = item.variantPriceDelta || 0;
            const unitPrice = item.price + variantDelta + addonTotal;
            
            return {
              id: `orderItem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: item.price,  // Base price (without variant delta)
              subtotal: unitPrice * item.quantity,
              variantId: item.variantId || null,  // NEW: Selected variant
              notes: item.notes || null,          // NEW: Special instructions
              updatedAt: new Date()
            };
          })
        }
      },
      include: {
        order_items: true
      }
    });

    // Create order item add-ons separately (Prisma nested create limitation)
    // IMPORTANT: Use index-based matching because multiple items can have the same menuItemId
    // but different variants (e.g., Fries Small and Fries Large with same addon)
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      if (item.addons && item.addons.length > 0) {
        // Order items are created in the same order as data.items, so use index
        const orderItem = order.order_items[i];
        if (orderItem) {
          await this.prisma.order_item_addons.createMany({
            data: item.addons.map(addon => ({
              id: `orderItemAddon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              orderItemId: orderItem.id,
              addonItemId: addon.addonItemId,
              quantity: addon.quantity,
              unitPrice: addon.unitPrice,
              subtotal: addon.unitPrice * addon.quantity
            }))
          });
        }
      }
    }

    // Return order with add-ons included
    return this.prisma.orders.findUnique({
      where: { id: order.id },
      include: {
        order_items: {
          include: {
            order_item_addons: true
          }
        }
      }
    });
  }

  async update(id: string, data: UpdateOrderDTO) {
    const updateData: any = { updatedAt: new Date() };
    
    if (data.customerName !== undefined) updateData.customerName = data.customerName;
    if (data.tableNumber !== undefined) updateData.tableNumber = data.tableNumber;
    if (data.orderType !== undefined) updateData.orderType = data.orderType;
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.paymentStatus !== undefined) {
      updateData.paymentStatus = data.paymentStatus;
      // Set paidAt timestamp when payment is marked as PAID
      if (data.paymentStatus === 'PAID' && !data.paidAt) {
        updateData.paidAt = new Date();
      }
    }
    if (data.processedBy !== undefined) updateData.processedBy = data.processedBy;
    if (data.discountAmount !== undefined) updateData.discountAmount = data.discountAmount;
    if (data.deliveryFee !== undefined) updateData.deliveryFee = data.deliveryFee;
    if (data.serviceFee !== undefined) updateData.serviceFee = data.serviceFee;
    if (data.cashReceived !== undefined) updateData.cashReceived = data.cashReceived;
    if (data.changeAmount !== undefined) updateData.changeAmount = data.changeAmount;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.authorizedBy !== undefined) updateData.authorizedBy = data.authorizedBy;
    if (data.paidAt !== undefined) updateData.paidAt = data.paidAt ? new Date(data.paidAt) : null;

    return this.prisma.orders.update({
      where: { id },
      data: updateData,
      include: {
        order_items: true
      }
    });
  }

  async delete(id: string) {
    return this.prisma.orders.delete({
      where: { id }
    });
  }

  async findByStatus(status: string) {
    return this.prisma.orders.findMany({
      where: { status: status as any },
      include: {
        order_items: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findLinkedOrders(orderId: string) {
    // Find the order to get its linkedOrderId
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId }
    });

    if (!order) return [];

    // If this order has a linkedOrderId, find all orders linked to that ID
    // If not, find all orders that link to this order's ID
    const linkedId = order.linkedOrderId || order.id;

    return this.prisma.orders.findMany({
      where: {
        OR: [
          { id: linkedId },
          { linkedOrderId: linkedId }
        ]
      },
      include: {
        order_items: true
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  // Find orders by device ID (for guest order tracking)
  async findByDeviceId(deviceId: string, limit: number = 20) {
    return this.prisma.orders.findMany({
      where: { deviceId },
      include: {
        order_items: {
          include: {
            menu_items: {
              select: {
                name: true,
                category: true,
                image: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  // Update order item status (for tab orders - item-level status tracking)
  async updateOrderItemStatus(orderItemId: string, status: 'PREPARING' | 'COMPLETED' | 'VOIDED') {
    return this.prisma.order_items.update({
      where: { id: orderItemId },
      data: { 
        status,
        updatedAt: new Date()
      }
    });
  }

  // Update all order items status (mark all as complete for tab orders, except voided items)
  async updateAllOrderItemsStatus(orderId: string, status: 'PREPARING' | 'COMPLETED' | 'VOIDED') {
    return this.prisma.order_items.updateMany({
      where: { 
        orderId,
        // Don't update items that are already VOIDED when marking as COMPLETED
        ...(status === 'COMPLETED' ? { status: { not: 'VOIDED' } } : {})
      },
      data: { 
        status,
        updatedAt: new Date()
      }
    });
  }

  // Add items to an existing order (for tab orders - adding to the tab)
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
    // Get current order to recalculate totals
    const order = await this.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Calculate new item subtotals including variants and addons
    const newItemsSubtotal = items.reduce((sum, item) => {
      const addonTotal = (item.addons || []).reduce(
        (aSum, addon) => aSum + (addon.unitPrice * addon.quantity), 0
      );
      const variantDelta = item.variantPriceDelta || 0;
      const unitPrice = item.price + variantDelta + addonTotal;
      return sum + (unitPrice * item.quantity);
    }, 0);
    
    // Create new order items with PREPARING status
    const newItems = await Promise.all(
      items.map(async item => {
        const addonTotal = (item.addons || []).reduce(
          (aSum, addon) => aSum + (addon.unitPrice * addon.quantity), 0
        );
        const variantDelta = item.variantPriceDelta || 0;
        const unitPrice = item.price + variantDelta + addonTotal;
        
        const orderItem = await this.prisma.order_items.create({
          data: {
            id: `orderItem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            orderId,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.price,
            subtotal: unitPrice * item.quantity,
            variantId: item.variantId || null,
            notes: item.notes || null,
            status: 'PREPARING',
            updatedAt: new Date()
          }
        });
        
        // Create order item addons if present
        if (item.addons && item.addons.length > 0) {
          await this.prisma.order_item_addons.createMany({
            data: item.addons.map(addon => ({
              id: `orderItemAddon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              orderItemId: orderItem.id,
              addonItemId: addon.addonItemId,
              quantity: addon.quantity,
              unitPrice: addon.unitPrice,
              subtotal: addon.unitPrice * addon.quantity
            }))
          });
        }
        
        return orderItem;
      })
    );

    // Recalculate order totals
    const newSubtotal = order.subtotal + newItemsSubtotal;
    const newTotalAmount = newSubtotal + order.deliveryFee + order.serviceFee - order.discountAmount;

    // Update order with new totals and set status to PREPARING if not already
    // (because we added new items that need to be prepared)
    await this.prisma.orders.update({
      where: { id: orderId },
      data: {
        subtotal: newSubtotal,
        totalAmount: newTotalAmount,
        status: 'PREPARING',
        updatedAt: new Date()
      }
    });

    return newItems;
  }

  // Get order with detailed item status (for tab orders UI)
  async findByIdWithItemStatus(id: string) {
    return this.prisma.orders.findUnique({
      where: { id },
      include: {
        order_items: {
          include: {
            menu_items: {
              select: {
                id: true,
                name: true,
                category: true,
                image: true,
                price: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  // Void a single order item (for tab orders)
  async voidOrderItem(orderItemId: string, orderId: string) {
    // Update item status to VOIDED
    await this.prisma.order_items.update({
      where: { id: orderItemId },
      data: { 
        status: 'VOIDED',
        updatedAt: new Date()
      }
    });

    // Recalculate order totals excluding voided items
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        order_items: true
      }
    });

    if (order) {
      const newSubtotal = order.order_items
        .filter(item => item.status !== 'VOIDED')
        .reduce((sum, item) => sum + item.subtotal, 0);
      
      const newTotalAmount = newSubtotal + order.deliveryFee + order.serviceFee - order.discountAmount;

      await this.prisma.orders.update({
        where: { id: orderId },
        data: {
          subtotal: newSubtotal,
          totalAmount: newTotalAmount,
          updatedAt: new Date()
        }
      });
    }

    return this.findById(orderId);
  }
}
