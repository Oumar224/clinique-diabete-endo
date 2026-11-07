import 'reflect-metadata'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Kysely } from 'kysely'
import { createMockDataSource, createTestDb } from './test-helper'
import { SalaireService, computeSalaireNet } from '../salaire.service'
import { CaisseService } from '../caisse.service'

let db: Kysely<any>
let service: SalaireService
let caisse: CaisseService
let employee1: number
let employee2: number

beforeAll(async () => {
  db = await createTestDb()
  // Le seed ajoute un infirmier : on le désactive pour garder des effectifs déterministes.
  await db
    .updateTable('user')
    .set({ is_active: 0 })
    .where('email', '=', 'infirmier@cde.com')
    .execute()

  const first = await db
    .insertInto('user')
    .values({
      nom: 'Diallo',
      prenom: 'Aminata',
      email: 'aminata.salaire@test.com',
      password_hash: 'x',
      role: 'MEDECIN',
      service: 'Cardiologie',
      temps_travail: 'PARTIEL',
      numero_securite_sociale: 'NSS-AML-001',
      is_active: 1,
      is_validated: 1,
    })
    .returning('id')
    .executeTakeFirstOrThrow()
  const second = await db
    .insertInto('user')
    .values({
      nom: 'Camara',
      prenom: 'Ibrahima',
      email: 'ibrahima.salaire@test.com',
      password_hash: 'x',
      role: 'SECRETAIRE',
      service: 'Accueil',
      is_active: 1,
      is_validated: 1,
    })
    .returning('id')
    .executeTakeFirstOrThrow()

  employee1 = Number(first.id)
  employee2 = Number(second.id)
  caisse = new CaisseService(createMockDataSource(db) as any)
  service = new SalaireService(createMockDataSource(db) as any, caisse)
})

afterAll(async () => {
  await db.destroy()
})

describe('computeSalaireNet', () => {
  it('additionne la base, les rubriques fixes et les rubriques journalières du net', () => {
    const net = computeSalaireNet({
      base: 5_000_000,
      joursTravailles: 22,
      rubriques: [
        { libelle: 'Prime', type: 'fixe', montant: 500_000, impactNet: true },
        { libelle: 'Pan', type: 'journalier', montant: 0, montantJour: 100_000, impactNet: true },
      ],
    })

    expect(net).toBe(5_000_000 + 500_000 + 100_000 * 22)
  })

  it('applique le nombre de jours explicite d’une rubrique journalière', () => {
    const net = computeSalaireNet({
      base: 5_000_000,
      joursTravailles: 22,
      rubriques: [
        { libelle: 'Transport', type: 'journalier', montantJour: 10_000, jours: 24, impactNet: true },
        { libelle: 'Pan', type: 'journalier', montantJour: 5_000, jours: null, impactNet: true },
      ],
    })

    expect(net).toBe(5_000_000 + 10_000 * 24 + 5_000 * 22)
  })

  it('ignore les rubriques sans impact sur le net et arrondit le résultat', () => {
    const net = computeSalaireNet({
      base: 1_000_000,
      joursTravailles: 10,
      rubriques: [
        { libelle: 'Impôt', type: 'fixe', montant: 250_000, impactNet: false },
        { libelle: 'Transport', type: 'journalier', montantJour: 5_000, impactNet: true },
      ],
    })

    expect(net).toBe(1_050_000)
  })
})

describe('SalaireService — configuration', () => {
  it('crée une configuration avec ses rubriques puis la remplace intégralement', async () => {
    const created = await service.saveConfig({
      userId: employee1,
      periode: '2026-01',
      base: 5_000_000,
      joursTravailles: 20,
      createdBy: 1,
      rubriques: [
        { libelle: 'Transport', type: 'fixe', montant: 500_000, impactNet: true, ordre: 1 },
        { libelle: 'Pan', type: 'journalier', montantJour: 50_000, impactNet: true, ordre: 2 },
        { libelle: 'Impôt', type: 'fixe', montant: 100_000, impactNet: false, ordre: 3 },
      ],
    })

    expect(created.id).toBeDefined()
    expect(created.base).toBe(5_000_000)
    expect(created.joursTravailles).toBe(20)
    expect(created.rubriques).toHaveLength(3)
    expect(created.rubriques?.[1].montantJour).toBe(50_000)
    expect(created.rubriques?.[2].impactNet).toBe(false)
    expect(computeSalaireNet(created)).toBe(6_500_000)

    const updated = await service.saveConfig({
      userId: employee1,
      periode: '2026-01',
      base: 4_000_000,
      joursTravailles: 10,
      rubriques: [{ libelle: 'Prime unique', type: 'fixe', montant: 1_000_000, impactNet: true }],
    })

    expect(updated.id).toBe(created.id)
    expect(updated.base).toBe(4_000_000)
    expect(updated.rubriques).toHaveLength(1)
    expect(updated.rubriques?.[0].libelle).toBe('Prime unique')
    expect(computeSalaireNet(updated)).toBe(5_000_000)

    const rows = await service.listConfigs('2026-01')
    expect(rows).toHaveLength(2)
    const row = rows.find((item) => item.userId === employee1)
    expect(row?.nom).toBe('Diallo')
    expect(row?.config?.id).toBe(created.id)
    expect(rows.find((item) => item.userId === employee2)?.config).toBeNull()
  })

  it('rejette une rubrique journalière sans montantJour', async () => {
    await expect(
      service.saveConfig({
        userId: employee1,
        periode: '2026-07',
        base: 1_000_000,
        rubriques: [{ libelle: 'Pan', type: 'journalier', montant: 0 } as any],
      }),
    ).rejects.toThrow(/montantJour requis/)
  })

  it('rejette une période mal formée', async () => {
    await expect(service.listConfigs('2026-13')).rejects.toThrow(/Période invalide/)
  })

  it('copie les configurations du mois précédent sans écraser celles déjà présentes', async () => {
    const first = await service.copyPreviousMonth('2026-02')
    expect(first).toEqual({ copied: 1, skipped: 1 })

    const second = await service.copyPreviousMonth('2026-02')
    expect(second).toEqual({ copied: 0, skipped: 2 })

    const rows = await service.listConfigs('2026-02')
    const copied = rows.find((item) => item.userId === employee1)?.config
    expect(copied?.base).toBe(4_000_000)
    expect(copied?.rubriques).toHaveLength(1)
    expect(copied?.rubriques?.[0].libelle).toBe('Prime unique')
  })
})

describe('SalaireService — paie', () => {
  it('calcule le net de la feuille de paie et marque les employés payés', async () => {
    await service.saveConfig({
      userId: employee1,
      periode: '2026-05',
      base: 1_000_000,
      joursTravailles: 0,
      rubriques: [],
    })

    const before = await service.getPaie('2026-05')
    const row = before.find((item) => item.userId === employee1)
    expect(row?.montantNet).toBe(1_000_000)
    expect(row?.paye).toBe(false)
    expect(row?.paiement).toBeNull()

    const paiement = await service.payer({
      userId: employee1,
      periode: '2026-05',
      modePaiement: 'virement',
      datePaiement: '2026-06-01',
      reference: 'VIR-001',
      createdBy: 1,
    })

    expect(paiement.montantNet).toBe(1_000_000)
    expect(paiement.modePaiement).toBe('virement')
    expect(paiement.reference).toBe('VIR-001')

    const after = await service.getPaie('2026-05')
    const paidRow = after.find((item) => item.userId === employee1)
    expect(paidRow?.paye).toBe(true)
    expect(paidRow?.datePaiement).toBe('2026-06-01')

    await expect(
      service.payer({
        userId: employee1,
        periode: '2026-05',
        modePaiement: 'espèces',
        datePaiement: '2026-06-02',
      }),
    ).rejects.toThrow(/déjà payé/)
  })

  it('paie en masse par net croissant sans jamais dépasser le budget', async () => {
    // Trésorerie positive : le plafond testé ici est le budget DEMANDÉ.
    await db
      .insertInto('invoice')
      .values({
        numero: 'F-CAISSE-PAIE-0001',
        patient_id: 1,
        date: '2026-06-01',
        montant_total: 5_000_000,
        montant_restant: 0,
        status: 'payé',
      })
      .execute()
    const funding = await db
      .selectFrom('invoice')
      .select('id')
      .where('numero', '=', 'F-CAISSE-PAIE-0001')
      .executeTakeFirstOrThrow()
    await db
      .insertInto('invoice_payment')
      .values({
        invoice_id: funding.id,
        montant: 5_000_000,
        mode_paiement: 'espèces',
        date_paiement: '2026-06-01',
        numero_recu: 'R-20260601-0001',
      })
      .execute()

    await service.saveConfig({
      userId: employee1,
      periode: '2026-06',
      base: 1_000_000,
      rubriques: [],
    })
    await service.saveConfig({
      userId: employee2,
      periode: '2026-06',
      base: 3_000_000,
      rubriques: [],
    })

    const result = await service.payerBulk({
      periode: '2026-06',
      montantDisponible: 2_000_000,
      modePaiement: 'mobile_money',
      datePaiement: '2026-07-01',
    })

    expect(result).toMatchObject({
      paid: 1,
      skipped: 1,
      totalPaye: 1_000_000,
      reste: 1_000_000,
    })
    expect(result.budgetDemande).toBe(2_000_000)
    // Le budget effectif ne dépasse jamais le budget demandé (et la caisse
    // est suffisamment approvisionnée ici).
    expect(result.budgetEffectif).toBe(2_000_000)

    const paie = await service.getPaie('2026-06')
    expect(paie.find((item) => item.userId === employee1)?.paye).toBe(true)
    expect(paie.find((item) => item.userId === employee2)?.paye).toBe(false)
  })

  it('expose un historique filtrable avec le nom de l’employé', async () => {
    const rows = await service.historique({ userId: employee1 })
    expect(rows.length).toBeGreaterThanOrEqual(2)
    expect(rows.every((row) => row.userId === employee1)).toBe(true)
    expect(rows[0].periode).toBe('2026-06')
    expect(rows[0].nom).toBe('Diallo')
    expect(rows[0].prenom).toBe('Aminata')

    const filtered = await service.historique({
      userId: employee1,
      periodeDebut: '2026-05',
      periodeFin: '2026-05',
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].periode).toBe('2026-05')
  })

  // ─── M9 : le budget effectif est plafonné par la trésorerie ───────

  it('plafonne le budget de paie au solde de caisse', async () => {
    // Une entrée en caisse importante rend le solde connu et positif.
    await db
      .insertInto('invoice')
      .values({
        numero: 'F-CAISSE-TEST-0001',
        patient_id: 1,
        date: '2026-08-01',
        montant_total: 500_000_000,
        montant_restant: 0,
        status: 'payé',
      })
      .execute()
    const invoiceId = await db
      .selectFrom('invoice')
      .select('id')
      .where('numero', '=', 'F-CAISSE-TEST-0001')
      .executeTakeFirstOrThrow()
    await db
      .insertInto('invoice_payment')
      .values({
        invoice_id: invoiceId.id,
        montant: 500_000_000,
        mode_paiement: 'espèces',
        date_paiement: '2026-08-01',
        numero_recu: 'R-20260801-0001',
      })
      .execute()

    const solde = await caisse.getSolde()
    expect(solde).toBeGreaterThan(0)

    await service.saveConfig({
      userId: employee1,
      periode: '2026-08',
      base: 1_000_000,
      rubriques: [],
    })

    // Budget demandé très supérieur à la trésorerie disponible.
    const result = await service.payerBulk({
      periode: '2026-08',
      montantDisponible: solde + 10_000_000,
      modePaiement: 'virement',
      datePaiement: '2026-09-01',
    })

    expect(result.budgetDemande).toBe(solde + 10_000_000)
    expect(result.budgetEffectif).toBe(solde)
    expect(result.totalPaye).toBeLessThanOrEqual(solde)
    expect(result.reste).toBe(result.budgetEffectif! - result.totalPaye)
  })

  it('bloque tout paiement quand la trésorerie connue est nulle ou négative', async () => {
    // Sortie massive : la trésorerie est négative. Le solde est CONNU, donc
    // le budget est plafonné à `max(0, solde)` = 0 : aucun paiement.
    await db
      .insertInto('salaire_paiement')
      .values({
        user_id: employee2,
        periode: '2019-01',
        montant_net: 2_000_000_000,
        mode_paiement: 'espèces',
        date_paiement: '2019-01-31',
      })
      .execute()

    const solde = await caisse.getSolde()
    expect(solde).toBeLessThanOrEqual(0)

    await service.saveConfig({
      userId: employee1,
      periode: '2026-09',
      base: 1_000_000,
      rubriques: [],
    })

    const result = await service.payerBulk({
      periode: '2026-09',
      montantDisponible: 2_000_000,
      modePaiement: 'virement',
      datePaiement: '2026-10-01',
    })

    expect(result.budgetDemande).toBe(2_000_000)
    expect(result.budgetEffectif).toBe(0)
    expect(result.paid).toBe(0)
    expect(result.totalPaye).toBe(0)
    expect(result.reste).toBe(0)
  })

  it('honore le budget demandé quand le solde de caisse est ILLISIBLE', async () => {
    // Échec de lecture (base indisponible, etc.) : la paie ne doit pas être
    // bloquée par une erreur de diagnostic. On conserve la demande et on
    // journalise un avertissement.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const brokenCaisse = {
        getSolde: async () => { throw new Error('caisse indisponible') },
      } as unknown as CaisseService
      const degraded = new SalaireService(createMockDataSource(db) as any, brokenCaisse)

      await degraded.saveConfig({
        userId: employee1,
        periode: '2026-10',
        base: 1_000_000,
        rubriques: [],
      })

      const result = await degraded.payerBulk({
        periode: '2026-10',
        montantDisponible: 1_500_000,
        modePaiement: 'virement',
        datePaiement: '2026-11-01',
      })

      expect(result.budgetDemande).toBe(1_500_000)
      expect(result.budgetEffectif).toBe(1_500_000)
      expect(result.paid).toBe(1)
      expect(result.totalPaye).toBe(1_000_000)
      expect(result.reste).toBe(500_000)
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('non plafonné'),
        expect.objectContaining({ periode: '2026-10', budgetDemande: 1_500_000 }),
      )
    } finally {
      warn.mockRestore()
    }
  })
})


describe('SalaireService — fiche de paie', () => {
  it('calcule les rubriques, le total mensuel et le net en isolant les informations', async () => {
    await service.saveConfig({
      userId: employee1,
      periode: '2026-07',
      base: 5_000_000,
      joursTravailles: 22,
      rubriques: [
        { libelle: 'Prime de responsabilité', type: 'fixe', montant: 500_000, impactNet: true, ordre: 0 },
        { libelle: 'Prime de transport', type: 'journalier', montantJour: 10_000, jours: 24, impactNet: false, ordre: 1 },
        { libelle: 'Prime de rendement', type: 'journalier', montantJour: 5_000, impactNet: true, ordre: 2 },
      ],
    })

    const payslip = await service.getPayslip(employee1, '2026-07')

    expect(payslip.employee.prenom).toBe('Aminata')
    expect(payslip.employee.nom).toBe('Diallo')
    expect(payslip.employee.service).toBe('Cardiologie')
    expect(payslip.employee.tempsTravail).toBe('PARTIEL')
    expect(payslip.employee.numeroSecuriteSociale).toBe('NSS-AML-001')
    expect(payslip.periode).toBe('2026-07')
    expect(payslip.joursTravailles).toBe(22)
    expect(payslip.rubriques).toHaveLength(3)
    expect(payslip.rubriques[1]).toMatchObject({
      libelle: 'Prime de transport',
      jours: 24,
      impactNet: false,
      montantCalcule: 240_000,
    })
    expect(payslip.totalMensuel).toBe(5_850_000)
    expect(payslip.totalInformations).toBe(240_000)
    expect(payslip.netAPayer).toBe(5_610_000)
    expect(payslip.paiement).toBeNull()
  })

  it('génère une fiche à zéro pour un employé actif sans configuration', async () => {
    const payslip = await service.getPayslip(employee2, '2026-08')

    expect(payslip.employee.tempsTravail).toBe('PLEIN')
    expect(payslip.employee.numeroSecuriteSociale).toBeUndefined()
    expect(payslip.base).toBe(0)
    expect(payslip.rubriques).toEqual([])
    expect(payslip.totalMensuel).toBe(0)
    expect(payslip.netAPayer).toBe(0)
    expect(payslip.paiement).toBeNull()
  })

  it('refuse un employé inconnu ou une période invalide', async () => {
    await expect(service.getPayslip(999_999, '2026-08')).rejects.toThrow('Employé introuvable ou inactif')
    await expect(service.getPayslip(employee1, '2026-13')).rejects.toThrow('Période invalide')
  })

  it('rejette un nombre de jours de rubrique hors bornes', async () => {
    await expect(service.saveConfig({
      userId: employee1,
      periode: '2026-09',
      base: 1_000_000,
      joursTravailles: 20,
      rubriques: [
        { libelle: 'Transport', type: 'journalier', montantJour: 10_000, jours: 40, impactNet: false },
      ],
    })).rejects.toThrow('jours doit être compris entre 0 et 31')
  })
})
