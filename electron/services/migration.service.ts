import { type Kysely, type Migration, type MigrationProvider, Migrator, sql } from 'kysely'
import * as InitialSchema from '../migrations/001-initial-schema'
import * as FixUserSchema from '../migrations/002-fix-user-schema'
import * as AddSettings from '../migrations/003-add-settings'
import * as InvoiceSchema from '../migrations/004-invoice'
import * as SettingsTables from '../migrations/005-settings-tables'

class StaticMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    return {
      '001-initial-schema': InitialSchema,
      '002-fix-user-schema': FixUserSchema,
      '003-add-settings': AddSettings,
      '004-invoice': InvoiceSchema,
      '005-settings-tables': SettingsTables,
    }
  }
}

export class MigrationService {
  private migrator: Migrator
  private db: Kysely<unknown>

  constructor(db: Kysely<unknown>) {
    this.db = db
    this.migrator = new Migrator({
      db,
      provider: new StaticMigrationProvider(),
    })
  }

  async runMigrations(): Promise<void> {
    const { error, results } = await this.migrator.migrateToLatest()
    if (error) {
      console.error('[CDE] Migration failed:', error)
      throw error
    }
    if (results) {
      for (const r of results) {
        console.log(`[CDE] Migration "${r.migrationName}": ${r.direction} - ${r.status}`)
      }
    }
  }

  async destroyMigrationTables(): Promise<void> {
    await sql`DROP TABLE IF EXISTS kysely_migration`.execute(this.db)
    await sql`DROP TABLE IF EXISTS kysely_migration_lock`.execute(this.db)
  }
}
