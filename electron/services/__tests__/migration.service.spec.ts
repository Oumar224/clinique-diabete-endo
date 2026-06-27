import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Kysely, sql } from 'kysely'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { NodeSqliteDialect } from '../../driver/node-sqlite-dialect'
import { MigrationService } from '../migration.service'

describe('MigrationService', () => {
  let db: Kysely<any>
  let dbDir: string
  let dbPath: string

  beforeEach(() => {
    dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-migration-'))
    dbPath = path.join(dbDir, 'test.db')
    const dialect = new NodeSqliteDialect(dbPath)
    db = new Kysely<any>({ dialect })
  })

  afterEach(async () => {
    await db.destroy().catch(() => {})
    fs.rmSync(dbDir, { recursive: true, force: true })
  })

  it('should run all 30 migrations successfully', async () => {
    const svc = new MigrationService(db)
    await expect(svc.runMigrations()).resolves.not.toThrow()

    const rows = await sql`SELECT name FROM kysely_migration`.execute(db)
    expect(rows.rows.length).toBe(30)

    const names = rows.rows.map((r: any) => r.name)
    expect(names).toContain('025-attachment-types')
    expect(names).toContain('026-remove-mutuelle')
    expect(names).toContain('027-add-assurance-mutuelle')
    expect(names).toContain('028-form-drafts')
    expect(names).toContain('029-patient-consentement-etude')
    expect(names).toContain('030-user-attachment-type')
  })

  it('should create all settings tables', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrations()

    const tables = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type='table'
    `.execute(db)

    const tableNames = tables.rows.map((r: any) => r.name)
    expect(tableNames).toContain('currency')
    expect(tableNames).toContain('services')
    expect(tableNames).toContain('medical_acts')
    expect(tableNames).toContain('act_price_history')
    expect(tableNames).toContain('medical_units')
    expect(tableNames).toContain('sites')
    expect(tableNames).toContain('specialties')
    expect(tableNames).toContain('fonctions')
  })

  it('should be idempotent and not throw on second run', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrations()
    // Second run should not fail (all migrations already applied)
    await expect(svc.runMigrations()).resolves.not.toThrow()
  })

  it('should seed default currencies', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrations()

    const currencies = await sql<{ code: string }>`
      SELECT code FROM currency ORDER BY code
    `.execute(db)

    const codes = currencies.rows.map((r: any) => r.code)
    expect(codes).toEqual(['EUR', 'GNF', 'XOF'])
  })
})
