import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { sql } from 'kysely'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { ExamResultService } from '../exam-result.service'
import { ExamResultEntity } from '../../entities/exam-result.entity'
import type { Kysely } from 'kysely'
import type { DB } from '../../entities/database'

describe('ExamResultService.listByPatient', () => {
  let tempDir: string
  let dbPath: string
  let service: ExamResultService
  let db: Kysely<DB>

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-exam-result-test-'))
    dbPath = path.join(tempDir, 'test.db')
    container.register('DB_PATH', { useValue: dbPath })
    const datasource = container.resolve(AppDatabaseDatasource)
    // Skip the migration chain — create only the tables needed by listByPatient
    db = datasource.getInstance()

    await sql`
      CREATE TABLE IF NOT EXISTS lab_exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      )
    `.execute(db)

    await sql`
      CREATE TABLE IF NOT EXISTS exam_parameters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        unit TEXT,
        input_type TEXT NOT NULL,
        reference_values TEXT NOT NULL DEFAULT '{}',
        sort_order INTEGER NOT NULL DEFAULT 0
      )
    `.execute(db)

    await sql`
      CREATE TABLE IF NOT EXISTS exam_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        exam_ids TEXT,
        planned_date TEXT,
        statut TEXT NOT NULL DEFAULT 'en_attente',
        validated_at TEXT
      )
    `.execute(db)

    await sql`
      CREATE TABLE IF NOT EXISTS exam_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_request_id INTEGER NOT NULL,
        parameter_id INTEGER NOT NULL,
        value TEXT,
        is_normal INTEGER,
        filled_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `.execute(db)

    service = new ExamResultService(
      { getInstance: () => db } as unknown as AppDatabaseDatasource
    )
  })

  afterEach(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch { /* cleanup best-effort */ }
  })

  // ─── Helper ──────────────────────────────────────────────────────

  /** Seed one lab exam → parameter → request → result chain. */
  async function seedResult(
    overrides: {
      patientId?: number
      requestId?: number
      resultId?: number
      examId?: number
      /** null skips the lab_exams row (dangling parameter) */
      examName?: string | null
      parameterId?: number
      examIds?: string | null
      plannedDate?: string
      filledAt?: string | null
      validatedAt?: string | null
    } = {},
  ) {
    const patientId = overrides.patientId ?? 42
    const requestId = overrides.requestId ?? 1
    const resultId = overrides.resultId ?? 1
    const parameterId = overrides.parameterId ?? 1
    const examId = overrides.examId ?? 1
    const examName = overrides.examName !== undefined ? overrides.examName : 'Glycémie à jeun'
    const examIds = overrides.examIds !== undefined ? overrides.examIds : '[1]'
    const plannedDate = overrides.plannedDate ?? '2026-01-10'
    const filledAt = overrides.filledAt !== undefined ? overrides.filledAt : '2026-01-12 08:30:00'
    const validatedAt = overrides.validatedAt !== undefined ? overrides.validatedAt : '2026-01-12 08:30:00'

    if (examName !== null) {
      await sql`INSERT INTO lab_exams (id, name) VALUES (${examId}, ${examName})`.execute(db)
    }
    await sql`INSERT INTO exam_parameters (id, exam_id, name, unit, input_type, reference_values, sort_order)
      VALUES (${parameterId}, ${examId}, 'Glucose', 'mg/dL', 'numeric', '{"min":0.7,"max":1.1}', 1)`.execute(db)
    await sql`INSERT INTO exam_requests (id, patient_id, type, planned_date, statut, validated_at, exam_ids)
      VALUES (${requestId}, ${patientId}, 'laboratoire', ${plannedDate}, 'realise', ${validatedAt}, ${examIds})`.execute(db)
    if (filledAt === null) {
      await sql`INSERT INTO exam_results (id, exam_request_id, parameter_id, value, is_normal, filled_at)
        VALUES (${resultId}, ${requestId}, ${parameterId}, '0.85', 1, NULL)`.execute(db)
    } else {
      await sql`INSERT INTO exam_results (id, exam_request_id, parameter_id, value, is_normal, filled_at)
        VALUES (${resultId}, ${requestId}, ${parameterId}, '0.85', 1, ${filledAt})`.execute(db)
    }
  }

  it('returns examName from lab_exams and validatedAt from exam_requests', async () => {
    await seedResult()

    const rows = await service.listByPatient(42)

    expect(rows).toHaveLength(1)
    expect(rows[0].exam_name).toBe('Glycémie à jeun')
    expect(rows[0].validated_at).toBe('2026-01-12 08:30:00')
  })

  it('maps examName and validatedAt to the DTO via toDto', async () => {
    await seedResult()

    const rows = await service.listByPatient(42)
    const dto = ExamResultEntity.toDto(rows[0])

    expect(dto.examName).toBe('Glycémie à jeun')
    expect(dto.validatedAt).toBe('2026-01-12 08:30:00')
  })

  it('returns null validatedAt for a request that has not been validated', async () => {
    await seedResult({ validatedAt: null })

    const rows = await service.listByPatient(42)
    const dto = ExamResultEntity.toDto(rows[0])

    expect(rows[0].validated_at).toBeNull()
    expect(dto.validatedAt).toBeNull()
  })

  it('returns an empty array for a patient with no results', async () => {
    const rows = await service.listByPatient(999)

    expect(rows).toHaveLength(0)
  })

  it('filters by dateFrom and dateTo on filled_at with planned_date fallback', async () => {
    await seedResult({ requestId: 1, resultId: 1, parameterId: 1, examId: 1, plannedDate: '2026-01-10', filledAt: '2026-01-12 08:30:00' })
    await seedResult({ requestId: 2, resultId: 2, parameterId: 2, examId: 2, plannedDate: '2026-02-15', filledAt: '2026-02-16 09:00:00' })

    const from = await service.listByPatient(42, { dateFrom: '2026-02-01' })
    expect(from).toHaveLength(1)
    expect(from[0].request_date).toBe('2026-02-15')

    const to = await service.listByPatient(42, { dateTo: '2026-01-31' })
    expect(to).toHaveLength(1)
    expect(to[0].request_date).toBe('2026-01-10')

    const both = await service.listByPatient(42, { dateFrom: '2026-01-01', dateTo: '2026-01-31' })
    expect(both).toHaveLength(1)
  })

  it('includes results whose filled date is in range even when planned_date is outside', async () => {
    // Cas écran : ECBU rempli le 06/09 alors que la prescription est antérieure.
    await seedResult({ requestId: 1, resultId: 1, parameterId: 1, examId: 1, plannedDate: '2026-07-10', filledAt: '2026-09-06 06:00:00' })

    const rows = await service.listByPatient(42, { dateFrom: '2026-08-01', dateTo: '2026-09-30' })
    expect(rows).toHaveLength(1)
  })

  it('falls back to planned_date when filled_at is null', async () => {
    await seedResult({ requestId: 1, resultId: 1, parameterId: 1, examId: 1, plannedDate: '2026-08-15', filledAt: null })

    const rows = await service.listByPatient(42, { dateFrom: '2026-08-01', dateTo: '2026-09-30' })
    expect(rows).toHaveLength(1)
  })

  it('filters by parameterId', async () => {
    await seedResult({ requestId: 1, resultId: 1, parameterId: 1, examId: 1 })
    await seedResult({ requestId: 2, resultId: 2, parameterId: 2, examId: 2 })

    const rows = await service.listByPatient(42, { parameterId: 2 })

    expect(rows).toHaveLength(1)
    expect(rows[0].parameter_id).toBe(2)
  })

  it('filters by examRequestId', async () => {
    await seedResult({ requestId: 1, resultId: 1, parameterId: 1, examId: 1 })
    await seedResult({ requestId: 2, resultId: 2, parameterId: 2, examId: 2 })

    const rows = await service.listByPatient(42, { examRequestId: 2 })

    expect(rows).toHaveLength(1)
    expect(rows[0].exam_request_id).toBe(2)
  })

  it('filters by examId as an exact element of the exam_ids JSON array', async () => {
    await seedResult({ requestId: 1, resultId: 1, parameterId: 1, examId: 1, examIds: '[1,3]' })
    await seedResult({ requestId: 2, resultId: 2, parameterId: 2, examId: 2, examIds: '[10,11]' })
    await seedResult({ requestId: 3, resultId: 3, parameterId: 3, examId: 3, examIds: '[4]' })

    const rows = await service.listByPatient(42, { examId: 1 })
    expect(rows).toHaveLength(1)
    expect(rows[0].exam_request_id).toBe(1)

    const rowsTen = await service.listByPatient(42, { examId: 10 })
    expect(rowsTen).toHaveLength(1)
    expect(rowsTen[0].exam_request_id).toBe(2)
  })

  it('returns a null examName when the parameter exam_id has no lab_exams row (leftJoin)', async () => {
    await seedResult({ examId: 999, examName: null })

    const rows = await service.listByPatient(42)
    expect(rows).toHaveLength(1)
    expect(rows[0].exam_name).toBeNull()

    const dto = ExamResultEntity.toDto(rows[0])
    expect(dto.examName).toBeNull()
  })
})
