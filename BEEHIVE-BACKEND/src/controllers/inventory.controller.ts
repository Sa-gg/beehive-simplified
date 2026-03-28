import { Request, Response } from 'express';
import { InventoryService } from '../services/inventory.service.js';
import { CreateInventoryItemDTO, UpdateInventoryItemDTO, InventoryFilters } from '../types/inventory.types.js';

export class InventoryController {
  private inventoryService: InventoryService;

  constructor(inventoryService: InventoryService) {
    this.inventoryService = inventoryService;
  }

  getAllItems = async (req: Request, res: Response) => {
    try {
      const filters: InventoryFilters = {
        category: req.query.category as any,
        status: req.query.status as any,
        search: req.query.search as string
      };

      const items = await this.inventoryService.getAllItems(filters);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getItemById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const item = await this.inventoryService.getItemById(id);
      
      if (!item) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  createItem = async (req: Request, res: Response) => {
    try {
      const data: CreateInventoryItemDTO = req.body;
      const item = await this.inventoryService.createItem(data);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  updateItem = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data: UpdateInventoryItemDTO = req.body;
      const item = await this.inventoryService.updateItem(id, data);
      res.json(item);
    } catch (error: any) {
      if (error.message === 'Inventory item not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  };

  deleteItem = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      await this.inventoryService.deleteItem(id, reason);
      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'Inventory item not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  };

  updateStock = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { stock } = req.body;

      if (stock === undefined || typeof stock !== 'number') {
        return res.status(400).json({ error: 'Stock value is required and must be a number' });
      }

      const item = await this.inventoryService.updateStock(id, stock);
      res.json(item);
    } catch (error: any) {
      if (error.message === 'Inventory item not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  };

  getStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.inventoryService.getStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get low-stock and out-of-stock alerts
   * GET /api/inventory/alerts
   */
  getAlerts = async (req: Request, res: Response) => {
    try {
      const alerts = await this.inventoryService.getAlerts();
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
