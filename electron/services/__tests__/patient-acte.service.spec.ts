import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { PatientActeService } from '../patient-acte.service'
import { ConfigTarifService } from '../config-tarif.service'

describe('PatientActeService', { timeout: 30_000 }, () => {
  let tempDir: string
  let dbPath: string
  let patientId: number
  let encounterId: number
  let acteId: number
  // tarif auto-resolved from config_tarifs

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-pa-test-'))
    dbPath = path.join(tempDir, 'test.db')
    container.register('DB_PATH', { useValue: dbPath })
    const datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()

    // Seed a patient with raw SQL
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const patientResult = await db
      .insertInto('patient')
      .values({
        civilite: 'M',
        nom: 'Test',
        prenom: 'Patient',
        date_naissance: '1990-01-01',
        nir: 'TEST001',
        telephone: '0000000000',
      })
      .returning('id')
      .executeTakeFirst()
    patientId = (patientResult as any).id

    // Get an existing medical act
    const acts = await db
      .selectFrom('medical_acts')
      .select('id')
      .execute()
    acteId = acts[0].id!

    // Create a TARIF.STANDARD for the act
    const configService = container.resolve(ConfigTarifService)
    const tarif = await configService.create({
      acte_id: acteId,
      prix_unitaire: 50000,
      code_tarif: 'TARIF.STANDARD',
    })
    // tarif_id is auto-resolved by PatientActeService.create()

    // Create an encounter for the patient
    const { EncounterService } = await import('../encounter.service')
    const encounterService = container.resolve(EncounterService)
    const encounter = await encounterService.create({
      patient_id: patientId,
      contact_type: 'consultation',
      start_date: new Date().toISOString(),
      origin: 'auto_refere',
      zone_situation: 'zone_responsabilite',
      prise_en_charge: 'maladie_naturelle',
      service_id: 1,
    } as any)
    encounterId = encounter.id!
  })

  afterEach(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch { /* cleanup best-effort */ }
  })

  // ─── listByPatient ────────────────────────────────────────────
  it('should list acts for a patient with act and tarif info', async () => {
    const service = container.resolve(PatientActeService)

    // Create a patient acte first
    await service.create({
      patient_id: patientId,
      acte_id: acteId,
      encounter_id: encounterId,
    })

    const list = await service.listByPatient(patientId)
    expect(list.length).toBe(1)
    expect(list[0].patient_id).toBe(patientId)
    expect((list[0] as any).acte_code).toBeTruthy()
    expect((list[0] as any).acte_label).toBeTruthy()
    expect((list[0] as any).prix_unitaire).toBe(50000)
    expect(list[0].statut_paiement).toBe('A_PAYER')
  })

  it('should return empty array for patient with no acts', async () => {
    const service = container.resolve(PatientActeService)
    const list = await service.listByPatient(99999)
    expect(list).toEqual([])
  })

  // ─── listByEncounter ─────────────────────────────────────────
  it('should return acts for a specific encounter', async () => {
    const service = container.resolve(PatientActeService)
    await service.create({
      patient_id: patientId,
      acte_id: acteId,
      encounter_id: encounterId,
    })

    const list = await service.listByEncounter(encounterId)
    expect(list.length).toBe(1)
    expect(list[0].encounter_id).toBe(encounterId)
  })

  it('should return empty array for encounter with no acts', async () => {
    const service = container.resolve(PatientActeService)
    const list = await service.listByEncounter(99999)
    expect(list).toEqual([])
  })

  // ─── create ──────────────────────────────────────────────────
  it('should create a patient acte and auto-look-up TARIF.STANDARD', async () => {
    const service = container.resolve(PatientActeService)
    const created = await service.create({
      patient_id: patientId,
      acte_id: acteId,
      encounter_id: encounterId,
    })

    expect(created.id).toBeDefined()
    expect(created.patient_id).toBe(patientId)
    expect(created.quantite).toBe(1)
    expect(created.statut_paiement).toBe('A_PAYER')
    expect((created as any).prix_unitaire).toBe(50000)
    expect((created as any).code_tarif).toBe('TARIF.STANDARD')
  })

  it('should use explicit tarif_id when provided', async () => {
    const service = container.resolve(PatientActeService)
    const configService = container.resolve(ConfigTarifService)
    const vipTarif = await configService.create({
      acte_id: acteId,
      prix_unitaire: 100000,
      code_tarif: 'TARIF.VIP',
    })

    const created = await service.create({
      patient_id: patientId,
      acte_id: acteId,
      encounter_id: encounterId,
      tarif_id: vipTarif.id,
    })

    expect((created as any).prix_unitaire).toBe(100000)
    expect((created as any).code_tarif).toBe('TARIF.VIP')
  })

  it('should create with a custom quantite', async () => {
    const service = container.resolve(PatientActeService)
    const created = await service.create({
      patient_id: patientId,
      acte_id: acteId,
      encounter_id: encounterId,
      quantite: 3,
    })

    expect(created.quantite).toBe(3)
  })

  it('should reject non-existent acte_id', async () => {
    const service = container.resolve(PatientActeService)
    await expect(
      service.create({ patient_id: patientId, acte_id: 99999 })
    ).rejects.toThrow("Impossible de créer la demande : acte médical (ID 99999) n'existe pas dans la base de données")
  })

  it('should reject non-existent patient_id', async () => {
    const service = container.resolve(PatientActeService)
    await expect(
      service.create({ patient_id: 99999, acte_id: acteId })
    ).rejects.toThrow("Impossible de créer la demande : patient (ID 99999) n'existe pas dans la base de données")
  })

  // ─── updateStatut ────────────────────────────────────────────
  it('should change payment status to PAYE', async () => {
    const service = container.resolve(PatientActeService)
    const created = await service.create({
      patient_id: patientId,
      acte_id: acteId,
    })

    const updated = await service.updateStatut(created.id!, 'PAYE')
    expect(updated.statut_paiement).toBe('PAYE')
  })

  it('should change payment status back to A_PAYER', async () => {
    const service = container.resolve(PatientActeService)
    const created = await service.create({
      patient_id: patientId,
      acte_id: acteId,
    })

    await service.updateStatut(created.id!, 'PAYE')
    const reverted = await service.updateStatut(created.id!, 'A_PAYER')
    expect(reverted.statut_paiement).toBe('A_PAYER')
  })

  it('should throw when updating statut for non-existent acte', async () => {
    const service = container.resolve(PatientActeService)
    await expect(service.updateStatut(99999, 'PAYE')).rejects.toThrow('Acte patient introuvable')
  })

  // ─── delete ──────────────────────────────────────────────────
  it('should delete a patient acte', async () => {
    const service = container.resolve(PatientActeService)
    const created = await service.create({
      patient_id: patientId,
      acte_id: acteId,
    })

    await service.delete(created.id!)
    const list = await service.listByPatient(patientId)
    expect(list.find(a => a.id === created.id)).toBeUndefined()
  })

  it('should throw when deleting non-existent patient acte', async () => {
    const service = container.resolve(PatientActeService)
    await expect(service.delete(99999)).rejects.toThrow('Acte patient introuvable')
  })
})
