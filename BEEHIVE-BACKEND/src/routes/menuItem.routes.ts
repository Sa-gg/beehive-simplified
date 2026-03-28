import { Router } from 'express';
import { MenuItemController } from '../controllers/menuItem.controller.js';

export function createMenuItemRoutes(controller: MenuItemController): Router {
  const router = Router();

  // Stats endpoint - must be before :id routes
  router.get('/stats', controller.getMenuItemsStats);

  // Search endpoint - must be before :id routes
  router.get('/search', controller.searchMenuItems);

  // Featured items endpoint - must be before :id routes
  router.get('/featured', controller.getFeaturedMenuItems);

  // Category endpoint - must be before :id routes
  router.get('/category/:category', controller.getMenuItemsByCategory);

  // CRUD operations
  router.get('/', controller.getAllMenuItems);
  router.get('/:id', controller.getMenuItemById);
  router.post('/', controller.createMenuItem);
  router.put('/:id', controller.updateMenuItem);
  router.delete('/:id', controller.deleteMenuItem);

  // Toggle operations
  router.patch('/:id/availability', controller.toggleAvailability);
  router.patch('/:id/featured', controller.toggleFeatured);
  router.patch('/:id/out-of-stock', controller.toggleOutOfStock);

  // Bulk operations
  router.post('/bulk/availability', controller.bulkUpdateAvailability);
  router.post('/bulk/out-of-stock', controller.bulkUpdateOutOfStock);

  return router;
}
