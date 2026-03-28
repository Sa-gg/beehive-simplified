import { Request, Response } from 'express';
import { MenuItemService } from '../services/menuItem.service.js';
import { CreateMenuItemDTO, UpdateMenuItemDTO } from '../types/menuItem.types.js';

export class MenuItemController {
  private service: MenuItemService;

  constructor(service: MenuItemService) {
    this.service = service;
  }

  // GET /api/menu-items
  getAllMenuItems = async (req: Request, res: Response) => {
    try {
      const { categoryId, category, available, featured, search } = req.query;

      const filters: any = {};

      // Support both categoryId and category (category name) for backwards compatibility
      if (categoryId) {
        filters.categoryId = categoryId as string;
      }

      if (available !== undefined) {
        filters.available = available === 'true';
      }

      if (featured !== undefined) {
        filters.featured = featured === 'true';
      }

      if (search) {
        filters.search = search as string;
      }

      const items = await this.service.getAllMenuItems(filters);

      res.status(200).json({
        success: true,
        data: items,
        count: items.length
      });
    } catch (error: any) {
      console.error('Error fetching menu items:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch menu items',
        message: error.message
      });
    }
  };

  // GET /api/menu-items/:id
  getMenuItemById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const item = await this.service.getMenuItemById(id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Menu item not found'
        });
      }

      res.status(200).json({
        success: true,
        data: item
      });
    } catch (error: any) {
      console.error('Error fetching menu item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch menu item',
        message: error.message
      });
    }
  };

  // POST /api/menu-items
  createMenuItem = async (req: Request, res: Response) => {
    try {
      const data: CreateMenuItemDTO = req.body;

      const item = await this.service.createMenuItem(data);

      res.status(201).json({
        success: true,
        data: item,
        message: 'Menu item created successfully'
      });
    } catch (error: any) {
      console.error('Error creating menu item:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to create menu item',
        message: error.message
      });
    }
  };

  // PUT /api/menu-items/:id
  updateMenuItem = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data: UpdateMenuItemDTO = req.body;

      const item = await this.service.updateMenuItem(id, data);

      res.status(200).json({
        success: true,
        data: item,
        message: 'Menu item updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating menu item:', error);
      
      if (error.message === 'Menu item not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(400).json({
        success: false,
        error: 'Failed to update menu item',
        message: error.message
      });
    }
  };

  // DELETE /api/menu-items/:id
  deleteMenuItem = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await this.service.deleteMenuItem(id);

      res.status(200).json({
        success: true,
        message: 'Menu item deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting menu item:', error);

      if (error.message === 'Menu item not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(400).json({
        success: false,
        error: 'Failed to delete menu item',
        message: error.message
      });
    }
  };

  // PATCH /api/menu-items/:id/availability
  toggleAvailability = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const item = await this.service.toggleAvailability(id);

      res.status(200).json({
        success: true,
        data: item,
        message: `Product marked as ${item.available ? 'available' : 'unavailable'}`
      });
    } catch (error: any) {
      console.error('Error toggling availability:', error);

      if (error.message === 'Menu item not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(400).json({
        success: false,
        error: 'Failed to toggle availability',
        message: error.message
      });
    }
  };

  // PATCH /api/menu-items/:id/out-of-stock
  toggleOutOfStock = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const item = await this.service.toggleOutOfStock(id);

      res.status(200).json({
        success: true,
        data: item,
        message: `Product marked as ${item.outOfStock ? 'out of stock' : 'in stock'}`
      });
    } catch (error: any) {
      console.error('Error toggling out of stock:', error);

      if (error.message === 'Menu item not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(400).json({
        success: false,
        error: 'Failed to toggle out of stock',
        message: error.message
      });
    }
  };

  // PATCH /api/menu-items/:id/featured
  toggleFeatured = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const item = await this.service.toggleFeatured(id);

      res.status(200).json({
        success: true,
        data: item,
        message: `Menu item ${item.featured ? 'featured' : 'unfeatured'} successfully`
      });
    } catch (error: any) {
      console.error('Error toggling featured:', error);

      if (error.message === 'Menu item not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(400).json({
        success: false,
        error: 'Failed to toggle featured',
        message: error.message
      });
    }
  };

  // POST /api/menu-items/bulk/availability
  bulkUpdateAvailability = async (req: Request, res: Response) => {
    try {
      const { ids, available } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'ids must be a non-empty array'
        });
      }

      if (typeof available !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'available must be a boolean'
        });
      }

      const result = await this.service.bulkUpdateAvailability(ids, available);

      res.status(200).json({
        success: true,
        data: result,
        message: `Updated ${result.count} menu items`
      });
    } catch (error: any) {
      console.error('Error bulk updating availability:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to bulk update availability',
        message: error.message
      });
    }
  };

  // POST /api/menu-items/bulk/out-of-stock
  bulkUpdateOutOfStock = async (req: Request, res: Response) => {
    try {
      const { ids, outOfStock } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'ids must be a non-empty array'
        });
      }

      if (typeof outOfStock !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'outOfStock must be a boolean'
        });
      }

      const result = await this.service.bulkUpdateOutOfStock(ids, outOfStock);

      res.status(200).json({
        success: true,
        data: result,
        message: `Marked ${result.count} products as ${outOfStock ? 'out of stock' : 'in stock'}`
      });
    } catch (error: any) {
      console.error('Error bulk updating out of stock:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to bulk update out of stock',
        message: error.message
      });
    }
  };

  // GET /api/menu-items/category/:category
  getMenuItemsByCategory = async (req: Request, res: Response) => {
    try {
      const { category } = req.params;

      const items = await this.service.getMenuItemsByCategory(category);

      res.status(200).json({
        success: true,
        data: items,
        count: items.length
      });
    } catch (error: any) {
      console.error('Error fetching menu items by category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch menu items',
        message: error.message
      });
    }
  };

  // GET /api/menu-items/featured
  getFeaturedMenuItems = async (req: Request, res: Response) => {
    try {
      const items = await this.service.getFeaturedMenuItems();

      res.status(200).json({
        success: true,
        data: items,
        count: items.length
      });
    } catch (error: any) {
      console.error('Error fetching featured menu items:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch featured items',
        message: error.message
      });
    }
  };

  // GET /api/menu-items/search
  searchMenuItems = async (req: Request, res: Response) => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Search query (q) is required'
        });
      }

      const items = await this.service.searchMenuItems(q);

      res.status(200).json({
        success: true,
        data: items,
        count: items.length
      });
    } catch (error: any) {
      console.error('Error searching menu items:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search menu items',
        message: error.message
      });
    }
  };

  // GET /api/menu-items/stats
  getMenuItemsStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.service.getMenuItemsStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error fetching menu items stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch stats',
        message: error.message
      });
    }
  };
}
