import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { InvoiceService } from '../invoice.service'

describe('InvoiceService', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-invoice-test-'))
    dbPath = path.join(tempDir, 'test.db')
    container.register('DB_PATH', { useValue: dbPath })
    const datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()
  })

  afterEach(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch { /* best-effort cleanup */ }
  })

  async function createTestPatient(): Promise<number> {
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const p = await db
      .insertInto('patient')
      .values({
        civilite: 'M',
        nom: 'Diallo',
        prenom: 'Amadou',
        date_naissance: '1985-06-15',
        nir: `1${String(Math.random()).slice(2, 15)}`,
        telephone: '0612345678',
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    return p.id!
  }

  // ─── Create ─────────────────────────────────────────────────────

  it('should create an invoice successfully', async () => {
    const service = container.resolve(InvoiceService)
    const patientId = await createTestPatient()

    const result = await service.create({
      patient_id: patientId,
      date: new Date().toISOString().slice(0, 10),
      items: [
        { libelle: 'Consultation', quantite: 1, prix_unitaire: 50000, montant: 50000, type: 'consultation' },
      ],
    })

    expect(result).toBeDefined()
    expect(result.id).toBeDefined()
    expect(result.patient_id).toBe(patientId)
    expect(result.status).toBe('en_attente')
  })

  it('should reject create with invalid patient_id', async () => {
    const service = container.resolve(InvoiceService)

    await expect(
      service.create({
        patient_id: 99999,
        date: new Date().toISOString().slice(0, 10),
        items: [
          { libelle: 'Consultation', quantite: 1, prix_unitaire: 50000, montant: 50000, type: 'consultation' },
        ],
      })
    ).rejects.toThrow()
  })

  // ─── Payments ──────────────────────────────────────────────────

  it('should add a payment to an existing invoice', async () => {
    const service = container.resolve(InvoiceService)
    const patientId = await createTestPatient()

    const invoice = await service.create({
      patient_id: patientId,
      date: new Date().toISOString().slice(0, 10),
      items: [
        { libelle: 'Consultation', quantite: 1, prix_unitaire: 50000, montant: 50000, type: 'consultation' },
      ],
    })

    const updated = await service.addPayment({
      invoice_id: invoice.id!,
      montant: 50000,
      mode_paiement: 'espèces',
      date_paiement: new Date().toISOString(),
    })

    expect(updated.status).toBe('payé')
  })

  it('should reject addPayment with invalid invoice_id', async () => {
    const service = container.resolve(InvoiceService)

    await expect(
      service.addPayment({
        invoice_id: 99999,
        montant: 50000,
        mode_paiement: 'espèces',
        date_paiement: new Date().toISOString(),
      })
    ).rejects.toThrow()
  })
})
