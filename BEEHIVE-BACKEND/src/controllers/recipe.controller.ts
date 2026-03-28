import { Request, Response } from 'express';
import { recipeService } from '../services/recipe.service.js';

/**
 * Add ingredient to menu item recipe (supports variant-specific recipes)
 * POST /api/recipes/ingredients
 */
export const addIngredient = async (req: Request, res: Response) => {
  try {
    const { menuItemId, inventoryItemId, quantity, variantId } = req.body;

    if (!menuItemId || !inventoryItemId || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'menuItemId, inventoryItemId, and quantity are required',
      });
    }

    const ingredient = await recipeService.addIngredient({
      menuItemId,
      inventoryItemId,
      quantity: parseFloat(quantity),
      variantId: variantId || null,
    });

    res.status(200).json({
      success: true,
      data: ingredient,
      message: 'Ingredient added to recipe successfully',
    });
  } catch (error: any) {
    console.error('Add ingredient error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to add ingredient',
    });
  }
};

/**
 * Remove ingredient from menu item recipe (supports variant-specific recipes)
 * DELETE /api/recipes/ingredients
 */
export const removeIngredient = async (req: Request, res: Response) => {
  try {
    const { menuItemId, inventoryItemId, variantId } = req.body;

    if (!menuItemId || !inventoryItemId) {
      return res.status(400).json({
        success: false,
        error: 'menuItemId and inventoryItemId are required',
      });
    }

    await recipeService.removeIngredient(menuItemId, inventoryItemId, variantId || null);

    res.status(200).json({
      success: true,
      message: 'Ingredient removed from recipe successfully',
    });
  } catch (error: any) {
    console.error('Remove ingredient error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to remove ingredient',
    });
  }
};

/**
 * Get recipe for a menu item (supports variant-specific recipes)
 * GET /api/recipes/:menuItemId
 * Query params:
 *   - variantId: string (optional) - get ingredients for specific variant
 *   - includeAll: boolean (optional) - include all ingredients regardless of variant
 */
export const getRecipe = async (req: Request, res: Response) => {
  try {
    const { menuItemId } = req.params;
    const { variantId, includeAll } = req.query;

    const recipe = await recipeService.getRecipe(
      menuItemId, 
      variantId as string | undefined,
      includeAll === 'true'
    );

    res.status(200).json({
      success: true,
      data: recipe,
    });
  } catch (error: any) {
    console.error('Get recipe error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get recipe',
    });
  }
};

/**
 * Get effective recipe for a menu item (base + variant overrides)
 * GET /api/recipes/:menuItemId/effective
 * Query params:
 *   - variantId: string (optional) - get effective recipe for specific variant
 */
export const getEffectiveRecipe = async (req: Request, res: Response) => {
  try {
    const { menuItemId } = req.params;
    const { variantId } = req.query;

    const recipe = await recipeService.getEffectiveRecipe(
      menuItemId, 
      variantId as string | undefined
    );

    res.status(200).json({
      success: true,
      data: recipe,
    });
  } catch (error: any) {
    console.error('Get effective recipe error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get effective recipe',
    });
  }
};

/**
 * Get menu items using a specific ingredient
 * GET /api/recipes/ingredient/:inventoryItemId
 */
export const getMenuItemsUsingIngredient = async (req: Request, res: Response) => {
  try {
    const { inventoryItemId } = req.params;

    const menuItems = await recipeService.getMenuItemsUsingIngredient(inventoryItemId);

    res.status(200).json({
      success: true,
      data: menuItems,
    });
  } catch (error: any) {
    console.error('Get menu items using ingredient error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get menu items',
    });
  }
};

/**
 * Check if menu item can be prepared
 * GET /api/recipes/:menuItemId/availability
 */
export const checkAvailability = async (req: Request, res: Response) => {
  try {
    const { menuItemId } = req.params;

    const availability = await recipeService.checkMenuItemAvailability(menuItemId);

    res.status(200).json({
      success: true,
      data: availability,
    });
  } catch (error: any) {
    console.error('Check availability error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to check availability',
    });
  }
};

/**
 * Calculate menu item cost
 * GET /api/recipes/:menuItemId/cost
 */
export const calculateCost = async (req: Request, res: Response) => {
  try {
    const { menuItemId } = req.params;

    const cost = await recipeService.calculateMenuItemCost(menuItemId);

    res.status(200).json({
      success: true,
      data: { cost },
    });
  } catch (error: any) {
    console.error('Calculate cost error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to calculate cost',
    });
  }
};

/**
 * Update entire recipe (bulk update)
 * PUT /api/recipes/:menuItemId
 */
export const updateRecipe = async (req: Request, res: Response) => {
  try {
    const { menuItemId } = req.params;
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        success: false,
        error: 'ingredients array is required',
      });
    }

    const recipe = await recipeService.updateRecipe(menuItemId, ingredients);

    res.status(200).json({
      success: true,
      data: recipe,
      message: 'Recipe updated successfully',
    });
  } catch (error: any) {
    console.error('Update recipe error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update recipe',
    });
  }
};

/**
 * Get menu items with low stock ingredients
 * GET /api/recipes/low-stock
 */
export const getMenuItemsWithLowStock = async (req: Request, res: Response) => {
  try {
    const menuItems = await recipeService.getMenuItemsWithLowStockIngredients();

    res.status(200).json({
      success: true,
      data: menuItems,
    });
  } catch (error: any) {
    console.error('Get menu items with low stock error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get menu items with low stock',
    });
  }
};

/**
 * Calculate maximum servings for all menu items
 * GET /api/recipes/max-servings
 */
export const getAllMaxServings = async (_req: Request, res: Response) => {
  try {
    const servingsMap = await recipeService.calculateAllMenuItemServings();
    
    // Convert Map to object for JSON response
    const servingsObj: Record<string, number> = {};
    for (const [menuItemId, servings] of servingsMap) {
      servingsObj[menuItemId] = servings;
    }

    res.status(200).json({
      success: true,
      data: servingsObj,
    });
  } catch (error: any) {
    console.error('Get max servings error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to calculate max servings',
    });
  }
};

/**
 * Calculate maximum servings for a single menu item
 * GET /api/recipes/:menuItemId/max-servings
 */
export const getMaxServings = async (req: Request, res: Response) => {
  try {
    const { menuItemId } = req.params;
    const maxServings = await recipeService.calculateMaxServings(menuItemId);

    res.status(200).json({
      success: true,
      data: { menuItemId, maxServings },
    });
  } catch (error: any) {
    console.error('Get max servings error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to calculate max servings',
    });
  }
};

/**
 * Calculate maximum servings for all menu items with cart items considered
 * POST /api/recipes/max-servings-with-cart
 */
export const getMaxServingsWithCart = async (req: Request, res: Response) => {
  try {
    const { cartItems } = req.body;
    
    if (!Array.isArray(cartItems)) {
      return res.status(400).json({
        success: false,
        error: 'cartItems must be an array',
      });
    }

    const servingsMap = await recipeService.calculateAllMenuItemServingsWithCart(cartItems);
    
    // Convert Map to object for JSON response
    const servingsObj: Record<string, number> = {};
    for (const [menuItemId, servings] of servingsMap) {
      servingsObj[menuItemId] = servings;
    }

    res.status(200).json({
      success: true,
      data: servingsObj,
    });
  } catch (error: any) {
    console.error('Get max servings with cart error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to calculate max servings with cart',
    });
  }
};

/**
 * Get variant-specific max servings for a menu item
 * GET /api/recipes/:menuItemId/variant-servings
 */
export const getVariantServings = async (req: Request, res: Response) => {
  try {
    const { menuItemId } = req.params;
    const variantServings = await recipeService.calculateVariantServings(menuItemId);

    res.status(200).json({
      success: true,
      data: variantServings,
    });
  } catch (error: any) {
    console.error('Get variant servings error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to calculate variant servings',
    });
  }
};

/**
 * Get variant-specific max servings for ALL menu items that have variants
 * GET /api/recipes/all-variant-servings
 */
export const getAllVariantServings = async (req: Request, res: Response) => {
  try {
    const allVariantServings = await recipeService.calculateAllVariantServings();

    res.status(200).json({
      success: true,
      data: allVariantServings,
    });
  } catch (error: any) {
    console.error('Get all variant servings error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to calculate all variant servings',
    });
  }
};

/**
 * Get variant-specific max servings WITH cart items considered
 * POST /api/recipes/:menuItemId/variant-servings-with-cart
 */
export const getVariantServingsWithCart = async (req: Request, res: Response) => {
  try {
    const { menuItemId } = req.params;
    const { cartItems } = req.body;
    
    if (!Array.isArray(cartItems)) {
      return res.status(400).json({
        success: false,
        error: 'cartItems must be an array',
      });
    }

    const variantServings = await recipeService.calculateVariantServingsWithCart(menuItemId, cartItems);

    res.status(200).json({
      success: true,
      data: variantServings,
    });
  } catch (error: any) {
    console.error('Get variant servings with cart error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to calculate variant servings with cart',
    });
  }
};
