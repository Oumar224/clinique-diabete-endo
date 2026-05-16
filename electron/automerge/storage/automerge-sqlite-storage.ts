import { singleton, inject, delay } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import type { Kysely } from 'kysely'
import { CompiledQuery } from 'kysely'

@singleton()
export class AutomergeSqliteStorageAdapter {
  private readonly db: Kysely<unknown>

  constructor(
    @inject(delay(() => AppDatabaseDatasource)) datasource: AppDatabaseDatasource,
  ) {
    this.db = datasource.getInstance() as unknown as Kysely<unknown>
  }

  async initialize(): Promise<void> {
    await this.db.executeQuery(CompiledQuery.raw(`
      CREATE TABLE IF NOT EXISTS automerge_documents (
        document_id TEXT PRIMARY KEY,
        data BLOB NOT NULL,
        last_modified INTEGER NOT NULL
      )
    `))
  }

  async save(documentId: string, data: Uint8Array): Promise<void> {
    await this.db.executeQuery(CompiledQuery.raw(
      'INSERT OR REPLACE INTO automerge_documents (document_id, data, last_modified) VALUES (?, ?, ?)',
      [documentId, Buffer.from(data), Date.now()]
    ))
  }

  async load(documentId: string): Promise<Uint8Array | undefined> {
    const result = await this.db.executeQuery(CompiledQuery.raw(
      'SELECT data FROM automerge_documents WHERE document_id = ?',
      [documentId]
    ))
    if (result.rows.length > 0) {
      const row = result.rows[0] as { data: Buffer }
      return new Uint8Array(row.data)
    }
    return undefined
  }

  async remove(documentId: string): Promise<void> {
    await this.db.executeQuery(CompiledQuery.raw(
      'DELETE FROM automerge_documents WHERE document_id = ?',
      [documentId]
    ))
  }

  async list(): Promise<string[]> {
    const result = await this.db.executeQuery(CompiledQuery.raw(
      'SELECT document_id FROM automerge_documents'
    ))
    return (result.rows as { document_id: string }[]).map(r => r.document_id)
  }
}
