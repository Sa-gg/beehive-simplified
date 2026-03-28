import 'dotenv/config'
import pg from 'pg'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL! })

async function backupData() {
  const backupDir = path.join(__dirname, '..', 'backups', `backup-${new Date().toISOString().replace(/[:.]/g, '-')}`)
  
  // Create backup directory
  fs.mkdirSync(backupDir, { recursive: true })
  
  console.log(`\n📦 Starting database backup to: ${backupDir}\n`)
  
  const tables = [
    'users',
    'menu_items', 
    'orders',
    'order_items',
    'customers',
    'inventory_items',
    'stock_transactions',
    'recipes',
    'recipe_ingredients',
    'expenses',
    'mood_settings',
    'mood_order_stats',
    'mood_feedback_config',
    'menu_item_mood_stats',
  ]
  
  let totalRecords = 0
  
  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT * FROM "${table}"`)
      const data = result.rows
      const filePath = path.join(backupDir, `${table}.json`)
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
      console.log(`✅ ${table}: ${data.length} records`)
      totalRecords += data.length
    } catch (error: any) {
      console.log(`⚠️  ${table}: Skipped (${error.message})`)
    }
  }
  
  // Create a manifest file
  const manifest = {
    createdAt: new Date().toISOString(),
    totalRecords,
    tables
  }
  fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  
  console.log(`\n✅ Backup complete! Total: ${totalRecords} records`)
  console.log(`📁 Location: ${backupDir}\n`)
  
  return backupDir
}

backupData()
  .catch(console.error)
  .finally(() => pool.end())
