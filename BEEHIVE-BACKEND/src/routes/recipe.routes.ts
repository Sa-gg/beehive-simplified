import { Router } from 'express';
import {
  addIngredient,
  removeIngredient,
  getRecipe,
  getEffectiveRecipe,
  getMenuItemsUsingIngredient,
  checkAvailability,
  calculateCost,
  updateRecipe,
  getMenuItemsWithLowStock,
  getAllMaxServings,
  getMaxServings,
  getMaxServingsWithCart,
  getVariantServings,
  getAllVariantServings,
  getVariantServingsWithCart,
} from '../controllers/recipe.controller.js';

const router = Router();

// Recipe management
router.post('/ingredients', addIngredient);
router.delete('/ingredients', removeIngredient);
router.get('/low-stock', getMenuItemsWithLowStock);
router.get('/max-servings', getAllMaxServings);  // Get all menu items max servings
router.get('/all-variant-servings', getAllVariantServings);  // Get variant servings for all items with variants
router.post('/max-servings-with-cart', getMaxServingsWithCart);  // Get max servings accounting for cart
router.get('/:menuItemId', getRecipe);
router.put('/:menuItemId', updateRecipe);
router.get('/:menuItemId/effective', getEffectiveRecipe);  // Get effective recipe (base + variant overrides)
router.get('/:menuItemId/availability', checkAvailability);
router.get('/:menuItemId/cost', calculateCost);
router.get('/:menuItemId/max-servings', getMaxServings);  // Get single menu item max servings
router.get('/:menuItemId/variant-servings', getVariantServings);  // Get variant-specific servings
router.post('/:menuItemId/variant-servings-with-cart', getVariantServingsWithCart);  // Get variant servings with cart
router.get('/ingredient/:inventoryItemId', getMenuItemsUsingIngredient);

export default router;
