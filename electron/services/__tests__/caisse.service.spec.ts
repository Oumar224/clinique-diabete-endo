import 'reflect-metadata'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Kysely } from 'kysely'
import { createMockDataSource, createTestDb } from './test-helper'
import { CaisseService } from '../caisse.service'

const INVOICE_PAYMENT_1 = 40_000
const INVOICE_PAYMENT_2 = 60_000
const PHARMACY_PAYMENT = 25_000
const SALARY_PAYMENT = 70_000
const PAID_EXPENSE = 50_000
const CREDIT_EXPENSE = 80_000

let db: Kysely<any>
let service: CaisseService
let transportCategoryId: number
let pharmacieCategoryId: number

async function seed(): Promise<void> {
  // Patient #1 (Dupont Jean) is created by the shared test helper.
  await db.insertInto('invoice').values({
    numero: 'F-20260110-0001',
    patient_id: 1,
    date: '2026-01-10',
    montant_total: INVOICE_PAYMENT_1 + INVOICE_PAYMENT_2,
    montant_restant: 0,
    status: 'payé',
  } as any).execute()

  const invoice = await db
    .selectFrom('invoice')
    .select('id')
    .where('numero', '=', 'F-20260110-0001')
    .executeTakeFirstOrThrow()

  await db.insertInto('invoice_payment').values([
    {
      invoice_id: invoice.id,
      montant: INVOICE_PAYMENT_1,
      mode_paiement: 'espèces',
      date_paiement: '2026-01-10',
      numero_recu: 'R-20260110-0001',
    },
    {
      invoice_id: invoice.id,
      montant: INVOICE_PAYMENT_2,
      mode_paiement: 'mobile_money',
      date_paiement: '2026-01-11',
      numero_recu: 'R-20260111-0001',
    },
  ] as any).execute()

  // Pharmacie : une vente payée, une vente à crédit (aucun paiement).
  const paidDelivery = await db.insertInto('delivrances').values({
    source: 'ordonnance_libre',
    source_document_id: 1,
    patient_id: 1,
    statut: 'servie',
    date_vente: '2026-01-15',
    type_vente: 'facturee',
    montant_total: PHARMACY_PAYMENT,
  } as any).returningAll().executeTakeFirstOrThrow()

  await db.insertInto('delivrances').values({
    source: 'ordonnance_libre',
    source_document_id: 2,
    patient_id: 1,
    statut: 'servie',
    date_vente: '2026-01-16',
    type_vente: 'facturee',
    montant_total: 90_000,
  } as any).execute()

  await db.insertInto('vente_pharmacie_paiement').values({
    delivrance_id: paidDelivery.id,
    montant: PHARMACY_PAYMENT,
    mode_paiement: 'espèces',
    date_paiement: '2026-01-15',
    numero_recu: 'RP-20260115-0001',
  } as any).execute()

  const employee = await db.insertInto('user').values({
    nom: 'Kone',
    prenom: 'Awa',
    email: 'awa.kone@cde.test',
    password_hash: 'x',
    role: 'COMPTABLE',
  } as any).returningAll().executeTakeFirstOrThrow()

  await db.insertInto('salaire_paiement').values({
    user_id: employee.id,
    periode: '2025-12',
    montant_net: SALARY_PAYMENT,
    mode_paiement: 'virement',
    date_paiement: '2026-01-20',
    reference: 'SAL-2025-12',
  } as any).execute()

  const transport = await db
    .selectFrom('depense_categorie')
    .select('id')
    .where('code', '=', 'transport')
    .executeTakeFirstOrThrow()
  const pharmacie = await db
    .selectFrom('depense_categorie')
    .select('id')
    .where('code', '=', 'pharmacie')
    .executeTakeFirstOrThrow()
  transportCategoryId = Number(transport.id)
  pharmacieCategoryId = Number(pharmacie.id)

  await db.insertInto('depense').values([
    {
      date: '2026-01-18',
      categorie_id: transportCategoryId,
      libelle: 'Carburant',
      montant: PAID_EXPENSE,
      mode_paiement: 'espèces',
      reference: 'DEP-001',
      statut_paiement: 'payee',
      date_paiement: '2026-01-18',
    },
    {
      date: '2026-01-19',
      categorie_id: pharmacieCategoryId,
      libelle: 'Achat médicaments à crédit',
      montant: CREDIT_EXPENSE,
      mode_paiement: 'virement',
      reference: 'DEP-002',
      statut_paiement: 'credit',
      date_paiement: '2026-01-19',
    },
  ] as any).execute()
}

beforeAll(async () => {
  db = await createTestDb()
  service = new CaisseService(createMockDataSource(db) as any)
  await seed()
})

afterAll(async () => {
  await db.destroy()
})

describe('CaisseService — solde et synthèse', () => {
  it('calcule le solde all-time (entrées − sorties, crédits exclus)', async () => {
    const solde = await service.getSolde()
    expect(solde).toBe(
      INVOICE_PAYMENT_1 + INVOICE_PAYMENT_2 + PHARMACY_PAYMENT - SALARY_PAYMENT - PAID_EXPENSE,
    )
  })

  it('exclut la vente pharmacie à crédit et la dépense à crédit', async () => {
    const synthese = await service.getSynthese()
    expect(synthese.count).toBe(5)
    expect(synthese.entrees).toBe(INVOICE_PAYMENT_1 + INVOICE_PAYMENT_2 + PHARMACY_PAYMENT)
    expect(synthese.sorties).toBe(SALARY_PAYMENT + PAID_EXPENSE)
    expect(synthese.solde).toBe(5_000)
  })

  it('agrège les entrées/sorties par source', async () => {
    const { parSource } = await service.getSynthese()
    const bySource = Object.fromEntries(parSource.map((row) => [row.source, row]))

    expect(bySource.facture).toMatchObject({
      entrees: INVOICE_PAYMENT_1 + INVOICE_PAYMENT_2,
      sorties: 0,
      solde: INVOICE_PAYMENT_1 + INVOICE_PAYMENT_2,
      count: 2,
    })
    expect(bySource.pharmacie).toMatchObject({
      entrees: PHARMACY_PAYMENT,
      sorties: 0,
      count: 1,
    })
    expect(bySource.salaire).toMatchObject({
      entrees: 0,
      sorties: SALARY_PAYMENT,
      solde: -SALARY_PAYMENT,
      count: 1,
    })
    expect(bySource.depense).toMatchObject({
      entrees: 0,
      sorties: PAID_EXPENSE,
      solde: -PAID_EXPENSE,
      count: 1,
    })
  })

  it('agrège par mode et par sens', async () => {
    const { parMode } = await service.getSynthese()
    const find = (mode: string, sens: string) =>
      parMode.find((row) => row.mode === mode && row.sens === sens)

    expect(find('espèces', 'entree')).toMatchObject({
      total: INVOICE_PAYMENT_1 + PHARMACY_PAYMENT,
      count: 2,
    })
    expect(find('espèces', 'sortie')).toMatchObject({ total: PAID_EXPENSE, count: 1 })
    expect(find('mobile_money', 'entree')).toMatchObject({ total: INVOICE_PAYMENT_2, count: 1 })
    expect(find('virement', 'sortie')).toMatchObject({ total: SALARY_PAYMENT, count: 1 })
    expect(find('virement', 'entree')).toBeUndefined()
  })

  it('restreint la synthèse à une période inclusive', async () => {
    const synthese = await service.getSynthese({
      dateDebut: '2026-01-15',
      dateFin: '2026-01-20',
    })

    expect(synthese.entrees).toBe(PHARMACY_PAYMENT)
    expect(synthese.sorties).toBe(SALARY_PAYMENT + PAID_EXPENSE)
    expect(synthese.solde).toBe(PHARMACY_PAYMENT - SALARY_PAYMENT - PAID_EXPENSE)
    expect(synthese.count).toBe(3)
  })
})
