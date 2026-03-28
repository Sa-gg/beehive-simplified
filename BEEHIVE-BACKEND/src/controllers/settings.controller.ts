import { Request, Response } from 'express';
import { SettingsService } from '../services/settings.service.js';
import { SettingsDTO } from '../types/settings.types.js';
import { recipeService } from '../services/recipe.service.js';

class SettingsController {
  constructor(private settingsService: SettingsService) {}

  getSettings = async (req: Request, res: Response) => {
    try {
      const settings = this.settingsService.getSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error getting settings:', error);
      res.status(500).json({ error: 'Failed to get settings' });
    }
  };

  updateSettings = async (req: Request, res: Response) => {
    try {
      const settings = req.body as Partial<SettingsDTO>;
      
      // Validate time format if provided
      if (settings.openTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(settings.openTime)) {
        return res.status(400).json({ error: 'Invalid open time format. Use HH:MM' });
      }
      if (settings.closeTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(settings.closeTime)) {
        return res.status(400).json({ error: 'Invalid close time format. Use HH:MM' });
      }

      const updatedSettings = this.settingsService.updateSettings(settings);
      res.json(updatedSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  };

  forceResetOrderNumbers = async (req: Request, res: Response) => {
    try {
      this.settingsService.forceResetOrderNumbers();
      res.json({ success: true, message: 'Order numbers will be reset for the next order' });
    } catch (error) {
      console.error('Error forcing reset:', error);
      res.status(500).json({ error: 'Failed to reset order numbers' });
    }
  };
  
  validateManagerPin = async (req: Request, res: Response) => {
    try {
      const { pin } = req.body;
      
      if (!pin || typeof pin !== 'string' || pin.length !== 4) {
        return res.status(400).json({ error: 'PIN must be 4 digits' });
      }
      
      const isValid = this.settingsService.validateManagerPin(pin);
      res.json({ valid: isValid });
    } catch (error) {
      console.error('Error validating PIN:', error);
      res.status(500).json({ error: 'Failed to validate PIN' });
    }
  };
  
  updateManagerPin = async (req: Request, res: Response) => {
    try {
      const { currentPin, newPin } = req.body;
      
      if (!currentPin || typeof currentPin !== 'string' || currentPin.length !== 4) {
        return res.status(400).json({ error: 'Current PIN must be 4 digits' });
      }
      
      if (!newPin || typeof newPin !== 'string' || newPin.length !== 4) {
        return res.status(400).json({ error: 'New PIN must be 4 digits' });
      }
      
      // Validate current PIN first
      if (!this.settingsService.validateManagerPin(currentPin)) {
        return res.status(401).json({ error: 'Current PIN is incorrect' });
      }
      
      this.settingsService.updateManagerPin(newPin);
      res.json({ success: true, message: 'Manager PIN updated successfully' });
    } catch (error) {
      console.error('Error updating manager PIN:', error);
      res.status(500).json({ error: 'Failed to update manager PIN' });
    }
  };

  // Get auto-stock settings
  getAutoStockSettings = async (req: Request, res: Response) => {
    try {
      res.json({
        autoOutOfStockWhenIngredientsRunOut: this.settingsService.getAutoOutOfStockWhenIngredientsRunOut(),
        autoMarkInStockWhenAvailable: this.settingsService.getAutoMarkInStockWhenAvailable()
      });
    } catch (error) {
      console.error('Error getting auto-stock settings:', error);
      res.status(500).json({ error: 'Failed to get auto-stock settings' });
    }
  };

  // Update auto-stock settings
  updateAutoStockSettings = async (req: Request, res: Response) => {
    try {
      const { autoOutOfStockWhenIngredientsRunOut, autoMarkInStockWhenAvailable } = req.body;
      
      if (typeof autoOutOfStockWhenIngredientsRunOut === 'boolean') {
        this.settingsService.setAutoOutOfStockWhenIngredientsRunOut(autoOutOfStockWhenIngredientsRunOut);
      }
      
      if (typeof autoMarkInStockWhenAvailable === 'boolean') {
        this.settingsService.setAutoMarkInStockWhenAvailable(autoMarkInStockWhenAvailable);
      }
      
      res.json({
        success: true,
        autoOutOfStockWhenIngredientsRunOut: this.settingsService.getAutoOutOfStockWhenIngredientsRunOut(),
        autoMarkInStockWhenAvailable: this.settingsService.getAutoMarkInStockWhenAvailable()
      });
    } catch (error) {
      console.error('Error updating auto-stock settings:', error);
      res.status(500).json({ error: 'Failed to update auto-stock settings' });
    }
  };

  // Manually trigger stock status update for all menu items
  triggerStockStatusUpdate = async (req: Request, res: Response) => {
    try {
      const autoOutOfStock = this.settingsService.getAutoOutOfStockWhenIngredientsRunOut();
      const autoInStock = this.settingsService.getAutoMarkInStockWhenAvailable();
      
      if (!autoOutOfStock && !autoInStock) {
        return res.status(400).json({ 
          error: 'No auto-stock settings enabled. Enable at least one setting to trigger update.' 
        });
      }
      
      const result = await recipeService.updateMenuItemsStockStatus(
        undefined, // Check all menu items
        autoOutOfStock,
        autoInStock
      );
      
      res.json({
        success: true,
        message: `Updated ${result.markedOutOfStock.length + result.markedInStock.length} menu items`,
        markedOutOfStock: result.markedOutOfStock,
        markedInStock: result.markedInStock
      });
    } catch (error) {
      console.error('Error triggering stock status update:', error);
      res.status(500).json({ error: 'Failed to update stock status' });
    }
  };
  
  // Get global settings (shared across all accounts)
  getGlobalSettings = async (req: Request, res: Response) => {
    try {
      const settings = this.settingsService.getGlobalSettings();
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Error getting global settings:', error);
      res.status(500).json({ error: 'Failed to get global settings' });
    }
  };
  
  // Update global settings (shared across all accounts)
  updateGlobalSettings = async (req: Request, res: Response) => {
    try {
      const settings = req.body;
      
      // Remove any sensitive fields that shouldn't be updated through this endpoint
      delete settings.managerPin;
      
      const updatedSettings = this.settingsService.updateGlobalSettings(settings);
      res.json({ success: true, settings: updatedSettings });
    } catch (error) {
      console.error('Error updating global settings:', error);
      res.status(500).json({ error: 'Failed to update global settings' });
    }
  };
}

export { SettingsController };
