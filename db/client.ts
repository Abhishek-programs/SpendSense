import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'
import { migrate } from 'drizzle-orm/expo-sqlite/migrator'
import * as schema from './schema'
import { migrations } from './migrations'

const sqlite = openDatabaseSync('spendsense.db', { enableChangeListener: true })
export const db = drizzle(sqlite, { schema })

const APP_TABLES = ['bucket_balances', 'buckets', 'goals', 'keyword_mappings', 'net_worth_snapshots', 'playbook', 'sure_shot_merchants', 'transactions']

type TableInfoRow = { name: string }

function hasColumn(table: string, column: string): boolean {
  const cols = sqlite.getAllSync(`PRAGMA table_info("${table}")`) as TableInfoRow[]
  return cols.some(c => c.name === column)
}

/** Idempotent fixes for installs that missed a migration (e.g. m0004 ef_start_balance). */
export function applySchemaPatches() {
  const playbookExists = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='playbook'`
  )
  if (playbookExists && !hasColumn('playbook', 'ef_start_balance')) {
    sqlite.execSync(`ALTER TABLE \`playbook\` ADD COLUMN \`ef_start_balance\` real DEFAULT 0 NOT NULL`)
  }

  const bucketsExists = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='buckets'`
  )
  if (bucketsExists) {
    const foodBucket = sqlite.getFirstSync<{ id: string }>(
      `SELECT id FROM buckets WHERE id = 'food' OR name = 'Food' LIMIT 1`
    )
    if (!foodBucket) {
      sqlite.execSync(
        `INSERT INTO \`buckets\` (\`id\`, \`name\`, \`type\`, \`monthly_amount\`, \`color\`, \`icon\`, \`sort_order\`, \`is_active\`, \`show_on_home\`)
         VALUES ('food', 'Food', 'spending', 8000, '#F97316', '🍽️', 3, 1, 1)`
      )
    }

    const foodId = foodBucket?.id ?? 'food'
    const foodKeyword = sqlite.getFirstSync(
      `SELECT id FROM keyword_mappings WHERE keyword = 'food' LIMIT 1`
    )
    if (!foodKeyword) {
      sqlite.execSync(
        `INSERT INTO \`keyword_mappings\` (\`keyword\`, \`bucket_id\`) VALUES ('food', '${foodId}')`
      )
    }

    if (!hasColumn('buckets', 'linked_goal_id')) {
      sqlite.execSync(`ALTER TABLE \`buckets\` ADD COLUMN \`linked_goal_id\` text`)
    }
    if (!hasColumn('buckets', 'goal_bucket_role')) {
      sqlite.execSync(`ALTER TABLE \`buckets\` ADD COLUMN \`goal_bucket_role\` text`)
    }
    if (!hasColumn('buckets', 'accumulates')) {
      sqlite.execSync(`ALTER TABLE \`buckets\` ADD COLUMN \`accumulates\` integer DEFAULT false NOT NULL`)
    }
    if (!hasColumn('buckets', 'accumulation_cap')) {
      sqlite.execSync(`ALTER TABLE \`buckets\` ADD COLUMN \`accumulation_cap\` real`)
    }

    const personalBucket = sqlite.getFirstSync<{ id: string }>(
      `SELECT id FROM buckets WHERE id = 'personal' OR name = 'Personal' LIMIT 1`
    )
    if (!personalBucket) {
      sqlite.execSync(
        `INSERT INTO \`buckets\` (\`id\`, \`name\`, \`type\`, \`monthly_amount\`, \`color\`, \`icon\`, \`sort_order\`, \`is_active\`, \`show_on_home\`, \`accumulates\`, \`accumulation_cap\`)
         VALUES ('personal', 'Personal', 'spending', 5000, '#7C3AED', '👤', 4, 1, 1, 1, 20000)`
      )
    }

    const personalId = personalBucket?.id ?? 'personal'
    const personalKeyword = sqlite.getFirstSync(
      `SELECT id FROM keyword_mappings WHERE keyword = 'personal' LIMIT 1`
    )
    if (!personalKeyword) {
      sqlite.execSync(
        `INSERT INTO \`keyword_mappings\` (\`keyword\`, \`bucket_id\`) VALUES ('personal', '${personalId}')`
      )
    }
  }

  const playbookTable = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='playbook'`
  )
  if (playbookTable && !hasColumn('playbook', 'last_balance_rollover_month')) {
    sqlite.execSync(`ALTER TABLE \`playbook\` ADD COLUMN \`last_balance_rollover_month\` text`)
  }

  const balancesTable = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='bucket_balances'`
  )
  if (!balancesTable) {
    sqlite.execSync(
      `CREATE TABLE \`bucket_balances\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`bucket_id\` text NOT NULL,
        \`balance\` real DEFAULT 0 NOT NULL,
        \`updated_at\` text NOT NULL
      )`
    )
  }

  const goalsExists = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='goals'`
  )
  if (goalsExists) {
    if (!hasColumn('goals', 'payment_mode')) {
      sqlite.execSync(`ALTER TABLE \`goals\` ADD COLUMN \`payment_mode\` text DEFAULT 'pay_in_full' NOT NULL`)
    }
    if (!hasColumn('goals', 'upfront_amount')) {
      sqlite.execSync(`ALTER TABLE \`goals\` ADD COLUMN \`upfront_amount\` real`)
    }
    if (!hasColumn('goals', 'emi_tenure_months')) {
      sqlite.execSync(`ALTER TABLE \`goals\` ADD COLUMN \`emi_tenure_months\` integer`)
    }
    if (!hasColumn('goals', 'is_enabled')) {
      sqlite.execSync(`ALTER TABLE \`goals\` ADD COLUMN \`is_enabled\` integer DEFAULT true NOT NULL`)
    }
  }
}

export async function runMigrations() {
  // Check if app tables exist but the migration was never recorded.
  // This happens when tables were created outside Drizzle's migrator.
  const appTableExists = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='buckets'`
  )
  let migrationRecorded = false
  try {
    const row = sqlite.getFirstSync(`SELECT hash FROM __drizzle_migrations LIMIT 1`)
    migrationRecorded = !!row
  } catch {
    // __drizzle_migrations table doesn't exist yet — that's fine
  }

  if (appTableExists && !migrationRecorded) {
    // Dirty state: tables exist but migrator doesn't know. Nuke and redo.
    for (const table of [...APP_TABLES, '__drizzle_migrations']) {
      sqlite.execSync(`DROP TABLE IF EXISTS "${table}"`)
    }
  }

  try {
    await migrate(db, migrations)
    applySchemaPatches()
    console.log('✅ DB migrations applied successfully')
  } catch (error) {
    console.error('❌ Migration failed, attempting Hard Reset:', error)
    // If migration fails, it's likely a schema conflict. Nuke everything and retry.
    for (const table of [...APP_TABLES, '__drizzle_migrations']) {
      sqlite.execSync(`DROP TABLE IF EXISTS "${table}"`)
    }
    // Re-run migration from scratch
    await migrate(db, migrations)
    applySchemaPatches()
    console.log('✅ DB recovered after Hard Reset')
  }
}
