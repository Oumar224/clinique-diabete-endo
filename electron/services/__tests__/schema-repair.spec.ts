import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Kysely, sql } from 'kysely'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { NodeSqliteDialect } from '../../driver/node-sqlite-dialect'
import { MigrationService } from '../migration.service'
import { repairCriticalSchema } from '../schema-repair'

describe('repairCriticalSchema', { timeout: 30_000 }, () => {
  let db: Kysely<any>
  let dbDir: string
  let dbPath: string

  beforeEach(() => {
    dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-repair-'))
    dbPath = path.join(dbDir, 'test.db')
    const dialect = new NodeSqliteDialect(dbPath)
    db = new Kysely<any>({ dialect })
  })

  afterEach(async () => {
    await db.destroy().catch(() => {})
    fs.rmSync(dbDir, { recursive: true, force: true })
  })

  async function movementColumns(): Promise<string[]> {
    const cols = await sql<{ name: string }>`
      SELECT name FROM pragma_table_info('encounter_movements')
    `.execute(db)
    return cols.rows.map((r: any) => r.name)
  }

  async function encounterColumns(): Promise<string[]> {
    const cols = await sql<{ name: string }>`
      SELECT name FROM pragma_table_info('encounters')
    `.execute(db)
    return cols.rows.map((r: any) => r.name)
  }

  async function appointmentColumns(): Promise<string[]> {
    const cols = await sql<{ name: string }>`
      SELECT name FROM pragma_table_info('appointment')
    `.execute(db)
    return cols.rows.map((r: any) => r.name)
  }

  async function clinicalDocColumns(): Promise<string[]> {
    const cols = await sql<{ name: string }>`
      SELECT name FROM pragma_table_info('patient_clinical_documents')
    `.execute(db)
    return cols.rows.map((r: any) => r.name)
  }

  async function labExamColumns(): Promise<string[]> {
    const cols = await sql<{ name: string }>`
      SELECT name FROM pragma_table_info('lab_exams')
    `.execute(db)
    return cols.rows.map((r: any) => r.name)
  }

  it('should repair a partial database', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrationsTo('069-exam-categories-types')

    await repairCriticalSchema(db)

    const movementCols = await movementColumns()
    expect(movementCols).toContain('created_by')
    expect(movementCols).toContain('from_service_id')
    expect(movementCols).toContain('motif')

    const encounterCols = await encounterColumns()
    expect(encounterCols).toContain('care_unit_id')

    const appointmentCols = await appointmentColumns()
    expect(appointmentCols).toContain('service_id')
    expect(appointmentCols).toContain('care_unit_id')
  })

  it('should be idempotent', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrationsTo('069-exam-categories-types')

    await repairCriticalSchema(db)
    await repairCriticalSchema(db)

    const movementCols = await movementColumns()
    expect(movementCols.filter(c => c === 'created_by')).toHaveLength(1)
    expect(movementCols.filter(c => c === 'from_service_id')).toHaveLength(1)
    expect(movementCols.filter(c => c === 'motif')).toHaveLength(1)

    const encounterCols = await encounterColumns()
    expect(encounterCols.filter(c => c === 'care_unit_id')).toHaveLength(1)
  })

  it('should be a no-op on a fully migrated database', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrations()

    await repairCriticalSchema(db)

    const movementCols = await movementColumns()
    expect(movementCols.filter(c => c === 'created_by')).toHaveLength(1)
    expect(movementCols.filter(c => c === 'from_service_id')).toHaveLength(1)
    expect(movementCols.filter(c => c === 'motif')).toHaveLength(1)

    const encounterCols = await encounterColumns()
    expect(encounterCols.filter(c => c === 'care_unit_id')).toHaveLength(1)

    // 078 columns are present exactly once (round-2 regression pin)
    const docCols = await clinicalDocColumns()
    expect(docCols.filter(c => c === 'source')).toHaveLength(1)
    expect(docCols.filter(c => c === 'pdf_path')).toHaveLength(1)
  })

  it('should add source and pdf_path to patient_clinical_documents when migration 078 never ran', async () => {
    const svc = new MigrationService(db)
    // Stop before 078: source/pdf_path do not exist yet.
    await svc.runMigrationsTo('077-encounter-movements-new-fields')

    let docCols = await clinicalDocColumns()
    expect(docCols).not.toContain('source')
    expect(docCols).not.toContain('pdf_path')

    await repairCriticalSchema(db)

    docCols = await clinicalDocColumns()
    expect(docCols).toContain('source')
    expect(docCols).toContain('pdf_path')

    // Column definition must mirror migration 078: NOT NULL + DEFAULT 'created'.
    const sourceMeta = await sql<{ notnull: number; dflt_value: string | null }>`
      SELECT "notnull", dflt_value FROM pragma_table_info('patient_clinical_documents')
      WHERE name = 'source'
    `.execute(db)
    expect(sourceMeta.rows[0].notnull).toBe(1)
    expect(sourceMeta.rows[0].dflt_value).toBe("'created'")

    // Behavioral check: an insert without source/pdf_path gets the 078 defaults,
    // exactly as clinical-document.service.ts expects on the hot path.
    await sql`PRAGMA foreign_keys = OFF`.execute(db)
    await sql`
      INSERT INTO patient_clinical_documents (id, contact_id, document_type_id, created_by)
      VALUES ('pcd-repair-test-1', '1', '11111111-1111-4111-1111-111111111111', '1')
    `.execute(db)
    await sql`PRAGMA foreign_keys = ON`.execute(db)

    const row = await sql<{ source: string; pdf_path: string | null }>`
      SELECT source, pdf_path FROM patient_clinical_documents WHERE id = 'pcd-repair-test-1'
    `.execute(db)
    expect(row.rows[0].source).toBe('created')
    expect(row.rows[0].pdf_path).toBeNull()
  })

  it('should be idempotent for patient_clinical_documents columns', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrationsTo('077-encounter-movements-new-fields')

    await repairCriticalSchema(db)
    await repairCriticalSchema(db)

    const docCols = await clinicalDocColumns()
    expect(docCols.filter(c => c === 'source')).toHaveLength(1)
    expect(docCols.filter(c => c === 'pdf_path')).toHaveLength(1)
  })

  it('should add parent_id to a legacy lab_exams table when migration 072 predates the hierarchy column', async () => {
    // Simulate a legacy DB: lab_exams exists in its pre-hierarchy shape (no
    // parent_id). Build it manually without running 072.
    await sql`
      CREATE TABLE lab_exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        code TEXT,
        name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `.execute(db)

    let cols = await labExamColumns()
    expect(cols).not.toContain('parent_id')

    await repairCriticalSchema(db)

    cols = await labExamColumns()
    expect(cols).toContain('parent_id')
  })

  it('should be idempotent for lab_exams parent_id', async () => {
    await sql`
      CREATE TABLE lab_exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        code TEXT,
        name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `.execute(db)

    await repairCriticalSchema(db)
    await repairCriticalSchema(db)

    const cols = await labExamColumns()
    expect(cols.filter(c => c === 'parent_id')).toHaveLength(1)
  })

  it('should not throw on an empty database', async () => {
    await expect(repairCriticalSchema(db)).resolves.toBeUndefined()
  })
})
