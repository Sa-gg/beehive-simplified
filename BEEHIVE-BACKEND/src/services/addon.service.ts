/**
 * Add-ons & Variants Service
 * 
 * Business logic for:
 * - Managing variants (size/temperature options)
 * - Managing add-ons (extra items)
 * - Price calculations with variants and add-ons
 * 
 * SAFETY GUARANTEES:
 * - Add-ons never appear in main menu browsing
 * - Add-ons never affect mood scoring/recommendations
 * - Existing orders without add-ons continue working
 */

import { PrismaClient } from '../../generated/prisma/client.js';
import { AddonRepository } from '../repositories/addon.repository.js';
import type {
  CreateVariantDTO,
  UpdateVariantDTO,
  CreateMenuItemAddonDTO,
  UpdateMenuItemAddonDTO,
  OrderItemPriceCalculation,
  calculateOrderItemSubtotal,
} from '../types/addon.types.js';

export class AddonService {
  private addonRepo: AddonRepository;

  constructor(private prisma: PrismaClient) {
    this.addonRepo = new AddonRepository(prisma);
  }

  // ============================================================================
  // VARIANTS
  // ============================================================================

  async createVariant(data: CreateVariantDTO) {
    // Verify base item exists and is not an ADDON
    const menuItem = await this.prisma.menu_items.findUnique({
      where: { id: data.menuItemId },
      select: { id: true, name: true, itemType: true }
    });

    if (!menuItem) {
      throw new Error(`Menu item not found: ${data.menuItemId}`);
    }

    if (menuItem.itemType === 'ADDON') {
      throw new Error(`Cannot add variants to add-on items. "${menuItem.name}" is an add-on.`);
    }

    return this.addonRepo.createVariant(data);
  }

  async updateVariant(id: string, data: UpdateVariantDTO) {
    return this.addonRepo.updateVariant(id, data);
  }

  async deleteVariant(id: string) {
    // Check if any orders reference this variant
    const ordersWithVariant = await this.prisma.order_items.count({
      where: { variantId: id }
    });

    if (ordersWithVariant > 0) {
      // Soft delete by setting isActive = false
      return this.addonRepo.updateVariant(id, { isActive: false });
    }

    return this.addonRepo.deleteVariant(id);
  }

  async getVariantsByMenuItem(menuItemId: string, includeInactive = false) {
    return this.addonRepo.getVariantsByMenuItem(menuItemId, !includeInactive);
  }

  async getVariantById(id: string) {
    return this.addonRepo.getVariantById(id);
  }

  // ============================================================================
  // MENU ITEM ADD-ONS (Define what add-ons are allowed for each base item)
  // ============================================================================

  async linkAddonToBaseItem(data: CreateMenuItemAddonDTO) {
    // Verify base item exists and is not itself an ADDON
    const baseItem = await this.prisma.menu_items.findUnique({
      where: { id: data.baseItemId },
      select: { id: true, name: true, itemType: true }
    });

    if (!baseItem) {
      throw new Error(`Base menu item not found: ${data.baseItemId}`);
    }

    if (baseItem.itemType === 'ADDON') {
      throw new Error(`Cannot add add-ons to an add-on item. "${baseItem.name}" is an add-on.`);
    }

    return this.addonRepo.createMenuItemAddon(data);
  }

  async updateMenuItemAddon(id: string, data: UpdateMenuItemAddonDTO) {
    return this.addonRepo.updateMenuItemAddon(id, data);
  }

  async unlinkAddonFromBaseItem(id: string) {
    return this.addonRepo.deleteMenuItemAddon(id);
  }

  async getAddonsForBaseItem(baseItemId: string, includeInactive = false) {
    return this.addonRepo.getAddonsByBaseItem(baseItemId, !includeInactive);
  }

  async bulkLinkAddons(baseItemId: string, addonItemIds: string[]) {
    return this.addonRepo.bulkLinkAddonsToBaseItem(baseItemId, addonItemIds);
  }

  // ============================================================================
  // ADD-ON MENU ITEMS (The actual add-on products)
  // ============================================================================

  async createAddonMenuItem(data: {
    name: string;
    categoryId: string;
    price: number;
    cost?: number;
    image?: string;
    description?: string;
    available?: boolean;
    prepTime?: number;
  }) {
    return this.addonRepo.createAddonMenuItem(data);
  }

  async getAllAddonMenuItems(includeUnavailable = false) {
    return this.addonRepo.getAllAddonMenuItems(!includeUnavailable);
  }

  // ============================================================================
  // EXTENDED MENU ITEM QUERIES
  // ============================================================================

  async getMenuItemWithAddonsAndVariants(menuItemId: string) {
    return this.addonRepo.getMenuItemWithAddons(menuItemId);
  }

  /**
   * Get menu items for customer browsing.
   * EXCLUDES add-on items - they're only shown after selecting a base item.
   */
  async getMenuItemsForBrowsing(filters?: {
    categoryId?: string;
    available?: boolean;
    featured?: boolean;
    search?: string;
  }) {
    return this.addonRepo.getMenuItemsForBrowsing(filters);
  }

  /**
   * Get menu items for mood recommendations.
   * ONLY includes BASE items - add-ons don't participate in mood system.
   */
  async getMenuItemsForMoodRecommendations(filters?: {
    categoryId?: string;
    available?: boolean;
  }) {
    return this.addonRepo.getMenuItemsForMoodRecommendations(filters);
  }

  // ============================================================================
  // PRICE CALCULATION
  // ============================================================================

  /**
   * Calculate the total price for an order item including variant and add-ons.
   * Formula: (basePrice + variantDelta + SUM(addon.price * addon.qty)) * quantity
   */
  calculateOrderItemSubtotal(params: {
    basePrice: number;
    variantPriceDelta?: number;
    addons?: Array<{ unitPrice: number; quantity: number }>;
    quantity: number;
  }): number {
    const addonTotal = (params.addons || []).reduce(
      (sum, addon) => sum + (addon.unitPrice * addon.quantity),
      0
    );
    const unitPrice = params.basePrice + (params.variantPriceDelta || 0) + addonTotal;
    return unitPrice * params.quantity;
  }

  /**
   * Validate and get pricing for order items with variants and add-ons.
   * Returns validated items with calculated prices.
   */
  async validateAndPriceOrderItems(items: Array<{
    menuItemId: string;
    quantity: number;
    variantId?: string;
    addons?: Array<{ addonItemId: string; quantity: number }>;
  }>) {
    const pricedItems = [];

    for (const item of items) {
      // Get base item
      const menuItem = await this.prisma.menu_items.findUnique({
        where: { id: item.menuItemId },
        select: { id: true, name: true, price: true, itemType: true, available: true }
      });

      if (!menuItem) {
        throw new Error(`Menu item not found: ${item.menuItemId}`);
      }

      if (!menuItem.available) {
        throw new Error(`Menu item "${menuItem.name}" is not available`);
      }

      if (menuItem.itemType === 'ADDON') {
        throw new Error(`Cannot order add-on "${menuItem.name}" directly. Add-ons must be attached to a base item.`);
      }

      let variantPriceDelta = 0;
      let variantName: string | null = null;

      // Validate variant if provided
      if (item.variantId) {
        const variant = await this.prisma.menu_item_variants.findUnique({
          where: { id: item.variantId }
        });

        if (!variant) {
          throw new Error(`Variant not found: ${item.variantId}`);
        }

        if (variant.menuItemId !== item.menuItemId) {
          throw new Error(`Variant "${variant.name}" does not belong to this menu item`);
        }

        if (!variant.isActive) {
          throw new Error(`Variant "${variant.name}" is not available`);
        }

        variantPriceDelta = variant.priceDelta;
        variantName = variant.name;
      }

      // Validate and price add-ons
      const pricedAddons = [];
      if (item.addons && item.addons.length > 0) {
        // Get allowed add-ons for this base item
        const allowedAddons = await this.addonRepo.getAddonsByBaseItem(item.menuItemId, true);
        const allowedAddonIds = allowedAddons.map(a => a.addonItemId);

        for (const addon of item.addons) {
          if (!allowedAddonIds.includes(addon.addonItemId)) {
            throw new Error(`Add-on "${addon.addonItemId}" is not allowed for "${menuItem.name}"`);
          }

          const allowedAddon = allowedAddons.find(a => a.addonItemId === addon.addonItemId);
          if (addon.quantity > (allowedAddon?.maxQuantity || 5)) {
            throw new Error(`Add-on quantity exceeds maximum allowed (${allowedAddon?.maxQuantity || 5})`);
          }

          const addonItem = await this.prisma.menu_items.findUnique({
            where: { id: addon.addonItemId },
            select: { id: true, name: true, price: true, available: true }
          });

          if (!addonItem || !addonItem.available) {
            throw new Error(`Add-on "${addon.addonItemId}" is not available`);
          }

          pricedAddons.push({
            addonItemId: addon.addonItemId,
            addonName: addonItem.name,
            quantity: addon.quantity,
            unitPrice: addonItem.price,
            subtotal: addonItem.price * addon.quantity
          });
        }
      }

      const addonTotal = pricedAddons.reduce((sum, a) => sum + a.subtotal, 0);
      const unitPrice = menuItem.price + variantPriceDelta + addonTotal;
      const subtotal = unitPrice * item.quantity;

      pricedItems.push({
        menuItemId: item.menuItemId,
        menuItemName: menuItem.name,
        basePrice: menuItem.price,
        quantity: item.quantity,
        variantId: item.variantId || null,
        variantName,
        variantPriceDelta,
        addons: pricedAddons,
        addonTotal,
        unitPrice,
        subtotal
      });
    }

    return pricedItems;
  }

  // ============================================================================
  // BULK VARIANT CREATION
  // ============================================================================

  async createVariantsForMenuItem(menuItemId: string, variants: Array<{
    name: string;
    priceDelta: number;
    isDefault?: boolean;
  }>) {
    // Verify menu item exists and is not an ADDON
    const menuItem = await this.prisma.menu_items.findUnique({
      where: { id: menuItemId },
      select: { id: true, name: true, itemType: true }
    });

    if (!menuItem) {
      throw new Error(`Menu item not found: ${menuItemId}`);
    }

    if (menuItem.itemType === 'ADDON') {
      throw new Error(`Cannot add variants to add-on items`);
    }

    return this.addonRepo.bulkCreateVariants(menuItemId, variants);
  }

  // ============================================================================
  // INVENTORY HELPERS
  // ============================================================================

  async getIngredientsForOrderItem(orderItemId: string) {
    return this.addonRepo.getIngredientsForOrderItem(orderItemId);
  }
}
