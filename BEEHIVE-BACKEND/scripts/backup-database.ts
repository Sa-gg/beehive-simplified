import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL! 
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function backupDatabase() {
  console.log('🔄 Starting database backup...\n');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups', timestamp);
  
  // Create backup directory
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`📁 Backup directory: ${backupDir}\n`);
  
  const backup: Record<string, any[]> = {};
  
  try {
    // Backup users
    console.log('📦 Backing up users...');
    const users = await prisma.users.findMany();
    backup.users = users;
    console.log(`   ✅ ${users.length} users`);
    
    // Backup categories
    console.log('📦 Backing up categories...');
    const categories = await prisma.categories.findMany();
    backup.categories = categories;
    console.log(`   ✅ ${categories.length} categories`);
    
    // Backup menu_items
    console.log('📦 Backing up menu_items...');
    const menuItems = await prisma.menu_items.findMany();
    backup.menu_items = menuItems;
    console.log(`   ✅ ${menuItems.length} menu items`);
    
    // Backup orders
    console.log('📦 Backing up orders...');
    const orders = await prisma.orders.findMany();
    backup.orders = orders;
    console.log(`   ✅ ${orders.length} orders`);
    
    // Backup order_items
    console.log('📦 Backing up order_items...');
    const orderItems = await prisma.order_items.findMany();
    backup.order_items = orderItems;
    console.log(`   ✅ ${orderItems.length} order items`);
    
    // Backup inventory_items
    console.log('📦 Backing up inventory_items...');
    const inventoryItems = await prisma.inventory_items.findMany();
    backup.inventory_items = inventoryItems;
    console.log(`   ✅ ${inventoryItems.length} inventory items`);
    
    // Backup stock_transactions
    console.log('📦 Backing up stock_transactions...');
    const stockTransactions = await prisma.stock_transactions.findMany();
    backup.stock_transactions = stockTransactions;
    console.log(`   ✅ ${stockTransactions.length} stock transactions`);
    
    // Backup menu_item_ingredients
    console.log('📦 Backing up menu_item_ingredients...');
    const menuItemIngredients = await prisma.menu_item_ingredients.findMany();
    backup.menu_item_ingredients = menuItemIngredients;
    console.log(`   ✅ ${menuItemIngredients.length} menu item ingredients`);
    
    // Backup expenses
    console.log('📦 Backing up expenses...');
    const expenses = await prisma.expenses.findMany();
    backup.expenses = expenses;
    console.log(`   ✅ ${expenses.length} expenses`);
    
    // Write backup to file
    const backupFile = path.join(backupDir, 'backup.json');
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    
    // Also write individual table files for easier inspection
    for (const [tableName, data] of Object.entries(backup)) {
      const tableFile = path.join(backupDir, `${tableName}.json`);
      fs.writeFileSync(tableFile, JSON.stringify(data, null, 2));
    }
    
    console.log(`\n✅ Backup completed successfully!`);
    console.log(`📄 Full backup: ${backupFile}`);
    console.log(`📁 Individual tables saved to: ${backupDir}`);
    
    // Summary
    console.log('\n📊 Backup Summary:');
    for (const [tableName, data] of Object.entries(backup)) {
      console.log(`   ${tableName}: ${data.length} records`);
    }
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

backupDatabase();
