# Quick Start Guide - Testing BEEHIVE Menu Items API

## 1. Start the Server

```bash
cd BEEHIVE-BACKEND
npm start
```

You should see:
```
🚀 Server is running on port 3000
📍 API Documentation:
   GET    /api/menu-items              - Get all menu items (with filters)
   GET    /api/menu-items/:id          - Get menu item by ID
   POST   /api/menu-items              - Create new menu item
   PUT    /api/menu-items/:id          - Update menu item
   DELETE /api/menu-items/:id          - Delete menu item
   ...
```

## 2. Import Postman Collection

1. Open Postman
2. Click **Import** button (top left)
3. Select the file: `postman_collection.json`
4. Collection "BEEHIVE Menu Items API" will appear in your sidebar

## 3. Test the APIs in This Order

### Step 1: Health Check
**GET** `http://localhost:3000/`

Should return API info and available endpoints.

### Step 2: Get Statistics (Before Creating Items)
**GET** `http://localhost:3000/api/menu-items/stats`

Response:
```json
{
  "success": true,
  "data": {
    "total": 0,
    "available": 0,
    "unavailable": 0,
    "featured": 0
  }
}
```

### Step 3: Create Your First Menu Item
**POST** `http://localhost:3000/api/menu-items`

Body:
```json
{
  "name": "Bacon Pepperoni Pizza",
  "category": "PIZZA",
  "price": 299,
  "cost": 180,
  "description": "Classic pizza with bacon and pepperoni toppings",
  "available": true,
  "featured": true,
  "prepTime": 15
}
```

✅ **SAVE THE ID** from the response! You'll need it for the next steps.

### Step 4: Get All Menu Items
**GET** `http://localhost:3000/api/menu-items`

Should return the menu item you just created.

### Step 5: Get Menu Item by ID
**GET** `http://localhost:3000/api/menu-items/{YOUR_ID_HERE}`

Replace `{YOUR_ID_HERE}` with the ID from Step 3.

### Step 6: Update Menu Item
**PUT** `http://localhost:3000/api/menu-items/{YOUR_ID_HERE}`

Body:
```json
{
  "price": 320,
  "description": "Updated: Classic pizza with bacon and pepperoni toppings"
}
```

### Step 7: Toggle Availability
**PATCH** `http://localhost:3000/api/menu-items/{YOUR_ID_HERE}/availability`

Run this twice to see it toggle between available/unavailable.

### Step 8: Toggle Featured
**PATCH** `http://localhost:3000/api/menu-items/{YOUR_ID_HERE}/featured`

Run this twice to see it toggle between featured/unfeatured.

### Step 9: Get Featured Items
**GET** `http://localhost:3000/api/menu-items/featured`

Should return your item if it's currently featured.

### Step 10: Search Menu Items
**GET** `http://localhost:3000/api/menu-items/search?q=bacon`

Should find your pizza item.

### Step 11: Filter by Category
**GET** `http://localhost:3000/api/menu-items?category=PIZZA`

Should return only pizza items.

### Step 12: Create More Items (Optional)

Create a few more items with different categories:

**Appetizer Example:**
```json
{
  "name": "Beef Burger",
  "category": "APPETIZER",
  "price": 149,
  "cost": 85,
  "description": "Juicy beef burger",
  "available": true,
  "featured": false,
  "prepTime": 10
}
```

**Cold Drink Example:**
```json
{
  "name": "Iced Coffee",
  "category": "COLD_DRINKS",
  "price": 89,
  "cost": 35,
  "description": "Refreshing iced coffee",
  "available": true,
  "featured": true,
  "prepTime": 5
}
```

### Step 13: Bulk Update Availability

After creating multiple items, get their IDs and test:

**POST** `http://localhost:3000/api/menu-items/bulk/availability`

Body:
```json
{
  "ids": ["id1", "id2", "id3"],
  "available": false
}
```

### Step 14: Get Updated Statistics
**GET** `http://localhost:3000/api/menu-items/stats`

Should now show your created items.

### Step 15: Upload an Image

**POST** `http://localhost:3000/api/upload/image`

1. In Postman, select Body → form-data
2. Key: `image` (change type to File)
3. Select an image file from your computer
4. Send request
5. **SAVE THE PATH** from response (e.g., `/uploads/menu-images/menu-1702551234567.jpg`)

### Step 16: Use Image Path in Menu Item

**POST** `http://localhost:3000/api/menu-items`

Body:
```json
{
  "name": "Special Pizza",
  "category": "PIZZA",
  "price": 350,
  "cost": 200,
  "image": "/uploads/menu-images/menu-1702551234567.jpg",
  "description": "Pizza with uploaded image",
  "available": true,
  "featured": true,
  "prepTime": 20
}
```

### Step 17: Download Image from URL (Optional)

**POST** `http://localhost:3000/api/upload/image-url`

Body:
```json
{
  "url": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38"
}
```

Use the returned path in your menu items.

### Step 18: Delete Menu Item (Last Test)
**DELETE** `http://localhost:3000/api/menu-items/{YOUR_ID_HERE}`

Should successfully delete the item.

## 4. Valid Categories

When creating/updating menu items, use these exact category values:
- `PIZZA`
- `APPETIZER`
- `HOT_DRINKS`
- `COLD_DRINKS`
- `SMOOTHIE`
- `PLATTER`
- `SAVERS`
- `VALUE_MEAL`

## 5. Common Test Scenarios

### Test Validation Errors

Try creating without required fields:
```json
{
  "name": "Test Item"
  // Missing category and price
}
```

Should return validation error.

### Test Negative Prices

Try creating with negative price:
```json
{
  "name": "Test Item",
  "category": "PIZZA",
  "price": -100
}
```

Should return validation error.

### Test Not Found

Try getting non-existent ID:
**GET** `http://localhost:3000/api/menu-items/invalid-id-123`

Should return 404 error.

## 6. Expected Response Structure

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "..." // Optional
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

## 7. Tips for Testing

1. **Keep IDs handy**: Copy menu item IDs to a notepad for quick reference
2. **Test in sequence**: Follow the order above for logical flow
3. **Check database**: Verify changes persist by re-fetching items
4. **Test edge cases**: Try invalid inputs, missing fields, etc.
5. **Monitor console**: Watch server logs for detailed error messages

## 8. Architecture Overview

Your API follows this structure:

```
Client (Postman)
    ↓
Route (/api/menu-items)
    ↓
Controller (handles request/response)
    ↓
Service (business logic & validation)
    ↓
Repository (database queries)
    ↓
Prisma Client (Prisma 7 with PostgreSQL adapter)
    ↓
Database (PostgreSQL)
```

All layers are properly separated for maintainability and testability.

## 9. Next Steps

After testing all endpoints:
1. ✅ Confirm all CRUD operations work
2. ✅ Verify image upload/download works
3. ✅ Test filtering and search functionality
4. ✅ Validate error handling
5. 🎯 Ready to connect to frontend when you're ready!

## 10. Troubleshooting

**Server won't start?**
- Check if PostgreSQL is running
- Verify DATABASE_URL in .env file
- Run `npm install` to ensure all dependencies

**Can't create items?**
- Check category spelling (must be exact: PIZZA, not pizza)
- Ensure price is a number, not string
- Verify all required fields are present

**Images not uploading?**
- Check file size (max 5MB)
- Ensure file type is image (jpeg, jpg, png, gif, webp)
- Verify `public/uploads/menu-images/` directory exists

---

Happy Testing! 🚀
