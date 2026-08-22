import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Kysely, sql, type MigrationProvider } from 'kysely'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { NodeSqliteDialect } from '../../driver/node-sqlite-dialect'
import { MIGRATIONS, MigrationService } from '../migration.service'

// Migrations renumbered by the backend (066/083/084 → 087/088/089), plus the
// brand-new 090 through 094. A pre-upgrade database knows nothing about any of
// them — and if they are ever reintroduced under pre-086 names, the reduced
// provider in the upgrade test below silently includes them and the
// count/applied assertions fail (guard against the "corrupted migrations" bug).
const RENAMED_MIGRATIONS = [
  '087-add-service-care-unit-to-appointments',
  '088-seed-crc-diabete',
  '089-add-contact-types-to-document-types',
  '090-create-document-attachments',
  '091-add-prescription-duree-type',
  '092-add-clinical-document-site',
  '093-add-exam-request-resultat-realized',
  '094-create-exam-request-attachments',
] as const

describe('MigrationService', { timeout: 30_000 }, () => {
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

  it('should run all 87 migrations successfully', async () => {
    const svc = new MigrationService(db)
    await expect(svc.runMigrations()).resolves.not.toThrow()

    const rows = await sql`SELECT name FROM kysely_migration`.execute(db)
    expect(rows.rows.length).toBe(87)

    const names = rows.rows.map((r: any) => r.name)
    expect(names).toContain('025-attachment-types')
    expect(names).toContain('026-remove-mutuelle')
    expect(names).toContain('027-add-assurance-mutuelle')
    expect(names).toContain('028-form-drafts')
    expect(names).toContain('029-patient-consentement-etude')
    expect(names).toContain('030-user-attachment-type')
    expect(names).toContain('031-patient-care')
    expect(names).toContain('032-seed-plan-soins')
    expect(names).toContain('033-prescriptions')
    expect(names).toContain('034-seed-week-plan-soins')
    expect(names).toContain('035-seed-vital-signs-range')
    expect(names).toContain('042-vital-signs-new-columns')
    expect(names).toContain('043-vital-signs-items')
    expect(names).toContain('046-service-hierarchy')
    expect(names).toContain('057-contact-origins')
    expect(names).toContain('058-insurances')
    expect(names).toContain('059-contact-categories')
    expect(names).toContain('060-prescription-frequence-type')
    expect(names).toContain('087-add-service-care-unit-to-appointments')
    expect(names).toContain('088-seed-crc-diabete')
    expect(names).toContain('089-add-contact-types-to-document-types')
    expect(names).toContain('090-create-document-attachments')
    expect(names).toContain('091-add-prescription-duree-type')
    expect(names).toContain('092-add-clinical-document-site')
    expect(names).toContain('093-add-exam-request-resultat-realized')
    expect(names).toContain('094-create-exam-request-attachments')
    expect(names).toContain('086-close-expired-active-encounters')

    const last = await sql<{ name: string }>`
      SELECT name FROM kysely_migration ORDER BY rowid DESC LIMIT 1
    `.execute(db)
    expect(last.rows[0].name).toBe('094-create-exam-request-attachments')
  })

  it('should seed the CRC_DIABETE document type in 088', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrations()

    const rows = await sql<{ code: string }>`
      SELECT code FROM clinical_document_types WHERE code = 'CRC_DIABETE'
    `.execute(db)
    expect(rows.rows).toHaveLength(1)
  })

  it('should add contact_types to clinical_document_types with expected values in 089', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrations()

    const cols = await sql<{ name: string }>`
      SELECT name FROM pragma_table_info('clinical_document_types')
    `.execute(db)
    const columnNames = cols.rows.map((r: any) => r.name)
    expect(columnNames).toContain('contact_types')

    const rows = await sql<{ code: string; contact_types: string }>`
      SELECT code, contact_types FROM clinical_document_types
      WHERE code IN ('CRC_DIABETE', 'ORDONNANCE_LIBRE', 'CRH_DIABETE')
      ORDER BY code
    `.execute(db)
    const byCode: Record<string, string> = Object.fromEntries(
      rows.rows.map(r => [r.code, r.contact_types])
    )
    expect(byCode['CRC_DIABETE']).toBe('["consultation"]')
    expect(byCode['ORDONNANCE_LIBRE']).toBe('["consultation","hospitalisation"]')
    expect(byCode['CRH_DIABETE']).toBe('["hospitalisation"]')
  })

  it('should add service_id and care_unit_id to appointment in 087', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrations()

    const cols = await sql<{ name: string }>`
      SELECT name FROM pragma_table_info('appointment')
    `.execute(db)
    const columnNames = cols.rows.map((r: any) => r.name)
    expect(columnNames).toContain('service_id')
    expect(columnNames).toContain('care_unit_id')
  })

  it('should upgrade a pre-086 database without re-running migrations', async () => {
    // Build a REAL old base: the full migration set minus the eight migrations
    // the backend renumbered/added after 086 (066/083/084 → 087/088/089, plus
    // brand-new 090 through 094). A pre-upgrade database contains every
    // migration EXCEPT those eight, so the reduced provider below replays
    // exactly that state (79 = 87 − 8 migrations).
    //
    // GUARD: if someone reintroduces these migrations under pre-086 names,
    // the filter no longer matches, the "old" base runs all 87 migrations and
    // the count/applied assertions below fail — the "corrupted migrations" bug.
    const reducedMigrations = Object.fromEntries(
      Object.entries(MIGRATIONS).filter(([name]) => !RENAMED_MIGRATIONS.includes(name)),
    )
    expect(Object.keys(reducedMigrations)).toHaveLength(79)

    const reducedProvider: MigrationProvider = {
      getMigrations: async () => reducedMigrations,
    }

    // b) Old base: 79 migrations executed, none of 087/088/089/090/091/092/093/094.
    const partial = await new MigrationService(db, reducedProvider).runMigrations()
    expect(partial.success).toBe(true)

    const oldCount = await sql<{ n: number }>`
      SELECT COUNT(*) as n FROM kysely_migration
    `.execute(db)
    expect(Number(oldCount.rows[0].n)).toBe(79)

    const oldNames = await sql<{ name: string }>`
      SELECT name FROM kysely_migration ORDER BY rowid
    `.execute(db)
    const oldNameList = oldNames.rows.map((r: any) => r.name)
    for (const renamed of RENAMED_MIGRATIONS) {
      expect(oldNameList).not.toContain(renamed)
    }

    // On this old base migration 077 (encounter-movements-new-fields) has
    // ALREADY run — it belongs to the 79 — so created_by/from_service_id/motif
    // are present. The "stopped before 077 → repairCriticalSchema" scenario is
    // covered by schema-repair.spec.ts; here we only pin the pre-upgrade shape.
    const before = await sql<{ name: string }>`
      SELECT name FROM pragma_table_info('encounter_movements')
    `.execute(db)
    const beforeCols = before.rows.map((r: any) => r.name)
    expect(beforeCols).toContain('created_by')
    expect(beforeCols).toContain('from_service_id')
    expect(beforeCols).toContain('motif')

    // c) Upgrade with the full provider: ONLY 087/088/089/090/091/092/093/094
    // apply (applied = 8), nothing is re-executed, no "corrupted migrations".
    const status = await new MigrationService(db).runMigrations()
    expect(status.success).toBe(true)
    expect(status.applied).toBe(8)
    expect(status.failed).toEqual([])

    const count = await sql<{ n: number }>`
      SELECT COUNT(*) as n FROM kysely_migration
    `.execute(db)
    expect(Number(count.rows[0].n)).toBe(87)

    // d) Columns still present after the upgrade (unchanged by 087/088/089).
    const after = await sql<{ name: string }>`
      SELECT name FROM pragma_table_info('encounter_movements')
    `.execute(db)
    const afterCols = after.rows.map((r: any) => r.name)
    expect(afterCols).toContain('created_by')
    expect(afterCols).toContain('from_service_id')
    expect(afterCols).toContain('motif')

    // e) The INSERT that crashed with « no such column: created_by » succeeds.
    await sql`PRAGMA foreign_keys = OFF`.execute(db)
    await sql`
      INSERT INTO encounter_movements (encounter_id, service_id, step_label, entered_at, created_by)
      VALUES (1, 1, 'Admission', datetime('now'), 1)
    `.execute(db)
    await sql`PRAGMA foreign_keys = ON`.execute(db)
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

  it('should drop contact_categories and contact_category_id after 059 + 085', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrations()

    const tables = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type='table' AND name='contact_categories'
    `.execute(db)
    expect(tables.rows).toHaveLength(0)

    const cols = await sql<{ name: string }>`
      PRAGMA table_info('encounters')
    `.execute(db)
    const columnNames = cols.rows.map((r: any) => r.name)
    expect(columnNames).not.toContain('contact_category_id')
  })

  it('should not seed phantom demo data for patients 1/2 on a fresh install', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrations()

    // 031-035 no longer seed demo data for non-existent patients (ids 1/2),
    // so on a fresh DB every patient-scoped table must be empty.
    const tables = ['plan_soins', 'plan_soins_items', 'prescriptions', 'vital_signs', 'dispositifs']
    for (const table of tables) {
      const res = await sql<{ n: number }>`
        SELECT COUNT(*) as n FROM ${sql.ref(table)}
      `.execute(db)
      expect(Number(res.rows[0].n)).toBe(0)
    }

    // Guard: even a non-empty table must not reference the phantom patients.
    const patientTables = ['plan_soins', 'prescriptions', 'vital_signs', 'dispositifs']
    for (const table of patientTables) {
      const res = await sql<{ n: number }>`
        SELECT COUNT(*) as n FROM ${sql.ref(table)} WHERE patient_id IN (1, 2)
      `.execute(db)
      expect(Number(res.rows[0].n)).toBe(0)
    }
  })

  it('should clean only the exact seeded demo item ids in 067', async () => {
    // Build the pre-fix DB state: migrate up to 034 (the seed used to live here),
    // then replay rows matching the OLD 031/032/034 seeds (plan_soins 10-16 with
    // seeded item ids 100-106) plus non-seed rows (ids 200-202) that must NOT be
    // touched by the exact-id DELETE.
    const svc = new MigrationService(db)
    await svc.runMigrationsTo('034-seed-week-plan-soins')

    await sql`PRAGMA foreign_keys = OFF`.execute(db)
    await sql`
      INSERT INTO plan_soins (id, patient_id, date, created_by) VALUES
        (10, 1, date('now', '+0 days'), 1),
        (11, 1, date('now', '+1 day'),  1),
        (12, 1, date('now', '+2 days'), 1),
        (13, 1, date('now', '+3 days'), 1),
        (14, 1, date('now', '+4 days'), 1),
        (15, 1, date('now', '+5 days'), 1),
        (16, 1, date('now', '+6 days'), 1)
    `.execute(db)
    await sql`
      INSERT INTO plan_soins_items (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut) VALUES
        (100, 10, '08h00', 'Insuline NOVORAPID', '10 UI', 'SC', 'en_attente'),
        (101, 11, '08h00', 'Metformine', '500 mg', 'PO', 'en_attente'),
        (102, 12, '12h00', 'Furosémide', '40 mg', 'PO', 'en_attente'),
        (103, 13, '18h00', 'Insuline NOVORAPID', '10 UI', 'SC', 'en_attente'),
        (104, 14, '22h00', 'Insuline LANTUS', '24 UI', 'SC', 'en_attente'),
        (105, 15, '06h00', 'Insuline LANTUS', '24 UI', 'SC', 'valide'),
        (106, 16, '08h00', 'Furosémide', '40 mg', 'PO', 'en_attente')
    `.execute(db)
    await sql`
      INSERT INTO plan_soins_items (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut) VALUES
        (200, 1, '08h00', 'Insuline NOVORAPID', '10 UI', 'SC', 'en_attente'),
        (201, 2, '12h00', 'Metformine', '500 mg', 'PO', 'en_attente'),
        (202, 3, '18h00', 'Atorvastatin', '10 mg', 'PO', 'en_attente')
    `.execute(db)
    await sql`PRAGMA foreign_keys = ON`.execute(db)

    // Upgrade the rest of the way: 067 deletes ONLY the seeded demo item ids
    // (1-25, 100-136) that are still en_attente with prescription_id NULL.
    const status = await svc.runMigrations()
    expect(status.success).toBe(true)

    // Seed items on plan_soins 10-16: the en_attente ones (100-104, 106) are
    // removed; the valide one (105) survives the statut guard.
    const kept = await sql<{ n: number }>`
      SELECT COUNT(*) as n FROM plan_soins_items WHERE plan_soins_id BETWEEN 10 AND 16
    `.execute(db)
    expect(Number(kept.rows[0].n)).toBe(1)

    const valide = await sql<{ statut: string }>`
      SELECT statut FROM plan_soins_items WHERE id = 105
    `.execute(db)
    expect(valide.rows[0].statut).toBe('valide')

    // Non-seed ids (200-202) are NOT in the 067 target list, so they survive
    // even though they are en_attente with prescription_id NULL.
    const nonSeed = await sql<{ n: number }>`
      SELECT COUNT(*) as n FROM plan_soins_items WHERE plan_soins_id IN (1, 2, 3)
    `.execute(db)
    expect(Number(nonSeed.rows[0].n)).toBe(3)
  })

  it('should seed ORDONNANCE_LIBRE with lowercase prescriptions category in 079', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrations()

    const rows = await sql<{ code: string; category: string }>`
      SELECT code, category FROM clinical_document_types WHERE code = 'ORDONNANCE_LIBRE'
    `.execute(db)
    expect(rows.rows).toHaveLength(1)
    expect(rows.rows[0].category).toBe('prescriptions')
  })

  it('should keep the duplicate 062 migrations in lexicographic order with unique keys', async () => {
    const keys = Object.keys(MIGRATIONS)
    expect(new Set(keys).size).toBe(keys.length)

    const sorted = [...keys].sort()
    const careUnitIdx = sorted.indexOf('062-add-care-unit-to-encounters')
    const prescriptionTypeIdx = sorted.indexOf('062-prescription-type')
    expect(careUnitIdx).toBeGreaterThanOrEqual(0)
    expect(prescriptionTypeIdx).toBeGreaterThanOrEqual(0)
    expect(careUnitIdx).toBeLessThan(prescriptionTypeIdx)
    expect(prescriptionTypeIdx).toBe(careUnitIdx + 1)
  })

  it('should throw when a migration up() fails', async () => {
    const failingProvider: MigrationProvider = {
      getMigrations: async () => ({
        '000-failing-migration': {
          up: async () => {
            throw new Error('boom')
          },
          down: async () => {},
        },
      }),
    }
    const svc = new MigrationService(db, failingProvider)
    await expect(svc.runMigrations()).rejects.toThrow('[CDE] Migration failed')
  })

  it('should throw on a corrupted kysely_migration table', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrations()

    // Simulate a DB whose migration log references a migration the registry
    // does not contain (e.g. an interrupted or partial deployment).
    await sql`
      INSERT INTO kysely_migration (name, timestamp) VALUES ('999-not-a-real-migration', datetime('now'))
    `.execute(db)

    await expect(svc.runMigrations()).rejects.toThrow(/corrupted migrations/)
  })
})
