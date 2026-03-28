import { Router } from 'express';
import { SalesController } from '../controllers/sales.controller.js';

export function createSalesRoutes(salesController: SalesController): Router {
  const router = Router();

  router.get('/report', salesController.getSalesReport);

  return router;
}
