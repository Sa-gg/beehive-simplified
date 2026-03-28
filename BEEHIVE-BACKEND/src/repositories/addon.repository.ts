/**
 * Add-ons & Variants Repository
 * 
 * Handles database operations for:
 * - menu_item_variants (size/temperature options)
 * - menu_item_addons (allowed add-ons per base item)
 * - order_item_addons (selected add-ons per order item)
 * 
 * IMPORTANT: This is ADDITIVE functionality.
 * Existing orders without variants/add-ons continue to work unchanged.
 */

import { PrismaClient, menu_item_type } from '../../generated/prisma/client.js';
import { randomUUID } from 'crypto';
import type {
  CreateVariantDTO,
  UpdateVariantDTO,
  CreateMenuItemAddonDTO,
  UpdateMenuItemAddonDTO,
  CreateOrderItemAddonDTO,
} from '../types/addon.types.js';

export class AddonRepository {
  constructor(private prisma: PrismaClient) {}

  // ============================================================================
  // VARIANTS
  // ============================================================================

  async createVariant(data: CreateVariantDTO) {
    // If this is being set as default, unset other defaults first
    if (data.isDefault) {
      await this.prisma.menu_item_variants.updateMany({
        where: { menuItemId: data.menuItemId, isDefault: true },
        data: { isDefault: false, updatedAt: new Date() }
      });
    }

    return this.prisma.menu_item_variants.create({
      data: {
        id: randomUUID(),
        menuItemId: data.menuItemId,
        name: data.name,
        priceDelta: data.priceDelta,
        isDefault: data.isDefault ?? false,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        updatedAt: new Date()
      }
    });
  }

  async updateVariant(id: string, data: UpdateVariantDTO) {
    // If setting as default, get the menuItemId first and unset other defaults
    if (data.isDefault) {
      const variant = await this.prisma.menu_item_variants.findUnique({
        where: { id },
        select: { menuItemId: true }
      });
      if (variant) {
        await this.prisma.menu_item_variants.updateMany({
          where: { menuItemId: variant.menuItemId, isDefault: true, id: { not: id } },
          data: { isDefault: false, updatedAt: new Date() }
        });
      }
    }

    return this.prisma.menu_item_variants.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  async deleteVariant(id: string) {
    return this.prisma.menu_item_variants.delete({
      where: { id }
    });
  }

  async getVariantsByMenuItem(menuItemId: string, activeOnly = true) {
    return this.prisma.menu_item_variants.findMany({
      where: {
        menuItemId,
        ...(activeOnly ? { isActive: true } : {})
      },
      orderBy: { sortOrder: 'asc' }
    });
  }

  async getVariantById(id: string) {
    return this.prisma.menu_item_variants.findUnique({
      where: { id }
    });
  }

  // ============================================================================
  // MENU ITEM ADD-ONS (Link base items to allowed add-ons)
  // ============================================================================

  async createMenuItemAddon(data: CreateMenuItemAddonDTO) {
    // Verify the addon item exists and has itemType = ADDON
    const addonItem = await this.prisma.menu_items.findUnique({
      where: { id: data.addonItemId },
      select: { id: true, itemType: true, name: true }
    });

    if (!addonItem) {
      throw new Error(`Add-on menu item not found: ${data.addonItemId}`);
    }

    if (addonItem.itemType !== 'ADDON') {
      throw new Error(`Menu item "${addonItem.name}" is not an ADDON type. Only ADDON items can be linked as add-ons.`);
    }

    return this.prisma.menu_item_addons.create({
      data: {
        id: randomUUID(),
        baseItemId: data.baseItemId,
        addonItemId: data.addonItemId,
        maxQuantity: data.maxQuantity ?? 5,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        updatedAt: new Date()
      },
      include: {
        addon_item: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
            description: true
          }
        }
      }
    });
  }

  async updateMenuItemAddon(id: string, data: UpdateMenuItemAddonDTO) {
    return this.prisma.menu_item_addons.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        addon_item: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
            description: true
          }
        }
      }
    });
  }

  async deleteMenuItemAddon(id: string) {
    return this.prisma.menu_item_addons.delete({
      where: { id }
    });
  }

  async getAddonsByBaseItem(baseItemId: string, activeOnly = true) {
    return this.prisma.menu_item_addons.findMany({
      where: {
        baseItemId,
        ...(activeOnly ? { isActive: true } : {})
      },
      include: {
        addon_item: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
            description: true,
            available: true
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
  }

  // Get all base items that allow a specific add-on
  async getBaseItemsForAddon(addonItemId: string) {
    return this.prisma.menu_item_addons.findMany({
      where: {
        addonItemId,
        isActive: true
      },
      include: {
        base_item: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
            categoryId: true
          }
        }
      }
    });
  }

  // ============================================================================
  // ORDER ITEM ADD-ONS (Track selected add-ons per order item)
  // ============================================================================

  async createOrderItemAddon(data: CreateOrderItemAddonDTO) {
    return this.prisma.order_item_addons.create({
      data: {
        id: randomUUID(),
        orderItemId: data.orderItemId,
        addonItemId: data.addonItemId,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        subtotal: data.unitPrice * data.quantity
      }
    });
  }

  async createOrderItemAddons(addons: CreateOrderItemAddonDTO[]) {
    return this.prisma.order_item_addons.createMany({
      data: addons.map(addon => ({
        id: randomUUID(),
        orderItemId: addon.orderItemId,
        addonItemId: addon.addonItemId,
        quantity: addon.quantity,
        unitPrice: addon.unitPrice,
        subtotal: addon.unitPrice * addon.quantity
      }))
    });
  }

  async getAddonsByOrderItem(orderItemId: string) {
    return this.prisma.order_item_addons.findMany({
      where: { orderItemId }
    });
  }

  async deleteOrderItemAddons(orderItemId: string) {
    return this.prisma.order_item_addons.deleteMany({
      where: { orderItemId }
    });
  }

  // ============================================================================
  // ADD-ON MENU ITEMS (CRUD for items with itemType = ADDON)
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
    return this.prisma.menu_items.create({
      data: {
        id: randomUUID(),
        name: data.name,
        categoryId: data.categoryId,
        price: data.price,
        cost: data.cost ?? 0,
        image: data.image,
        description: data.description,
        available: data.available ?? true,
        featured: false,  // Add-ons should never be featured
        prepTime: data.prepTime ?? 2,
        itemType: 'ADDON',
        updatedAt: new Date()
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      }
    });
  }

  async getAllAddonMenuItems(activeOnly = true) {
    return this.prisma.menu_items.findMany({
      where: {
        itemType: 'ADDON',
        ...(activeOnly ? { available: true } : {})
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  // ============================================================================
  // EXTENDED MENU ITEM QUERIES (with variants and add-ons)
  // ============================================================================

  async getMenuItemWithAddons(menuItemId: string) {
    return this.prisma.menu_items.findUnique({
      where: { id: menuItemId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        },
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
        allowed_addons: {
          where: { isActive: true },
          include: {
            addon_item: {
              select: {
                id: true,
                name: true,
                price: true,
                image: true,
                description: true,
                available: true
              }
            }
          },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
  }

  /**
   * Get menu items for customer browsing.
   * CRITICAL: This excludes ADDON items from main browsing UNLESS they have showInMenu=true.
   * Add-ons are only shown after selecting a base item, unless they're marked to show in menu.
   */
  async getMenuItemsForBrowsing(filters?: {
    categoryId?: string;
    available?: boolean;
    featured?: boolean;
    search?: string;
  }) {
    const where: any = {
      // CRITICAL: Exclude ADDON items unless they have showInMenu=true
      OR: [
        { itemType: { not: 'ADDON' } },
        { itemType: 'ADDON', showInMenu: true }
      ]
    };

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.available !== undefined) {
      where.available = filters.available;
    }

    if (filters?.featured !== undefined) {
      where.featured = filters.featured;
    }

    if (filters?.search) {
      where.AND = [
        {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } }
          ]
        }
      ];
    }

    return this.prisma.menu_items.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        },
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
        allowed_addons: {
          where: { isActive: true },
          include: {
            addon_item: {
              select: {
                id: true,
                name: true,
                price: true,
                image: true,
                description: true,
                available: true
              }
            }
          },
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: [
        { featured: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  /**
   * Get menu items for mood recommendations.
   * CRITICAL: Only BASE items are considered for mood scoring.
   * DRINK items may be included if they have mood benefits.
   */
  async getMenuItemsForMoodRecommendations(filters?: {
    categoryId?: string;
    available?: boolean;
  }) {
    const where: any = {
      // CRITICAL: Only BASE items for mood recommendations
      itemType: 'BASE',
      available: true
    };

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    return this.prisma.menu_items.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      },
      orderBy: [
        { featured: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  async bulkLinkAddonsToBaseItem(baseItemId: string, addonItemIds: string[]) {
    // Verify all add-on items exist and are ADDON type
    const addonItems = await this.prisma.menu_items.findMany({
      where: {
        id: { in: addonItemIds },
        itemType: 'ADDON'
      },
      select: { id: true }
    });

    const validAddonIds = addonItems.map(a => a.id);
    const invalidIds = addonItemIds.filter(id => !validAddonIds.includes(id));

    if (invalidIds.length > 0) {
      throw new Error(`Invalid or non-ADDON items: ${invalidIds.join(', ')}`);
    }

    // Create links (skip duplicates)
    const results = await Promise.all(
      validAddonIds.map(async (addonItemId, index) => {
        try {
          return await this.prisma.menu_item_addons.upsert({
            where: {
              baseItemId_addonItemId: {
                baseItemId,
                addonItemId
              }
            },
            create: {
              id: randomUUID(),
              baseItemId,
              addonItemId,
              sortOrder: index,
              updatedAt: new Date()
            },
            update: {
              isActive: true,
              updatedAt: new Date()
            }
          });
        } catch (e) {
          return null;
        }
      })
    );

    return results.filter(Boolean);
  }

  async bulkCreateVariants(menuItemId: string, variants: Array<{
    name: string;
    priceDelta: number;
    isDefault?: boolean;
  }>) {
    // Ensure only one default
    const hasDefault = variants.some(v => v.isDefault);
    let defaultSet = false;

    return this.prisma.menu_item_variants.createMany({
      data: variants.map((v, index) => ({
        id: randomUUID(),
        menuItemId,
        name: v.name,
        priceDelta: v.priceDelta,
        isDefault: hasDefault ? (v.isDefault && !defaultSet ? (defaultSet = true, true) : false) : index === 0,
        sortOrder: index,
        updatedAt: new Date()
      }))
    });
  }

  // ============================================================================
  // INVENTORY DEDUCTION HELPERS
  // ============================================================================

  /**
   * Get ingredients for an order item including add-on ingredients.
   * Used for inventory deduction when order is placed.
   */
  async getIngredientsForOrderItem(orderItemId: string) {
    const orderItem = await this.prisma.order_items.findUnique({
      where: { id: orderItemId },
      include: {
        menu_items: {
          include: {
            menu_item_ingredients: {
              include: {
                inventory_item: true
              }
            }
          }
        },
        order_item_addons: true
      }
    });

    if (!orderItem) return [];

    const ingredients: Array<{
      inventoryItemId: string;
      inventoryItemName: string;
      quantity: number;
      source: 'base' | 'addon';
    }> = [];

    // Base item ingredients (multiply by order quantity)
    for (const ing of orderItem.menu_items.menu_item_ingredients) {
      ingredients.push({
        inventoryItemId: ing.inventoryItemId,
        inventoryItemName: ing.inventory_item.name,
        quantity: ing.quantity * orderItem.quantity,
        source: 'base'
      });
    }

    // Add-on ingredients (multiply by addon quantity * order quantity)
    for (const addon of orderItem.order_item_addons) {
      const addonItem = await this.prisma.menu_items.findUnique({
        where: { id: addon.addonItemId },
        include: {
          menu_item_ingredients: {
            include: {
              inventory_item: true
            }
          }
        }
      });

      if (addonItem) {
        for (const ing of addonItem.menu_item_ingredients) {
          ingredients.push({
            inventoryItemId: ing.inventoryItemId,
            inventoryItemName: ing.inventory_item.name,
            quantity: ing.quantity * addon.quantity * orderItem.quantity,
            source: 'addon'
          });
        }
      }
    }

    return ingredients;
  }
}
