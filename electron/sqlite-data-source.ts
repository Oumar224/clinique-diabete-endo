import { singleton, inject, container } from 'tsyringe'
import path from 'node:path'
import { app } from 'electron'
import { Kysely, sql } from 'kysely'
import { NodeSqliteDialect } from './driver/node-sqlite-dialect'
import type { DB } from './entities/database'
import { IAppDataSource } from './data-source'
import { MigrationService } from './services/migration.service'
import { repairCriticalSchema } from './services/schema-repair'
import { SeedService } from './services/seed.service'
import { AutomergeSyncService } from './automerge/automerge-sync.service'
import { EntityRegistry } from './automerge/entity-registry'
import { ENTITIES } from './entities/database'

@singleton()
export class AppDatabaseDatasource implements IAppDataSource<Kysely<DB>> {
  private readonly instance: Kysely<DB>

  constructor(
    @inject('DB_PATH', {isOptional:true}) dbPath?: string,
  ) {
    const finalPath = dbPath || path.join(app.getPath('userData'), 'cde-clinique.db')
    const dialect = new NodeSqliteDialect(finalPath)
    this.instance = new Kysely<DB>({ dialect })
  }

  async initialize(): Promise<Kysely<DB>> {
    // Disable FK constraints during migration to avoid issues
    // on existing databases where tables may be partially created
    await sql`PRAGMA foreign_keys = OFF`.execute(this.instance)

    const migrationService = new MigrationService(this.instance as never)
    try {
      await migrationService.runMigrations()
    } catch (error) {
      // Migrations run WITHOUT a transaction (SqliteAdapter.supportsTransactionalDdl
      // is false), so a failed chain can leave partial migrations committed and
      // recorded. Never boot into that state silently.
      console.error('[CDE] Migration failed:', error)

      // Recovery pass: patch critical columns so the retry has a chance to
      // succeed (e.g. a later migration in the chain can now find the columns
      // it depends on, as with patient_clinical_documents.source/pdf_path).
      await repairCriticalSchema(this.instance)

      try {
        await migrationService.runMigrations()
        console.log('[CDE] Migration retry succeeded after schema repair')
      } catch (retryError) {
        // Do NOT proceed into seed()/normal boot with a broken schema. The
        // throw propagates to the caller (main.ts), which logs it, shows an
        // error dialog, and quits the app instead of booting into a broken DB.
        const message = retryError instanceof Error ? retryError.message : String(retryError)
        throw new Error(`[CDE] Migration failed after schema repair and retry — refusing to start with a broken schema: ${message}`)
      }
    }

    // Ensure critical columns exist (recovery for failed/partial migrations)
    await repairCriticalSchema(this.instance)

    // Ensure critical settings tables exist (recovery for failed migrations)
    await this.ensureSettingsTables()

    await sql`PRAGMA foreign_keys = ON`.execute(this.instance)

    const seedService = new SeedService(this.instance as never)
    await seedService.seed()

    if (EntityRegistry.getInstance().getAllTypes().length === 0) {
      await this.triggerEntityRegistration()
    }

    try {
      const syncService = container.resolve(AutomergeSyncService)
      await syncService.initialize()
      console.log('[CDE] AutomergeSyncService initialized')
    } catch (error) {
      console.error('[CDE] Failed to initialize AutomergeSyncService:', error)
    }

    return this.instance
  }

  async dropAllSchemas(): Promise<void> {
    const ENTITIES_REVERSE = [...ENTITIES].reverse()
    for (const Entity of ENTITIES_REVERSE) {
      if (Entity.dropSchema) {
        await Entity.dropSchema(this.instance as any)
        console.log(`Schema dropped for ${Entity.name}`)
      }
    }
  }

  async recreateAllSchemas(): Promise<void> {
    const migrationService = new MigrationService(this.instance as never)
    await migrationService.destroyMigrationTables()
    for (const Entity of ENTITIES) {
      if (Entity.recreateSchema) {
        await Entity.recreateSchema(this.instance as any)
        console.log(`Schema recreated for ${Entity.name}`)
      }
    }
  }

  private async ensureSettingsTables(): Promise<void> {
    // Check if settings tables are missing (migration 005+ may have failed)
    try {
      const hasCurrency = await sql<{ name: string }>`
        SELECT name FROM sqlite_master WHERE type='table' AND name='currency'
      `.execute(this.instance)

      if (hasCurrency.rows.length === 0) {
        console.warn('[CDE] Tables de paramètres manquantes — recréation...')

        await sql`
          CREATE TABLE IF NOT EXISTS currency (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            symbol TEXT NOT NULL,
            decimals INTEGER NOT NULL DEFAULT 0 CHECK(decimals >= 0),
            is_active INTEGER NOT NULL DEFAULT 1
          )
        `.execute(this.instance)

        await sql`
          CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            duration INTEGER NOT NULL DEFAULT 30,
            color TEXT DEFAULT '#0E5C5B',
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
          )
        `.execute(this.instance)

        await sql`
          CREATE TABLE IF NOT EXISTS medical_acts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            label TEXT NOT NULL,
            price REAL NOT NULL CHECK(price >= 0),
            currency_code TEXT NOT NULL DEFAULT 'GNF' REFERENCES currency(code),
            service_id INTEGER NOT NULL REFERENCES services(id),
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
          )
        `.execute(this.instance)

        await sql`
          CREATE TABLE IF NOT EXISTS act_price_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            act_id INTEGER NOT NULL REFERENCES medical_acts(id),
            old_price REAL,
            new_price REAL NOT NULL,
            change_reason TEXT,
            changed_at TEXT DEFAULT (datetime('now'))
          )
        `.execute(this.instance)

        // Seed currencies
        await sql`
          INSERT OR IGNORE INTO currency (code, name, symbol, decimals) VALUES
            ('GNF', 'Franc Guinéen', 'FG', 0),
            ('EUR', 'Euro', '€', 2),
            ('XOF', 'Franc CFA', 'FCFA', 0)
        `.execute(this.instance)

        console.log('[CDE] Tables de paramètres recréées avec succès')
      }
    } catch (err) {
      console.error('[CDE] Échec de la recréation des tables de paramètres:', err)
    }
  }

  private async triggerEntityRegistration(): Promise<void> {
    for (const Entity of ENTITIES) {
      if (Entity.register) {
        Entity.register()
      }
    }
  }

  getInstance(): Kysely<DB> {
    return this.instance
  }

  async destroy(): Promise<void> {
    await this.instance.destroy()
  }
}
