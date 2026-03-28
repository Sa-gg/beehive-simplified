import { Request, Response } from 'express';
import { OrderService } from '../services/order.service.js';
import type { CreateOrderDTO, UpdateOrderDTO } from '../types/order.types.js';
import { orderEventEmitter } from '../utils/eventEmitter.js';

export class OrderController {
  constructor(private orderService: OrderService) {}

  async getAllOrders(req: Request, res: Response) {
    try {
      const { status, deviceId, limit } = req.query;
      let orders;
      
      // If deviceId is provided, get orders for that device (guest tracking)
      if (deviceId && typeof deviceId === 'string') {
        const limitNum = limit ? parseInt(limit as string, 10) : 20;
        orders = await this.orderService.getOrdersByDeviceId(deviceId, limitNum);
      } else if (status && typeof status === 'string') {
        orders = await this.orderService.getOrdersByStatus(status);
      } else {
        orders = await this.orderService.getAllOrders();
      }
      
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getOrderById(req: Request, res: Response) {
    try {
      const order = await this.orderService.getOrderById(req.params.id);
      res.json(order);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async getOrderByOrderNumber(req: Request, res: Response) {
    try {
      const order = await this.orderService.getOrderByOrderNumber(req.params.orderNumber);
      res.json(order);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async createOrder(req: Request, res: Response) {
    try {
      const orderData: CreateOrderDTO = req.body;
      
      // If order is created by a logged-in staff member (POS), set createdBy to their name
      // If no deviceId (POS order) and no createdBy specified, use the logged-in user's name
      if (!orderData.deviceId && !orderData.createdBy && (req as any).user?.name) {
        orderData.createdBy = (req as any).user.name;
      }
      
      const order = await this.orderService.createOrder(orderData);
      
      // Emit real-time event for new order
      orderEventEmitter.broadcastNewOrder(order);
      
      res.status(201).json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateOrder(req: Request, res: Response) {
    try {
      const updateData: UpdateOrderDTO = req.body;
      const order = await this.orderService.updateOrder(req.params.id, updateData);
      
      // Emit real-time event for order update
      orderEventEmitter.broadcastOrderUpdate(order);
      
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteOrder(req: Request, res: Response) {
    try {
      await this.orderService.deleteOrder(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async updateOrderStatus(req: Request, res: Response) {
    try {
      const { status } = req.body;
      // Get the user NAME from the authenticated request (set by auth middleware)
      // processedBy should be the name of the cashier/manager who completed the order
      const processedBy = (req as any).user?.name || null;
      const order = await this.orderService.updateOrderStatus(req.params.id, status, processedBy);
      
      // Emit real-time event for status update
      orderEventEmitter.broadcastOrderUpdate(order);
      
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async markOrderAsPaid(req: Request, res: Response) {
    try {
      const { paymentMethod } = req.body;
      const order = await this.orderService.markOrderAsPaid(req.params.id, paymentMethod);
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getLinkedOrders(req: Request, res: Response) {
    try {
      const orders = await this.orderService.getLinkedOrders(req.params.id);
      res.json(orders);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async mergeOrders(req: Request, res: Response) {
    try {
      const { orderIds } = req.body;
      if (!orderIds || !Array.isArray(orderIds)) {
        return res.status(400).json({ error: 'orderIds array is required' });
      }
      const mergedData = await this.orderService.mergeOrders(orderIds);
      res.json({ success: true, data: mergedData });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async markMergedOrdersAsPaid(req: Request, res: Response) {
    try {
      const { orderIds, paymentMethod } = req.body;
      if (!orderIds || !Array.isArray(orderIds)) {
        return res.status(400).json({ error: 'orderIds array is required' });
      }
      if (!paymentMethod) {
        return res.status(400).json({ error: 'paymentMethod is required' });
      }
      const orders = await this.orderService.markMergedOrdersAsPaid(orderIds, paymentMethod);
      res.json({ success: true, data: orders });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Void an order (sets payment status to VOIDED)
  // If order was COMPLETED, also replenishes stock since the order didn't happen
  async voidOrder(req: Request, res: Response) {
    try {
      const { reason, authorizedBy } = req.body;
      if (!reason) {
        return res.status(400).json({ error: 'Reason is required for voiding an order' });
      }
      if (!authorizedBy) {
        return res.status(400).json({ error: 'Manager authorization is required' });
      }
      
      // Get the logged-in user name for processedBy
      const processedBy = (req as any).user?.name || null;
      
      // Void the order and replenish stock if it was completed
      const order = await this.orderService.voidOrder(req.params.id, {
        reason,
        authorizedBy,
        processedBy
      });
      
      orderEventEmitter.broadcastOrderUpdate(order);
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Refund a paid order
  async refundOrder(req: Request, res: Response) {
    try {
      const { reason, authorizedBy } = req.body;
      if (!reason) {
        return res.status(400).json({ error: 'Reason is required for refunding an order' });
      }
      if (!authorizedBy) {
        return res.status(400).json({ error: 'Manager authorization is required' });
      }
      
      // Get the logged-in user name for processedBy
      const processedBy = (req as any).user?.name || null;
      
      const order = await this.orderService.updateOrder(req.params.id, {
        paymentStatus: 'REFUNDED',
        notes: reason,
        authorizedBy: authorizedBy,
        processedBy: processedBy
      });
      
      orderEventEmitter.broadcastOrderUpdate(order);
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Mark order as complimentary
  async markAsComplimentary(req: Request, res: Response) {
    try {
      const { reason, authorizedBy } = req.body;
      if (!reason) {
        return res.status(400).json({ error: 'Reason is required for complimentary orders' });
      }
      if (!authorizedBy) {
        return res.status(400).json({ error: 'Manager authorization is required' });
      }
      
      // Get the logged-in user name for processedBy
      const processedBy = (req as any).user?.name || null;
      
      const order = await this.orderService.updateOrder(req.params.id, {
        paymentStatus: 'COMPLIMENTARY',
        notes: reason,
        authorizedBy: authorizedBy,
        processedBy: processedBy,
        paidAt: new Date().toISOString() // Mark as settled
      });
      
      orderEventEmitter.broadcastOrderUpdate(order);
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Write off an unpaid order (customer left without paying)
  async writeOff(req: Request, res: Response) {
    try {
      const { reason, authorizedBy } = req.body;
      if (!reason) {
        return res.status(400).json({ error: 'Reason is required for write-off' });
      }
      if (!authorizedBy) {
        return res.status(400).json({ error: 'Manager authorization is required' });
      }
      
      // Get the logged-in user name for processedBy
      const processedBy = (req as any).user?.name || null;
      
      const order = await this.orderService.updateOrder(req.params.id, {
        paymentStatus: 'WRITTEN_OFF',
        notes: reason,
        authorizedBy: authorizedBy,
        processedBy: processedBy
      });
      
      orderEventEmitter.broadcastOrderUpdate(order);
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ============================================
  // TAB ORDER ENDPOINTS (Item-level status management)
  // ============================================

  // Add items to an existing tab order (without creating a new linked order)
  async addItemsToTab(req: Request, res: Response) {
    try {
      const { items } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Items array is required' });
      }
      
      const order = await this.orderService.addItemsToOrder(req.params.id, items);
      
      // Emit real-time event for order update
      orderEventEmitter.broadcastOrderUpdate(order);
      
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Update individual order item status (preparing/completed/voided)
  async updateOrderItemStatus(req: Request, res: Response) {
    try {
      const { status } = req.body;
      if (!status || !['PREPARING', 'COMPLETED', 'VOIDED'].includes(status)) {
        return res.status(400).json({ error: 'Valid status (PREPARING, COMPLETED, VOIDED) is required' });
      }
      
      const orderItem = await this.orderService.updateOrderItemStatus(req.params.itemId, status);
      
      // Get the updated order to broadcast
      const order = await this.orderService.getOrderById(req.params.id);
      if (order) {
        orderEventEmitter.broadcastOrderUpdate(order);
      }
      
      res.json(orderItem);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Mark all items in a tab order as completed
  async markAllItemsCompleted(req: Request, res: Response) {
    try {
      await this.orderService.updateAllOrderItemsStatus(req.params.id, 'COMPLETED');
      
      // Get the updated order
      const order = await this.orderService.getOrderById(req.params.id);
      if (order) {
        orderEventEmitter.broadcastOrderUpdate(order);
      }
      
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Void a single order item in a tab order (manager required)
  async voidOrderItem(req: Request, res: Response) {
    try {
      const { reason, authorizedBy } = req.body;
      if (!reason) {
        return res.status(400).json({ error: 'Reason is required for voiding an item' });
      }
      if (!authorizedBy) {
        return res.status(400).json({ error: 'Manager authorization is required' });
      }
      
      const order = await this.orderService.voidOrderItem(req.params.itemId, req.params.id);
      
      orderEventEmitter.broadcastOrderUpdate(order);
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
