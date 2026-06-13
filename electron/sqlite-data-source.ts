import { singleton, inject, container } from 'tsyringe'
import path from 'node:path'
import { app } from 'electron'
import { Kysely, sql } from 'kysely'
import { NodeSqliteDialect } from './driver/node-sqlite-dialect'
import type { DB } from './entities/database'
import { IAppDataSource } from './data-source'
import { MigrationService } from './services/migration.service'
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

    try {
      const migrationService = new MigrationService(this.instance as never)
      await migrationService.runMigrations()
    } catch (error) {
      console.error('[CDE] Migration failed, continuing:', error)
    }

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
      await Entity.dropSchema(this.instance as any)
      console.log(`Schema dropped for ${Entity.name}`)
    }
  }

  async recreateAllSchemas(): Promise<void> {
    const migrationService = new MigrationService(this.instance as never)
    await migrationService.destroyMigrationTables()
    for (const Entity of ENTITIES) {
      await Entity.recreateSchema(this.instance as any)
      console.log(`Schema recreated for ${Entity.name}`)
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
