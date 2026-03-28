import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller.js';

export function createInventoryRoutes(inventoryController: InventoryController): Router {
  const router = Router();

  router.get('/', inventoryController.getAllItems);
  router.get('/stats', inventoryController.getStats);
  router.get('/alerts', inventoryController.getAlerts);
  router.get('/:id', inventoryController.getItemById);
  router.post('/', inventoryController.createItem);
  router.put('/:id', inventoryController.updateItem);
  router.patch('/:id/stock', inventoryController.updateStock);
  router.delete('/:id', inventoryController.deleteItem);

  return router;
}
