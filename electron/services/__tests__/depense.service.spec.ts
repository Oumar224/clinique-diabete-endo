import 'reflect-metadata'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { sql, type Kysely } from 'kysely'
import { createMockDataSource, createTestDb } from './test-helper'
import { DepenseService } from '../depense.service'
import { CaisseService } from '../caisse.service'

let db: Kysely<any>
let service: DepenseService
let transportId: number
let pharmacieId: number

beforeAll(async () => {
  db = await createTestDb()
  service = new DepenseService(createMockDataSource(db) as any)

  const categories = await service.listCategories()
  transportId = Number(categories.find((categorie) => categorie.code === 'transport')?.id)
  pharmacieId = Number(categories.find((categorie) => categorie.code === 'pharmacie')?.id)

  expect(transportId).toBeGreaterThan(0)
  expect(pharmacieId).toBeGreaterThan(0)
})

afterAll(async () => {
  await db.destroy()
})

describe('DepenseService — catégories', () => {
  it('liste les catégories actives seedées', async () => {
    const categories = await service.listCategories()
    expect(categories.map((categorie) => categorie.code)).toEqual(
      expect.arrayContaining(['transport', 'repas', 'equipement', 'pharmacie', 'autre']),
    )
    expect(categories.every((categorie) => categorie.actif === true)).toBe(true)
  })

  it('génère un code slug unique à partir du nom', async () => {
    const first = await service.createCategorie({ nom: 'Carburant' })
    expect(first.code).toBe('carburant')
    expect(first.actif).toBe(true)

    const second = await service.createCategorie({ nom: 'Carburant' })
    expect(second.code).toBe('carburant-2')

    const accented = await service.createCategorie({ nom: 'Équipement' })
    expect(accented.code).toBe('equipement-2')
  })

  it('refuse un code explicitement dupliqué', async () => {
    await expect(
      service.createCategorie({ nom: 'Transport bis', code: 'transport' }),
    ).rejects.toThrow(/existe déjà/)
  })

  it('met à jour une catégorie sans modifier son code', async () => {
    const created = await service.createCategorie({ nom: 'Divers test', couleur: '#123456' })
    const updated = await service.updateCategorie(Number(created.id), {
      nom: 'Divers renommé',
      couleur: null,
      actif: false,
      ordre: 7,
    })

    expect(updated.code).toBe(created.code)
    expect(updated.nom).toBe('Divers renommé')
    expect(updated.actif).toBe(false)
    expect(updated.ordre).toBe(7)

    const active = await service.listCategories()
    expect(active.find((categorie) => categorie.id === created.id)).toBeUndefined()

    const all = await service.listCategories(true)
    expect(all.find((categorie) => categorie.id === created.id)?.nom).toBe('Divers renommé')
  })

  it('supprime une catégorie inutilisée mais refuse une catégorie utilisée', async () => {
    const unused = await service.createCategorie({ nom: 'Catégorie jetable' })
    await expect(service.deleteCategorie(Number(unused.id))).resolves.toEqual({ deleted: true })

    const used = await service.createCategorie({ nom: 'Catégorie utilisée' })
    const depense = await service.create({
      date: '2026-01-02',
      categorieId: Number(used.id),
      libelle: 'Dépense de test',
      montant: 1_000,
    })

    await expect(service.deleteCategorie(Number(used.id))).rejects.toThrow(
      /utilisée par des dépenses/,
    )

    await service.delete(Number(depense.id))
    await expect(service.deleteCategorie(Number(used.id))).resolves.toEqual({ deleted: true })
  })
})

describe('DepenseService — dépenses', () => {
  let depenseId: number
  let creditId: number

  it('crée une dépense payée avec jointure de catégorie', async () => {
    const created = await service.create({
      date: '2026-01-15',
      categorieId: transportId,
      libelle: 'Course taxi',
      montant: 150_000,
      modePaiement: 'espèces',
      fournisseurNom: 'Taxi Conakry',
      createdBy: 1,
    })

    depenseId = Number(created.id)
    expect(created.categorieCode).toBe('transport')
    expect(created.categorieNom).toBe('Transport')
    expect(created.statutPaiement).toBe('payee')
    expect(created.datePaiement).toBe('2026-01-15')
    expect(created.source).toBe('manuel')
    expect(created.montant).toBe(150_000)
  })

  it('crée une dépense à crédit sans date de paiement', async () => {
    const created = await service.create({
      date: '2026-01-20',
      categorieId: transportId,
      libelle: 'Carburant à crédit',
      montant: 400_000,
      statutPaiement: 'credit',
      fournisseurNom: 'Total',
      datePaiement: '2026-01-21',
    })

    creditId = Number(created.id)
    expect(created.statutPaiement).toBe('credit')
    expect(created.datePaiement).toBeUndefined()
  })

  it('filtre par période, catégorie, statut et recherche texte', async () => {
    const period = await service.list({
      dateDebut: '2026-01-01',
      dateFin: '2026-01-31',
      categorieId: transportId,
      statutPaiement: 'payee',
      source: 'manuel',
    })
    expect(period).toHaveLength(1)
    expect(period[0].libelle).toBe('Course taxi')

    const search = await service.list({ search: 'taxi' })
    expect(search).toHaveLength(1)
    expect(search[0].id).toBe(depenseId)
  })

  it('rejette une catégorie inexistante', async () => {
    await expect(
      service.create({
        date: '2026-01-01',
        categorieId: 999_999,
        libelle: 'Fantôme',
        montant: 1_000,
      }),
    ).rejects.toThrow(/Catégorie de dépense introuvable/)
  })

  it('met à jour une dépense et recale la date de paiement selon le statut', async () => {
    const updated = await service.update(depenseId, {
      libelle: 'Course taxi aéroport',
      montant: 175_000,
      notes: 'Aller-retour',
    })
    expect(updated.libelle).toBe('Course taxi aéroport')
    expect(updated.montant).toBe(175_000)
    expect(updated.notes).toBe('Aller-retour')

    const asCredit = await service.update(depenseId, { statutPaiement: 'credit' })
    expect(asCredit.statutPaiement).toBe('credit')
    expect(asCredit.datePaiement).toBeUndefined()

    const asPaid = await service.update(depenseId, {
      statutPaiement: 'payee',
      datePaiement: '2026-02-10',
    })
    expect(asPaid.datePaiement).toBe('2026-02-10')

    await expect(service.update(depenseId, { fournisseurId: 999_999 })).rejects.toThrow(
      /Fournisseur introuvable/,
    )
  })

  it('marque une dépense à crédit comme payée', async () => {
    const paid = await service.marquerPayee(creditId, {
      modePaiement: 'virement',
      datePaiement: '2026-02-01',
    })

    expect(paid.statutPaiement).toBe('payee')
    expect(paid.datePaiement).toBe('2026-02-01')
    expect(paid.modePaiement).toBe('virement')
  })

  it('N11 — ré-applique date et mode sur une dépense DÉJÀ payée', async () => {
    const created = await service.create({
      date: '2026-10-01',
      categorieId: transportId,
      libelle: 'N11 déjà payée',
      montant: 5_000,
      modePaiement: 'espèces',
    })
    const id = Number(created.id)

    const first = await service.marquerPayee(id, {
      modePaiement: 'virement',
      datePaiement: '2026-10-02',
    })
    expect(first.datePaiement).toBe('2026-10-02')

    // Deuxième appel : la nouvelle date ET le nouveau mode doivent être
    // appliqués, pas silencieusement ignorés.
    const second = await service.marquerPayee(id, {
      modePaiement: 'mobile_money',
      datePaiement: '2026-10-09',
    })
    expect(second.statutPaiement).toBe('payee')
    expect(second.datePaiement).toBe('2026-10-09')
    expect(second.modePaiement).toBe('mobile_money')

    // Sans date fournie, la date de paiement existante est conservée.
    const third = await service.marquerPayee(id, { modePaiement: 'espèces' })
    expect(third.datePaiement).toBe('2026-10-09')
    expect(third.modePaiement).toBe('espèces')
  })

  it('N10 — refuse une dépense manuelle à montant nul ou négatif', async () => {
    await expect(
      service.create({
        date: '2026-05-01',
        categorieId: transportId,
        libelle: 'Montant nul',
        montant: 0,
      }),
    ).rejects.toThrow(/supérieur à zéro/)

    await expect(
      service.create({
        date: '2026-05-01',
        categorieId: transportId,
        libelle: 'Montant négatif',
        montant: -1,
      }),
    ).rejects.toThrow(/négatif/)

    const draft = await service.create({
      date: '2026-05-02',
      categorieId: transportId,
      libelle: 'Mise à zéro',
      montant: 1_000,
    })
    await expect(service.update(Number(draft.id), { montant: 0 })).rejects.toThrow(
      /supérieur à zéro/,
    )
  })

  it('M1 — liste par date d’écriture (défaut) ou de décaissement', async () => {
    // Dépense à crédit écrite le 31/08, payée le 05/09 : elle doit basculer
    // de période selon la référence demandée, sans jamais être comptée deux
    // fois dans la même vue.
    const created = await service.create({
      date: '2026-08-31',
      categorieId: transportId,
      libelle: 'M1 crédit août',
      montant: 100_000,
      statutPaiement: 'credit',
      fournisseurNom: 'M1 Fournisseur',
    })
    await service.marquerPayee(Number(created.id), {
      modePaiement: 'virement',
      datePaiement: '2026-09-05',
    })

    const aout = { dateDebut: '2026-08-01', dateFin: '2026-08-31', search: 'M1 crédit août' }
    const septembre = { dateDebut: '2026-09-01', dateFin: '2026-09-30', search: 'M1 crédit août' }

    // Défaut de la liste = écriture.
    expect(await service.list(aout)).toHaveLength(1)
    expect(await service.list({ ...aout, dateReference: 'ecriture' })).toHaveLength(1)
    // Décaissement : la dépense appartient à septembre.
    expect(await service.list({ ...aout, dateReference: 'decaissement' })).toHaveLength(0)
    expect(await service.list({ ...septembre, dateReference: 'decaissement' })).toHaveLength(1)
    expect(await service.list(septembre)).toHaveLength(0)

    // Synthèse : défaut = décaissement (réconcilié avec la caisse).
    const syntheseSeptembre = await service.getSynthese(septembre)
    expect(syntheseSeptembre.dateReference).toBe('decaissement')
    expect(syntheseSeptembre.count).toBe(1)
    expect(syntheseSeptembre.total).toBe(100_000)

    const syntheseAout = await service.getSynthese({ ...aout, dateReference: 'ecriture' })
    expect(syntheseAout.dateReference).toBe('ecriture')
    expect(syntheseAout.count).toBe(1)
    expect(syntheseAout.total).toBe(100_000)

    expect(await service.getSynthese(aout)).toMatchObject({ count: 0, total: 0 })
  })

  it('calcule la synthèse par catégorie et par fournisseur (référence explicite)', async () => {
    // M1 : la synthèse utilise par défaut la date de DÉCAISSEMENT. Les deux
    // dépenses ont été payées en février (01/02 et 10/02) : en janvier, seule
    // la référence d'ÉCRITURE les rattache à la période d'engagement.
    const parEcriture = await service.getSynthese({
      dateDebut: '2026-01-01',
      dateFin: '2026-01-31',
      dateReference: 'ecriture',
    })

    // 175 000 (taxi, après mise à jour) + 400 000 (carburant) = 575 000
    expect(parEcriture.dateReference).toBe('ecriture')
    expect(parEcriture.count).toBe(2)
    expect(parEcriture.total).toBe(575_000)
    expect(parEcriture.totalPaye).toBe(575_000)
    expect(parEcriture.totalCredit).toBe(0)

    const transport = parEcriture.parCategorie.find((categorie) => categorie.code === 'transport')
    expect(transport?.total).toBe(575_000)
    expect(transport?.count).toBe(2)

    expect(
      parEcriture.parFournisseur.find((row) => row.fournisseurNom === 'Taxi Conakry')?.total,
    ).toBe(175_000)
    expect(parEcriture.parFournisseur.find((row) => row.fournisseurNom === 'Total')?.total).toBe(
      400_000,
    )

    // Défaut `decaissement` : janvier ne contient aucun décaissement.
    const janvierDefaut = await service.getSynthese({
      dateDebut: '2026-01-01',
      dateFin: '2026-01-31',
    })
    expect(janvierDefaut.dateReference).toBe('decaissement')
    expect(janvierDefaut.count).toBe(0)
    expect(janvierDefaut.total).toBe(0)

    // Février (décaissement) contient les deux paiements.
    const fevrierDefaut = await service.getSynthese({
      dateDebut: '2026-02-01',
      dateFin: '2026-02-28',
    })
    expect(fevrierDefaut.count).toBe(2)
    expect(fevrierDefaut.total).toBe(575_000)
  })

  it('M2 — une dépense à crédit non payée n’est jamais un décaissement', async () => {
    await service.create({
      date: '2027-02-10',
      categorieId: transportId,
      libelle: 'M2 crédit non payé',
      montant: 345_000,
      statutPaiement: 'credit',
    })

    const ecriture = {
      dateDebut: '2027-02-01',
      dateFin: '2027-02-28',
      search: 'M2 crédit non payé',
    }
    expect(await service.list(ecriture)).toHaveLength(1)
    expect(await service.list({ ...ecriture, dateReference: 'decaissement' })).toHaveLength(0)

    // La synthèse d'écriture voit l'engagement (crédit), pas la caisse.
    expect(await service.getSynthese({ ...ecriture, dateReference: 'ecriture' })).toMatchObject({
      count: 1,
      total: 345_000,
      totalPaye: 0,
      totalCredit: 345_000,
    })

    // Aucune période de décaissement ne la contient.
    expect(
      await service.getSynthese({ dateDebut: '2027-02-01', dateFin: '2027-02-28' }),
    ).toMatchObject({ count: 0, total: 0 })
  })

  it('M2 — la synthèse de décaissement réconcilie avec les sorties de caisse', async () => {
    const caisse = new CaisseService(createMockDataSource(db) as any)
    const dateDebut = '2027-03-01'
    const dateFin = '2027-03-31'

    // Payée à l'écriture.
    await service.create({
      date: '2027-03-02',
      categorieId: transportId,
      libelle: 'M2 payée mars',
      montant: 120_000,
      modePaiement: 'espèces',
    })
    // À crédit, jamais payée : absente de la caisse.
    await service.create({
      date: '2027-03-05',
      categorieId: transportId,
      libelle: 'M2 crédit mars',
      montant: 999_000,
      statutPaiement: 'credit',
    })
    // Écrite en février, payée en mars : décaissement de mars.
    const later = await service.create({
      date: '2027-02-20',
      categorieId: transportId,
      libelle: 'M2 crédit payé en mars',
      montant: 80_000,
      statutPaiement: 'credit',
    })
    await service.marquerPayee(Number(later.id), {
      modePaiement: 'virement',
      datePaiement: '2027-03-10',
    })

    const synthese = await service.getSynthese({ dateDebut, dateFin })
    expect(synthese.dateReference).toBe('decaissement')
    expect(synthese).toMatchObject({ count: 2, total: 200_000, totalPaye: 200_000, totalCredit: 0 })

    const caisseSynthese = await caisse.getSynthese({ dateDebut, dateFin })
    const depenseCaisse = caisseSynthese.parSource.find((row) => row.source === 'depense')
    expect(depenseCaisse?.sorties).toBe(synthese.total)
  })

  it('supprime une dépense', async () => {
    const created = await service.create({
      date: '2026-04-01',
      categorieId: pharmacieId,
      libelle: 'À supprimer',
      montant: 1_000,
    })
    await expect(service.delete(Number(created.id))).resolves.toEqual({ deleted: true })
    await expect(service.getById(Number(created.id))).rejects.toThrow(/introuvable/)
  })
})

describe('DepenseService — entrées de stock', () => {
  it('crée une dépense pharmacie idempotente par sourceId', async () => {
    const first = await service.createFromStockEntry({
      date: '2026-03-01',
      libelle: 'Réception stock',
      montant: 75_000,
      fournisseurNom: 'Pharma Import',
      reference: 'BL-42',
      sourceId: 42,
      createdBy: 1,
    })

    expect(first?.categorieCode).toBe('pharmacie')
    expect(first?.source).toBe('stock_entree')
    expect(first?.sourceId).toBe(42)
    expect(first?.statutPaiement).toBe('payee')
    expect(first?.datePaiement).toBe('2026-03-01')

    const second = await service.createFromStockEntry({
      date: '2026-03-01',
      libelle: 'Réception stock (doublon)',
      montant: 75_000,
      sourceId: 42,
    })
    expect(second?.id).toBe(first?.id)

    const rows = await db
      .selectFrom('depense')
      .select('id')
      .where('source', '=', 'stock_entree')
      .where('source_id', '=', 42)
      .execute()
    expect(rows).toHaveLength(1)
  })

  it('ignore un montant nul et refuse un fournisseur inexistant', async () => {
    await expect(
      service.createFromStockEntry({
        date: '2026-03-01',
        libelle: 'Sans montant',
        montant: 0,
        sourceId: 43,
      }),
    ).resolves.toBeNull()

    await expect(
      service.createFromStockEntry({
        date: '2026-03-01',
        libelle: 'Fournisseur fantôme',
        montant: 10_000,
        fournisseurId: 999_999,
        sourceId: 44,
      }),
    ).rejects.toThrow(/Fournisseur introuvable/)
  })

  it('N9 — refuse de supprimer une dépense issue d’une entrée de stock', async () => {
    const created = await service.createFromStockEntry({
      date: '2026-03-05',
      libelle: 'Entrée N9',
      montant: 2_000,
      sourceId: 9_001,
    })
    await expect(service.delete(Number(created?.id))).rejects.toThrow(/entrée de stock/)
  })
})

describe('DepenseService — table fournisseurs absente (M8)', () => {
  it('liste sans jointure et retombe sur depense.fournisseur_nom', async () => {
    const localDb = await createTestDb()
    try {
      // Simule une base pré-pharmacie : la migration 103 n'a pas été jouée.
      await sql`PRAGMA foreign_keys = OFF`.execute(localDb)
      await sql`DROP TABLE fournisseurs`.execute(localDb)
      await sql`PRAGMA foreign_keys = ON`.execute(localDb)

      const local = new DepenseService(createMockDataSource(localDb) as any)
      const categories = await local.listCategories()
      const categorieId = Number(categories.find((c) => c.code === 'transport')?.id)

      const created = await local.create({
        date: '2026-11-01',
        categorieId,
        libelle: 'Sans table fournisseurs',
        montant: 7_000,
        fournisseurNom: 'Fournisseur local',
      })
      expect(created.fournisseurNom).toBe('Fournisseur local')

      // Aucune requête `fournisseurs` ne doit être émise (sinon
      // « no such table ») : le nom dénormalisé est la seule source.
      const rows = await local.list({ search: 'Sans table fournisseurs' })
      expect(rows).toHaveLength(1)
      expect(rows[0].fournisseurNom).toBe('Fournisseur local')

      // M8 : l'absence (fait stable) est mise en cache, et la promesse est
      // libérée pour ne pas retenir un résultat indéfiniment.
      expect((local as any).hasFournisseursCache).toBe(false)
      expect((local as any).hasFournisseursPromise).toBeUndefined()

      // Un `fournisseurId` ne déclenche pas non plus de résolution.
      await expect(
        local.create({
          date: '2026-11-02',
          categorieId,
          libelle: 'Avec id sans table',
          montant: 3_000,
          fournisseurId: 42,
          fournisseurNom: 'Conservé',
        }),
      ).resolves.toMatchObject({ fournisseurId: 42, fournisseurNom: 'Conservé' })
    } finally {
      await localDb.destroy()
    }
  })
})

describe('DepenseService — sonde fournisseurs en échec (M8)', () => {
  it('ne cache pas l’échec, avertit et réessaie au prochain appel', async () => {
    const brokenDb = await createTestDb()
    const broken = new DepenseService(createMockDataSource(brokenDb) as any)
    await brokenDb.destroy()

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      await expect((broken as any).hasFournisseurs()).resolves.toBe(false)
      expect((broken as any).hasFournisseursCache).toBeUndefined()
      expect((broken as any).hasFournisseursPromise).toBeUndefined()
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('[CDE][DepenseService]'),
        expect.anything(),
      )

      // Deuxième appel : la sonde est rejouée (donc un second avertissement).
      await expect((broken as any).hasFournisseurs()).resolves.toBe(false)
      expect(warn).toHaveBeenCalledTimes(2)
    } finally {
      warn.mockRestore()
    }
  })
})
