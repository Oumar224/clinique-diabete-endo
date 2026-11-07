import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

  it('projette l’identifiant patient (IP / NIP) sur la facture', async () => {
    const service = container.resolve(InvoiceService)
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const patient = await db
      .insertInto('patient')
      .values({
        civilite: 'M',
        nom: 'Fofana',
        prenom: 'Adama',
        date_naissance: '1990-03-12',
        nir: `9${String(Math.random()).slice(2, 15)}`,
        nip: `NIP-${String(Math.random()).slice(2, 8)}`,
        telephone: '0623456789',
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    const invoice = await service.create({
      patient_id: patient.id!,
      date: '2026-10-24',
      items: [
        { libelle: 'Consultation', quantite: 1, prix_unitaire: 40000, montant: 40000, type: 'consultation' },
      ],
    })

    const detail = await service.getById(invoice.id!)
    expect(detail?.patient_nip).toBe(patient.nip)

    const listed = (await service.list()).find((row) => row.id === invoice.id)
    expect(listed?.patient_nip).toBe(patient.nip)
  })

  it('persiste acte_id sur la ligne de facture (migration 110)', async () => {
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const patientId = await createTestPatient()
    const service = await db
      .insertInto('services')
      .values({ name: 'Endocrinologie Test' })
      .returningAll()
      .executeTakeFirstOrThrow()
    const acte = await db
      .insertInto('medical_acts')
      .values({
        code: 'ENDO-TEST',
        label: 'Consultation endocrinologie',
        service_id: service.id!,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    const invoice = await container.resolve(InvoiceService).create({
      patient_id: patientId,
      date: new Date().toISOString().slice(0, 10),
      items: [
        {
          libelle: 'ENDO-TEST — Consultation endocrinologie',
          quantite: 1,
          prix_unitaire: 75000,
          montant: 75000,
          type: 'acte',
          acte_id: String(acte.id),
        },
      ],
    })

    expect(invoice.items?.[0]).toMatchObject({
      type: 'acte',
      acte_id: String(acte.id),
    })
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

  it('should reject a payment on a cancelled invoice', async () => {
    const service = container.resolve(InvoiceService)
    const patientId = await createTestPatient()

    const invoice = await service.create({
      patient_id: patientId,
      date: '2026-07-01',
      items: [{ libelle: 'Acte', quantite: 1, prix_unitaire: 50000, montant: 50000, type: 'acte' }],
    })
    await service.update(invoice.id!, { status: 'annulé' })

    await expect(
      service.addPayment({
        invoice_id: invoice.id!,
        montant: 10000,
        mode_paiement: 'espèces',
        date_paiement: '2026-07-01',
      }),
    ).rejects.toThrow(/annulée/i)

    const after = await service.getById(invoice.id!)
    expect(after!.status).toBe('annulé')
    expect(after!.payments ?? []).toHaveLength(0)
    expect(after!.montant_restant).toBe(0)
  })

  it('should reject an overpayment and persist nothing', async () => {
    const service = container.resolve(InvoiceService)
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const patientId = await createTestPatient()

    const invoice = await service.create({
      patient_id: patientId,
      date: '2026-07-02',
      items: [{ libelle: 'Acte', quantite: 1, prix_unitaire: 50000, montant: 50000, type: 'acte' }],
    })

    await expect(
      service.addPayment({
        invoice_id: invoice.id!,
        montant: 60000,
        mode_paiement: 'espèces',
        date_paiement: '2026-07-02',
      }),
    ).rejects.toThrow(/reste à payer/i)

    const after = await service.getById(invoice.id!)
    expect(after!.status).toBe('en_attente')
    expect(after!.montant_restant).toBe(50000)
    expect(after!.payments ?? []).toHaveLength(0)

    const count: any = await db
      .selectFrom('invoice_payment')
      .select(db.fn.countAll<number>().as('nb'))
      .executeTakeFirst()
    expect(Number(count?.nb ?? 0)).toBe(0)
  })

  it('should roll back the payment insert when the post-insert check fails', async () => {
    const service = container.resolve(InvoiceService)
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const patientId = await createTestPatient()

    const invoice = await service.create({
      patient_id: patientId,
      date: '2026-07-03',
      items: [{ libelle: 'Acte', quantite: 1, prix_unitaire: 50000, montant: 50000, type: 'acte' }],
    })

    // Simule une course : le garde-fou voit 0 payé, puis le contrôle
    // post-insertion voit un total supérieur au dû. La transaction doit
    // être annulée, y compris l'insertion du reçu.
    const spy = vi
      .spyOn(service as any, 'getTotalPaid')
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(60000)

    await expect(
      service.addPayment({
        invoice_id: invoice.id!,
        montant: 50000,
        mode_paiement: 'espèces',
        date_paiement: '2026-07-03',
      }),
    ).rejects.toThrow(/reste à payer|dépasserait/i)
    spy.mockRestore()

    const count: any = await db
      .selectFrom('invoice_payment')
      .select(db.fn.countAll<number>().as('nb'))
      .executeTakeFirst()
    expect(Number(count?.nb ?? 0)).toBe(0)

    const after = await service.getById(invoice.id!)
    expect(after!.status).toBe('en_attente')
    expect(after!.montant_restant).toBe(50000)
  })

  // ─── Remise / TVA ─────────────────────────────────────────────

  it('should compute total = sum(qte*pu) - remise% + tva%', async () => {
    const service = container.resolve(InvoiceService)
    const patientId = await createTestPatient()

    const result = await service.create({
      patient_id: patientId,
      date: new Date().toISOString().slice(0, 10),
      remise_pct: 10,
      tva_pct: 18,
      items: [
        { libelle: 'Consultation', quantite: 1, prix_unitaire: 100000, montant: 100000, type: 'consultation' },
      ],
    } as any)

    // 100 000 - 10% = 90 000 + 18% = 106 200
    expect(result.montant_total).toBe(106200)
    expect(result.remise_pct).toBe(10)
    expect(result.tva_pct).toBe(18)
    expect(result.part_patient).toBe(106200)
  })

  // ─── Modification tant qu'aucun paiement n'est encaissé ─────────

  it('should replace items and recompute totals on an unpaid invoice', async () => {
    const service = container.resolve(InvoiceService)
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const patientId = await createTestPatient()
    const serviceRow = await db
      .insertInto('services')
      .values({ name: 'Endocrinologie Update' })
      .returningAll()
      .executeTakeFirstOrThrow()
    const acte = await db
      .insertInto('medical_acts')
      .values({ code: 'UPD-1', label: 'Acte à modifier', service_id: serviceRow.id! })
      .returningAll()
      .executeTakeFirstOrThrow()

    const invoice = await service.create({
      patient_id: patientId,
      date: '2026-05-10',
      items: [
        { libelle: 'Ancienne ligne', quantite: 1, prix_unitaire: 50000, montant: 50000, type: 'consultation' },
      ],
    })

    const updated = await service.update(invoice.id!, {
      remise_pct: 10,
      tva_pct: 18,
      items: [
        {
          libelle: 'UPD-1 — Acte à modifier',
          quantite: 2,
          prix_unitaire: 50000,
          montant: 100000,
          type: 'acte',
          acte_id: String(acte.id),
        },
        { libelle: 'Consultation', quantite: 1, prix_unitaire: 20000, montant: 20000, type: 'consultation' },
      ],
    })

    // 120 000 − 10 % = 108 000 ; + 18 % = 127 440
    expect(updated.montant_total).toBe(127440)
    expect(updated.part_patient).toBe(127440)
    expect(updated.montant_restant).toBe(127440)
    expect(updated.status).toBe('en_attente')
    expect(updated.remise_pct).toBe(10)
    expect(updated.tva_pct).toBe(18)
    expect(updated.items).toHaveLength(2)
    expect(updated.items?.some((item) => item.libelle === 'Ancienne ligne')).toBe(false)
    expect(updated.items?.find((item) => item.type === 'acte')?.acte_id).toBe(String(acte.id))

    const persisted = await db
      .selectFrom('invoice_item')
      .selectAll()
      .where('invoice_id', '=', invoice.id!)
      .execute()
    expect(persisted).toHaveLength(2)
  })

  it('should refuse any content edit once a payment has been recorded', async () => {
    const service = container.resolve(InvoiceService)
    const patientId = await createTestPatient()

    const invoice = await service.create({
      patient_id: patientId,
      date: '2026-05-11',
      items: [{ libelle: 'Acte', quantite: 1, prix_unitaire: 50000, montant: 50000, type: 'acte' }],
    })
    await service.addPayment({
      invoice_id: invoice.id!,
      montant: 10000,
      mode_paiement: 'espèces',
      date_paiement: '2026-05-11',
    } as any)

    await expect(
      service.update(invoice.id!, {
        items: [{ libelle: 'Nouveau', quantite: 1, prix_unitaire: 90000, montant: 90000, type: 'consultation' }],
      }),
    ).rejects.toThrow(/paiement/i)

    const after = await service.getById(invoice.id!)
    expect(after!.montant_total).toBe(50000)
    expect(after!.items).toHaveLength(1)
    expect(after!.items?.[0].libelle).toBe('Acte')
  })

  it('should refuse to modify a cancelled invoice', async () => {
    const service = container.resolve(InvoiceService)
    const patientId = await createTestPatient()

    const invoice = await service.create({
      patient_id: patientId,
      date: '2026-05-12',
      items: [{ libelle: 'Acte', quantite: 1, prix_unitaire: 50000, montant: 50000, type: 'acte' }],
    })
    await service.update(invoice.id!, { status: 'annulé' })

    await expect(service.update(invoice.id!, { notes: 'retouche' })).rejects.toThrow(/annulée/i)

    const after = await service.getById(invoice.id!)
    expect(after!.status).toBe('annulé')
    expect(after!.notes ?? '').not.toBe('retouche')
  })

  it('should derive the assurance share from an explicit take-over rate', async () => {
    const service = container.resolve(InvoiceService)
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const patientId = await createTestPatient()
    const insurance = await db
      .insertInto('insurances')
      .values({ name: 'Assurance Test', code: `AT-${String(Math.random()).slice(2, 8)}` })
      .returningAll()
      .executeTakeFirstOrThrow()

    const invoice = await service.create({
      patient_id: patientId,
      date: '2026-05-13',
      items: [{ libelle: 'Acte', quantite: 1, prix_unitaire: 100000, montant: 100000, type: 'acte' }],
    })

    const updated = await service.update(invoice.id!, {
      assurance_id: insurance.id!,
      taux_prise_en_charge: 70,
    })

    expect(updated.montant_total).toBe(100000)
    expect(updated.part_assurance).toBe(70000)
    expect(updated.part_patient).toBe(30000)
    expect(updated.montant_restant).toBe(30000)
  })

  it('should stamp updated_at on every modification', async () => {
    const service = container.resolve(InvoiceService)
    const patientId = await createTestPatient()

    const invoice = await service.create({
      patient_id: patientId,
      date: '2026-05-14',
      items: [{ libelle: 'Acte', quantite: 1, prix_unitaire: 20000, montant: 20000, type: 'acte' }],
    })
    const before = (await service.getById(invoice.id!))!.updated_at

    const after = await service.update(invoice.id!, { notes: 'note modifiée' })

    expect(after.updated_at).toBeTruthy()
    expect(after.updated_at).not.toBe(before)
    expect(new Date(after.updated_at!).toISOString()).toBe(after.updated_at)
    expect(after.notes).toBe('note modifiée')
  })

  // ─── Reçu auto ────────────────────────────────────────────────

  it('should generate numero_recu R-YYYYMMDD-0001 on payment', async () => {
    const service = container.resolve(InvoiceService)
    const patientId = await createTestPatient()
    const today = new Date().toISOString().slice(0, 10)

    const invoice = await service.create({
      patient_id: patientId,
      date: today,
      items: [
        { libelle: 'Acte', quantite: 2, prix_unitaire: 25000, montant: 50000, type: 'acte' },
      ],
    })

    const updated = await service.addPayment({
      invoice_id: invoice.id!,
      montant: 20000,
      mode_paiement: 'mobile_money',
      date_paiement: today,
    } as any)

    const lastPay = updated.payments![updated.payments!.length - 1] as any
    expect(lastPay.numero_recu).toMatch(new RegExp(`^R-${today.replace(/-/g, '')}-\\d{4}$`))
    expect(updated.status).toBe('partiel')
    expect(updated.montant_restant).toBe(30000)

    const recu = await service.getRecu({ payment_id: lastPay.id })
    expect(recu).toBeDefined()
    expect(recu!.payment.numero_recu).toBe(lastPay.numero_recu)
    expect(recu!.montant_lettres).toContain('francs')
  })

  it('should return extended stats', async () => {
    const service = container.resolve(InvoiceService)
    const patientId = await createTestPatient()
    const today = new Date().toISOString().slice(0, 10)

    const inv = await service.create({
      patient_id: patientId,
      date: today,
      items: [
        { libelle: 'Consultation diabète', quantite: 1, prix_unitaire: 50000, montant: 50000, type: 'consultation' },
      ],
    })
    await service.addPayment({ invoice_id: inv.id!, montant: 50000, mode_paiement: 'espèces', date_paiement: today } as any)

    const stats = await service.getStats()
    expect(stats.ca_jour).toBeGreaterThanOrEqual(50000)
    expect(stats.ca_par_mode!.length).toBeGreaterThanOrEqual(1)
    expect(stats.top_actes!.length).toBeGreaterThanOrEqual(1)
  })

  // ─── Stats : filtres de période ──────────────────────────────────

  it('should restrict getStats windows and modes to the requested period', async () => {
    const service = container.resolve(InvoiceService)
    const patientId = await createTestPatient()
    const today = new Date().toISOString().slice(0, 10)
    const pastDay = '2020-01-15'

    const pastInvoice = await service.create({
      patient_id: patientId,
      date: pastDay,
      items: [
        { libelle: 'Consultation 2020', quantite: 1, prix_unitaire: 100000, montant: 100000, type: 'consultation' },
      ],
    })
    await service.addPayment({
      invoice_id: pastInvoice.id!,
      montant: 20000,
      mode_paiement: 'espèces',
      date_paiement: pastDay,
    } as any)

    const todayInvoice = await service.create({
      patient_id: patientId,
      date: today,
      items: [
        { libelle: 'Consultation', quantite: 1, prix_unitaire: 50000, montant: 50000, type: 'consultation' },
      ],
    })
    await service.addPayment({
      invoice_id: todayInvoice.id!,
      montant: 50000,
      mode_paiement: 'mobile_money',
      date_paiement: today,
    } as any)

    const pastStats = await service.getStats({ date_debut: '2020-01-01', date_fin: '2020-12-31' })
    expect(pastStats.ca_jour).toBe(0)
    // La semaine CALENDAIRE de l'ancre (mercredi 2020-01-01) est bornée au
    // 2020-01-05 : l'encaissement du 2020-01-15 n'en fait pas partie.
    // (Avant correction, la fenêtre de semaine n'était pas bornée et
    // remontait l'encaissement du 15 janvier : 20 000.)
    expect(pastStats.ca_semaine).toBe(0)
    expect(pastStats.ca_mois).toBe(20000)
    expect(pastStats.ca_annee).toBe(20000)
    expect(pastStats.ca_par_mode).toEqual([
      expect.objectContaining({ mode: 'espèces', total: 20000, nb: 1 }),
    ])

    const todayStats = await service.getStats({ date_debut: today, date_fin: today })
    expect(todayStats.ca_jour).toBe(50000)
    expect(todayStats.ca_semaine).toBe(50000)
    expect(todayStats.ca_mois).toBe(50000)
    expect(todayStats.ca_annee).toBe(50000)
    expect(todayStats.ca_par_mode).toEqual([
      expect.objectContaining({ mode: 'mobile_money', total: 50000, nb: 1 }),
    ])

    // Sans filtre : comportement historique, tous les modes.
    const allTime = await service.getStats()
    const modes = Object.fromEntries((allTime.ca_par_mode ?? []).map((m: any) => [m.mode, m.total]))
    expect(modes['espèces']).toBe(20000)
    expect(modes['mobile_money']).toBe(50000)
  })

  // ─── Politique d'annulation unique ───────────────────────────────

  it('should refuse to cancel an invoice that has payments', async () => {
    const service = container.resolve(InvoiceService)
    const patientId = await createTestPatient()

    const invoice = await service.create({
      patient_id: patientId,
      date: '2026-06-05',
      items: [{ libelle: 'Acte', quantite: 1, prix_unitaire: 50000, montant: 50000, type: 'acte' }],
    })
    await service.addPayment({
      invoice_id: invoice.id!,
      montant: 20000,
      mode_paiement: 'espèces',
      date_paiement: '2026-06-05',
    } as any)

    await expect(service.update(invoice.id!, { status: 'annulé' })).rejects.toThrow(/paiement/i)

    const after = await service.getById(invoice.id!)
    expect(after!.status).toBe('partiel')
    expect(after!.montant_restant).toBe(30000)
    expect(after!.payments ?? []).toHaveLength(1)
  })

  it('should reject an impossible invoice date', async () => {
    const service = container.resolve(InvoiceService)
    const patientId = await createTestPatient()

    await expect(
      service.create({
        patient_id: patientId,
        date: '2026-02-30',
        items: [{ libelle: 'Acte', quantite: 1, prix_unitaire: 10000, montant: 10000, type: 'acte' }],
      }),
    ).rejects.toThrow(/Date de facture invalide/i)
  })

  it('should reject an impossible payment date and persist nothing', async () => {
    const service = container.resolve(InvoiceService)
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const patientId = await createTestPatient()

    const invoice = await service.create({
      patient_id: patientId,
      date: '2026-09-01',
      items: [{ libelle: 'Acte', quantite: 1, prix_unitaire: 20000, montant: 20000, type: 'acte' }],
    })

    await expect(
      service.addPayment({
        invoice_id: invoice.id!,
        montant: 5000,
        mode_paiement: 'espèces',
        date_paiement: '2026-13-01',
      }),
    ).rejects.toThrow(/Date de paiement invalide/i)

    const count: any = await db
      .selectFrom('invoice_payment')
      .select(db.fn.countAll<number>().as('nb'))
      .executeTakeFirst()
    expect(Number(count?.nb ?? 0)).toBe(0)

    const after = await service.getById(invoice.id!)
    expect(after!.montant_restant).toBe(20000)
  })

  // ─── M5/M6 : fenêtres de getStats cadrées sur la plage demandée ───

  it('should frame getStats windows on the requested range', async () => {
    const service = container.resolve(InvoiceService)
    const patientId = await createTestPatient()

    // Facture payée le jour d'ancrage (2026-03-10) : 100 000 encaissés.
    const anchorInvoice = await service.create({
      patient_id: patientId,
      date: '2026-03-10',
      items: [{ libelle: 'Acte A', quantite: 1, prix_unitaire: 100000, montant: 100000, type: 'acte' }],
    })
    await service.addPayment({
      invoice_id: anchorInvoice.id!,
      montant: 100000,
      mode_paiement: 'espèces',
      date_paiement: '2026-03-10',
    } as any)

    // Facture antérieure encaissée pendant la fenêtre : le numérateur du taux
    // dépasse le dénominateur (la facture n'est pas dans la fenêtre).
    const oldInvoice = await service.create({
      patient_id: patientId,
      date: '2026-02-01',
      items: [{ libelle: 'Acte B', quantite: 1, prix_unitaire: 50000, montant: 50000, type: 'acte' }],
    })
    await service.addPayment({
      invoice_id: oldInvoice.id!,
      montant: 50000,
      mode_paiement: 'espèces',
      date_paiement: '2026-03-12',
    } as any)

    // Facture + encaissement hors de la plage : exclus de toutes les fenêtres.
    const outInvoice = await service.create({
      patient_id: patientId,
      date: '2026-04-05',
      items: [{ libelle: 'Acte C', quantite: 1, prix_unitaire: 900000, montant: 900000, type: 'acte' }],
    })
    await service.addPayment({
      invoice_id: outInvoice.id!,
      montant: 900000,
      mode_paiement: 'espèces',
      date_paiement: '2026-04-05',
    } as any)

    // Facture non payée dans la plage : compte pour nb_jour.
    await service.create({
      patient_id: patientId,
      date: '2026-03-20',
      items: [{ libelle: 'Acte D', quantite: 1, prix_unitaire: 10000, montant: 10000, type: 'acte' }],
    })

    const stats = await service.getStats({ date_debut: '2026-03-10', date_fin: '2026-03-31' })

    // ca_jour = ENCAISSÉ du jour d'ancrage uniquement (plus de repli sur le facturé).
    expect(stats.ca_jour).toBe(100000)
    expect(stats.ca_facture_jour).toBe(100000)
    // Les fenêtres ne dépassent jamais la plage demandée.
    expect(stats.ca_mois).toBe(150000)
    expect(stats.ca_annee).toBe(150000)
    // Taux plafonné à 100 % (150 000 encaissés / 110 000 facturés dans la fenêtre).
    expect(stats.taux_encaissement).toBeLessThanOrEqual(100)
    expect(stats.taux_encaissement).toBe(100)
    // nb_jour suit la plage (2 factures datées entre le 10 et le 31 mars).
    expect(stats.nb_jour).toBe(2)
    expect(stats.nb_jours_periode).toBe(22)
    expect(stats.nb_mois).toBe(2)
  })

  it('should keep ca_jour strictly collected when no invoice was paid that day', async () => {
    const service = container.resolve(InvoiceService)
    const patientId = await createTestPatient()
    const today = new Date().toISOString().slice(0, 10)

    // Facture payée HIER : facturée aujourd'hui, encaissée hier.
    const invoice = await service.create({
      patient_id: patientId,
      date: today,
      items: [{ libelle: 'Acte', quantite: 1, prix_unitaire: 70000, montant: 70000, type: 'acte' }],
    })
    await service.addPayment({
      invoice_id: invoice.id!,
      montant: 70000,
      mode_paiement: 'espèces',
      date_paiement: '2026-01-15',
    } as any)

    const stats = await service.getStats({ date_debut: today, date_fin: today })
    // Aucun encaissement le jour d'ancrage : ca_jour vaut 0 (et non le facturé).
    expect(stats.ca_jour).toBe(0)
    expect(stats.ca_facture_jour).toBe(70000)
  })

  // ─── MINOR-3 : clés calendaires de ca_30j entièrement en UTC ───

  it('should build ca_30j keys on UTC days even under a non-UTC timezone', async () => {
    const service = container.resolve(InvoiceService)
    const previousTz = process.env.TZ
    // Los Angeles : le passage à l'heure d'été (08/03/2026) tombe DANS la
    // fenêtre de 30 jours ancrée au 10/03/2026. L'ancien code (`setDate` +
    // `getDate`, heure locale) y décalait les clés d'un jour et en dupliquait.
    process.env.TZ = 'America/Los_Angeles'
    try {
      const stats = await service.getStats({ date_debut: '2026-03-10', date_fin: '2026-03-31' })
      const keys = (stats.ca_30j ?? []).map((point) => point.date)

      expect(keys).toHaveLength(30)
      // 30 jours UTC consécutifs se terminant sur le jour d'ancrage.
      expect(keys[0]).toBe('2026-02-09')
      expect(keys[29]).toBe('2026-03-10')
      expect(new Set(keys).size).toBe(30) // aucune clé dupliquée par la dérive DST
      expect([...keys].sort()).toEqual(keys)
      keys.forEach((key, index) => {
        expect(key).toBe(new Date(Date.UTC(2026, 1, 9 + index)).toISOString().slice(0, 10))
      })
    } finally {
      if (previousTz === undefined) delete process.env.TZ
      else process.env.TZ = previousTz
    }
  })

  // ─── MINOR-5 : nb_jours_periode indéfini si une borne manque ───

  it('should not report nb_jours_periode when a period bound is missing', async () => {
    const service = container.resolve(InvoiceService)

    const debutSeul = await service.getStats({ date_debut: '2026-03-10' })
    const finSeule = await service.getStats({ date_fin: '2026-03-31' })
    const sansPlage = await service.getStats()

    expect(debutSeul.nb_jours_periode).toBeUndefined()
    expect(finSeule.nb_jours_periode).toBeUndefined()
    expect(sansPlage.nb_jours_periode).toBeUndefined()

    // Les deux bornes fournies : le décompte reste défini.
    const plage = await service.getStats({ date_debut: '2026-03-10', date_fin: '2026-03-31' })
    expect(plage.nb_jours_periode).toBe(22)
  })
})
