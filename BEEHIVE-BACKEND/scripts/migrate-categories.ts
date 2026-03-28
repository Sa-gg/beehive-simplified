/**
 * Category Migration Script
 * This script migrates from the category enum to a categories table.
 * 
 * Steps:
 * 1. Create categories table and populate with existing categories
 * 2. Add categoryId column to menu_items
 * 3. Update menu_items to reference categories by ID
 * 4. Drop the old category column
 * 
 * Run with: npx tsx scripts/migrate-categories.ts
 */

import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import crypto from 'crypto';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL! 
});

// Generate UUID using crypto
function generateUUID(): string {
  return crypto.randomUUID();
}

// Default categories with display names
const DEFAULT_CATEGORIES = [
  { name: 'PIZZA', displayName: 'Pizza', sortOrder: 0 },
  { name: 'APPETIZER', displayName: 'Appetizer', sortOrder: 1 },
  { name: 'HOT_DRINKS', displayName: 'Hot Drinks', sortOrder: 2 },
  { name: 'COLD_DRINKS', displayName: 'Cold Drinks', sortOrder: 3 },
  { name: 'SMOOTHIE', displayName: 'Smoothie', sortOrder: 4 },
  { name: 'PLATTER', displayName: 'Platter', sortOrder: 5 },
  { name: 'SAVERS', displayName: 'Savers', sortOrder: 6 },
  { name: 'VALUE_MEAL', displayName: 'Value Meal', sortOrder: 7 },
];

async function main() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting category migration...\n');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Step 1: Create categories table if it doesn't exist
    console.log('📦 Step 1: Creating categories table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        "displayName" VARCHAR(255) NOT NULL,
        description TEXT,
        "sortOrder" INT DEFAULT 0,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('   ✅ Categories table created');
    
    // Step 2: Insert default categories
    console.log('📦 Step 2: Inserting default categories...');
    const categoryIdMap = new Map<string, string>();
    
    for (const cat of DEFAULT_CATEGORIES) {
      const categoryId = `cat-${cat.name.toLowerCase()}-${generateUUID().slice(0, 8)}`;
      
      // Check if category already exists
      const existingResult = await client.query(
        'SELECT id FROM categories WHERE name = $1',
        [cat.name]
      );
      
      if (existingResult.rows.length > 0) {
        categoryIdMap.set(cat.name, existingResult.rows[0].id);
        console.log(`   ⏭️  Skipped ${cat.name} (already exists)`);
      } else {
        await client.query(
          `INSERT INTO categories (id, name, "displayName", "sortOrder", "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [categoryId, cat.name, cat.displayName, cat.sortOrder, true]
        );
        categoryIdMap.set(cat.name, categoryId);
        console.log(`   ✅ Created category: ${cat.displayName}`);
      }
    }
    
    // Step 3: Add categoryId column to menu_items if it doesn't exist
    console.log('📦 Step 3: Adding categoryId column to menu_items...');
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'menu_items' AND column_name = 'categoryId'
    `);
    
    if (columnCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE menu_items 
        ADD COLUMN "categoryId" VARCHAR(255)
      `);
      console.log('   ✅ Added categoryId column');
    } else {
      console.log('   ⏭️  categoryId column already exists');
    }
    
    // Step 4: Update menu_items to use categoryId based on old category column
    console.log('📦 Step 4: Migrating menu items to use categoryId...');
    
    // Check if old category column exists
    const oldColumnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'menu_items' AND column_name = 'category'
    `);
    
    if (oldColumnCheck.rows.length > 0) {
      // Get all menu items with their old category
      const menuItems = await client.query(
        'SELECT id, category FROM menu_items WHERE "categoryId" IS NULL'
      );
      
      let updatedCount = 0;
      for (const item of menuItems.rows) {
        const categoryId = categoryIdMap.get(item.category);
        if (categoryId) {
          await client.query(
            'UPDATE menu_items SET "categoryId" = $1 WHERE id = $2',
            [categoryId, item.id]
          );
          updatedCount++;
        }
      }
      console.log(`   ✅ Updated ${updatedCount} menu items with categoryId`);
    }
    
    // Step 5: Make categoryId NOT NULL and add foreign key constraint
    console.log('📦 Step 5: Adding constraints...');
    
    // Check if all menu items have categoryId
    const nullCheck = await client.query(
      'SELECT COUNT(*) FROM menu_items WHERE "categoryId" IS NULL'
    );
    
    if (parseInt(nullCheck.rows[0].count) > 0) {
      console.log(`   ⚠️  Warning: ${nullCheck.rows[0].count} menu items still have NULL categoryId`);
      // Assign them to the first category as fallback
      const firstCategory = categoryIdMap.values().next().value;
      await client.query(
        'UPDATE menu_items SET "categoryId" = $1 WHERE "categoryId" IS NULL',
        [firstCategory]
      );
      console.log(`   ✅ Assigned orphan items to default category`);
    }
    
    // Make column NOT NULL
    await client.query(`
      ALTER TABLE menu_items 
      ALTER COLUMN "categoryId" SET NOT NULL
    `);
    console.log('   ✅ Made categoryId NOT NULL');
    
    // Add foreign key constraint
    const fkCheck = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'menu_items' 
      AND constraint_name = 'menu_items_categoryId_fkey'
    `);
    
    if (fkCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE menu_items 
        ADD CONSTRAINT menu_items_categoryId_fkey 
        FOREIGN KEY ("categoryId") REFERENCES categories(id)
      `);
      console.log('   ✅ Added foreign key constraint');
    }
    
    // Step 6: Create index on categoryId
    console.log('📦 Step 6: Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS menu_items_categoryId_idx ON menu_items("categoryId")
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS categories_name_idx ON categories(name)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS categories_isActive_idx ON categories("isActive")
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS categories_sortOrder_idx ON categories("sortOrder")
    `);
    console.log('   ✅ Indexes created');
    
    // Step 7: Drop old category column (enum type)
    console.log('📦 Step 7: Cleaning up old category column...');
    if (oldColumnCheck.rows.length > 0) {
      await client.query('ALTER TABLE menu_items DROP COLUMN IF EXISTS category');
      console.log('   ✅ Dropped old category column');
    }
    
    // Drop the old enum type if it exists
    await client.query('DROP TYPE IF EXISTS category CASCADE');
    console.log('   ✅ Dropped old category enum type');
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n✅ Migration completed successfully!');
    
    // Display summary
    const categoryCount = await client.query('SELECT COUNT(*) FROM categories');
    const menuItemCount = await client.query('SELECT COUNT(*) FROM menu_items');
    
    console.log('\n📊 Migration Summary:');
    console.log('━'.repeat(50));
    console.log(`   Total Categories: ${categoryCount.rows[0].count}`);
    console.log(`   Total Menu Items: ${menuItemCount.rows[0].count}`);
    console.log('━'.repeat(50));
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
