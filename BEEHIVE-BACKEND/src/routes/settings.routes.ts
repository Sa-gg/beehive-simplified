import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller.js';

export const createSettingsRoutes = (settingsController: SettingsController) => {
  const router = Router();

  router.get('/', settingsController.getSettings);
  router.patch('/', settingsController.updateSettings);
  router.post('/force-reset', settingsController.forceResetOrderNumbers);
  router.get('/manager-pin', settingsController.getManagerPin);
  router.post('/validate-pin', settingsController.validateManagerPin);
  router.post('/update-pin', settingsController.updateManagerPin);
  
  // Auto-stock settings endpoints
  router.get('/auto-stock', settingsController.getAutoStockSettings);
  router.patch('/auto-stock', settingsController.updateAutoStockSettings);
  router.post('/auto-stock/trigger', settingsController.triggerStockStatusUpdate);
  
  // Global settings endpoints (shared across all accounts)
  router.get('/global', settingsController.getGlobalSettings);
  router.patch('/global', settingsController.updateGlobalSettings);

  return router;
};
