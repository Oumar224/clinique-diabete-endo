import { singleton, inject, delay } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import type { Kysely } from 'kysely'
import { CompiledQuery } from 'kysely'
import type { StorageAdapterInterface, StorageKey, Chunk } from '@automerge/automerge-repo'

// node:sqlite truncates TEXT values at NUL bytes, so keys are encoded as
// hex-encoded segments joined with ':' instead of using '\u0000' separators.
const KEY_SEPARATOR = ':'

@singleton()
export class AutomergeSqliteStorageAdapter implements StorageAdapterInterface {
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

  private encodeKey(key: StorageKey): string {
    return key.map((segment) => Buffer.from(segment, 'utf8').toString('hex')).join(KEY_SEPARATOR)
  }

  private decodeKey(key: string): StorageKey {
    return key.split(KEY_SEPARATOR).map((segment) => Buffer.from(segment, 'hex').toString('utf8'))
  }

  async load(key: StorageKey): Promise<Uint8Array | undefined> {
    const result = await this.db.executeQuery(CompiledQuery.raw(
      'SELECT data FROM automerge_documents WHERE document_id = ?',
      [this.encodeKey(key)]
    ))
    if (result.rows.length > 0) {
      const row = result.rows[0] as { data: Buffer }
      return new Uint8Array(row.data)
    }
    return undefined
  }

  async save(key: StorageKey, data: Uint8Array): Promise<void> {
    await this.db.executeQuery(CompiledQuery.raw(
      'INSERT OR REPLACE INTO automerge_documents (document_id, data, last_modified) VALUES (?, ?, ?)',
      [this.encodeKey(key), Buffer.from(data), Date.now()]
    ))
  }

  async remove(key: StorageKey): Promise<void> {
    await this.db.executeQuery(CompiledQuery.raw(
      'DELETE FROM automerge_documents WHERE document_id = ?',
      [this.encodeKey(key)]
    ))
  }

  async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    const prefix = this.encodeKey(keyPrefix)
    const result = await this.db.executeQuery(CompiledQuery.raw(
      'SELECT document_id, data FROM automerge_documents WHERE document_id LIKE ? ORDER BY document_id',
      [prefix + '%']
    ))
    return (result.rows as { document_id: string; data: Buffer }[]).map((row) => ({
      key: this.decodeKey(row.document_id),
      data: new Uint8Array(row.data),
    }))
  }

  async removeRange(keyPrefix: StorageKey): Promise<void> {
    const prefix = this.encodeKey(keyPrefix)
    await this.db.executeQuery(CompiledQuery.raw(
      'DELETE FROM automerge_documents WHERE document_id LIKE ?',
      [prefix + '%']
    ))
  }

  async saveBatch(entries: Array<[StorageKey, Uint8Array]>): Promise<void> {
    for (const [key, data] of entries) {
      await this.save(key, data)
    }
  }

  // Legacy helper used by AutomergeSyncService specs: returns distinct first
  // key segments (decoded) so old raw-uuid rows and new hex-encoded rows both
  // surface their document ids.
  async list(): Promise<string[]> {
    const result = await this.db.executeQuery(CompiledQuery.raw(
      'SELECT document_id FROM automerge_documents ORDER BY document_id'
    ))
    const seen = new Set<string>()
    const ids: string[] = []
    for (const row of result.rows as { document_id: string }[]) {
      const first = this.firstSegment(row.document_id)
      if (!seen.has(first)) {
        seen.add(first)
        ids.push(first)
      }
    }
    return ids
  }

  private firstSegment(key: string): string {
    if (key.length % 2 === 0 && /^[0-9a-f]+$/i.test(key)) {
      const decoded = Buffer.from(key, 'hex').toString('utf8')
      const first = decoded.split(KEY_SEPARATOR)[0]
      if (first) return first
    }
    return key.split(KEY_SEPARATOR)[0]
  }
}