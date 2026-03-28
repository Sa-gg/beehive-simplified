# Add-ons & Variants Implementation Summary

## Overview

This document describes the additive schema changes and API implementation for menu item variants and add-ons in the BEEHIVE POS system.

## Schema Changes (Prisma)

### New Enum

```prisma
enum menu_item_type {
  BASE      // Regular menu items - appear in browsing, mood recommendations
  ADDON     // Add-ons (extra rice, egg) - only selectable after base item chosen
  DRINK     // Drinks - appear in browsing, may have add-ons (espresso shot)
}
```

### Modified Tables

#### `menu_items`
- Added `itemType` field (defaults to `BASE`)
- Added relations for variants and add-ons

#### `order_items`
- Added `variantId` (nullable) - references selected variant
- Added `notes` (nullable) - special instructions

### New Tables

#### `menu_item_variants`
Size/temperature options for menu items.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| menuItemId | String | FK to menu_items |
| name | String | e.g., "Small", "Medium", "Large", "Hot", "Iced" |
| priceDelta | Float | Price adjustment from base (can be negative) |
| isDefault | Boolean | Whether this is the default variant |
| sortOrder | Int | Display order |
| isActive | Boolean | Soft delete flag |

#### `menu_item_addons`
Links base items to their allowed add-ons.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| baseItemId | String | FK to base menu_items |
| addonItemId | String | FK to add-on menu_items (itemType=ADDON) |
| maxQuantity | Int | Max quantity per order item (default: 5) |
| sortOrder | Int | Display order |
| isActive | Boolean | Soft delete flag |

#### `order_item_addons`
Stores selected add-ons for each order item.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key |
| orderItemId | String | FK to order_items |
| addonItemId | String | FK to add-on menu_items |
| quantity | Int | Quantity selected |
| unitPrice | Float | Price at time of order |
| subtotal | Float | quantity * unitPrice |

## API Endpoints

### Variants

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/addons/variants` | Create a variant |
| POST | `/api/addons/variants/bulk` | Create multiple variants |
| PUT | `/api/addons/variants/:id` | Update a variant |
| DELETE | `/api/addons/variants/:id` | Delete a variant |
| GET | `/api/addons/variants/menu-item/:menuItemId` | Get variants for item |

### Add-on Links

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/addons/links` | Link add-on to base item |
| POST | `/api/addons/links/bulk` | Bulk link add-ons |
| PUT | `/api/addons/links/:id` | Update link settings |
| DELETE | `/api/addons/links/:id` | Remove link |
| GET | `/api/addons/links/base-item/:baseItemId` | Get allowed add-ons |

### Add-on Menu Items

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/addons/items` | Create add-on menu item |
| GET | `/api/addons/items` | Get all add-on items |

### Extended Queries

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/addons/menu-item/:id/full` | Get item with variants & add-ons |
| GET | `/api/addons/browse` | Get items for browsing (excludes add-ons) |

### Price Calculation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/addons/calculate-price` | Calculate price with variants/add-ons |

## Pricing Formula

```
Order Item Subtotal = (
  baseItem.price 
  + selectedVariant.priceDelta 
  + SUM(addon.price * addon.quantity)
) * quantity
```

## Example Usage

### 1. Create Add-on Menu Items

```bash
# Create "Extra Rice" add-on
POST /api/addons/items
{
  "name": "Extra Rice",
  "categoryId": "add-ons-category-id",
  "price": 15,
  "description": "Additional serving of rice"
}

# Create "Extra Egg" add-on
POST /api/addons/items
{
  "name": "Extra Egg",
  "categoryId": "add-ons-category-id",
  "price": 20
}
```

### 2. Create Variants for a Drink

```bash
POST /api/addons/variants/bulk
{
  "menuItemId": "iced-coffee-id",
  "variants": [
    { "name": "Small", "priceDelta": 0, "isDefault": true },
    { "name": "Medium", "priceDelta": 20 },
    { "name": "Large", "priceDelta": 40 }
  ]
}
```

### 3. Link Add-ons to Base Item

```bash
POST /api/addons/links/bulk
{
  "baseItemId": "adobo-meal-id",
  "addonItemIds": ["extra-rice-id", "extra-egg-id"]
}
```

### 4. Create Order with Variants and Add-ons

```bash
POST /api/orders
{
  "customerName": "Juan",
  "tableNumber": "5",
  "items": [
    {
      "menuItemId": "adobo-meal-id",
      "quantity": 2,
      "price": 150,
      "addons": [
        { "addonItemId": "extra-rice-id", "quantity": 1, "unitPrice": 15 },
        { "addonItemId": "extra-egg-id", "quantity": 2, "unitPrice": 20 }
      ]
    },
    {
      "menuItemId": "iced-coffee-id",
      "quantity": 1,
      "price": 80,
      "variantId": "medium-variant-id"
    }
  ]
}
```

## Safety Guarantees

### 1. Customer UI Safety
- **Menu browsing unchanged**: The existing `/api/menu-items` endpoint continues to work
- **Add-ons excluded**: Use `/api/addons/browse` to explicitly exclude ADDON items
- **Add-ons load after selection**: Frontend should call `/api/addons/menu-item/:id/full` only after user selects a base item

### 2. Mood System Safety
- **Only BASE items in recommendations**: The `getMenuItemsForMoodRecommendations` method filters by `itemType: 'BASE'`
- **Mood stats not affected**: Add-ons are never tracked in `menu_item_mood_stats`
- **Existing algorithm unchanged**: No modifications to mood scoring logic

### 3. Existing Data Safety
- **All existing items default to BASE**: The `itemType` field defaults to `BASE`
- **Existing orders unchanged**: Orders without variants/add-ons continue working
- **Reports remain valid**: Sales reports calculate from order totals, unaffected by add-ons
- **Admin pages unaffected**: Existing admin CRUD operations work as before

### 4. Inventory Safety
- **Base item ingredients**: Always deducted based on order quantity
- **Add-on ingredients**: Deducted per add-on quantity × order quantity
- **Void reversal**: Works for both base items and add-ons

## Migration Notes

### Database Migration

Run these commands to apply schema changes:

```bash
cd BEEHIVE-BACKEND

# Push schema changes to database
npx prisma db push

# Regenerate Prisma client
npx prisma generate
```

### Existing Menu Items

All existing menu items automatically have `itemType: BASE`. No data migration required.

### Creating Add-on Category

You may want to create a dedicated category for add-ons:

```bash
POST /api/categories
{
  "id": "add-ons",
  "name": "ADD_ONS",
  "displayName": "Add-ons",
  "description": "Extra items and additions",
  "isActive": true
}
```

## Files Created/Modified

### New Files
- `src/types/addon.types.ts` - Type definitions
- `src/repositories/addon.repository.ts` - Database operations
- `src/services/addon.service.ts` - Business logic
- `src/controllers/addon.controller.ts` - HTTP handlers
- `src/routes/addon.routes.ts` - Route definitions

### Modified Files
- `prisma/schema.prisma` - Schema additions
- `index.ts` - Added addon routes
- `src/types/menuItem.types.ts` - Added itemType field
- `src/types/order.types.ts` - Added variant/addon support
- `src/services/menuItem.service.ts` - Added itemType to response
- `src/repositories/order.repository.ts` - Updated order creation and queries

## Receipt/Kitchen Ticket Format

When printing receipts or kitchen tickets, format as:

```
Chicken Adobo (Large)          x2    ₱330.00
  + Extra Rice                 x1     ₱15.00
  + Extra Egg                  x2     ₱40.00
                                     --------
                                     ₱385.00
```

The frontend should:
1. Display base item name with variant in parentheses
2. Indent add-ons under the base item
3. Show individual add-on prices
4. Sum to the order item subtotal
