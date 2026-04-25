import 'dotenv/config';
import express, { Request, Response } from 'express';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Menu Items architecture layers
import { MenuItemRepository } from './src/repositories/menuItem.repository.js';
import { MenuItemService } from './src/services/menuItem.service.js';
import { MenuItemController } from './src/controllers/menuItem.controller.js';
import { createMenuItemRoutes } from './src/routes/menuItem.routes.js';

// Import Upload architecture layers
import { FileStorageRepository } from './src/repositories/fileStorage.repository.js';
import { UploadService } from './src/services/upload.service.js';
import { UploadController } from './src/controllers/upload.controller.js';
import { createUploadRoutes } from './src/routes/upload.routes.js';

// Import Order architecture layers
import { OrderRepository } from './src/repositories/order.repository.js';
import { OrderService } from './src/services/order.service.js';
import { OrderController } from './src/controllers/order.controller.js';
import { createOrderRoutes } from './src/routes/order.routes.js';

// Import Auth architecture layers
import { AuthRepository } from './src/repositories/auth.repository.js';
import { AuthService } from './src/services/auth.service.js';
import { AuthController } from './src/controllers/auth.controller.js';
import { createAuthRouter } from './src/routes/auth.routes.js';

// Import Inventory architecture layers
import { InventoryRepository } from './src/repositories/inventory.repository.js';
import { InventoryService } from './src/services/inventory.service.js';
import { InventoryController } from './src/controllers/inventory.controller.js';
import { createInventoryRoutes } from './src/routes/inventory.routes.js';

// Import Sales architecture layers
import { SalesRepository } from './src/repositories/sales.repository.js';
import { SalesService } from './src/services/sales.service.js';
import { SalesController } from './src/controllers/sales.controller.js';
import { createSalesRoutes } from './src/routes/sales.routes.js';

// Import Expenses architecture layers
import { ExpensesRepository } from './src/repositories/expenses.repository.js';
import { ExpensesService } from './src/services/expenses.service.js';
import { ExpensesController } from './src/controllers/expenses.controller.js';
import { createExpensesRoutes } from './src/routes/expenses.routes.js';

// Import Customers architecture layers
import { CustomersRepository } from './src/repositories/customers.repository.js';
import { CustomersService } from './src/services/customers.service.js';
import { CustomersController } from './src/controllers/customers.controller.js';
import { createCustomersRoutes } from './src/routes/customers.routes.js';

// Import Dashboard architecture layers
import { DashboardRepository } from './src/repositories/dashboard.repository.js';
import { DashboardService } from './src/services/dashboard.service.js';
import { DashboardController } from './src/controllers/dashboard.controller.js';
import { createDashboardRoutes } from './src/routes/dashboard.routes.js';

// Import Settings architecture layers
import { SettingsRepository, settingsRepository } from './src/repositories/settings.repository.js';
import { SettingsService } from './src/services/settings.service.js';
import { SettingsController } from './src/controllers/settings.controller.js';
import { createSettingsRoutes } from './src/routes/settings.routes.js';

// Import Stock Transaction routes
import stockTransactionRoutes from './src/routes/stockTransaction.routes.js';

// Import Recipe routes
import recipeRoutes from './src/routes/recipe.routes.js';

// Import Category routes
import { createCategoryRoutes } from './src/routes/category.routes.js';

// Import Add-ons & Variants routes
import { createAddonRoutes } from './src/routes/addon.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg; 

// Create PostgreSQL connection pool
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL! 
});

// Create adapter and Prisma Client with adapter (Prisma 7 requirement)
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Initialize Menu Items architecture layers
const menuItemRepository = new MenuItemRepository(prisma);
const menuItemService = new MenuItemService(menuItemRepository);
const menuItemController = new MenuItemController(menuItemService);

// Initialize Upload architecture layers
const fileStorageRepository = new FileStorageRepository();
const uploadService = new UploadService(fileStorageRepository);
const uploadController = new UploadController(uploadService);

// Initialize Settings architecture layers (needs to be before Order)
// Use singleton settingsRepository to share state across services
const settingsService = new SettingsService(settingsRepository);
const settingsController = new SettingsController(settingsService);

// Initialize Order architecture layers
const orderRepository = new OrderRepository(
  prisma,
  () => {
    // Check if force reset flag is set
    if (settingsRepository.getForceResetFlag()) {
      // Clear the flag and reset
      settingsRepository.setForceResetFlag(false);
      settingsRepository.setLastResetDate(new Date().toISOString().split('T')[0]);
      return true; // Reset order numbers
    }
    
    // Check if we should reset order numbers based on lastResetDate (daily reset)
    const lastResetDate = settingsRepository.getLastResetDate();
    const today = new Date().toISOString().split('T')[0];
    
    if (!lastResetDate || lastResetDate !== today) {
      // Mark as reset for today
      settingsRepository.setLastResetDate(today);
      return true; // Reset order numbers
    }
    
    return false; // Don't reset
  }
);
const orderService = new OrderService(orderRepository);
const orderController = new OrderController(orderService);

// Initialize Auth architecture layers
const authRepository = new AuthRepository(prisma);
const authService = new AuthService(authRepository, settingsRepository);
const authController = new AuthController(authService);

// Initialize Inventory architecture layers
const inventoryRepository = new InventoryRepository(prisma);
const inventoryService = new InventoryService(inventoryRepository);
const inventoryController = new InventoryController(inventoryService);

// Initialize Sales architecture layers
const salesRepository = new SalesRepository(prisma);
const salesService = new SalesService(salesRepository);
const salesController = new SalesController(salesService);

// Initialize Expenses architecture layers
const expensesRepository = new ExpensesRepository(prisma);
const expensesService = new ExpensesService(expensesRepository);
const expensesController = new ExpensesController(expensesService);

// Initialize Customers architecture layers
const customersRepository = new CustomersRepository(prisma);
const customersService = new CustomersService(customersRepository);
const customersController = new CustomersController(customersService);

// Initialize Dashboard architecture layers
const dashboardRepository = new DashboardRepository(prisma);
const dashboardService = new DashboardService(dashboardRepository);
const dashboardController = new DashboardController(dashboardService);

const app = express();
const frontendDistPath = path.join(process.cwd(), 'public/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static files from public directory
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

// Serve built frontend static files only when a built bundle exists
if (fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistPath));
}

// Routes
// Auth API Routes (using layered architecture)
app.use('/api/auth', createAuthRouter(authController));

// Menu Items API Routes (using layered architecture)
app.use('/api/menu-items', createMenuItemRoutes(menuItemController));

// Upload API Routes (using layered architecture)

// Order API Routes (using layered architecture)
app.use('/api/orders', createOrderRoutes(orderController));
app.use('/api/upload', createUploadRoutes(uploadController));

// Inventory API Routes (using layered architecture)
app.use('/api/inventory', createInventoryRoutes(inventoryController));

// Sales API Routes (using layered architecture)
app.use('/api/sales', createSalesRoutes(salesController));

// Expenses API Routes (using layered architecture)
app.use('/api/expenses', createExpensesRoutes(expensesController));

// Customers API Routes (using layered architecture)
app.use('/api/customers', createCustomersRoutes(customersController));

// Dashboard API Routes (using layered architecture)
app.use('/api/dashboard', createDashboardRoutes(dashboardController));

// Settings API Routes (using layered architecture)
app.use('/api/settings', createSettingsRoutes(settingsController));

// Stock Transaction API Routes
app.use('/api/stock-transactions', stockTransactionRoutes);

// Recipe API Routes
app.use('/api/recipes', recipeRoutes);

// Categories API Routes
app.use('/api/categories', createCategoryRoutes(prisma));

// Add-ons & Variants API Routes
app.use('/api/addons', createAddonRoutes(prisma));

// SPA fallback - React Router handles all non-API routes
if (fs.existsSync(frontendIndexPath)) {
  app.get('/{*path}', (req: Request, res: Response, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }

    res.sendFile(frontendIndexPath);
  });
}

// Start server
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

app.listen(PORT, HOST, () => {
  console.log('🚀 Server is running on port ' + PORT);
  console.log('📍 API Documentation:');
  console.log('   GET    /api/menu-items              - Get all menu items (with filters)');
  console.log('   GET    /api/menu-items/:id          - Get menu item by ID');
  console.log('   POST   /api/menu-items              - Create new menu item');
  console.log('   PUT    /api/menu-items/:id          - Update menu item');
  console.log('   DELETE /api/menu-items/:id          - Delete menu item');
  console.log('   PATCH  /api/menu-items/:id/availability - Toggle availability');
  console.log('   PATCH  /api/menu-items/:id/featured - Toggle featured');
  console.log('   GET    /api/menu-items/category/:category - Get by category');
  console.log('   GET    /api/menu-items/featured     - Get featured items');
  console.log('   GET    /api/menu-items/search?q=... - Search items');
  console.log('   GET    /api/menu-items/stats        - Get statistics');
  console.log('');
  console.log('   POST   /api/upload/image            - Upload image file');
  console.log('   POST   /api/upload/image-url        - Download image from URL');
  console.log('   DELETE /api/upload/image/:filename  - Delete uploaded image');
  console.log('   GET    /api/upload/image/:filename/info - Get image info');
});