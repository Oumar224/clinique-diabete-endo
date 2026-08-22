import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Kysely, sql } from 'kysely'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { NodeSqliteDialect } from '../../driver/node-sqlite-dialect'
import { up } from '../../migrations/072-seed-lab-exam-data'

describe('migration 072', { timeout: 30_000 }, () => {
  let db: Kysely<any>
  let dbDir: string
  let dbPath: string

  beforeEach(async () => {
    dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-migration-072-'))
    dbPath = path.join(dbDir, 'test.db')
    const dialect = new NodeSqliteDialect(dbPath)
    db = new Kysely<any>({ dialect })

    // Reproduce the legacy pre-hierarchy shape: lab_exams already exists
    // without parent_id, so 072's CREATE TABLE IF NOT EXISTS is a no-op.
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

    await sql`
      CREATE TABLE lab_exam_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `.execute(db)
  })

  afterEach(async () => {
    await db.destroy().catch(() => {})
    fs.rmSync(dbDir, { recursive: true, force: true })
  })

  async function labExamColumns(): Promise<string[]> {
    const cols = await sql<{ name: string }>`
      SELECT name FROM pragma_table_info('lab_exams')
    `.execute(db)
    return cols.rows.map((r: any) => r.name)
  }

  it('adds parent_id and seeds data against a legacy lab_exams table', async () => {
    const cols = await labExamColumns()
    expect(cols).not.toContain('parent_id')

    await expect(up(db)).resolves.toBeUndefined()

    const after = await labExamColumns()
    expect(after.filter(c => c === 'parent_id')).toHaveLength(1)

    const categories = await sql<{ code: string }>`
      SELECT code FROM lab_exam_categories ORDER BY sort_order
    `.execute(db)
    expect(categories.rows.map((r: any) => r.code)).toEqual(['imagerie', 'laboratoire'])

    const exams = await sql<{ n: number }>`
      SELECT COUNT(*) as n FROM lab_exams
    `.execute(db)
    expect(Number(exams.rows[0].n)).toBe(55)

    const linked = await sql<{ n: number }>`
      SELECT COUNT(*) as n FROM lab_exams WHERE parent_id IS NOT NULL
    `.execute(db)
    expect(Number(linked.rows[0].n)).toBe(43)
  })

  it('is idempotent when run twice', async () => {
    await up(db)
    await expect(up(db)).resolves.toBeUndefined()

    const cols = await labExamColumns()
    expect(cols.filter(c => c === 'parent_id')).toHaveLength(1)

    const categories = await sql<{ n: number }>`
      SELECT COUNT(*) as n FROM lab_exam_categories
    `.execute(db)
    expect(Number(categories.rows[0].n)).toBe(2)

    const exams = await sql<{ n: number }>`
      SELECT COUNT(*) as n FROM lab_exams
    `.execute(db)
    expect(Number(exams.rows[0].n)).toBe(55)
  })
})
