export interface OrderItemDTO {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  price: number;
  subtotal: number;
  variantId?: string | null;     // NEW: Selected variant
  notes?: string | null;          // NEW: Special instructions
  createdAt: string;
  updatedAt: string;
  // NEW: Selected add-ons for this item
  order_item_addons?: Array<{
    id: string;
    addonItemId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED' | 'COMPLIMENTARY' | 'WRITTEN_OFF' | 'VOIDED';
export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface OrderDTO {
  id: string;
  orderNumber: string;
  customerName: string | null;
  tableNumber: string | null;
  orderType: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  status: OrderStatus;
  subtotal: number;
  tax: number;
  totalAmount: number;
  discountAmount: number;
  deliveryFee: number;
  serviceFee: number;
  cashReceived: number | null;
  changeAmount: number | null;
  paymentMethod: string | null;
  paymentStatus: PaymentStatus;
  linkedOrderId: string | null;
  createdBy: string | null;
  processedBy: string | null;
  deviceId: string | null;
  notes: string | null;
  authorizedBy: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  paidAt: string | null;
  order_items: OrderItemDTO[];
}

// NEW: Order item with variants and add-ons for creating orders
export interface CreateOrderItemWithAddons {
  menuItemId: string;
  quantity: number;
  price: number;
  variantId?: string;           // Selected variant ID
  variantPriceDelta?: number;   // Variant price adjustment
  notes?: string;               // Special instructions
  addons?: Array<{
    addonItemId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface CreateOrderDTO {
  customerName?: string;
  tableNumber?: string;
  orderType?: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  linkedOrderId?: string; // Link to original order when reordering
  createdBy?: string; // User ID who created the order
  deviceId?: string; // Device ID for guest order tracking
  deliveryFee?: number;
  serviceFee?: number;
  discountAmount?: number;
  items: Array<{
    menuItemId: string;
    quantity: number;
    price: number;
    variantId?: string;         // NEW: Selected variant
    variantPriceDelta?: number; // NEW: Variant price adjustment
    notes?: string;             // NEW: Special instructions
    addons?: Array<{            // NEW: Selected add-ons
      addonItemId: string;
      quantity: number;
      unitPrice: number;
    }>;
  }>;
  paymentMethod?: string;
}

export interface UpdateOrderDTO {
  customerName?: string;
  tableNumber?: string;
  orderType?: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  status?: OrderStatus;
  paymentMethod?: string;
  paymentStatus?: PaymentStatus;
  processedBy?: string | null;
  discountAmount?: number;
  deliveryFee?: number;
  serviceFee?: number;
  cashReceived?: number | null;
  changeAmount?: number | null;
  notes?: string | null;
  authorizedBy?: string | null;
  paidAt?: string | null;
}
