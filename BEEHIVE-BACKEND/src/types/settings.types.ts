export interface SettingsDTO {
  openTime: string; // Format: "HH:MM" (24-hour)
  closeTime: string; // Format: "HH:MM" (24-hour)
  lastResetDate: string | null; // ISO date string of last reset
  managerPin?: string; // 4-digit manager PIN for authorization
  
  // Auto-stock management settings
  autoOutOfStockWhenIngredientsRunOut: boolean; // Auto mark menu items as out of stock when ingredients are depleted
  autoMarkInStockWhenAvailable: boolean; // Auto mark menu items as in-stock when ingredients become available
  
  // Payment settings
  cashChangeEnabled: boolean; // Show cash/change modal when marking CASH orders as paid
  
  // Printing settings
  printKitchenCopy: boolean; // Print extra receipt for kitchen
  printKitchenCopyForOpenTab: boolean; // Print kitchen copy when clicking Open Tab button
  
  // Experimental features
  linkedOrdersEnabled: boolean; // Enable linked orders feature
  
  // Order permissions
  allowVoidOrderItem: boolean; // Allow voiding individual order items
  
  // Cashier permissions (whether actions require manager PIN)
  cashierCanVoidWithoutPin: boolean;
  cashierCanRefundWithoutPin: boolean;
  cashierCanComplimentaryWithoutPin: boolean;
  cashierCanWriteOffWithoutPin: boolean;
  cashierCanVoidAndReorderWithoutPin: boolean;
  
  // Cashier POS permissions
  cashierCanApplyServiceAmount: boolean;
  cashierCanApplyDiscount: boolean;
  cashierCanApplyDeliveryAmount: boolean;
}

// Response type that excludes sensitive fields
export interface PublicSettingsDTO extends Omit<SettingsDTO, 'managerPin'> {}

