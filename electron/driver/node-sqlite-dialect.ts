import { DatabaseSync } from 'node:sqlite'
import { Dialect, Kysely, SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler } from 'kysely'
import { NodeSqliteDriver } from './node-sqlite-driver'

export class NodeSqliteDialect implements Dialect {
  private _db?: DatabaseSync

  constructor(private filename: string) {}

  private get db(): DatabaseSync {
    if (!this._db) {
      this._db = new DatabaseSync(this.filename)
      this._db.exec('PRAGMA foreign_keys = ON')
      this._db.exec('PRAGMA journal_mode = WAL')
    }
    return this._db!
  }

  createDriver(): NodeSqliteDriver {
    return new NodeSqliteDriver(this.db)
  }

  createQueryCompiler() {
    return new SqliteQueryCompiler()
  }

  createAdapter() {
    return new SqliteAdapter()
  }

  createIntrospector(db: Kysely<unknown>) {
    return new SqliteIntrospector(db)
  }
}
