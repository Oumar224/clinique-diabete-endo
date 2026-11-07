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
  // Brand-new repair for the 021 positional-copy scramble. A pre-upgrade
  // database knows nothing about it, so it belongs in the "added later" set.
  '095-repair-021-patient-scramble',
] as const

// Pharmacie (096 → 106), comptabilité pharmacie (109) and the salary/expense
// foundation are absent from any pre-upgrade database. The migrator rejects
// out-of-order upgrades (new migrations must come alphabetically after the
// last executed one), so the simulated old base below must exclude the whole
// pharmacie block — including 109, which ALTERs the pharmacie tables.
// 81 = 103 − 9 renamed − 12 pharmacie − 1 annual. Note that 107/108 are NOT excluded:
// they must apply on a base where the pharmacie tables do not exist.
const PHARMACIE_MIGRATIONS = [
  '096-create-medicaments',
  '097-create-stock-lots',
  '098-create-mouvements-stock',
  '099-create-delivrances',
  '100-fix-pharmacie-text-references',
  '101-add-delivrance-motif',
  '102-add-medicaments-actif-check',
  '103-create-fournisseurs',
  '104-pharmacie-fondation-prix-conditionnement',
  '105-invoice-pro',
  '106-fix-voie-labels',
  '109-pharmacie-comptabilite',
] as const

// Salaires/dépenses (107/108) are also newer than the simulated pre-086 base.
// They are kept separate from the pharmacie list because they must apply
// without the pharmacie tables — see the focused test below.
const FOUNDATION_MIGRATIONS = [
  '107-create-salaires',
  '108-create-depenses',
  '112-add-salaire-rubrique-jours',
  '118-add-user-temps-travail-nss',
] as const

// Indicateurs annuels (110/111) — postérieures à la base simulée pré-086.
// Elles ne font pas partie de l'ancienne base et s'appliquent à la montée.
const ANNUAL_INDICATORS_MIGRATIONS = [
  '110-annual-indicators',
  '111-indicateurs-cas-et-soins',
] as const

// Commandes pharmacie, réceptions, apports et pièces jointes de lots —
// postérieures à la base simulée pré-086 et donc absentes de celle-ci.
// 124-seed-crc-obesite / 125-seed-crc-gesta requièrent la colonne contact_types
// (089) — ils doivent donc aussi être exclus de l'ancienne base.
const BUSINESS_MIGRATIONS = [
  '113-create-commandes',
  '114-create-commande-receptions',
  '115-create-apports',
  '116-create-stock-lot-attachments',
  '117-commande-constraints',
  '119-create-unites-stock',
  '120-labo-exam-requests-externe',
  '121-create-laboratoire-stock',
  '122-create-labo-paiements',
  '123-lab-exam-prix',
  '124-seed-crc-obesite',
  '125-seed-crc-gesta',
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

  it('should run all 118 migrations successfully', async () => {
    const svc = new MigrationService(db)
    await expect(svc.runMigrations()).resolves.not.toThrow()

    const rows = await sql`SELECT name FROM kysely_migration`.execute(db)
    expect(rows.rows.length).toBe(118)

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
    expect(names).toContain('095-repair-021-patient-scramble')
    expect(names).toContain('096-create-medicaments')
    expect(names).toContain('097-create-stock-lots')
    expect(names).toContain('098-create-mouvements-stock')
    expect(names).toContain('099-create-delivrances')
    expect(names).toContain('100-fix-pharmacie-text-references')
    expect(names).toContain('101-add-delivrance-motif')
    expect(names).toContain('102-add-medicaments-actif-check')
    expect(names).toContain('103-create-fournisseurs')
    expect(names).toContain('104-pharmacie-fondation-prix-conditionnement')
    expect(names).toContain('105-invoice-pro')
    expect(names).toContain('106-fix-voie-labels')
    expect(names).toContain('107-create-salaires')
    expect(names).toContain('108-create-depenses')
    expect(names).toContain('109-pharmacie-comptabilite')
    expect(names).toContain('110-annual-indicators')
    expect(names).toContain('112-add-salaire-rubrique-jours')
    expect(names).toContain('113-create-commandes')
    expect(names).toContain('114-create-commande-receptions')
    expect(names).toContain('115-create-apports')
    expect(names).toContain('116-create-stock-lot-attachments')
    expect(names).toContain('117-commande-constraints')
    expect(names).toContain('118-add-user-temps-travail-nss')
    expect(names).toContain('119-create-unites-stock')
    expect(names).toContain('120-labo-exam-requests-externe')
    expect(names).toContain('121-create-laboratoire-stock')
    expect(names).toContain('122-create-labo-paiements')
    expect(names).toContain('123-lab-exam-prix')
    expect(names).toContain('124-seed-crc-obesite')
    expect(names).toContain('125-seed-crc-gesta')
    expect(names).toContain('086-close-expired-active-encounters')

    const last = await sql<{ name: string }>`
      SELECT name FROM kysely_migration ORDER BY rowid DESC LIMIT 1
    `.execute(db)
    expect(last.rows[0].name).toBe('125-seed-crc-gesta')
  })

  it('should seed the CRC_DIABETE document type in 088', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrations()

    const rows = await sql<{ code: string }>`
      SELECT code FROM clinical_document_types WHERE code = 'CRC_DIABETE'
    `.execute(db)
    expect(rows.rows).toHaveLength(1)
  })

  it('should seed the CRC_OBESITE document type in 124', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrations()

    const rows = await sql<{ code: string; category: string; contact_types: string; label: string }>`
      SELECT code, category, contact_types, label FROM clinical_document_types WHERE code = 'CRC_OBESITE'
    `.execute(db)
    expect(rows.rows).toHaveLength(1)
    expect(rows.rows[0].category).toBe('consultation')
    expect(rows.rows[0].contact_types).toBe('["consultation"]')
    expect(rows.rows[0].label).toBe('Compte Rendu de Consultation — Obésité')

    // Idempotence : un second run ne duplique pas la ligne seed.
    await svc.runMigrations()
    const rows2 = await sql<{ code: string }>`
      SELECT code FROM clinical_document_types WHERE code = 'CRC_OBESITE'
    `.execute(db)
    expect(rows2.rows).toHaveLength(1)
  })

  it('should seed the CRC_GESTA document type in 125', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrations()

    const rows = await sql<{ code: string; category: string; contact_types: string; label: string }>`
      SELECT code, category, contact_types, label FROM clinical_document_types WHERE code = 'CRC_GESTA'
    `.execute(db)
    expect(rows.rows).toHaveLength(1)
    expect(rows.rows[0].category).toBe('consultation')
    expect(rows.rows[0].contact_types).toBe('["consultation"]')
    expect(rows.rows[0].label).toBe('Compte Rendu de Consultation — Diabète gestationnel')

    // Idempotence : un second run ne duplique pas la ligne seed.
    await svc.runMigrations()
    const rows2 = await sql<{ code: string }>`
      SELECT code FROM clinical_document_types WHERE code = 'CRC_GESTA'
    `.execute(db)
    expect(rows2.rows).toHaveLength(1)
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

  it('should apply 107/108 without the pharmacie migrations', async () => {
    // Minimal provider: the user table (001) plus the salary/expense
    // foundation. No 096-106/109 → `fournisseurs` does not exist, so this
    // proves `depense.fournisseur_id` is intentionally FK-free.
    const provider: MigrationProvider = {
      getMigrations: async () => ({
        '001-initial-schema': MIGRATIONS['001-initial-schema'],
        '107-create-salaires': MIGRATIONS['107-create-salaires'],
        '108-create-depenses': MIGRATIONS['108-create-depenses'],
      }),
    }

    const status = await new MigrationService(db, provider).runMigrations()
    expect(status.success).toBe(true)
    expect(status.applied).toBe(3)

    const tables = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type='table'
    `.execute(db)
    const tableNames = tables.rows.map((r: any) => r.name)
    expect(tableNames).toContain('salaire_config')
    expect(tableNames).toContain('salaire_config_rubrique')
    expect(tableNames).toContain('salaire_paiement')
    expect(tableNames).toContain('depense_categorie')
    expect(tableNames).toContain('depense')
    expect(tableNames).not.toContain('fournisseurs')
    expect(tableNames).not.toContain('delivrances')

    const categories = await sql<{ code: string }>`
      SELECT code FROM depense_categorie ORDER BY code
    `.execute(db)
    expect(categories.rows.map((r: any) => r.code)).toEqual([
      'autre', 'equipement', 'pharmacie', 'repas', 'transport',
    ])

    const fks = await sql<{ table: string }>`
      SELECT "table" FROM pragma_foreign_key_list('depense')
    `.execute(db)
    expect(fks.rows.map((r: any) => r.table)).not.toContain('fournisseurs')

    // Defaults + nullable mode_paiement work on the reduced schema.
    await sql`
      INSERT INTO depense (date, categorie_id, libelle, montant, mode_paiement)
      VALUES ('2026-01-15', (SELECT id FROM depense_categorie WHERE code = 'transport'), 'Course', 5000, NULL)
    `.execute(db)
    const inserted = await sql<{ source: string; statut_paiement: string }>`
      SELECT source, statut_paiement FROM depense WHERE libelle = 'Course'
    `.execute(db)
    expect(inserted.rows[0].source).toBe('manuel')
    expect(inserted.rows[0].statut_paiement).toBe('payee')
  })

  it('should upgrade a pre-086 database without re-running migrations', async () => {
    // Build a REAL old base: the full migration set minus every migration
    // added after 086 — the renumbered/rewritten ones (066/083/084 →
    // 087/088/089, brand-new 090 through 094, 021-repair 095), the pharmacie
    // module (096 → 106 + 109) AND the salary/expense foundation (107/108).
    //
    // 107/108 must be excluded here even though they do not touch pharmacie:
    // Kysely requires executed migrations to be a strict prefix of the
    // provider's sorted list. Leaving 107/108 in would make the old log
    // [..., 086, 107, 108] and the full upgrade would reject it ("expected
    // 107 at index 79 but 087 found"). Their independence from pharmacie is
    // covered by the focused test above. Old base: 79 = 103 − 9 renamed
    // − 12 pharmacie − 2 foundation − 1 indicateurs annuels.
    //
    // GUARD: if someone reintroduces these migrations under pre-086 names,
    // the filter no longer matches, the "old" base runs all 103 migrations and
    // the count/applied assertions below fail — the "corrupted migrations" bug.
    const reducedMigrations = Object.fromEntries(
      Object.entries(MIGRATIONS).filter(
        ([name]) =>
          !RENAMED_MIGRATIONS.includes(name) &&
          !PHARMACIE_MIGRATIONS.includes(name) &&
          !FOUNDATION_MIGRATIONS.includes(name) &&
          !ANNUAL_INDICATORS_MIGRATIONS.includes(name) &&
          !BUSINESS_MIGRATIONS.includes(name),
      ),
    )
    expect(Object.keys(reducedMigrations)).toHaveLength(79)

    const reducedProvider: MigrationProvider = {
      getMigrations: async () => reducedMigrations,
    }

    // b) Old base: 79 migrations executed, none of 087..095, 096..106/109,
    // 107/108 nor 110/111.
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
    for (const pharmacie of PHARMACIE_MIGRATIONS) {
      expect(oldNameList).not.toContain(pharmacie)
    }
    for (const foundation of FOUNDATION_MIGRATIONS) {
      expect(oldNameList).not.toContain(foundation)
    }
    for (const annual of ANNUAL_INDICATORS_MIGRATIONS) {
      expect(oldNameList).not.toContain(annual)
    }
    for (const business of BUSINESS_MIGRATIONS) {
      expect(oldNameList).not.toContain(business)
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

    // c) Upgrade with the full provider: the 9 renamed (087..095), the 12
    // pharmacie migrations (096..106 + 109), the 3 foundation migrations
    // (107/108/112) + 118, 110/111 AND les migrations métier 113..125 apply
    // (applied = 39), nothing is re-executed, no "corrupted migrations".
    const status = await new MigrationService(db).runMigrations()
    expect(status.success).toBe(true)
    expect(status.applied).toBe(39)
    expect(status.failed).toEqual([])

    const count = await sql<{ n: number }>`
      SELECT COUNT(*) as n FROM kysely_migration
    `.execute(db)
    expect(Number(count.rows[0].n)).toBe(118)

    // d) 107/108 are now applied on a database that also went through the
    // pharmacie migrations, and depense still has no FK to fournisseurs.
    const foundationTables = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type='table'
        AND name IN ('salaire_config', 'salaire_paiement', 'depense', 'depense_categorie', 'vente_pharmacie_paiement')
    `.execute(db)
    expect(foundationTables.rows.map((r: any) => r.name).sort()).toEqual(
      ['depense', 'depense_categorie', 'salaire_config', 'salaire_paiement', 'vente_pharmacie_paiement'],
    )
    const depenseFks = await sql<{ table: string }>`
      SELECT "table" FROM pragma_foreign_key_list('depense')
    `.execute(db)
    expect(depenseFks.rows.map((r: any) => r.table)).not.toContain('fournisseurs')

    // e) Columns still present after the upgrade (unchanged by 087/088/089).
    const after = await sql<{ name: string }>`
      SELECT name FROM pragma_table_info('encounter_movements')
    `.execute(db)
    const afterCols = after.rows.map((r: any) => r.name)
    expect(afterCols).toContain('created_by')
    expect(afterCols).toContain('from_service_id')
    expect(afterCols).toContain('motif')

    // f) The INSERT that crashed with « no such column: created_by » succeeds.
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

  it('should store text references (TEXT + index) in 100', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrations()

    const mvtCols = await sql<{ name: string; type: string }>`
      SELECT name, type FROM pragma_table_info('mouvements_stock')
    `.execute(db)
    const mvtByName = Object.fromEntries(mvtCols.rows.map((r: any) => [r.name, r.type]))
    expect(mvtByName['reference_id']).toBe('TEXT')

    const mvtIdx = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'mouvements_stock'
    `.execute(db)
    expect(mvtIdx.rows.map((r: any) => r.name)).toContain('idx_mouvements_stock_reference')

    const delCols = await sql<{ name: string; type: string }>`
      SELECT name, type FROM pragma_table_info('delivrances')
    `.execute(db)
    const delByName = Object.fromEntries(delCols.rows.map((r: any) => [r.name, r.type]))
    expect(delByName['source_document_id']).toBe('TEXT')
  })

  it('should add the motif column to delivrances in 101', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrations()

    const cols = await sql<{ name: string }>`
      SELECT name FROM pragma_table_info('delivrances')
    `.execute(db)
    expect(cols.rows.map((r: any) => r.name)).toContain('motif')
  })

  it('should enforce actif IN (0, 1) on medicaments in 102', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrations()

    const def = await sql<{ sql: string }>`
      SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'medicaments'
    `.execute(db)
    expect(def.rows[0].sql).toContain('CHECK (actif IN (0, 1))')
  })

  it('should create salaries, expenses and pharmacy accounting tables in 107-109', async () => {
    const svc = new MigrationService(db)
    await svc.runMigrations()

    const expectedTables = [
      'salaire_config',
      'salaire_config_rubrique',
      'salaire_paiement',
      'depense_categorie',
      'depense',
      'vente_pharmacie_paiement',
    ]
    const tables = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type='table'
    `.execute(db)
    const tableNames = tables.rows.map((r: any) => r.name)
    for (const table of expectedTables) {
      expect(tableNames).toContain(table)
    }

    const categories = await sql<{ code: string }>`
      SELECT code FROM depense_categorie ORDER BY code
    `.execute(db)
    expect(categories.rows.map((r: any) => r.code)).toEqual([
      'autre', 'equipement', 'pharmacie', 'repas', 'transport',
    ])

    // No FK on depense.fournisseur_id — it must not require `fournisseurs`
    // (migration 103), so 108 also runs on reduced/pre-pharmacie databases.
    const depenseFks = await sql<{ table: string }>`
      SELECT "table" FROM pragma_foreign_key_list('depense')
    `.execute(db)
    expect(depenseFks.rows.map((r: any) => r.table)).not.toContain('fournisseurs')

    const sourceIndex = await sql<{ name: string }>`
      SELECT name FROM sqlite_master
      WHERE type='index' AND name='idx_depense_source_source_id'
    `.execute(db)
    expect(sourceIndex.rows).toHaveLength(1)

    const delivranceCols = await sql<{ name: string }>`
      SELECT name FROM pragma_table_info('delivrances')
    `.execute(db)
    expect(delivranceCols.rows.map((r: any) => r.name)).toEqual(
      expect.arrayContaining(['date_vente', 'type_vente', 'motif_gratuite', 'montant_total']),
    )

    const ligneCols = await sql<{ name: string }>`
      SELECT name FROM pragma_table_info('delivrance_lignes')
    `.execute(db)
    expect(ligneCols.rows.map((r: any) => r.name)).toEqual(
      expect.arrayContaining(['prix_unitaire', 'montant', 'cout_achat_total']),
    )
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
