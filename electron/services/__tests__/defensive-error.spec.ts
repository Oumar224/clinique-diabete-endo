import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Kysely } from 'kysely'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { NodeSqliteDialect } from '../../driver/node-sqlite-dialect'
import { CurrencyService } from '../currency.service'
import { AppDatabaseDatasource } from '../../sqlite-data-source'

describe('Defensive error handling', () => {
  let db: Kysely<any>
  let dbDir: string
  let dbPath: string

  beforeEach(() => {
    dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-defensive-'))
    dbPath = path.join(dbDir, 'test.db')
    const dialect = new NodeSqliteDialect(dbPath)
    db = new Kysely<any>({ dialect })
  })

  afterEach(async () => {
    await db.destroy().catch(() => {})
    fs.rmSync(dbDir, { recursive: true, force: true })
  })

  it('should throw French error message when currency table is missing', async () => {
    // Create a mock AppDatabaseDatasource that returns the raw (empty) Kysely instance.
    // No migrations have run, so the currency table does not exist.
    const mockDatasource = {
      getInstance: () => db,
    } as unknown as AppDatabaseDatasource

    // Manually instantiate CurrencyService with our mock datasource
    const service = new CurrencyService(mockDatasource)

    // Attempting to create a currency without the table must throw the French error
    await expect(
      service.create({ code: 'USD', name: 'US Dollar', symbol: '$' })
    ).rejects.toThrow(
      'La base de données n\'est pas initialisée correctement. Contactez l\'administrateur.'
    )
  })

  it('should return empty list from list() when currency table is missing', async () => {
    const mockDatasource = {
      getInstance: () => db,
    } as unknown as AppDatabaseDatasource

    const service = new CurrencyService(mockDatasource)

    // list() should gracefully return an empty array for a missing table
    const result = await service.list()
    expect(result).toEqual([])
  })

  it('should return null from getByCode() when currency table is missing', async () => {
    const mockDatasource = {
      getInstance: () => db,
    } as unknown as AppDatabaseDatasource

    const service = new CurrencyService(mockDatasource)

    // getByCode() should gracefully return null for a missing table
    const result = await service.getByCode('USD')
    expect(result).toBeNull()
  })
})
