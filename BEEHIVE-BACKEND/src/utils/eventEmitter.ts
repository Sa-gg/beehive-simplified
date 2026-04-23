import { Response } from 'express';

interface SSEClient {
  id: string;
  response: Response;
  type: 'cashier' | 'customer';
  customerId?: string; // For customer-specific events
}

class OrderEventEmitter {
  private clients: SSEClient[] = [];

  // Add a new SSE client
  addClient(client: SSEClient) {
    this.clients.push(client);
  }

  // Remove a disconnected client
  removeClient(id: string) {
    const index = this.clients.findIndex(c => c.id === id);
    if (index !== -1) {
      this.clients.splice(index, 1);
    }
  }

  // Broadcast new order to all cashier clients
  broadcastNewOrder(order: any) {
    const cashierClients = this.clients.filter(c => c.type === 'cashier');
    cashierClients.forEach(client => {
      this.sendEvent(client.response, 'NEW_ORDER', order);
    });
  }

  // Broadcast order status update to specific customer and all cashiers
  broadcastOrderUpdate(order: any) {
    // Notify all cashiers
    const cashierClients = this.clients.filter(c => c.type === 'cashier');
    cashierClients.forEach(client => {
      this.sendEvent(client.response, 'ORDER_UPDATE', order);
    });

    // Notify the customer who placed this order
    const customerClients = this.clients.filter(
      c => c.type === 'customer' && 
      (c.customerId === order.customerName || c.customerId === order.id)
    );
    
    customerClients.forEach(client => {
      this.sendEvent(client.response, 'ORDER_UPDATE', order);
    });

    // Also broadcast to all customers (they can filter by their own orders)
    const allCustomers = this.clients.filter(c => c.type === 'customer');
    allCustomers.forEach(client => {
      this.sendEvent(client.response, 'ORDER_UPDATE', order);
    });
  }

  // Send an SSE event to a specific client
  private sendEvent(response: Response, eventType: string, data: any) {
    try {
      response.write(`event: ${eventType}\n`);
      response.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('Error sending SSE event:', error);
    }
  }

  // Send heartbeat to keep connections alive
  sendHeartbeat() {
    this.clients.forEach(client => {
      try {
        client.response.write(`:heartbeat\n\n`);
      } catch (error) {
        // Client probably disconnected
        this.removeClient(client.id);
      }
    });
  }

  // Get connected client count
  getClientCount() {
    return {
      total: this.clients.length,
      cashiers: this.clients.filter(c => c.type === 'cashier').length,
      customers: this.clients.filter(c => c.type === 'customer').length
    };
  }
}

// Singleton instance
export const orderEventEmitter = new OrderEventEmitter();

// Heartbeat interval to keep SSE connections alive
setInterval(() => {
  orderEventEmitter.sendHeartbeat();
}, 30000); // Every 30 seconds
