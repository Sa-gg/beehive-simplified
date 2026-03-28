# BEEHIVE Backend Architecture

## Overview

This backend follows a **Layered Architecture** pattern with clear separation of concerns, making it maintainable, testable, and scalable.

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 5.2.1
- **ORM**: Prisma 7.1.0 (with PostgreSQL adapter)
- **Database**: PostgreSQL
- **File Upload**: Multer
- **HTTP Client**: Axios

## Project Structure

```
BEEHIVE-BACKEND/
├── index.ts                          # Application entry point
├── package.json                      # Dependencies and scripts
├── tsconfig.json                     # TypeScript configuration
├── .env                              # Environment variables
│
├── prisma/
│   ├── schema.prisma                 # Database schema definition
│   └── migrations/                   # Database migration files
│
├── generated/
│   └── prisma/                       # Prisma Client (auto-generated)
│
├── src/
│   ├── types/
│   │   └── menuItem.types.ts        # TypeScript interfaces & DTOs
│   │
│   ├── repositories/
│   │   └── menuItem.repository.ts   # Database operations
│   │
│   ├── services/
│   │   └── menuItem.service.ts      # Business logic
│   │
│   ├── controllers/
│   │   └── menuItem.controller.ts   # HTTP request handlers
│   │
│   ├── routes/
│   │   └── menuItem.routes.ts       # Route definitions
│   │
│   └── utils/
│       ├── upload.ts                 # Multer configuration
│       └── imageDownloader.ts        # Image download utility
│
└── public/
    └── uploads/
        └── menu-images/              # Uploaded images storage
```

## Architecture Layers

### 1. Routes Layer (`src/routes/`)
**Purpose**: Define API endpoints and HTTP methods

**Responsibilities**:
- Map URLs to controller methods
- Define route parameters
- Apply middleware (if needed)

**Example**:
```typescript
router.get('/', controller.getAllMenuItems);
router.post('/', controller.createMenuItem);
router.put('/:id', controller.updateMenuItem);
```

---

### 2. Controllers Layer (`src/controllers/`)
**Purpose**: Handle HTTP requests and responses

**Responsibilities**:
- Extract data from requests (body, params, query)
- Call service layer methods
- Format and send responses
- Handle HTTP status codes
- Catch and format errors

**Example**:
```typescript
async createMenuItem(req: Request, res: Response) {
  try {
    const data = req.body;
    const item = await this.service.createMenuItem(data);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}
```

**Key Points**:
- No business logic here
- Only HTTP-related concerns
- Delegates to service layer

---

### 3. Services Layer (`src/services/`)
**Purpose**: Implement business logic and validation

**Responsibilities**:
- Validate input data
- Implement business rules
- Coordinate between multiple repositories
- Transform data if needed
- Throw meaningful errors

**Example**:
```typescript
async createMenuItem(data: CreateMenuItemDTO) {
  // Validation
  if (!data.name || !data.category || data.price === undefined) {
    throw new Error('Name, category, and price are required');
  }
  
  if (data.price < 0) {
    throw new Error('Price must be positive');
  }
  
  // Delegate to repository
  const item = await this.repository.create(data);
  return this.mapToResponse(item);
}
```

**Key Points**:
- Contains all business logic
- Independent of HTTP layer
- Can be tested without Express
- Throws errors (not HTTP responses)

---

### 4. Repositories Layer (`src/repositories/`)
**Purpose**: Execute database operations

**Responsibilities**:
- Perform CRUD operations
- Execute complex queries
- Handle database transactions
- Abstract Prisma Client usage

**Example**:
```typescript
async create(data: CreateMenuItemDTO) {
  return this.prisma.menu_items.create({
    data: {
      id: randomUUID(),
      name: data.name,
      category: data.category,
      price: data.price,
      // ... other fields
      updatedAt: new Date()
    }
  });
}
```

**Key Points**:
- Only database operations
- No business logic
- Returns raw database results
- Uses Prisma Client

---

### 5. Types Layer (`src/types/`)
**Purpose**: Define TypeScript interfaces and DTOs

**DTOs (Data Transfer Objects)**:
- `CreateMenuItemDTO` - For creating menu items
- `UpdateMenuItemDTO` - For updating menu items
- `MenuItemResponse` - For API responses
- `MenuItemFilters` - For query filters

**Benefits**:
- Type safety
- Auto-completion in IDE
- Clear API contracts
- Documentation

---

## Data Flow

### Creating a Menu Item (POST /api/menu-items)

```
1. Client sends POST request
   ↓
2. Express routes to → menuItem.routes.ts
   ↓
3. Routes delegate to → controller.createMenuItem()
   ↓
4. Controller extracts req.body and calls → service.createMenuItem(data)
   ↓
5. Service validates data and calls → repository.create(data)
   ↓
6. Repository executes Prisma query → Database
   ↓
7. Database returns created record
   ↓
8. Repository returns record to → Service
   ↓
9. Service transforms to DTO and returns to → Controller
   ↓
10. Controller formats response with status 201
   ↓
11. Client receives JSON response
```

### Getting Menu Items (GET /api/menu-items?category=PIZZA)

```
1. Client sends GET request with query params
   ↓
2. Routes → Controller
   ↓
3. Controller extracts query params: { category: 'PIZZA' }
   ↓
4. Service → Repository with filters
   ↓
5. Repository builds Prisma where clause
   ↓
6. Database executes query
   ↓
7. Results flow back through Repository → Service → Controller
   ↓
8. Controller sends response with status 200
```

---

## Dependency Injection

All layers use **constructor-based dependency injection**:

```typescript
// In index.ts
const prisma = new PrismaClient({ adapter });

const repository = new MenuItemRepository(prisma);
const service = new MenuItemService(repository);
const controller = new MenuItemController(service);
const routes = createMenuItemRoutes(controller);
```

**Benefits**:
- Easy to test (can inject mocks)
- Loose coupling
- Single source of truth for dependencies
- Clear dependency graph

---

## Prisma 7 Integration

### Key Features Used

1. **Driver Adapter Pattern**
```typescript
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

2. **Custom Output Path**
```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}
```

3. **Type-Safe Queries**
```typescript
const items = await prisma.menu_items.findMany({
  where: { available: true },
  orderBy: { createdAt: 'desc' }
});
```

4. **Relations**
```prisma
model menu_items {
  id          String        @id
  name        String
  order_items order_items[] // Relation to order_items
}
```

---

## Error Handling Strategy

### Service Layer
- Throws meaningful errors
- Validates business rules
- No HTTP concepts

```typescript
if (!item) {
  throw new Error('Menu item not found');
}
```

### Controller Layer
- Catches errors from service
- Maps to HTTP status codes
- Formats error responses

```typescript
try {
  const item = await this.service.getMenuItemById(id);
  res.status(200).json({ success: true, data: item });
} catch (error) {
  if (error.message === 'Menu item not found') {
    return res.status(404).json({ success: false, error: error.message });
  }
  res.status(500).json({ success: false, error: 'Server error' });
}
```

---

## API Response Format

### Success Response
```typescript
{
  success: true,
  data: { ... },
  count: 10,        // Optional (for lists)
  message: "..."    // Optional
}
```

### Error Response
```typescript
{
  success: false,
  error: "Brief error type",
  message: "Detailed error message"
}
```

---

## Benefits of This Architecture

### 1. **Separation of Concerns**
Each layer has a single responsibility, making code easier to understand and maintain.

### 2. **Testability**
Each layer can be tested independently with mocks:
```typescript
// Test service without database
const mockRepository = {
  create: jest.fn().mockResolvedValue(mockMenuItem)
};
const service = new MenuItemService(mockRepository);
```

### 3. **Maintainability**
Changes in one layer don't affect others:
- Change database → only update repository
- Change validation → only update service
- Change response format → only update controller

### 4. **Scalability**
Easy to add new features:
1. Add types in `types/`
2. Add database method in repository
3. Add business logic in service
4. Add endpoint in controller
5. Register route

### 5. **Reusability**
Services can be reused by different controllers or even other services.

---

## Design Patterns Used

1. **Repository Pattern** - Abstracts database access
2. **Service Layer Pattern** - Encapsulates business logic
3. **DTO Pattern** - Data Transfer Objects for API contracts
4. **Dependency Injection** - Loose coupling between layers
5. **Factory Pattern** - Route factory function

---

## Future Enhancements

### 1. Middleware Layer
Add authentication, logging, rate limiting:
```typescript
router.post('/', authMiddleware, controller.createMenuItem);
```

### 2. Validation Layer
Use libraries like Zod or class-validator:
```typescript
const createMenuItemSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['PIZZA', 'APPETIZER', ...]),
  price: z.number().positive()
});
```

### 3. Transaction Support
For complex operations:
```typescript
async createMenuItemWithInventory(data) {
  return this.prisma.$transaction(async (tx) => {
    const item = await tx.menu_items.create({ data });
    await tx.inventory.create({ menuItemId: item.id });
    return item;
  });
}
```

### 4. Caching Layer
Add Redis for frequently accessed data:
```typescript
const cached = await redis.get(`menu:${id}`);
if (cached) return JSON.parse(cached);
```

### 5. Event System
Emit events for important actions:
```typescript
eventEmitter.emit('menu-item-created', item);
```

---

## Comparison with Other Architectures

### vs Monolithic (All in One File)
❌ Hard to test
❌ Difficult to maintain
❌ No separation of concerns
✅ Simple for very small projects

### vs MVC (Model-View-Controller)
✅ Similar structure
❌ MVC mixes business logic with models
✅ Our architecture separates service layer

### vs Clean Architecture (Onion/Hexagonal)
✅ Similar principles
❌ Clean arch has more layers (use cases, entities)
✅ Our version is simpler but still maintainable

---

## Best Practices Followed

1. ✅ **Single Responsibility** - Each class/file has one job
2. ✅ **Dependency Inversion** - Depend on abstractions (interfaces)
3. ✅ **Open/Closed** - Open for extension, closed for modification
4. ✅ **Type Safety** - TypeScript throughout
5. ✅ **Error Handling** - Consistent error patterns
6. ✅ **Naming Conventions** - Clear, descriptive names
7. ✅ **Documentation** - Comments where needed
8. ✅ **Version Control** - Prisma migrations for database

---

## Summary

This architecture provides:
- ✅ Clear structure and organization
- ✅ Easy to test and maintain
- ✅ Scalable for future growth
- ✅ Type-safe with TypeScript
- ✅ Modern Prisma 7 integration
- ✅ Production-ready patterns

Perfect foundation for connecting to your React frontend! 🚀
