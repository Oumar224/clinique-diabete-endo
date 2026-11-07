import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { PlanSoinsService } from '../plan-soins.service'

describe('PlanSoinsService', { timeout: 30_000 }, () => {
  let tempDir: string
  let dbPath: string
  let service: PlanSoinsService
  let datasource: AppDatabaseDatasource
  let patientId: number
  let userId: number
  let planSoinsId: number

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-plan-soins-test-'))
    dbPath = path.join(tempDir, 'test.db')
    container.register('DB_PATH', { useValue: dbPath })
    datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()
    service = container.resolve(PlanSoinsService)
    const db = datasource.getInstance()

    // Create a test patient
    const p = await db
      .insertInto('patient')
      .values({
        civilite: 'M',
        nom: 'Patient',
        prenom: 'Test',
        date_naissance: '1980-01-01',
        nir: '1800101123456',
        telephone: '0611111111',
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    patientId = p.id!

    // Create a test user
    const u = await db
      .insertInto('user')
      .values({
        nom: 'Infirmier',
        prenom: 'Test',
        email: 'infirmier@test.com',
        password_hash: 'hash',
        role: 'INFIRMIER',
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    userId = u.id!

    // Create a plan_soins row
    const ps = await db
      .insertInto('plan_soins')
      .values({
        patient_id: patientId,
        date: '2025-06-15',
        created_by: userId,
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow()
    planSoinsId = ps.id!
  })

  afterEach(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      /* cleanup best-effort */
    }
  })

  // ─── Helpers ────────────────────────────────────────────────────

  async function insertSoinItem(overrides: {
    plan_soins_id?: number
    bloc_heure?: string
    medicament?: string
    dosage?: string
    voie?: string
    statut?: string
    valide_par?: string | null
    valide_a?: string | null
    motif_suspension?: string | null
    prescription_id?: number | null
  } = {}) {
    const db = datasource.getInstance()
    return await db
      .insertInto('plan_soins_items')
      .values({
        plan_soins_id: overrides.plan_soins_id ?? planSoinsId,
        bloc_heure: overrides.bloc_heure ?? '08:00',
        medicament: overrides.medicament ?? 'Paracétamol',
        dosage: overrides.dosage ?? '500mg',
        voie: overrides.voie ?? 'PO',
        statut: overrides.statut ?? 'en_attente',
        valide_par: overrides.valide_par ?? null,
        valide_a: overrides.valide_a ?? null,
        motif_suspension: overrides.motif_suspension ?? null,
        prescription_id: overrides.prescription_id ?? null,
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  // ─── getByPatientAndDate ────────────────────────────────────────

  it('returns plan soins DTO for existing patient and date', async () => {
    await insertSoinItem({ medicament: 'Doliprane', dosage: '1000mg', bloc_heure: '08:00', statut: 'valide', valide_par: 'Dr. Test', valide_a: '08:30' })
    await insertSoinItem({ medicament: 'Ibuprofène', dosage: '400mg', bloc_heure: '12:00', statut: 'valide', valide_par: 'Dr. Test', valide_a: '12:30' })

    const result = await service.getByPatientAndDate(patientId, '2025-06-15')

    expect(result).not.toBeNull()
    expect(result!.patientId).toBe(patientId)
    expect(result!.date).toBe('2025-06-15')
    expect(result!.blocs).toHaveLength(2)
    // Blocs should contain the items grouped by heure
    const matinBloc = result!.blocs.find(b => b.heure === '08:00')
    expect(matinBloc).toBeDefined()
    expect(matinBloc!.soins[0].medicament).toBe('Doliprane')
  })

  it('returns null when no plan soins exists for patient and date', async () => {
    const result = await service.getByPatientAndDate(patientId, '2099-12-31')
    expect(result).toBeNull()
  })

  it('returns null for non-existent patient', async () => {
    const result = await service.getByPatientAndDate(9999, '2025-06-15')
    expect(result).toBeNull()
  })

  it('returns plan soins with blocs sorted by id ascending', async () => {
    await insertSoinItem({ medicament: 'M1', bloc_heure: '08:00', statut: 'valide', valide_par: 'Dr. Test', valide_a: '08:30' })
    await insertSoinItem({ medicament: 'M2', bloc_heure: '08:00', statut: 'valide', valide_par: 'Dr. Test', valide_a: '08:30' })
    await insertSoinItem({ medicament: 'M3', bloc_heure: '12:00', statut: 'valide', valide_par: 'Dr. Test', valide_a: '12:30' })

    const result = await service.getByPatientAndDate(patientId, '2025-06-15')
    expect(result!.blocs.length).toBe(2)

    const matin = result!.blocs.find(b => b.heure === '08:00')
    expect(matin!.soins.length).toBe(2)
    expect(matin!.soins[0].medicament).toBe('M1')
    expect(matin!.soins[1].medicament).toBe('M2')
  })

  // ─── validerSoin ────────────────────────────────────────────────

  it('validates a soin item and returns updated SoinItem', async () => {
    const item = await insertSoinItem({ statut: 'en_attente' })

    const result = await service.validerSoin(item.id!, 'Dr. Diallo')
    expect(result.statut).toBe('valide')
    expect(result.validePar).toBe('Dr. Diallo')
    expect(result.valideA).toBeDefined()
  })

  it('throws French error when validating non-existent soin', async () => {
    await expect(service.validerSoin(9999, 'Dr. Diallo')).rejects.toThrow('Soin 9999 introuvable')
  })

  // ─── suspendreSoin ──────────────────────────────────────────────

  it('suspends a soin item with a motif', async () => {
    const item = await insertSoinItem({ statut: 'en_attente' })

    const result = await service.suspendreSoin(item.id!, 'Patient absent')
    expect(result.statut).toBe('suspendu')
    expect(result.motifSuspension).toBe('Patient absent')
  })

  it('throws French error when suspending non-existent soin', async () => {
    await expect(service.suspendreSoin(9999, 'Motif')).rejects.toThrow('Soin 9999 introuvable')
  })

  // ─── reprendreSoin ──────────────────────────────────────────────

  it('resumes a suspended soin item', async () => {
    const item = await insertSoinItem({ statut: 'suspendu', motif_suspension: 'Patient absent' })

    const result = await service.reprendreSoin(item.id!)
    expect(result.statut).toBe('en_attente')
    // Kysely skips undefined fields in .set(), so motifSuspension retains original value
    expect(result.motifSuspension).toBe('Patient absent')
    expect(result.validePar).toBeNull()
    expect(result.valideA).toBeNull()
  })

  it('throws French error when resuming non-existent soin', async () => {
    await expect(service.reprendreSoin(9999)).rejects.toThrow('Soin 9999 introuvable')
  })

  // ─── listValidesByPatientAndDateRange ───────────────────────────

  it('lists validated soins within a date range', async () => {
    // Create a second plan_soins on a different date
    const db = datasource.getInstance()
    const ps2 = await db
      .insertInto('plan_soins')
      .values({
        patient_id: patientId,
        date: '2025-06-16',
        created_by: userId,
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow()

    // Validated items
    await insertSoinItem({ medicament: 'Validé1', statut: 'valide', valide_par: 'Dr. Diallo', valide_a: '10:00' })
    await db
      .insertInto('plan_soins_items')
      .values({
        plan_soins_id: ps2.id,
        bloc_heure: '08:00',
        medicament: 'Validé2',
        dosage: '500mg',
        voie: 'PO',
        statut: 'valide',
        valide_par: 'Dr. Diallo',
        valide_a: '10:00',
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow()

    // Non-validated item (should not appear)
    await insertSoinItem({ medicament: 'EnAttente', statut: 'en_attente' })

    const results = await service.listValidesByPatientAndDateRange(patientId, '2025-06-15', '2025-06-16')
    expect(results.length).toBe(2)
    expect(results.every(r => r.medicament.startsWith('Validé'))).toBe(true)
  })

  it('returns empty array when no validated soins in range', async () => {
    await insertSoinItem({ statut: 'en_attente' })
    const results = await service.listValidesByPatientAndDateRange(patientId, '2025-06-15', '2025-06-15')
    expect(results).toEqual([])
  })

  // ─── suspendrePrescription / reprendrePrescription ──────────────

  it('suspends all soin items for a prescription', async () => {
    const db = datasource.getInstance()
    // Create a prescription
    const presc = await db
      .insertInto('prescriptions')
      .values({
        patient_id: patientId,
        medicament: 'TestMed',
        dosage: '500mg',
        voie: 'PO',
        duree: 7,
        frequence: '1x/jour',
        prescripteur_id: userId,
        statut: 'active',
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow()

    await insertSoinItem({ medicament: 'PS1', prescription_id: presc.id!, statut: 'en_attente' })
    await insertSoinItem({ medicament: 'PS2', prescription_id: presc.id!, statut: 'en_attente' })

    const results = await service.suspendrePrescription(presc.id!, 'Réaction allergique')
    expect(results.length).toBe(2)
    expect(results.every(r => r.statut === 'suspendu')).toBe(true)
    expect(results.every(r => r.motifSuspension === 'Réaction allergique')).toBe(true)
  })

  it('resumes all soin items for a prescription', async () => {
    const db = datasource.getInstance()
    const presc = await db
      .insertInto('prescriptions')
      .values({
        patient_id: patientId,
        medicament: 'TestMed2',
        dosage: '1000mg',
        voie: 'PO',
        duree: 5,
        frequence: '2x/jour',
        prescripteur_id: userId,
        statut: 'active',
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow()

    await insertSoinItem({ medicament: 'RS1', prescription_id: presc.id!, statut: 'suspendu', motif_suspension: 'Test' })
    await insertSoinItem({ medicament: 'RS2', prescription_id: presc.id!, statut: 'suspendu', motif_suspension: 'Test' })

    const results = await service.reprendrePrescription(presc.id!)
    expect(results.length).toBe(2)
    expect(results.every(r => r.statut === 'en_attente')).toBe(true)
    // Kysely skips undefined fields in .set(), so motifSuspension retains original value
    expect(results.every(r => r.motifSuspension === 'Test')).toBe(true)
  })

  // ─── Edge cases ─────────────────────────────────────────────────

  it('handles plan soins with no items gracefully', async () => {
    const result = await service.getByPatientAndDate(patientId, '2025-06-15')
    expect(result).not.toBeNull()
    expect(result!.blocs).toEqual([])
  })

  it('validates a soin that is already validated (idempotent)', async () => {
    const item = await insertSoinItem({ statut: 'valide', valide_par: 'Dr. Fall', valide_a: '09:00' })
    const result = await service.validerSoin(item.id!, 'Dr. Fall')
    expect(result.statut).toBe('valide')
    expect(result.validePar).toBe('Dr. Fall')
  })

  it('returns soin items ordered by id within each bloc', async () => {
    await insertSoinItem({ medicament: 'C', bloc_heure: '08:00', statut: 'valide', valide_par: 'Dr. Test', valide_a: '08:30' })
    await insertSoinItem({ medicament: 'A', bloc_heure: '08:00', statut: 'valide', valide_par: 'Dr. Test', valide_a: '08:30' })
    await insertSoinItem({ medicament: 'B', bloc_heure: '08:00', statut: 'valide', valide_par: 'Dr. Test', valide_a: '08:30' })

    const result = await service.getByPatientAndDate(patientId, '2025-06-15')
    const matin = result!.blocs.find(b => b.heure === '08:00')
    // Items should be ordered by id ascending (insertion order: C, A, B)
    expect(matin!.soins[0].medicament).toBe('C')
    expect(matin!.soins[1].medicament).toBe('A')
    expect(matin!.soins[2].medicament).toBe('B')
  })

  it('does not throw when suspending a prescription with no items', async () => {
    const db = datasource.getInstance()
    const presc = await db
      .insertInto('prescriptions')
      .values({
        patient_id: patientId,
        medicament: 'EmptyRx',
        dosage: '0mg',
        voie: 'PO',
        duree: 1,
        frequence: '1x/jour',
        prescripteur_id: userId,
        statut: 'active',
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow()

    const results = await service.suspendrePrescription(presc.id!, 'Test')
    expect(results).toEqual([])
  })

  // ─── FK Validation ────────────────────────────────────────────────

  it('should reject plan_soins insert with invalid patient_id', async () => {
    const db = datasource.getInstance()

    await expect(
      db.insertInto('plan_soins')
        .values({
          patient_id: 99999,
          date: '2025-06-15',
          created_by: userId,
        } as any)
        .execute()
    ).rejects.toThrow()
  })

  it('should reject plan_soins_items insert with invalid prescription_id', async () => {
    const db = datasource.getInstance()

    await expect(
      db.insertInto('plan_soins_items')
        .values({
          plan_soins_id: planSoinsId,
          bloc_heure: '08:00',
          medicament: 'Test',
          dosage: '500mg',
          voie: 'PO',
          statut: 'en_attente',
          prescription_id: 99999,
        } as any)
        .execute()
    ).rejects.toThrow()
  })

  it('should accept plan_soins_items insert with null prescription_id', async () => {
    const db = datasource.getInstance()

    const result = await db
      .insertInto('plan_soins_items')
      .values({
        plan_soins_id: planSoinsId,
        bloc_heure: '08:00',
        medicament: 'Libre',
        dosage: '500mg',
        voie: 'PO',
        statut: 'en_attente',
        prescription_id: null,
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow()

    expect(result).toBeDefined()
    expect(result.id).toBeGreaterThan(0)
  })

  // ─── getByPatientAndDate with prescription items ─────────────────

  it('returns items with prescription_id and resolves prescription type', async () => {
    const db = datasource.getInstance()

    const presc = await db
      .insertInto('prescriptions')
      .values({
        patient_id: patientId,
        medicament: 'TestMed',
        dosage: '500mg',
        voie: 'PO',
        duree: 7,
        frequence: '1x/jour',
        prescripteur_id: userId,
        statut: 'active',
        prescription_type: 'medicament',
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow()

    await insertSoinItem({ medicament: 'RxMed', prescription_id: presc.id!, statut: 'en_attente' })
    await insertSoinItem({ medicament: 'FreeMed', prescription_id: null, statut: 'valide', valide_par: 'Dr. Test', valide_a: '10:00' })

    const result = await service.getByPatientAndDate(patientId, '2025-06-15')
    expect(result).not.toBeNull()

    const allSoins = result!.blocs.flatMap(b => b.soins)
    const rxSoin = allSoins.find(s => s.medicament === 'RxMed')
    expect(rxSoin).toBeDefined()
    expect(rxSoin!.prescriptionType).toBe('medicament')

    const freeSoin = allSoins.find(s => s.medicament === 'FreeMed')
    expect(freeSoin).toBeDefined()
    expect(freeSoin!.prescriptionType).toBeNull()
  })

  it('returns items with soins prescription type', async () => {
    const db = datasource.getInstance()

    const presc = await db
      .insertInto('prescriptions')
      .values({
        patient_id: patientId,
        medicament: 'Pansement',
        dosage: '1',
        voie: 'PO',
        duree: 3,
        frequence: '1x/jour',
        prescripteur_id: userId,
        statut: 'active',
        prescription_type: 'soins',
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow()

    await insertSoinItem({ medicament: 'Pansement', prescription_id: presc.id!, statut: 'en_attente' })

    const result = await service.getByPatientAndDate(patientId, '2025-06-15')
    const allSoins = result!.blocs.flatMap(b => b.soins)
    const soin = allSoins.find(s => s.medicament === 'Pansement')
    expect(soin!.prescriptionType).toBe('soins')
  })

  // ─── listValidesByPatientAndDateRange mapping ────────────────────

  it('maps valide rows correctly with all fields', async () => {
    const db = datasource.getInstance()
    const ps2 = await db
      .insertInto('plan_soins')
      .values({
        patient_id: patientId,
        date: '2025-06-16',
        created_by: userId,
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow()

    await db
      .insertInto('plan_soins_items')
      .values({
        plan_soins_id: ps2.id,
        bloc_heure: '14:00',
        medicament: 'Amoxicilline',
        dosage: '1g',
        voie: 'PO',
        statut: 'valide',
        valide_par: 'Dr. Ndiaye',
        valide_a: '14:30',
      } as any)
      .executeTakeFirstOrThrow()

    const results = await service.listValidesByPatientAndDateRange(patientId, '2025-06-16', '2025-06-16')
    expect(results.length).toBe(1)
    expect(results[0].date).toBe('2025-06-16')
    expect(results[0].heure).toBe('14:00')
    expect(results[0].medicament).toBe('Amoxicilline')
    expect(results[0].dosage).toBe('1g')
    expect(results[0].voie).toBe('PO')
    expect(results[0].validePar).toBe('Dr. Ndiaye')
    expect(results[0].valideA).toBe('14:30')
  })

  // ─── suspendrePrescription with prescription type ────────────────

  it('suspends items and resolves prescription type', async () => {
    const db = datasource.getInstance()
    const presc = await db
      .insertInto('prescriptions')
      .values({
        patient_id: patientId,
        medicament: 'TypedMed',
        dosage: '200mg',
        voie: 'PO',
        duree: 5,
        frequence: '1x/jour',
        prescripteur_id: userId,
        statut: 'active',
        prescription_type: 'soins',
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow()

    await insertSoinItem({ medicament: 'TypedSoin', prescription_id: presc.id!, statut: 'en_attente' })

    const results = await service.suspendrePrescription(presc.id!, 'Motif test')
    expect(results.length).toBe(1)
    expect(results[0].prescriptionType).toBe('soins')
    expect(results[0].motifSuspension).toBe('Motif test')
  })

  it('resumes items and resolves prescription type', async () => {
    const db = datasource.getInstance()
    const presc = await db
      .insertInto('prescriptions')
      .values({
        patient_id: patientId,
        medicament: 'ResumeMed',
        dosage: '300mg',
        voie: 'PO',
        duree: 5,
        frequence: '1x/jour',
        prescripteur_id: userId,
        statut: 'active',
        prescription_type: 'medicament',
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow()

    await insertSoinItem({ medicament: 'ResumeSoin', prescription_id: presc.id!, statut: 'suspendu', motif_suspension: 'Test' })

    const results = await service.reprendrePrescription(presc.id!)
    expect(results.length).toBe(1)
    expect(results[0].prescriptionType).toBe('medicament')
    expect(results[0].statut).toBe('en_attente')
  })

  // ─── edge case: reprendrePrescription with empty items ───────────

  it('does not throw when resuming a prescription with no items', async () => {
    const db = datasource.getInstance()
    const presc = await db
      .insertInto('prescriptions')
      .values({
        patient_id: patientId,
        medicament: 'EmptyRx2',
        dosage: '0mg',
        voie: 'PO',
        duree: 1,
        frequence: '1x/jour',
        prescripteur_id: userId,
        statut: 'active',
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow()

    const results = await service.reprendrePrescription(presc.id!)
    expect(results).toEqual([])
  })

  // ─── Branch coverage: prescription_type null fallback ──────────────

  it('handles prescription with null prescription_type in getByPatientAndDate', async () => {
    const db = datasource.getInstance()

    const presc = await db
      .insertInto('prescriptions')
      .values({
        patient_id: patientId,
        medicament: 'NoTypeMed',
        dosage: '100mg',
        voie: 'PO',
        duree: 3,
        frequence: '1x/jour',
        prescripteur_id: userId,
        statut: 'active',
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow()

    await db
      .updateTable('prescriptions')
      .set({ prescription_type: 'medicament' } as any)
      .where('id', '=', presc.id!)
      .execute()

    await insertSoinItem({ medicament: 'NoTypeSoin', prescription_id: presc.id!, statut: 'en_attente' })

    const result = await service.getByPatientAndDate(patientId, '2025-06-15')
    const allSoins = result!.blocs.flatMap(b => b.soins)
    const soin = allSoins.find(s => s.medicament === 'NoTypeSoin')
    expect(soin).toBeDefined()
  })

  it('handles soin item with null created_at/updated_at', async () => {
    const db = datasource.getInstance()

    const item = await db
      .insertInto('plan_soins_items')
      .values({
        plan_soins_id: planSoinsId,
        bloc_heure: '08:00',
        medicament: 'NullDateMed',
        dosage: '100mg',
        voie: 'PO',
        statut: 'en_attente',
        prescription_id: null,
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow()

    await db
      .updateTable('plan_soins_items')
      .set({ created_at: null, updated_at: null } as any)
      .where('id', '=', item.id!)
      .execute()

    await insertSoinItem({ medicament: 'NullDateMed2', prescription_id: null, statut: 'valide', valide_par: 'Dr. Test', valide_a: '10:00', bloc_heure: '08:00' })

    const result = await service.getByPatientAndDate(patientId, '2025-06-15')
    expect(result).not.toBeNull()
  })

  it('handles prescription_id that does not exist in prescriptions table', async () => {
    const db = datasource.getInstance()

    const presc = await db
      .insertInto('prescriptions')
      .values({
        patient_id: patientId,
        medicament: 'OrphanMed',
        dosage: '50mg',
        voie: 'PO',
        duree: 1,
        frequence: '1x/jour',
        prescripteur_id: userId,
        statut: 'active',
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow()

    await insertSoinItem({ medicament: 'OrphanSoin', prescription_id: presc.id!, statut: 'en_attente' })

    await db.deleteFrom('prescriptions').where('id', '=', presc.id!).execute()

    await db.executeQuery({ sql: 'PRAGMA foreign_keys = OFF', parameters: [] } as any)
    await insertSoinItem({ medicament: 'OrphanSoin2', prescription_id: presc.id!, statut: 'valide', valide_par: 'Dr. Test', valide_a: '10:00' })
    await db.executeQuery({ sql: 'PRAGMA foreign_keys = ON', parameters: [] } as any)

    const result = await service.getByPatientAndDate(patientId, '2025-06-15')
    expect(result).not.toBeNull()
  })

  // ─── listDatesByPatient ─────────────────────────────────────────

  async function insertPlanSoinsRow(date: string) {
    const db = datasource.getInstance()
    return await db
      .insertInto('plan_soins')
      .values({ patient_id: patientId, date, created_by: userId } as any)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  it('returns distinct dates most recent first', async () => {
    await insertPlanSoinsRow('2025-06-10')
    await insertPlanSoinsRow('2025-06-15')
    await insertPlanSoinsRow('2025-06-12')

    const dates = await service.listDatesByPatient(patientId)
    expect(dates).toEqual(['2025-06-15', '2025-06-12', '2025-06-10'])
  })

  it('returns empty array for a patient with no plan_soins rows', async () => {
    const dates = await service.listDatesByPatient(999999)
    expect(dates).toEqual([])
  })
})
