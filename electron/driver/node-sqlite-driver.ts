import type { DatabaseSync } from 'node:sqlite'
import { CompiledQuery, DatabaseConnection, Driver } from 'kysely'
import { NodeSqliteConnection } from './node-sqlite-connection'

export class NodeSqliteDriver implements Driver {
  private connection!: NodeSqliteConnection

  constructor(private db: DatabaseSync) {}

  async init(): Promise<void> {
    this.connection = new NodeSqliteConnection(this.db)
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    return this.connection
  }

  async releaseConnection(): Promise<void> {}

  async beginTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw('BEGIN'))
  }

  async commitTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw('COMMIT'))
  }

  async rollbackTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw('ROLLBACK'))
  }

  async destroy(): Promise<void> {
    this.db.close()
  }
}
