import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller.js';
import { CategoryRepository } from '../repositories/category.repository.js';
import { PrismaClient } from '../../generated/prisma/client.js';

export function createCategoryRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const categoryRepository = new CategoryRepository(prisma);
  const categoryController = new CategoryController(categoryRepository);

  // GET /api/categories - Get all categories
  router.get('/', categoryController.getAll);

  // GET /api/categories/:id - Get category by ID
  router.get('/:id', categoryController.getById);

  // POST /api/categories - Create a new category
  router.post('/', categoryController.create);

  // PUT /api/categories/:id - Update a category
  router.put('/:id', categoryController.update);

  // DELETE /api/categories/:id - Delete a category
  router.delete('/:id', categoryController.delete);

  // POST /api/categories/reorder - Reorder categories
  router.post('/reorder', categoryController.reorder);

  // GET /api/categories/:id/items - Get category with menu items
  router.get('/:id/items', categoryController.getWithMenuItems);

  return router;
}
