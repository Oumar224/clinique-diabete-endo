import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { PlanSoinsService } from '../plan-soins.service'

describe('PlanSoinsService', () => {
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
    await insertSoinItem({ medicament: 'Doliprane', dosage: '1000mg', bloc_heure: '08:00' })
    await insertSoinItem({ medicament: 'Ibuprofène', dosage: '400mg', bloc_heure: '12:00' })

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
    await insertSoinItem({ medicament: 'M1', bloc_heure: '08:00' })
    await insertSoinItem({ medicament: 'M2', bloc_heure: '08:00' })
    await insertSoinItem({ medicament: 'M3', bloc_heure: '12:00' })

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
    expect(result.motifSuspension).toBeUndefined()
    expect(result.validePar).toBeUndefined()
    expect(result.valideA).toBeUndefined()
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
    expect(results.every(r => r.motifSuspension === undefined)).toBe(true)
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
    await insertSoinItem({ medicament: 'C', bloc_heure: '08:00' })
    await insertSoinItem({ medicament: 'A', bloc_heure: '08:00' })
    await insertSoinItem({ medicament: 'B', bloc_heure: '08:00' })

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
})
