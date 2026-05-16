import type { Kysely } from 'kysely'
import { CompiledQuery } from 'kysely'

export class AutomergeDocumentEntity {
  document_id?: string
  data?: Uint8Array
  last_modified?: number

  static async createSchema(db: Kysely<unknown>): Promise<void> {
    await db.executeQuery(CompiledQuery.raw(`
      CREATE TABLE IF NOT EXISTS automerge_documents (
        document_id TEXT PRIMARY KEY,
        data BLOB NOT NULL,
        last_modified INTEGER NOT NULL
      )
    `))
  }

  static async dropSchema(db: Kysely<unknown>): Promise<void> {
    await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS automerge_documents'))
  }

  static async recreateSchema(db: Kysely<unknown>): Promise<void> {
    await this.dropSchema(db)
    await this.createSchema(db)
  }

  static documentType(): string {
    return 'AutomergeDocument'
  }

  static documentSchema(): any {
    return {}
  }

  static register(): void {
    // Storage only - no registration needed in EntityRegistry
  }
}
