/**
 * Add-ons & Variants Routes
 * 
 * All routes are prefixed with /api/addons
 * 
 * VARIANTS:
 * POST   /variants                    - Create a variant for a menu item
 * POST   /variants/bulk               - Create multiple variants at once
 * PUT    /variants/:id                - Update a variant
 * DELETE /variants/:id                - Delete a variant
 * GET    /variants/menu-item/:menuItemId - Get variants for a menu item
 * 
 * ADD-ON LINKS:
 * POST   /links                       - Link an add-on to a base item
 * POST   /links/bulk                  - Bulk link add-ons to a base item
 * PUT    /links/:id                   - Update link settings
 * DELETE /links/:id                   - Remove link
 * GET    /links/base-item/:baseItemId - Get allowed add-ons for a base item
 * 
 * ADD-ON MENU ITEMS:
 * POST   /items                       - Create an add-on menu item
 * GET    /items                       - Get all add-on menu items
 * 
 * EXTENDED QUERIES:
 * GET    /menu-item/:id/full          - Get menu item with variants & add-ons
 * GET    /browse                      - Get menu items for browsing (excludes add-ons)
 * 
 * PRICE CALCULATION:
 * POST   /calculate-price             - Calculate price for items with variants/add-ons
 */

import { Router } from 'express';
import { PrismaClient } from '../../generated/prisma/client.js';
import { AddonController } from '../controllers/addon.controller.js';

export function createAddonRoutes(prisma: PrismaClient) {
  const router = Router();
  const controller = new AddonController(prisma);

  // ============================================================================
  // VARIANTS
  // ============================================================================
  
  // Create a variant
  router.post('/variants', controller.createVariant);
  
  // Create multiple variants at once
  router.post('/variants/bulk', controller.createBulkVariants);
  
  // Update a variant
  router.put('/variants/:id', controller.updateVariant);
  
  // Delete a variant
  router.delete('/variants/:id', controller.deleteVariant);
  
  // Get variants for a menu item
  router.get('/variants/menu-item/:menuItemId', controller.getVariantsByMenuItem);

  // ============================================================================
  // ADD-ON LINKS
  // ============================================================================
  
  // Link an add-on to a base item
  router.post('/links', controller.linkAddonToBaseItem);
  
  // Bulk link add-ons to a base item
  router.post('/links/bulk', controller.bulkLinkAddons);
  
  // Update link settings
  router.put('/links/:id', controller.updateAddonLink);
  
  // Remove link
  router.delete('/links/:id', controller.unlinkAddon);
  
  // Get allowed add-ons for a base item
  router.get('/links/base-item/:baseItemId', controller.getAddonsForBaseItem);

  // ============================================================================
  // ADD-ON MENU ITEMS
  // ============================================================================
  
  // Create an add-on menu item
  router.post('/items', controller.createAddonMenuItem);
  
  // Get all add-on menu items
  router.get('/items', controller.getAllAddonMenuItems);

  // ============================================================================
  // EXTENDED QUERIES
  // ============================================================================
  
  // Get menu item with variants & add-ons
  router.get('/menu-item/:id/full', controller.getMenuItemWithFull);
  
  // Get menu items for browsing (excludes add-ons)
  router.get('/browse', controller.getMenuItemsForBrowsing);

  // ============================================================================
  // PRICE CALCULATION
  // ============================================================================
  
  // Calculate price for items with variants/add-ons
  router.post('/calculate-price', controller.calculatePrice);

  return router;
}
