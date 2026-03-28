/**
 * Add-ons & Variants Type Definitions
 * 
 * DESIGN PRINCIPLES:
 * - Add-ons and variants are ADDITIVE features
 * - They do NOT affect mood scoring or recommendations
 * - They are only visible after a base item is selected
 * - Existing orders/analytics remain fully functional
 */

import { menu_item_type } from '../../generated/prisma/client.js';

// ============================================================================
// VARIANTS
// ============================================================================

export interface CreateVariantDTO {
  menuItemId: string;
  name: string;          // e.g., "Small", "Medium", "Large", "Hot", "Iced"
  priceDelta: number;    // Price adjustment from base (can be negative)
  isDefault?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateVariantDTO {
  name?: string;
  priceDelta?: number;
  isDefault?: boolean;
  sortOrder?: number;
  isActive?: boolean;
  outOfStock?: boolean;
}

export interface VariantResponse {
  id: string;
  menuItemId: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ADD-ONS (Menu Item Add-on Definitions)
// ============================================================================

export interface CreateMenuItemAddonDTO {
  baseItemId: string;    // The base menu item that allows this add-on
  addonItemId: string;   // The add-on menu item (must have itemType = ADDON)
  maxQuantity?: number;  // Max quantity allowed per order item
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateMenuItemAddonDTO {
  maxQuantity?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface MenuItemAddonResponse {
  id: string;
  baseItemId: string;
  addonItemId: string;
  maxQuantity: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  addon_item?: {
    id: string;
    name: string;
    price: number;
    image: string | null;
    description: string | null;
  };
}

// ============================================================================
// ORDER ITEM ADD-ONS (Selected add-ons for an order)
// ============================================================================

export interface CreateOrderItemAddonDTO {
  orderItemId: string;
  addonItemId: string;
  quantity: number;
  unitPrice: number;     // Price at time of order
}

export interface OrderItemAddonResponse {
  id: string;
  orderItemId: string;
  addonItemId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt: Date;
  addon_item?: {
    id: string;
    name: string;
    price: number;
    image: string | null;
  };
}

// ============================================================================
// EXTENDED ORDER ITEM (with variant and add-ons)
// ============================================================================

export interface OrderItemWithAddonsDTO {
  menuItemId: string;
  quantity: number;
  price: number;         // Base item price
  variantId?: string;    // Selected variant ID
  variantPriceDelta?: number; // Variant price adjustment
  notes?: string;        // Special instructions
  addons?: Array<{
    addonItemId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

// ============================================================================
// ADD-ON MENU ITEM CREATION (for creating add-on type items)
// ============================================================================

export interface CreateAddonMenuItemDTO {
  name: string;
  categoryId: string;    // Add-ons should have their own category
  price: number;
  cost?: number;
  image?: string;
  description?: string;
  available?: boolean;
  prepTime?: number;
  // itemType will be automatically set to ADDON
}

// ============================================================================
// QUERY FILTERS
// ============================================================================

export interface MenuItemFiltersExtended {
  categoryId?: string;
  available?: boolean;
  featured?: boolean;
  search?: string;
  itemType?: menu_item_type;         // Filter by item type
  excludeAddons?: boolean;           // Exclude ADDON items from results
  includeVariants?: boolean;         // Include variants in response
  includeAllowedAddons?: boolean;    // Include allowed add-ons in response
}

// ============================================================================
// PRICING CALCULATION HELPERS
// ============================================================================

/**
 * Calculate order item subtotal with variants and add-ons
 * Formula: (basePrice + variantDelta + SUM(addon.price * addon.qty)) * quantity
 */
export interface OrderItemPriceCalculation {
  basePrice: number;
  variantPriceDelta: number;
  addons: Array<{
    unitPrice: number;
    quantity: number;
  }>;
  quantity: number;
}

export function calculateOrderItemSubtotal(calc: OrderItemPriceCalculation): number {
  const addonTotal = calc.addons.reduce(
    (sum, addon) => sum + (addon.unitPrice * addon.quantity),
    0
  );
  const unitPrice = calc.basePrice + calc.variantPriceDelta + addonTotal;
  return unitPrice * calc.quantity;
}

// ============================================================================
// RESPONSE TYPES FOR API
// ============================================================================

export interface MenuItemWithAddonsResponse {
  id: string;
  name: string;
  price: number;
  cost: number | null;
  image: string | null;
  description: string | null;
  available: boolean;
  featured: boolean;
  prepTime: number | null;
  itemType: menu_item_type;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    displayName: string;
  };
  variants?: VariantResponse[];
  allowed_addons?: Array<{
    id: string;
    maxQuantity: number;
    sortOrder: number;
    addon_item: {
      id: string;
      name: string;
      price: number;
      image: string | null;
      description: string | null;
    };
  }>;
  createdAt: Date;
  updatedAt: Date;
}
