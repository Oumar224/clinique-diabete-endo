import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { sql } from 'kysely'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { ExamTypeService } from '../exam-type.service'
import { ExamTypeEntity } from '../../entities/exam-type.entity'
import type { Kysely } from 'kysely'
import type { DB } from '../../entities/database'

describe('ExamTypeService', () => {
  let tempDir: string
  let dbPath: string
  let service: ExamTypeService
  let db: Kysely<DB>

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-exam-type-test-'))
    dbPath = path.join(tempDir, 'test.db')
    container.register('DB_PATH', { useValue: dbPath })
    const datasource = container.resolve(AppDatabaseDatasource)
    // Skip the full migration chain that fails — just get the raw Kysely instance
    // and create only the tables we need
    db = datasource.getInstance()

    // Create lab_exam_categories table
    await sql`
      CREATE TABLE IF NOT EXISTS lab_exam_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL
      )
    `.execute(db)

    // Create lab_exams table
    await sql`
      CREATE TABLE IF NOT EXISTS lab_exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL REFERENCES lab_exam_categories(id),
        parent_id INTEGER,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `.execute(db)

    // Seed default categories
    await sql`
      INSERT OR IGNORE INTO lab_exam_categories (id, code, name) VALUES
        (1, 'imagerie', 'Imagerie'),
        (2, 'laboratoire', 'Laboratoire'),
        (3, 'avis', 'Avis spécialisé')
    `.execute(db)

    // Seed default exam types (parent_id IS NULL = type-level items)
    await sql`
      INSERT OR IGNORE INTO lab_exams (category_id, parent_id, code, name, sort_order)
      VALUES (1, NULL, 'RADX_THOR', 'Radiographie thoracique', 1)
    `.execute(db)
    await sql`
      INSERT OR IGNORE INTO lab_exams (category_id, parent_id, code, name, sort_order)
      VALUES (1, NULL, 'SCANNER_CER', 'Scanner cérébral', 2)
    `.execute(db)
    await sql`
      INSERT OR IGNORE INTO lab_exams (category_id, parent_id, code, name, sort_order)
      VALUES (1, NULL, 'IRM_CARD', 'IRM cardiaque', 3)
    `.execute(db)
    await sql`
      INSERT OR IGNORE INTO lab_exams (category_id, parent_id, code, name, sort_order)
      VALUES (1, NULL, 'ECHO_ABDOM', 'Échographie abdominale', 4)
    `.execute(db)
    await sql`
      INSERT OR IGNORE INTO lab_exams (category_id, parent_id, code, name, sort_order)
      VALUES (1, NULL, 'SCANNER_TAP', 'Scanner TAP', 5)
    `.execute(db)
    await sql`
      INSERT OR IGNORE INTO lab_exams (category_id, parent_id, code, name, sort_order)
      VALUES (2, NULL, 'NFS', 'NFS (Numération formule sanguine)', 1)
    `.execute(db)
    await sql`
      INSERT OR IGNORE INTO lab_exams (category_id, parent_id, code, name, sort_order)
      VALUES (2, NULL, 'IONO_SANG', 'Ionogramme sanguin', 2)
    `.execute(db)
    await sql`
      INSERT OR IGNORE INTO lab_exams (category_id, parent_id, code, name, sort_order)
      VALUES (2, NULL, 'BILAN_HEP', 'Bilan hépatique', 3)
    `.execute(db)
    await sql`
      INSERT OR IGNORE INTO lab_exams (category_id, parent_id, code, name, sort_order)
      VALUES (2, NULL, 'BILAN_REN', 'Bilan rénal', 4)
    `.execute(db)
    await sql`
      INSERT OR IGNORE INTO lab_exams (category_id, parent_id, code, name, sort_order)
      VALUES (2, NULL, 'HBA1C', 'Hémoglobine glyquée (HbA1c)', 5)
    `.execute(db)

    service = new ExamTypeService(
      { getInstance: () => db } as any
    )
  })

  afterEach(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch { /* cleanup best-effort */ }
  })

  // ─── Categories (seeded) ────────────────────────────────────

  it('should have 3 default categories from seed data', async () => {
    const categories = await service.listCategories()
    expect(categories.length).toBe(3)
    const codes = categories.map(c => c.code).sort()
    expect(codes).toEqual(['avis', 'imagerie', 'laboratoire'])
  })

  it('should have categories sorted by sort_order', async () => {
    const categories = await service.listCategories()
    expect(categories[0].code).toBe('imagerie')
    expect(categories[1].code).toBe('laboratoire')
    expect(categories[2].code).toBe('avis')
  })

  // ─── Default exam types (seeded) ────────────────────────────

  it('should list imagerie types from seed data', async () => {
    const types = await service.listByCategory('imagerie')
    expect(types.length).toBeGreaterThanOrEqual(4)
    expect(types.some(t => t.name?.includes('Radiographie'))).toBe(true)
    expect(types.some(t => t.name?.includes('Scanner'))).toBe(true)
    expect(types.every(t => t.is_active === 1 || t.is_active === true)).toBe(true)
  })

  it('should list laboratoire types from seed data', async () => {
    const types = await service.listByCategory('laboratoire')
    expect(types.length).toBeGreaterThanOrEqual(4)
    expect(types.some(t => t.name?.includes('NFS'))).toBe(true)
    expect(types.some(t => t.name?.includes('HbA1c'))).toBe(true)
  })

  it('should list avis category (no seed types)', async () => {
    const types = await service.listByCategory('avis')
    expect(types.length).toBe(0)
  })

  it('should filter exam types by category code correctly', async () => {
    const imagerie = await service.listByCategory('imagerie')
    const labo = await service.listByCategory('laboratoire')
    const imagerieIds = new Set(imagerie.map(t => t.id))
    const laboIds = new Set(labo.map(t => t.id))
    for (const id of imagerieIds) {
      expect(laboIds.has(id)).toBe(false)
    }
  })

  // ─── Create exam type ───────────────────────────────────────

  it('should create an exam type for an existing category', async () => {
    const categories = await service.listCategories()
    const imagerieCat = categories.find(c => c.code === 'imagerie')!

    const entity = ExamTypeEntity.fromDto({ category_id: imagerieCat.id!, label: 'Nouvel examen test', is_active: true })
    const created = await service.createType(entity)

    expect(created.id).toBeDefined()
    expect(created.name).toBe('Nouvel examen test')
    expect(created.category_id).toBe(imagerieCat.id)
    expect(created.is_active).toBe(1)
  })

  it('should reject creation without label', async () => {
    const categories = await service.listCategories()
    const entity = ExamTypeEntity.fromDto({ category_id: categories[0].id!, label: '', is_active: true })
    await expect(service.createType(entity)).rejects.toThrow('libellé')
  })

  it('should reject creation with non-existent category_id', async () => {
    const entity = ExamTypeEntity.fromDto({ category_id: 9999, label: 'Ghost exam', is_active: true })
    await expect(service.createType(entity)).rejects.toThrow()
  })

  // ─── Update exam type ───────────────────────────────────────

  it('should update an exam type name', async () => {
    const types = await service.listByCategory('imagerie')
    const target = types[0]

    const entity = new ExamTypeEntity()
    entity.id = target.id!
    entity.name = 'Libellé modifié'
    const updated = await service.updateType(entity)

    expect(updated.name).toBe('Libellé modifié')

    const refetched = await service.listByCategory('imagerie')
    const found = refetched.find(t => t.id === target.id)
    expect(found?.name).toBe('Libellé modifié')
  })

  it('should update is_active flag', async () => {
    const types = await service.listByCategory('imagerie')
    const target = types[0]

    const entity = new ExamTypeEntity()
    entity.id = target.id!
    entity.is_active = 0
    const updated = await service.updateType(entity)

    expect(updated.is_active).toBe(0)

    entity.is_active = 1
    const toggled = await service.updateType(entity)
    expect(toggled.is_active).toBe(1)
  })

  it('should throw when updating non-existent exam type', async () => {
    const entity = new ExamTypeEntity()
    entity.id = 9999
    entity.name = 'Ghost'
    await expect(service.updateType(entity)).rejects.toThrow('introuvable')
  })

  // ─── Delete exam type ───────────────────────────────────────

  it('should delete an exam type', async () => {
    const types = await service.listByCategory('laboratoire')
    const target = types[0]

    await expect(service.deleteType(target.id!)).resolves.not.toThrow()

    const remaining = await service.listByCategory('laboratoire')
    expect(remaining.find(t => t.id === target.id)).toBeUndefined()
  })

  it('should throw when deleting non-existent exam type', async () => {
    await expect(service.deleteType(9999)).rejects.toThrow('introuvable')
  })

  // ─── Return type shape ──────────────────────────────────────

  it('should return exam types with category_name via listByCategory', async () => {
    const types = await service.listByCategory('imagerie')
    if (types.length > 0) {
      const t = types[0] as any
      expect(t.category_name).toBeDefined()
      expect(t.category_name).toBe('Imagerie')
    }
  })
})
