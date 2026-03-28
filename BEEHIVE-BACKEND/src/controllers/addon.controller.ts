/**
 * Add-ons & Variants Controller
 * 
 * REST API endpoints for managing variants and add-ons.
 * 
 * ENDPOINTS:
 * 
 * Variants:
 * - POST   /api/addons/variants              - Create variant
 * - PUT    /api/addons/variants/:id          - Update variant
 * - DELETE /api/addons/variants/:id          - Delete variant
 * - GET    /api/addons/variants/menu-item/:menuItemId - Get variants for menu item
 * 
 * Add-on Links (which add-ons are allowed for which items):
 * - POST   /api/addons/links                 - Link add-on to base item
 * - PUT    /api/addons/links/:id             - Update link settings
 * - DELETE /api/addons/links/:id             - Remove link
 * - GET    /api/addons/links/base-item/:baseItemId - Get allowed add-ons for base item
 * - POST   /api/addons/links/bulk            - Bulk link add-ons to base item
 * 
 * Add-on Menu Items:
 * - POST   /api/addons/items                 - Create add-on menu item
 * - GET    /api/addons/items                 - Get all add-on menu items
 * 
 * Extended Menu Item Queries:
 * - GET    /api/addons/menu-item/:id/full    - Get menu item with variants & add-ons
 * - GET    /api/addons/browse                - Get menu items for browsing (excludes add-ons)
 * 
 * Price Calculation:
 * - POST   /api/addons/calculate-price       - Calculate price for items with variants/add-ons
 */

import { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma/client.js';
import { AddonService } from '../services/addon.service.js';

export class AddonController {
  private addonService: AddonService;

  constructor(private prisma: PrismaClient) {
    this.addonService = new AddonService(prisma);
  }

  // ============================================================================
  // VARIANTS
  // ============================================================================

  createVariant = async (req: Request, res: Response) => {
    try {
      const { menuItemId, name, priceDelta, isDefault, sortOrder, isActive } = req.body;

      if (!menuItemId || !name || priceDelta === undefined) {
        return res.status(400).json({
          error: 'Missing required fields: menuItemId, name, priceDelta'
        });
      }

      const variant = await this.addonService.createVariant({
        menuItemId,
        name,
        priceDelta,
        isDefault,
        sortOrder,
        isActive
      });

      res.status(201).json(variant);
    } catch (error: any) {
      console.error('Error creating variant:', error);
      res.status(400).json({ error: error.message });
    }
  };

  updateVariant = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, priceDelta, isDefault, sortOrder, isActive } = req.body;

      const variant = await this.addonService.updateVariant(id, {
        name,
        priceDelta,
        isDefault,
        sortOrder,
        isActive
      });

      res.json(variant);
    } catch (error: any) {
      console.error('Error updating variant:', error);
      res.status(400).json({ error: error.message });
    }
  };

  deleteVariant = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.addonService.deleteVariant(id);
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting variant:', error);
      res.status(400).json({ error: error.message });
    }
  };

  getVariantsByMenuItem = async (req: Request, res: Response) => {
    try {
      const { menuItemId } = req.params;
      const includeInactive = req.query.includeInactive === 'true';
      
      const variants = await this.addonService.getVariantsByMenuItem(menuItemId, includeInactive);
      res.json(variants);
    } catch (error: any) {
      console.error('Error getting variants:', error);
      res.status(500).json({ error: error.message });
    }
  };

  createBulkVariants = async (req: Request, res: Response) => {
    try {
      const { menuItemId, variants } = req.body;

      if (!menuItemId || !variants || !Array.isArray(variants)) {
        return res.status(400).json({
          error: 'Missing required fields: menuItemId, variants (array)'
        });
      }

      const result = await this.addonService.createVariantsForMenuItem(menuItemId, variants);
      res.status(201).json({ created: result.count });
    } catch (error: any) {
      console.error('Error creating variants:', error);
      res.status(400).json({ error: error.message });
    }
  };

  // ============================================================================
  // ADD-ON LINKS
  // ============================================================================

  linkAddonToBaseItem = async (req: Request, res: Response) => {
    try {
      const { baseItemId, addonItemId, maxQuantity, sortOrder, isActive } = req.body;

      if (!baseItemId || !addonItemId) {
        return res.status(400).json({
          error: 'Missing required fields: baseItemId, addonItemId'
        });
      }

      const link = await this.addonService.linkAddonToBaseItem({
        baseItemId,
        addonItemId,
        maxQuantity,
        sortOrder,
        isActive
      });

      res.status(201).json(link);
    } catch (error: any) {
      console.error('Error linking add-on:', error);
      res.status(400).json({ error: error.message });
    }
  };

  updateAddonLink = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { maxQuantity, sortOrder, isActive } = req.body;

      const link = await this.addonService.updateMenuItemAddon(id, {
        maxQuantity,
        sortOrder,
        isActive
      });

      res.json(link);
    } catch (error: any) {
      console.error('Error updating add-on link:', error);
      res.status(400).json({ error: error.message });
    }
  };

  unlinkAddon = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.addonService.unlinkAddonFromBaseItem(id);
      res.status(204).send();
    } catch (error: any) {
      console.error('Error unlinking add-on:', error);
      res.status(400).json({ error: error.message });
    }
  };

  getAddonsForBaseItem = async (req: Request, res: Response) => {
    try {
      const { baseItemId } = req.params;
      const includeInactive = req.query.includeInactive === 'true';
      
      const addons = await this.addonService.getAddonsForBaseItem(baseItemId, includeInactive);
      res.json(addons);
    } catch (error: any) {
      console.error('Error getting add-ons:', error);
      res.status(500).json({ error: error.message });
    }
  };

  bulkLinkAddons = async (req: Request, res: Response) => {
    try {
      const { baseItemId, addonItemIds } = req.body;

      if (!baseItemId || !addonItemIds || !Array.isArray(addonItemIds)) {
        return res.status(400).json({
          error: 'Missing required fields: baseItemId, addonItemIds (array)'
        });
      }

      const links = await this.addonService.bulkLinkAddons(baseItemId, addonItemIds);
      res.status(201).json({ linked: links.length });
    } catch (error: any) {
      console.error('Error bulk linking add-ons:', error);
      res.status(400).json({ error: error.message });
    }
  };

  // ============================================================================
  // ADD-ON MENU ITEMS
  // ============================================================================

  createAddonMenuItem = async (req: Request, res: Response) => {
    try {
      const { name, categoryId, price, cost, image, description, available, prepTime } = req.body;

      if (!name || !categoryId || price === undefined) {
        return res.status(400).json({
          error: 'Missing required fields: name, categoryId, price'
        });
      }

      const item = await this.addonService.createAddonMenuItem({
        name,
        categoryId,
        price,
        cost,
        image,
        description,
        available,
        prepTime
      });

      res.status(201).json(item);
    } catch (error: any) {
      console.error('Error creating add-on menu item:', error);
      res.status(400).json({ error: error.message });
    }
  };

  getAllAddonMenuItems = async (req: Request, res: Response) => {
    try {
      const includeUnavailable = req.query.includeUnavailable === 'true';
      const items = await this.addonService.getAllAddonMenuItems(includeUnavailable);
      res.json(items);
    } catch (error: any) {
      console.error('Error getting add-on menu items:', error);
      res.status(500).json({ error: error.message });
    }
  };

  // ============================================================================
  // EXTENDED QUERIES
  // ============================================================================

  getMenuItemWithFull = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const item = await this.addonService.getMenuItemWithAddonsAndVariants(id);

      if (!item) {
        return res.status(404).json({ error: 'Menu item not found' });
      }

      res.json(item);
    } catch (error: any) {
      console.error('Error getting menu item:', error);
      res.status(500).json({ error: error.message });
    }
  };

  getMenuItemsForBrowsing = async (req: Request, res: Response) => {
    try {
      const { categoryId, available, featured, search } = req.query;

      const items = await this.addonService.getMenuItemsForBrowsing({
        categoryId: categoryId as string,
        available: available === 'true' ? true : available === 'false' ? false : undefined,
        featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
        search: search as string
      });

      res.json(items);
    } catch (error: any) {
      console.error('Error getting menu items for browsing:', error);
      res.status(500).json({ error: error.message });
    }
  };

  // ============================================================================
  // PRICE CALCULATION
  // ============================================================================

  calculatePrice = async (req: Request, res: Response) => {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({
          error: 'Missing required field: items (array)'
        });
      }

      const pricedItems = await this.addonService.validateAndPriceOrderItems(items);
      
      const total = pricedItems.reduce((sum, item) => sum + item.subtotal, 0);

      res.json({
        items: pricedItems,
        subtotal: total
      });
    } catch (error: any) {
      console.error('Error calculating price:', error);
      res.status(400).json({ error: error.message });
    }
  };
}
