import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export interface MenuItemIngredientDTO {
  menuItemId: string;
  inventoryItemId: string;
  quantity: number;
  variantId?: string | null;  // Optional: if provided, applies to specific variant only
}

export class RecipeService {
  /**
   * Add an ingredient to a menu item recipe (or variant-specific recipe)
   */
  async addIngredient(data: MenuItemIngredientDTO) {
    // Validate quantity
    if (data.quantity <= 0) {
      throw new Error('Ingredient quantity must be greater than 0');
    }

    // Check if menu item exists
    const menuItem = await prisma.menu_items.findUnique({
      where: { id: data.menuItemId },
    });
    if (!menuItem) {
      throw new Error(`Menu item ${data.menuItemId} not found`);
    }

    // Check if inventory item exists
    const inventoryItem = await prisma.inventory_items.findUnique({
      where: { id: data.inventoryItemId },
    });
    if (!inventoryItem) {
      throw new Error(`Inventory item ${data.inventoryItemId} not found`);
    }

    // If variantId is provided, verify it exists and belongs to this menu item
    if (data.variantId) {
      const variant = await prisma.menu_item_variants.findUnique({
        where: { id: data.variantId },
      });
      if (!variant) {
        throw new Error(`Variant ${data.variantId} not found`);
      }
      if (variant.menuItemId !== data.menuItemId) {
        throw new Error(`Variant ${data.variantId} does not belong to menu item ${data.menuItemId}`);
      }
    }

    // Create or update ingredient (with variant support)
    // Note: Prisma doesn't support null in composite unique constraint for upsert,
    // so we need to use findFirst + create/update instead
    const variantId = data.variantId || null;
    
    // Check if ingredient already exists
    const existingIngredient = await prisma.menu_item_ingredients.findFirst({
      where: {
        menuItemId: data.menuItemId,
        inventoryItemId: data.inventoryItemId,
        variantId: variantId,
      },
    });

    const includeOptions = {
      menu_item: {
        select: {
          name: true,
          category: true,
        },
      },
      inventory_item: {
        select: {
          name: true,
          unit: true,
          currentStock: true,
        },
      },
      variant: {
        select: {
          id: true,
          name: true,
        },
      },
    };

    if (existingIngredient) {
      // Update existing ingredient
      return prisma.menu_item_ingredients.update({
        where: { id: existingIngredient.id },
        data: {
          quantity: data.quantity,
          updatedAt: new Date(),
        },
        include: includeOptions,
      });
    } else {
      // Create new ingredient
      return prisma.menu_item_ingredients.create({
        data: {
          id: `mii_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          menuItemId: data.menuItemId,
          inventoryItemId: data.inventoryItemId,
          variantId: variantId,
          quantity: data.quantity,
          updatedAt: new Date(),
        },
        include: includeOptions,
      });
    }
  }

  /**
   * Remove an ingredient from a menu item recipe (or variant-specific recipe)
   */
  async removeIngredient(menuItemId: string, inventoryItemId: string, variantId?: string | null) {
    // Use deleteMany instead of delete with compound key because Prisma's compound unique
    // key lookup doesn't support null values (needed for base product ingredients)
    const result = await prisma.menu_item_ingredients.deleteMany({
      where: {
        menuItemId,
        inventoryItemId,
        variantId: variantId || null,
      },
    });
    
    if (result.count === 0) {
      throw new Error('Ingredient not found in recipe');
    }
  }

  /**
   * Get all ingredients for a menu item (optionally filtered by variant)
   * If variantId is provided, returns only variant-specific ingredients
   * If variantId is null/undefined, returns base product ingredients (where variantId is null)
   * If includeAll is true, returns all ingredients regardless of variant
   */
  async getRecipe(menuItemId: string, variantId?: string | null, includeAll?: boolean) {
    let whereClause: any = { menuItemId };
    
    if (!includeAll) {
      if (variantId) {
        whereClause.variantId = variantId;
      } else {
        whereClause.variantId = null;
      }
    }
    
    return prisma.menu_item_ingredients.findMany({
      where: whereClause,
      include: {
        inventory_item: {
          select: {
            id: true,
            name: true,
            unit: true,
            currentStock: true,
            minStock: true,
            status: true,
            category: true,
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        inventory_item: {
          name: 'asc',
        },
      },
    });
  }

  /**
   * Get effective recipe for a menu item with optional variant
   * Returns base ingredients + variant-specific ingredients (variant overrides base)
   */
  async getEffectiveRecipe(menuItemId: string, variantId?: string | null) {
    // Get base ingredients (variantId = null)
    const baseIngredients = await prisma.menu_item_ingredients.findMany({
      where: { 
        menuItemId,
        variantId: null,
      },
      include: {
        inventory_item: {
          select: {
            id: true,
            name: true,
            unit: true,
            currentStock: true,
            minStock: true,
            status: true,
            category: true,
          },
        },
      },
    });

    if (!variantId) {
      return baseIngredients;
    }

    // Get variant-specific ingredients
    const variantIngredients = await prisma.menu_item_ingredients.findMany({
      where: { 
        menuItemId,
        variantId,
      },
      include: {
        inventory_item: {
          select: {
            id: true,
            name: true,
            unit: true,
            currentStock: true,
            minStock: true,
            status: true,
            category: true,
          },
        },
      },
    });

    // Merge: variant ingredients override base ingredients with same inventory item
    const variantInventoryIds = new Set(variantIngredients.map(vi => vi.inventoryItemId));
    
    // Base ingredients that are NOT overridden by variant
    const nonOverriddenBase = baseIngredients.filter(bi => !variantInventoryIds.has(bi.inventoryItemId));
    
    // Combine: non-overridden base + all variant ingredients
    return [...nonOverriddenBase, ...variantIngredients];
  }

  /**
   * Get all menu items that use a specific inventory item
   */
  async getMenuItemsUsingIngredient(inventoryItemId: string) {
    const ingredients = await prisma.menu_item_ingredients.findMany({
      where: { inventoryItemId },
      include: {
        menu_item: {
          select: {
            id: true,
            name: true,
            category: true,
            available: true,
          },
        },
      },
      orderBy: {
        menu_item: {
          name: 'asc',
        },
      },
    });
    
    // Return just the menu items (flattened from the nested structure)
    return ingredients.map(ing => ing.menu_item);
  }

  /**
   * Check if a menu item can be prepared based on current inventory
   */
  async checkMenuItemAvailability(menuItemId: string): Promise<{
    available: boolean;
    missingIngredients: Array<{
      name: string;
      required: number;
      available: number;
      unit: string;
    }>;
  }> {
    const ingredients = await prisma.menu_item_ingredients.findMany({
      where: { menuItemId },
      include: {
        inventory_item: true,
      },
    });

    const missingIngredients: Array<{
      name: string;
      required: number;
      available: number;
      unit: string;
    }> = [];

    for (const ingredient of ingredients) {
      if (ingredient.inventory_item.currentStock < ingredient.quantity) {
        missingIngredients.push({
          name: ingredient.inventory_item.name,
          required: ingredient.quantity,
          available: ingredient.inventory_item.currentStock,
          unit: ingredient.inventory_item.unit,
        });
      }
    }

    return {
      available: missingIngredients.length === 0,
      missingIngredients,
    };
  }

  /**
   * Calculate total cost of ingredients for a menu item
   */
  async calculateMenuItemCost(menuItemId: string): Promise<number> {
    const ingredients = await prisma.menu_item_ingredients.findMany({
      where: { menuItemId },
      include: {
        inventory_item: {
          select: {
            costPerUnit: true,
          },
        },
      },
    });

    return ingredients.reduce((total, ingredient) => {
      return total + ingredient.quantity * ingredient.inventory_item.costPerUnit;
    }, 0);
  }

  /**
   * Bulk update recipe (replace all ingredients)
   */
  async updateRecipe(
    menuItemId: string,
    ingredients: Array<{ inventoryItemId: string; quantity: number }>
  ) {
    return prisma.$transaction(async (tx) => {
      // Delete existing ingredients
      await tx.menu_item_ingredients.deleteMany({
        where: { menuItemId },
      });

      // Add new ingredients
      const createdIngredients = await Promise.all(
        ingredients.map((ing) =>
          tx.menu_item_ingredients.create({
            data: {
              id: `mii_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              menuItemId,
              inventoryItemId: ing.inventoryItemId,
              quantity: ing.quantity,
              updatedAt: new Date(),
            },
            include: {
              inventory_item: {
                select: {
                  name: true,
                  unit: true,
                },
              },
            },
          })
        )
      );

      return createdIngredients;
    });
  }

  /**
   * Get menu items with low stock ingredients
   */
  async getMenuItemsWithLowStockIngredients() {
    const menuItemsWithLowStock = await prisma.menu_item_ingredients.findMany({
      where: {
        inventory_item: {
          OR: [{ status: 'LOW_STOCK' }, { status: 'OUT_OF_STOCK' }],
        },
      },
      include: {
        menu_item: {
          select: {
            id: true,
            name: true,
            category: true,
            available: true,
          },
        },
        inventory_item: {
          select: {
            name: true,
            currentStock: true,
            minStock: true,
            unit: true,
            status: true,
          },
        },
      },
      orderBy: {
        menu_item: {
          name: 'asc',
        },
      },
    });

    // Group by menu item
    const groupedByMenuItem = menuItemsWithLowStock.reduce((acc: any, item) => {
      const menuItemId = item.menu_item.id;
      if (!acc[menuItemId]) {
        acc[menuItemId] = {
          menuItem: item.menu_item,
          lowStockIngredients: [],
        };
      }
      acc[menuItemId].lowStockIngredients.push({
        name: item.inventory_item.name,
        currentStock: item.inventory_item.currentStock,
        minStock: item.inventory_item.minStock,
        unit: item.inventory_item.unit,
        status: item.inventory_item.status,
      });
      return acc;
    }, {});

    return Object.values(groupedByMenuItem);
  }

  /**
   * Calculate maximum servings for a single menu item based on ingredient stock
   * Accounts for ingredients reserved by PREPARING orders (stock deducted on COMPLETED)
   */
  async calculateMaxServings(menuItemId: string): Promise<number> {
    const ingredients = await prisma.menu_item_ingredients.findMany({
      where: { menuItemId },
      include: {
        inventory_item: {
          select: {
            id: true,
            currentStock: true,
          },
        },
      },
    });

    // If no ingredients defined, return -1 (unlimited)
    if (ingredients.length === 0) {
      return -1;
    }

    // Get PREPARING orders to calculate reserved ingredients
    // (PREPARING orders haven't had their stock deducted yet - that happens on COMPLETED)
    const preparingOrders = await prisma.orders.findMany({
      where: {
        status: 'PREPARING',
      },
      include: {
        order_items: {
          select: {
            menuItemId: true,
            quantity: true,
          },
        },
      },
    });

    // Calculate reserved ingredients from PREPARING orders
    const reservedIngredients = new Map<string, number>();
    
    for (const order of preparingOrders) {
      for (const item of order.order_items) {
        // Get the recipe for this menu item
        const itemIngredients = await prisma.menu_item_ingredients.findMany({
          where: { menuItemId: item.menuItemId },
        });
        
        for (const ing of itemIngredients) {
          const current = reservedIngredients.get(ing.inventoryItemId) || 0;
          reservedIngredients.set(ing.inventoryItemId, current + (ing.quantity * item.quantity));
        }
      }
    }

    // Calculate how many servings each ingredient can make (accounting for reserved)
    let maxServings = Infinity;
    for (const ingredient of ingredients) {
      if (ingredient.quantity > 0) {
        const reserved = reservedIngredients.get(ingredient.inventory_item.id) || 0;
        const availableStock = Math.max(0, ingredient.inventory_item.currentStock - reserved);
        // Round to 6 decimal places to handle floating-point precision issues (e.g., 4.8/0.2 = 23.999... should be 24)
        const rawServings = Math.round((availableStock / ingredient.quantity) * 1000000) / 1000000;
        const servingsFromIngredient = Math.floor(rawServings);
        maxServings = Math.min(maxServings, servingsFromIngredient);
      }
    }

    return maxServings === Infinity ? -1 : maxServings;
  }

  /**
   * Calculate maximum servings for ALL menu items (for POS display)
   * Accounts for ingredients reserved by PREPARING orders (stock deducted on COMPLETED)
   */
  async calculateAllMenuItemServings(): Promise<Map<string, number>> {
    // Get all menu items with their ingredients
    const allIngredients = await prisma.menu_item_ingredients.findMany({
      include: {
        inventory_item: {
          select: {
            id: true,
            currentStock: true,
          },
        },
        menu_item: {
          select: {
            id: true,
          },
        },
      },
    });

    // Get PREPARING orders to calculate reserved ingredients
    // (PREPARING orders haven't had their stock deducted yet - that happens on COMPLETED)
    const preparingOrders = await prisma.orders.findMany({
      where: {
        status: 'PREPARING',
      },
      include: {
        order_items: {
          select: {
            menuItemId: true,
            quantity: true,
          },
        },
      },
    });

    // Calculate reserved ingredients from PREPARING orders
    // Map: inventoryItemId -> reserved quantity
    const reservedIngredients = new Map<string, number>();
    
    // First, get all unique menu item IDs from preparing orders
    const preparingMenuItemQuantities = new Map<string, number>();
    for (const order of preparingOrders) {
      for (const item of order.order_items) {
        const current = preparingMenuItemQuantities.get(item.menuItemId) || 0;
        preparingMenuItemQuantities.set(item.menuItemId, current + item.quantity);
      }
    }

    // Then calculate how much of each inventory item is reserved
    for (const ing of allIngredients) {
      const menuItemId = ing.menuItemId;
      const preparingQty = preparingMenuItemQuantities.get(menuItemId) || 0;
      if (preparingQty > 0) {
        const inventoryItemId = ing.inventory_item.id;
        const reservedAmount = ing.quantity * preparingQty;
        const current = reservedIngredients.get(inventoryItemId) || 0;
        reservedIngredients.set(inventoryItemId, current + reservedAmount);
      }
    }

    // Group ingredients by menu item, accounting for reserved stock
    const menuItemIngredients = new Map<string, Array<{ quantity: number; stock: number }>>();
    
    for (const ing of allIngredients) {
      const menuItemId = ing.menuItemId;
      if (!menuItemIngredients.has(menuItemId)) {
        menuItemIngredients.set(menuItemId, []);
      }
      
      // Calculate available stock (current stock minus reserved for preparing orders)
      const reservedForIng = reservedIngredients.get(ing.inventory_item.id) || 0;
      const availableStock = Math.max(0, ing.inventory_item.currentStock - reservedForIng);
      
      menuItemIngredients.get(menuItemId)!.push({
        quantity: ing.quantity,
        stock: availableStock,
      });
    }

    // Calculate max servings for each menu item
    const result = new Map<string, number>();
    
    for (const [menuItemId, ingredients] of menuItemIngredients) {
      if (ingredients.length === 0) {
        result.set(menuItemId, -1); // No recipe, unlimited
        continue;
      }

      let maxServings = Infinity;
      for (const ing of ingredients) {
        if (ing.quantity > 0) {
          // Round to 6 decimal places to handle floating-point precision issues
          const rawServings = Math.round((ing.stock / ing.quantity) * 1000000) / 1000000;
          const servingsFromIng = Math.floor(rawServings);
          maxServings = Math.min(maxServings, servingsFromIng);
        }
      }
      result.set(menuItemId, maxServings === Infinity ? -1 : maxServings);
    }

    return result;
  }

  /**
   * Calculate maximum servings for ALL menu items accounting for cart contents
   * This ensures shared ingredients across different menu items are properly calculated
   */
  async calculateAllMenuItemServingsWithCart(
    cartItems: Array<{ menuItemId: string; quantity: number }>
  ): Promise<Map<string, number>> {
    // Get all menu items with their ingredients
    const allIngredients = await prisma.menu_item_ingredients.findMany({
      include: {
        inventory_item: {
          select: {
            id: true,
            currentStock: true,
          },
        },
        menu_item: {
          select: {
            id: true,
          },
        },
      },
    });

    // Get PREPARING orders to calculate reserved ingredients
    const preparingOrders = await prisma.orders.findMany({
      where: {
        status: 'PREPARING',
      },
      include: {
        order_items: {
          select: {
            menuItemId: true,
            quantity: true,
          },
        },
      },
    });

    // Calculate reserved ingredients from PREPARING orders AND cart items
    const reservedIngredients = new Map<string, number>();
    
    // First, get all unique menu item IDs from preparing orders
    const preparingMenuItemQuantities = new Map<string, number>();
    for (const order of preparingOrders) {
      for (const item of order.order_items) {
        const current = preparingMenuItemQuantities.get(item.menuItemId) || 0;
        preparingMenuItemQuantities.set(item.menuItemId, current + item.quantity);
      }
    }

    // Add cart items to reserved quantities
    for (const cartItem of cartItems) {
      const current = preparingMenuItemQuantities.get(cartItem.menuItemId) || 0;
      preparingMenuItemQuantities.set(cartItem.menuItemId, current + cartItem.quantity);
    }

    // Then calculate how much of each inventory item is reserved
    for (const ing of allIngredients) {
      const menuItemId = ing.menuItemId;
      const reservedQty = preparingMenuItemQuantities.get(menuItemId) || 0;
      if (reservedQty > 0) {
        const inventoryItemId = ing.inventory_item.id;
        const reservedAmount = ing.quantity * reservedQty;
        const current = reservedIngredients.get(inventoryItemId) || 0;
        reservedIngredients.set(inventoryItemId, current + reservedAmount);
      }
    }

    // Group ingredients by menu item, accounting for reserved stock
    const menuItemIngredients = new Map<string, Array<{ inventoryItemId: string; quantity: number; stock: number }>>();
    
    for (const ing of allIngredients) {
      const menuItemId = ing.menuItemId;
      if (!menuItemIngredients.has(menuItemId)) {
        menuItemIngredients.set(menuItemId, []);
      }
      
      // Calculate available stock (current stock minus reserved)
      const reservedForIng = reservedIngredients.get(ing.inventory_item.id) || 0;
      const availableStock = Math.max(0, ing.inventory_item.currentStock - reservedForIng);
      
      menuItemIngredients.get(menuItemId)!.push({
        inventoryItemId: ing.inventory_item.id,
        quantity: ing.quantity,
        stock: availableStock,
      });
    }

    // Calculate max servings for each menu item
    const result = new Map<string, number>();
    
    for (const [menuItemId, ingredients] of menuItemIngredients) {
      if (ingredients.length === 0) {
        result.set(menuItemId, -1); // No recipe, unlimited
        continue;
      }

      let maxServings = Infinity;
      for (const ing of ingredients) {
        if (ing.quantity > 0) {
          // Round to 6 decimal places to handle floating-point precision issues
          const rawServings = Math.round((ing.stock / ing.quantity) * 1000000) / 1000000;
          const servingsFromIng = Math.floor(rawServings);
          maxServings = Math.min(maxServings, servingsFromIng);
        }
      }
      result.set(menuItemId, maxServings === Infinity ? -1 : maxServings);
    }

    return result;
  }

  /**
   * Update menu items' outOfStock status based on ingredient availability
   * Called after stock transactions to automatically mark items in/out of stock
   * 
   * @param inventoryItemId - The inventory item that was updated (optional, for targeted check)
   * @param autoOutOfStock - If true, mark items as out of stock when maxServings = 0
   * @param autoInStock - If true, mark items as in-stock when maxServings >= 1
   * @returns Object containing arrays of menu items that were marked out of stock and in stock
   */
  async updateMenuItemsStockStatus(
    inventoryItemId?: string,
    autoOutOfStock: boolean = false,
    autoInStock: boolean = false
  ): Promise<{
    markedOutOfStock: Array<{ id: string; name: string }>;
    markedInStock: Array<{ id: string; name: string }>;
  }> {
    const markedOutOfStock: Array<{ id: string; name: string }> = [];
    const markedInStock: Array<{ id: string; name: string }> = [];

    // If neither setting is enabled, return early
    if (!autoOutOfStock && !autoInStock) {
      return { markedOutOfStock, markedInStock };
    }

    // Get all max servings for menu items
    const allMaxServings = await this.calculateAllMenuItemServings();

    // Get menu items to check
    let menuItemsToCheck: Array<{ id: string; name: string; outOfStock: boolean }>;

    if (inventoryItemId) {
      // Only check menu items that use this specific ingredient
      const menuItemsWithIngredient = await prisma.menu_item_ingredients.findMany({
        where: { inventoryItemId },
        select: {
          menu_item: {
            select: {
              id: true,
              name: true,
              outOfStock: true,
            },
          },
        },
      });
      menuItemsToCheck = menuItemsWithIngredient.map(ing => ({
        id: ing.menu_item.id,
        name: ing.menu_item.name,
        outOfStock: ing.menu_item.outOfStock ?? false,
      }));
    } else {
      // Check all menu items with recipes
      const allMenuItems = await prisma.menu_items.findMany({
        where: {
          menu_item_ingredients: {
            some: {}, // Only items with at least one ingredient
          },
        },
        select: {
          id: true,
          name: true,
          outOfStock: true,
        },
      });
      menuItemsToCheck = allMenuItems.map(item => ({
        id: item.id,
        name: item.name,
        outOfStock: item.outOfStock ?? false,
      }));
    }

    // Process each menu item
    for (const menuItem of menuItemsToCheck) {
      const maxServings = allMaxServings.get(menuItem.id);
      
      // Skip items without recipes (maxServings = -1 means unlimited/no recipe)
      if (maxServings === undefined || maxServings === -1) {
        continue;
      }

      // Auto mark OUT OF STOCK: if maxServings = 0 and item is not already marked out of stock
      if (autoOutOfStock && maxServings === 0 && !menuItem.outOfStock) {
        await prisma.menu_items.update({
          where: { id: menuItem.id },
          data: { outOfStock: true, updatedAt: new Date() },
        });
        markedOutOfStock.push({ id: menuItem.id, name: menuItem.name });
      }

      // Auto mark IN STOCK: if maxServings >= 1 and item is currently marked out of stock
      if (autoInStock && maxServings >= 1 && menuItem.outOfStock) {
        await prisma.menu_items.update({
          where: { id: menuItem.id },
          data: { outOfStock: false, updatedAt: new Date() },
        });
        markedInStock.push({ id: menuItem.id, name: menuItem.name });
      }
    }

    return { markedOutOfStock, markedInStock };
  }

  /**
   * Calculate max servings for a specific variant using effective recipe logic
   * WITH cart items subtracted from available stock (like getMaxServingsWithCart but for variants)
   * Returns: Record<variantId | 'base', number>
   */
  async calculateVariantServingsWithCart(
    menuItemId: string,
    cartItems: Array<{ menuItemId: string; variantId?: string | null; quantity: number }>
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    
    // Get all variants for this menu item
    const variants = await prisma.menu_item_variants.findMany({
      where: { menuItemId, isActive: true },
      select: { id: true, name: true },
    });

    // Get PREPARING orders to calculate reserved ingredients
    const preparingOrders = await prisma.orders.findMany({
      where: { status: 'PREPARING' },
      include: {
        order_items: {
          select: { menuItemId: true, variantId: true, quantity: true },
        },
      },
    });

    // Calculate reserved ingredients from PREPARING orders
    const reservedIngredients = new Map<string, number>(); // inventoryItemId -> reserved qty
    
    for (const order of preparingOrders) {
      for (const item of order.order_items) {
        if (item.menuItemId) {
          const effectiveRecipe = await this.getEffectiveRecipe(item.menuItemId, item.variantId);
          for (const ing of effectiveRecipe) {
            const current = reservedIngredients.get(ing.inventoryItemId) || 0;
            reservedIngredients.set(ing.inventoryItemId, current + (ing.quantity * item.quantity));
          }
        }
      }
    }

    // Calculate reserved ingredients from cart items
    for (const cartItem of cartItems) {
      if (cartItem.menuItemId) {
        const effectiveRecipe = await this.getEffectiveRecipe(cartItem.menuItemId, cartItem.variantId);
        for (const ing of effectiveRecipe) {
          const current = reservedIngredients.get(ing.inventoryItemId) || 0;
          reservedIngredients.set(ing.inventoryItemId, current + (ing.quantity * cartItem.quantity));
        }
      }
    }

    // Get all inventory items for current stock lookup
    const inventoryItems = await prisma.inventory_items.findMany({
      select: { id: true, currentStock: true },
    });
    const inventoryStock = new Map(inventoryItems.map(i => [i.id, i.currentStock]));

    // Helper to calculate max servings from a recipe
    const calculateServingsFromRecipe = (recipe: Array<{ inventoryItemId: string; quantity: number }>) => {
      if (recipe.length === 0) return -1;
      
      let maxServings = Infinity;
      for (const ing of recipe) {
        if (ing.quantity > 0) {
          const currentStock = inventoryStock.get(ing.inventoryItemId) || 0;
          const reserved = reservedIngredients.get(ing.inventoryItemId) || 0;
          const available = Math.max(0, currentStock - reserved);
          const rawServings = Math.round((available / ing.quantity) * 1000000) / 1000000;
          const servingsFromIng = Math.floor(rawServings);
          maxServings = Math.min(maxServings, servingsFromIng);
        }
      }
      return maxServings === Infinity ? -1 : maxServings;
    };

    // Calculate for base product
    const baseRecipe = await this.getEffectiveRecipe(menuItemId, null);
    result['base'] = calculateServingsFromRecipe(baseRecipe);

    // Calculate for each variant
    for (const variant of variants) {
      const variantRecipe = await this.getEffectiveRecipe(menuItemId, variant.id);
      result[variant.id] = calculateServingsFromRecipe(variantRecipe);
    }

    return result;
  }

  /**
   * Calculate max servings for a specific variant using effective recipe logic
   * Returns: Record<variantId | 'base', number>
   */
  async calculateVariantServings(menuItemId: string): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    
    // Get all variants for this menu item
    const variants = await prisma.menu_item_variants.findMany({
      where: { menuItemId, isActive: true },
      select: { id: true, name: true },
    });

    // Get PREPARING orders to calculate reserved ingredients
    const preparingOrders = await prisma.orders.findMany({
      where: { status: 'PREPARING' },
      include: {
        order_items: {
          select: { menuItemId: true, variantId: true, quantity: true },
        },
      },
    });

    // Calculate reserved ingredients from PREPARING orders (per variant)
    const reservedByMenuItemVariant = new Map<string, number>(); // key: `${menuItemId}:${variantId || 'base'}`
    for (const order of preparingOrders) {
      for (const item of order.order_items) {
        const key = `${item.menuItemId}:${item.variantId || 'base'}`;
        const current = reservedByMenuItemVariant.get(key) || 0;
        reservedByMenuItemVariant.set(key, current + item.quantity);
      }
    }

    // Calculate reserved ingredients globally
    const reservedIngredients = new Map<string, number>(); // inventoryItemId -> reserved qty
    
    // For each preparing order item, get its effective recipe and reserve ingredients
    for (const order of preparingOrders) {
      for (const item of order.order_items) {
        if (item.menuItemId) {
          const effectiveRecipe = await this.getEffectiveRecipe(item.menuItemId, item.variantId);
          for (const ing of effectiveRecipe) {
            const current = reservedIngredients.get(ing.inventoryItemId) || 0;
            reservedIngredients.set(ing.inventoryItemId, current + (ing.quantity * item.quantity));
          }
        }
      }
    }

    // Get all inventory items for current stock lookup
    const inventoryItems = await prisma.inventory_items.findMany({
      select: { id: true, currentStock: true },
    });
    const inventoryStock = new Map(inventoryItems.map(i => [i.id, i.currentStock]));

    // Helper to calculate max servings from a recipe
    const calculateServingsFromRecipe = (recipe: Array<{ inventoryItemId: string; quantity: number }>) => {
      if (recipe.length === 0) return -1;
      
      let maxServings = Infinity;
      for (const ing of recipe) {
        if (ing.quantity > 0) {
          const currentStock = inventoryStock.get(ing.inventoryItemId) || 0;
          const reserved = reservedIngredients.get(ing.inventoryItemId) || 0;
          const available = Math.max(0, currentStock - reserved);
          const rawServings = Math.round((available / ing.quantity) * 1000000) / 1000000;
          const servingsFromIng = Math.floor(rawServings);
          maxServings = Math.min(maxServings, servingsFromIng);
        }
      }
      return maxServings === Infinity ? -1 : maxServings;
    };

    // Calculate for base product
    const baseRecipe = await this.getEffectiveRecipe(menuItemId, null);
    result['base'] = calculateServingsFromRecipe(baseRecipe);

    // Calculate for each variant
    for (const variant of variants) {
      const variantRecipe = await this.getEffectiveRecipe(menuItemId, variant.id);
      result[variant.id] = calculateServingsFromRecipe(variantRecipe);
    }

    return result;
  }

  /**
   * Calculate variant servings for ALL menu items that have variants
   * Returns: Record<menuItemId, Record<variantId | 'base', number>>
   */
  async calculateAllVariantServings(): Promise<Record<string, Record<string, number>>> {
    // Get all menu items that have variants
    const menuItemsWithVariants = await prisma.menu_items.findMany({
      where: {
        variants: {
          some: { isActive: true }
        }
      },
      select: { id: true },
    });

    const result: Record<string, Record<string, number>> = {};
    
    for (const item of menuItemsWithVariants) {
      result[item.id] = await this.calculateVariantServings(item.id);
    }

    return result;
  }
}

export const recipeService = new RecipeService();
