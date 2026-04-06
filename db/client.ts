import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'
import { migrate } from 'drizzle-orm/expo-sqlite/migrator'
import * as schema from './schema'
import { migrations } from './migrations'

const sqlite = openDatabaseSync('spendsense.db', { enableChangeListener: true })
export const db = drizzle(sqlite, { schema })

// Run migrations using drizzle's built-in migrator
export async function ensureMigrationsApplied() {
  try {
    await migrate(db, migrations)
    return true
  } catch (error) {
    console.error('Failed to apply migrations:', error)
    throw error
  }
}
