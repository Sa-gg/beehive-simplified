# BEEHIVE Menu Items API Documentation

## Base URL
```
http://localhost:3000
```

## Menu Items Endpoints

### 1. Get All Menu Items
**GET** `/api/menu-items`

Query Parameters (all optional):
- `category` - Filter by category (PIZZA, APPETIZER, HOT_DRINKS, COLD_DRINKS, SMOOTHIE, PLATTER, SAVERS, VALUE_MEAL)
- `available` - Filter by availability (true/false)
- `featured` - Filter by featured status (true/false)
- `search` - Search in name and description

**Example Requests:**
```
GET /api/menu-items
GET /api/menu-items?category=PIZZA
GET /api/menu-items?available=true
GET /api/menu-items?featured=true&category=APPETIZER
GET /api/menu-items?search=burger
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Bacon Pepperoni",
      "category": "PIZZA",
      "price": 299,
      "cost": 180,
      "image": "/uploads/menu-images/pizza.jpg",
      "description": "Classic pizza with bacon and pepperoni",
      "available": true,
      "featured": true,
      "prepTime": 15,
      "nutrients": null,
      "moodBenefits": null,
      "createdAt": "2025-12-14T10:00:00.000Z",
      "updatedAt": "2025-12-14T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### 2. Get Menu Item by ID
**GET** `/api/menu-items/:id`

**Example Request:**
```
GET /api/menu-items/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Bacon Pepperoni",
    "category": "PIZZA",
    "price": 299,
    "cost": 180,
    "image": "/uploads/menu-images/pizza.jpg",
    "description": "Classic pizza with bacon and pepperoni",
    "available": true,
    "featured": true,
    "prepTime": 15,
    "nutrients": null,
    "moodBenefits": null,
    "createdAt": "2025-12-14T10:00:00.000Z",
    "updatedAt": "2025-12-14T10:00:00.000Z"
  }
}
```

---

### 3. Create Menu Item
**POST** `/api/menu-items`

**Request Body:**
```json
{
  "name": "Bacon Pepperoni",
  "category": "PIZZA",
  "price": 299,
  "cost": 180,
  "image": "/uploads/menu-images/pizza.jpg",
  "description": "Classic pizza with bacon and pepperoni",
  "available": true,
  "featured": true,
  "prepTime": 15
}
```

**Required Fields:**
- `name` (string)
- `category` (enum: PIZZA, APPETIZER, HOT_DRINKS, COLD_DRINKS, SMOOTHIE, PLATTER, SAVERS, VALUE_MEAL)
- `price` (number, must be >= 0)

**Optional Fields:**
- `cost` (number, default: 0)
- `image` (string)
- `description` (string)
- `available` (boolean, default: true)
- `featured` (boolean, default: false)
- `prepTime` (number, default: 5)
- `nutrients` (string)
- `moodBenefits` (string)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "generated-uuid",
    "name": "Bacon Pepperoni",
    "category": "PIZZA",
    "price": 299,
    "cost": 180,
    "image": "/uploads/menu-images/pizza.jpg",
    "description": "Classic pizza with bacon and pepperoni",
    "available": true,
    "featured": true,
    "prepTime": 15,
    "nutrients": null,
    "moodBenefits": null,
    "createdAt": "2025-12-14T10:00:00.000Z",
    "updatedAt": "2025-12-14T10:00:00.000Z"
  },
  "message": "Menu item created successfully"
}
```

---

### 4. Update Menu Item
**PUT** `/api/menu-items/:id`

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Bacon Pepperoni",
  "category": "PIZZA",
  "price": 320,
  "cost": 190,
  "image": "/uploads/menu-images/new-pizza.jpg",
  "description": "Updated description",
  "available": true,
  "featured": false,
  "prepTime": 20
}
```

**Example Request:**
```
PUT /api/menu-items/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Updated Bacon Pepperoni",
    "category": "PIZZA",
    "price": 320,
    "cost": 190,
    "image": "/uploads/menu-images/new-pizza.jpg",
    "description": "Updated description",
    "available": true,
    "featured": false,
    "prepTime": 20,
    "nutrients": null,
    "moodBenefits": null,
    "createdAt": "2025-12-14T10:00:00.000Z",
    "updatedAt": "2025-12-14T11:00:00.000Z"
  },
  "message": "Menu item updated successfully"
}
```

---

### 5. Delete Menu Item
**DELETE** `/api/menu-items/:id`

**Example Request:**
```
DELETE /api/menu-items/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "success": true,
  "message": "Menu item deleted successfully"
}
```

---

### 6. Toggle Availability
**PATCH** `/api/menu-items/:id/availability`

Toggles the `available` status of a menu item.

**Example Request:**
```
PATCH /api/menu-items/550e8400-e29b-41d4-a716-446655440000/availability
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "available": false,
    ...
  },
  "message": "Menu item disabled successfully"
}
```

---

### 7. Toggle Featured
**PATCH** `/api/menu-items/:id/featured`

Toggles the `featured` status of a menu item.

**Example Request:**
```
PATCH /api/menu-items/550e8400-e29b-41d4-a716-446655440000/featured
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "featured": true,
    ...
  },
  "message": "Menu item featured successfully"
}
```

---

### 8. Bulk Update Availability
**POST** `/api/menu-items/bulk/availability`

Update availability for multiple menu items at once.

**Request Body:**
```json
{
  "ids": [
    "uuid1",
    "uuid2",
    "uuid3"
  ],
  "available": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 3
  },
  "message": "Updated 3 menu items"
}
```

---

### 9. Get Menu Items by Category
**GET** `/api/menu-items/category/:category`

**Example Requests:**
```
GET /api/menu-items/category/PIZZA
GET /api/menu-items/category/APPETIZER
GET /api/menu-items/category/HOT_DRINKS
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 5
}
```

---

### 10. Get Featured Menu Items
**GET** `/api/menu-items/featured`

Returns all menu items where `featured = true` and `available = true`.

**Example Request:**
```
GET /api/menu-items/featured
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 3
}
```

---

### 11. Search Menu Items
**GET** `/api/menu-items/search?q={searchTerm}`

Search menu items by name.

**Example Request:**
```
GET /api/menu-items/search?q=burger
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 2
}
```

---

### 12. Get Menu Items Statistics
**GET** `/api/menu-items/stats`

Returns statistics about menu items.

**Example Request:**
```
GET /api/menu-items/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 52,
    "available": 48,
    "unavailable": 4,
    "featured": 6
  }
}
```

---

## Image Upload Endpoints

### 13. Upload Image from File
**POST** `/api/upload/image`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `image` (file) - Image file to upload

**Example using Postman:**
1. Select POST method
2. Enter URL: `http://localhost:3000/api/upload/image`
3. Go to Body tab
4. Select form-data
5. Add key: `image`, select File type
6. Choose your image file

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "/uploads/menu-images/menu-1702551234567-123456789.jpg",
    "filename": "menu-1702551234567-123456789.jpg",
    "size": 245678,
    "mimetype": "image/jpeg"
  },
  "message": "Image uploaded successfully"
}
```

---

### 14. Download Image from URL
**POST** `/api/upload/image-url`

**Request Body:**
```json
{
  "url": "https://example.com/pizza.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "/uploads/menu-images/menu-1702551234567-123456789.jpg",
    "originalUrl": "https://example.com/pizza.jpg"
  },
  "message": "Image downloaded successfully"
}
```

---

## Categories Enum

Available categories:
- `PIZZA`
- `APPETIZER`
- `HOT_DRINKS`
- `COLD_DRINKS`
- `SMOOTHIE`
- `PLATTER`
- `SAVERS`
- `VALUE_MEAL`

---

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "error": "Failed to create menu item",
  "message": "Name, category, and price are required"
}
```

### Not Found (404)
```json
{
  "success": false,
  "error": "Menu item not found"
}
```

### Server Error (500)
```json
{
  "success": false,
  "error": "Failed to fetch menu items",
  "message": "Database connection error"
}
```

---

## Architecture

The backend follows a layered architecture:

```
index.ts (Entry Point)
    ↓
routes/menuItem.routes.ts (Route Definitions)
    ↓
controllers/menuItem.controller.ts (Request/Response Handling)
    ↓
services/menuItem.service.ts (Business Logic)
    ↓
repositories/menuItem.repository.ts (Database Operations)
    ↓
Prisma Client with PostgreSQL (Prisma 7 with Adapter)
```

### Layers:
1. **Routes** - Define API endpoints and HTTP methods
2. **Controllers** - Handle HTTP requests/responses
3. **Services** - Implement business logic and validation
4. **Repositories** - Execute database queries via Prisma

---

## Prisma 7 Features Used

- PostgreSQL driver adapter (`@prisma/adapter-pg`)
- Custom output path for generated client
- Connection pooling with `pg`
- Type-safe database queries
- Transaction support (future enhancement)
