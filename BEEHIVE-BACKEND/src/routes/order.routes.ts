import { Router } from 'express';
import { OrderController } from '../controllers/order.controller.js';
import { orderEventEmitter } from '../utils/eventEmitter.js';
import { authenticate } from '../middleware/auth.middleware.js';
import crypto from 'crypto';

export function createOrderRoutes(orderController: OrderController): Router {
  const router = Router();

  // SSE endpoint for real-time order updates (cashier side)
  router.get('/events/cashier', (req, res) => {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const clientId = crypto.randomUUID();
    orderEventEmitter.addClient({
      id: clientId,
      response: res,
      type: 'cashier'
    });

    // Send initial connection success event
    res.write(`event: CONNECTED\n`);
    res.write(`data: {"clientId": "${clientId}", "type": "cashier"}\n\n`);

    // Handle client disconnect
    req.on('close', () => {
      orderEventEmitter.removeClient(clientId);
    });
  });

  // SSE endpoint for real-time order updates (customer side)
  router.get('/events/customer', (req, res) => {
    const customerId = req.query.customerId as string || req.query.deviceId as string;
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const clientId = crypto.randomUUID();
    orderEventEmitter.addClient({
      id: clientId,
      response: res,
      type: 'customer',
      customerId: customerId
    });

    // Send initial connection success event
    res.write(`event: CONNECTED\n`);
    res.write(`data: {"clientId": "${clientId}", "type": "customer", "customerId": "${customerId || 'anonymous'}"}\n\n`);

    // Handle client disconnect
    req.on('close', () => {
      orderEventEmitter.removeClient(clientId);
    });
  });

  // Get SSE connection status
  router.get('/events/status', (req, res) => {
    res.json(orderEventEmitter.getClientCount());
  });

  // Get all orders (optionally filtered by status)
  router.get('/', (req, res) => orderController.getAllOrders(req, res));

  // Track order by order number (for guests) - must come before /:id
  router.get('/track/:orderNumber', (req, res) => orderController.getOrderByOrderNumber(req, res));

  // Get order by ID
  router.get('/:id', (req, res) => orderController.getOrderById(req, res));

  // Get linked orders
  router.get('/:id/linked', (req, res) => orderController.getLinkedOrders(req, res));

  // Create new order
  router.post('/', (req, res) => orderController.createOrder(req, res));

  // Merge orders for single receipt
  router.post('/merge', (req, res) => orderController.mergeOrders(req, res));

  // Mark merged orders as paid
  router.post('/merge/pay', (req, res) => orderController.markMergedOrdersAsPaid(req, res));

  // Update order
  router.put('/:id', (req, res) => orderController.updateOrder(req, res));

  // Delete order
  router.delete('/:id', (req, res) => orderController.deleteOrder(req, res));

  // Update order status (requires authentication to track who completed the order)
  router.patch('/:id/status', authenticate, (req, res) => orderController.updateOrderStatus(req, res));

  // Mark order as paid
  router.patch('/:id/payment', (req, res) => orderController.markOrderAsPaid(req, res));

  // Void an order (requires manager authorization)
  router.patch('/:id/void', authenticate, (req, res) => orderController.voidOrder(req, res));

  // Refund a paid order (requires manager authorization)
  router.patch('/:id/refund', authenticate, (req, res) => orderController.refundOrder(req, res));

  // Mark order as complimentary (requires manager authorization)
  router.patch('/:id/complimentary', authenticate, (req, res) => orderController.markAsComplimentary(req, res));

  // Write off an unpaid order (requires manager authorization)
  router.patch('/:id/write-off', authenticate, (req, res) => orderController.writeOff(req, res));

  // ============================================
  // TAB ORDER ROUTES (Item-level management)
  // ============================================

  // Add items to an existing tab order (unpaid order)
  router.post('/:id/items', authenticate, (req, res) => orderController.addItemsToTab(req, res));

  // Mark all items in a tab order as completed
  router.patch('/:id/items/complete-all', authenticate, (req, res) => orderController.markAllItemsCompleted(req, res));

  // Update individual order item status
  router.patch('/:id/items/:itemId/status', authenticate, (req, res) => orderController.updateOrderItemStatus(req, res));

  // Void a single order item (requires manager authorization)
  router.patch('/:id/items/:itemId/void', authenticate, (req, res) => orderController.voidOrderItem(req, res));

  // Update order (generic update)
  router.patch('/:id', (req, res) => orderController.updateOrder(req, res));

  return router;
}
