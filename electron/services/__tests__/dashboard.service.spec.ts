import 'reflect-metadata'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Kysely } from 'kysely'
import { createMockDataSource, createTestDb } from './test-helper'
import { DashboardService } from '../dashboard.service'

let db: Kysely<any>
let service: DashboardService

beforeAll(async () => {
  db = await createTestDb()
  service = new DashboardService(createMockDataSource(db) as any)
})

afterAll(async () => {
  await db.destroy()
})

async function addInvoice(
  numero: string,
  date: string,
  montantTotal: number,
  status = 'payé',
): Promise<number> {
  const row = await db
    .insertInto('invoice')
    .values({
      numero,
      patient_id: 1,
      date,
      montant_total: montantTotal,
      montant_restant: status === 'payé' ? 0 : montantTotal,
      status,
    })
    .returning('id')
    .executeTakeFirstOrThrow()
  return Number(row.id)
}

async function addPayment(
  invoiceId: number,
  datePaiement: string,
  montant: number,
  numeroRecu: string,
): Promise<void> {
  await db
    .insertInto('invoice_payment')
    .values({
      invoice_id: invoiceId,
      montant,
      mode_paiement: 'espèces',
      date_paiement: datePaiement,
      numero_recu: numeroRecu,
    })
    .execute()
}

describe('DashboardService — CA facturé vs encaissé (M5)', () => {
  it('distingue le facturé de l’encaissé et calcule le taux de la période', async () => {
    const inv1 = await addInvoice('DASH-2026-0001', '2026-01-10', 100_000)
    const inv2 = await addInvoice('DASH-2026-0002', '2026-01-20', 50_000)
    // Facture annulée : jamais comptée dans le CA.
    await addInvoice('DASH-2026-0003', '2026-01-15', 999_000, 'annulé')
    // 40 000 encaissés DANS la période, 70 000 encaissés APRÈS.
    await addPayment(inv1, '2026-01-12', 40_000, 'R-DASH-0001')
    await addPayment(inv2, '2026-02-03', 70_000, 'R-DASH-0002')

    const stats = await service.getStats({
      date_debut: '2026-01-01',
      date_fin: '2026-01-31',
    })

    expect(stats.ca.periode).toBe(150_000)
    expect(stats.ca.ca_facture_mois).toBe(150_000)
    // Champs historiques : toujours du FACTURÉ (compatibilité).
    expect(stats.ca.mois).toBe(150_000)

    expect(stats.ca.encaisse_periode).toBe(40_000)
    expect(stats.ca.ca_mois).toBe(40_000)
    expect(stats.ca.taux_encaissement).toBe(27) // 40 000 / 150 000
  })

  it('borne le taux d’encaissement à 100 % en cas de sur-encaissement', async () => {
    const inv = await addInvoice('DASH-2026-0004', '2026-03-10', 10_000)
    await addPayment(inv, '2026-03-11', 50_000, 'R-DASH-0003')

    const stats = await service.getStats({
      date_debut: '2026-03-01',
      date_fin: '2026-03-31',
    })

    expect(stats.ca.periode).toBe(10_000)
    expect(stats.ca.encaisse_periode).toBe(50_000)
    expect(stats.ca.taux_encaissement).toBe(100)
  })

  it('retourne 0 % quand rien n’est facturé sur la période', async () => {
    // Facture d'une autre période, encaissée dans celle-ci.
    const inv = await addInvoice('DASH-2025-0001', '2025-12-10', 10_000)
    await addPayment(inv, '2026-04-05', 30_000, 'R-DASH-0004')

    const stats = await service.getStats({
      date_debut: '2026-04-01',
      date_fin: '2026-04-30',
    })

    expect(stats.ca.periode).toBe(0)
    expect(stats.ca.encaisse_periode).toBe(30_000)
    expect(stats.ca.taux_encaissement).toBe(0)
    expect(stats.ca.ca_mois).toBe(30_000)
  })
})
