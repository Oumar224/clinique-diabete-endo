import type { DatabaseSync, SQLInputValue } from 'node:sqlite'
import { CompiledQuery, DatabaseConnection, QueryResult } from 'kysely'

type SQLValue = SQLInputValue | unknown

export class NodeSqliteConnection implements DatabaseConnection {
  constructor(private db: DatabaseSync) {}

  executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    const { sql, parameters } = compiledQuery
    const params = (parameters as SQLValue[]).map(p => {
      if (typeof p === 'boolean') return p ? 1 : 0
      if (p === undefined) return null
      return p as SQLInputValue
    })
    const stmt = this.db.prepare(sql)
    const returnsRows = /^\s*(select|pragma|with\s)/i.test(sql) || /\breturning\s/i.test(sql)

    if (returnsRows) {
      const rows = stmt.all(...params) as R[]
      return Promise.resolve({ rows })
    }

    const { changes, lastInsertRowid } = stmt.run(...params)
    return Promise.resolve({
      rows: [],
      numAffectedRows: BigInt(changes ?? 0),
      insertId: BigInt(lastInsertRowid ?? 0),
    } as QueryResult<R>)
  }

  async *streamQuery(): AsyncIterableIterator<never> {
    throw new Error('Streaming not supported with node:sqlite')
  }
}
