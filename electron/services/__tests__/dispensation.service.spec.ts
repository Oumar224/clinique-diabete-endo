import 'reflect-metadata'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { ClinicalDocumentService } from '../clinical-document.service'
import { MedicamentService } from '../medicament.service'
import { StockService } from '../stock.service'
import {
  DispensationService,
  computeDelivranceFinancier,
  computeQuantiteDemandee,
} from '../dispensation.service'
import { ORDONNANCE_LIBRE_ID } from '../ordonnance-libre.service'

describe('DispensationService', () => {
  let tempDir: string
  let dbPath: string
  let patientId: number
  let userId: number
  let encounterId: number

  beforeAll(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-dispensation-test-'))
    dbPath = path.join(tempDir, 'test.db')
    container.register('DB_PATH', { useValue: dbPath })
    const datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()

    const db = datasource.getInstance()
    // Le service refuse désormais une vente facturée sans prix. Les tests qui
    // ne portent pas sur ce cas utilisent le catalogue seedé : on lui donne un
    // prix de vente pour rester focalisés sur leur objet.
    await db.updateTable('medicaments').set({ prix_vente: 1000 }).where('actif', '=', 1).execute()
    const p = await db
      .insertInto('patient')
      .values({
        civilite: 'M',
        nom: 'Dispense',
        prenom: 'Test',
        date_naissance: '1980-01-01',
        nir: 'TEST-DISP-001',
        telephone: '0611111111',
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    patientId = p.id!
    const u = await db
      .insertInto('user')
      .values({ nom: 'Pharma', prenom: 'Test', email: 'pharma-disp@test.com', password_hash: 'hash', role: 'PHARMACIEN' })
      .returningAll()
      .executeTakeFirstOrThrow()
    userId = u.id!
    const s = await db
      .insertInto('services')
      .values({ name: 'Service Dispense Test' })
      .returningAll()
      .executeTakeFirstOrThrow()
    const e = await db
      .insertInto('encounters')
      .values({
        patient_id: patientId,
        contact_type: 'consultation',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000).toISOString(),
        service_id: s.id!,
        origin: 'auto_refere',
        zone_situation: 'zone_responsabilite',
        prise_en_charge: 'maladie_naturelle',
        status: 'active',
        created_by: userId,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    encounterId = e.id!
  }, 120_000)

  afterAll(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch { /* best-effort cleanup */ }
  })

  function service(): DispensationService {
    return container.resolve(DispensationService)
  }

  function stock(): StockService {
    return container.resolve(StockService)
  }

  function medicaments(): MedicamentService {
    return container.resolve(MedicamentService)
  }

  function db() {
    return container.resolve(AppDatabaseDatasource).getInstance()
  }

  async function createOrdonnanceDoc(items: Array<Record<string, any>>, status = 'draft'): Promise<string> {
    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`
    await db()
      .insertInto('patient_clinical_documents')
      .values({
        id: docId,
        contact_id: String(encounterId),
        document_type_id: ORDONNANCE_LIBRE_ID,
        title: 'Ordonnance Test',
        status,
        form_data: JSON.stringify({ items }),
        created_by: String(userId),
      })
      .executeTakeFirstOrThrow()
    return docId
  }

  async function createDocumentWithFormData(formData: Record<string, any>): Promise<string> {
    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`
    await db()
      .insertInto('patient_clinical_documents')
      .values({
        id: docId,
        contact_id: String(encounterId),
        document_type_id: ORDONNANCE_LIBRE_ID,
        title: 'Ordonnance Test',
        status: 'draft',
        form_data: JSON.stringify(formData),
        created_by: String(userId),
      })
      .executeTakeFirstOrThrow()
    return docId
  }

  async function lignesOf(delivranceId: number) {
    return (await service().getById(delivranceId))!.lignes
  }

  async function stockTotal(medicamentId: number): Promise<number> {
    const lots = await stock().lots(medicamentId)
    return lots.reduce((s, l) => s + (l.quantite ?? 0), 0)
  }

  // ─── computeQuantiteDemandee ─────────────────────────────────────

  it('computeQuantiteDemandee prefers an explicit quantite, then frequence×duree, else 0', () => {
    expect(computeQuantiteDemandee({ quantite: 5.7 })).toBe(5)
    expect(computeQuantiteDemandee({ quantite: '10' })).toBe(10)
    expect(computeQuantiteDemandee({ frequence: ['Matin', 'Soir'], duree: 7 })).toBe(14)
    expect(computeQuantiteDemandee({ frequence: 'Matin', duree: 3 })).toBe(3)
    expect(computeQuantiteDemandee({ frequence: ['Matin', 'Soir'], duree: 7, renouvellement: true, nbRenouvellements: 2 })).toBe(42)
    expect(computeQuantiteDemandee({ medicament: 'X' })).toBe(0)
    expect(computeQuantiteDemandee({ quantite: 0, frequence: ['Matin'], duree: 3 })).toBe(3)
    expect(computeQuantiteDemandee({})).toBe(0)
    expect(computeQuantiteDemandee(null)).toBe(0)
  })

  // ─── createFromDocument ──────────────────────────────────────────

  it('creates an a_servir demande with matched and unmapped lignes', async () => {
    const docId = await createOrdonnanceDoc([
      { medicament: 'Paracétamol', quantite: 12 },
      { medicament: 'TEST-ZZ-Inconnu-1', frequence: ['Matin', 'Soir'], duree: 5 },
      { medicament: 'TEST-ZZ-Inconnu-2' },
      { categorie: 'examen', examen: 'NFS' },
    ])
    const result = await service().createFromDocument(docId)
    expect(result).not.toBeNull()
    expect(result!.created).toBe(true)
    expect(result!.delivrance.statut).toBe('a_servir')
    expect(result!.delivrance.patientId).toBe(patientId)

    const lignes = await lignesOf(result!.delivrance.id!)
    expect(lignes).toHaveLength(3)

    const matched = lignes.find((l) => l.libelle === 'Paracétamol')!
    expect(matched.medicamentId).toBeDefined()
    expect(matched.quantiteDemandee).toBe(12)
    expect(matched.quantiteServie).toBe(0)

    const byFormula = lignes.find((l) => l.libelle === 'TEST-ZZ-Inconnu-1')!
    expect(byFormula.medicamentId == null).toBe(true)
    expect(byFormula.quantiteDemandee).toBe(10)

    const zero = lignes.find((l) => l.libelle === 'TEST-ZZ-Inconnu-2')!
    expect(zero.quantiteDemandee).toBe(0)
  })

  it('createFromDocument is idempotent (second call returns created:false)', async () => {
    const docId = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 3 }])
    const first = await service().createFromDocument(docId)
    expect(first!.created).toBe(true)
    const second = await service().createFromDocument(docId)
    expect(second!.created).toBe(false)
    expect(second!.delivrance.id).toBe(first!.delivrance.id)

    const count = await db()
      .selectFrom('delivrances')
      .select('id')
      .where('source_document_id', '=', docId)
      .execute()
    expect(count).toHaveLength(1)
  })

  it('createFromDocument returns created:false when the demande was inserted concurrently (UNIQUE race)', async () => {
    const docId = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 2 }])
    // Simule le gagnant de la course : la ligne existe déjà au moment du 2e appel.
    await db()
      .insertInto('delivrances')
      .values({ source: 'ordonnance_libre', source_document_id: docId, patient_id: patientId, statut: 'a_servir' })
      .execute()
    const result = await service().createFromDocument(docId)
    expect(result!.created).toBe(false)
    expect(
      (await db().selectFrom('delivrances').select('id').where('source_document_id', '=', docId).execute()).length,
    ).toBe(1)
  })

  it('createFromDocument returns null for non-ordonnance documents and empty item lists', async () => {
    const otherType = await db()
      .selectFrom('clinical_document_types')
      .select('id')
      .where('id', '!=', ORDONNANCE_LIBRE_ID)
      .executeTakeFirstOrThrow()
    const docId = `doc-autre-${Date.now()}`
    await db()
      .insertInto('patient_clinical_documents')
      .values({
        id: docId,
        contact_id: String(encounterId),
        document_type_id: otherType.id as string,
        title: 'Autre doc',
        status: 'draft',
        form_data: JSON.stringify({ items: [{ medicament: 'Paracétamol', quantite: 1 }] }),
        created_by: String(userId),
      })
      .executeTakeFirstOrThrow()
    expect(await service().createFromDocument(docId)).toBeNull()

    const noMed = await createOrdonnanceDoc([{ categorie: 'examen', examen: 'NFS' }])
    expect(await service().createFromDocument(noMed)).toBeNull()
  })

  it('createFromDocument accepts ordonnanceSortie and legacy inlinePrescriptions', async () => {
    const sortieDoc = await createDocumentWithFormData({
      ordonnanceSortie: [
        { categorie: 'medicament', medicament: 'Paracétamol', quantite: 4 },
        { categorie: 'examen', examen: 'NFS' },
      ],
    })
    const sortieResult = await service().createFromDocument(sortieDoc)
    expect(sortieResult!.created).toBe(true)
    expect((await lignesOf(sortieResult!.delivrance.id!)).map((l) => l.libelle)).toEqual(['Paracétamol'])

    const legacyDoc = await createDocumentWithFormData({
      inlinePrescriptions: [{ medicament: 'Ibuprofène', quantite: 2 }],
    })
    const legacyResult = await service().createFromDocument(legacyDoc)
    expect(legacyResult!.created).toBe(true)
    expect((await lignesOf(legacyResult!.delivrance.id!)).map((l) => l.libelle)).toEqual(['Ibuprofène'])
  })

  it('createFromDocument returns null for ordonnanceSortie without medication lines', async () => {
    const examDoc = await createDocumentWithFormData({
      ordonnanceSortie: [{ categorie: 'examen', examen: 'NFS' }],
    })
    expect(await service().createFromDocument(examDoc)).toBeNull()
  })

  it('computeDelivranceFinancier ignore le prix manquant d’une gratuité', () => {
    const lignes = [{ quantite_servie: 2, prix_unitaire: 0 }]
    expect(
      computeDelivranceFinancier({ typeVente: 'gratuite', montantTotal: 0, lignes }).prixManquant,
    ).toBe(false)
    expect(
      computeDelivranceFinancier({ typeVente: 'facturee', montantTotal: 0, lignes }).prixManquant,
    ).toBe(true)
    expect(
      computeDelivranceFinancier({
        typeVente: 'facturee',
        lignes: [{ quantite_servie: 1, prix_unitaire: 5_000 }],
      }).prixManquant,
    ).toBe(false)
  })

  it('getSynthesePharmacie exclut les délivrances annulées du CA', async () => {
    const date = '2031-01-15'
    await db().insertInto('delivrances').values([
      {
        source: 'ordonnance_libre',
        source_document_id: 90_001,
        patient_id: patientId,
        statut: 'servie',
        date_vente: date,
        type_vente: 'facturee',
        montant_total: 1_000,
      },
      {
        source: 'ordonnance_libre',
        source_document_id: 90_002,
        patient_id: patientId,
        statut: 'annulee',
        date_vente: date,
        type_vente: 'facturee',
        montant_total: 5_000,
      },
    ]).execute()

    const synthese = await service().getSynthesePharmacie({
      dateDebut: '2031-01-01',
      dateFin: '2031-01-31',
    })
    expect(synthese.caFacture).toBe(1_000)
    expect(synthese.topMedicamentsCA).toEqual([])
    expect(synthese.topMedicamentsQuantite).toEqual([])
  })

  it('createFromDocument throws for an unknown document', async () => {
    await expect(service().createFromDocument('doc-inexistant-xyz')).rejects.toThrow('introuvable')
  })

  // ─── servir (totale) ────────────────────────────────────────────

  it('serves a demande fully (FIFO, delivrance mouvements, servie + served_by/at + lot_id)', async () => {
    const med = await medicaments().findByName('Paracétamol')
    const docId = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 10 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await lignesOf(created!.delivrance.id!))[0].id!
    await stock().entree({ medicamentId: med!.id!, quantite: 10, numeroLot: 'SRV-FULL' })

    const result = await service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 10 }],
      userId,
    })
    expect(result.delivrance.statut).toBe('servie')
    expect(result.delivrance.servedBy).toBe(userId)
    expect(result.delivrance.servedAt).toBeDefined()
    expect(result.lignes[0].quantiteServie).toBe(10)
    expect(result.lignes[0].lotId).toBeDefined()
    expect(await stockTotal(med!.id!)).toBe(0)

    const mouvements = await stock().mouvements({ medicamentId: med!.id!, type: 'delivrance' })
    expect(mouvements.length).toBeGreaterThanOrEqual(1)
    expect(mouvements[0].quantite).toBe(-10)
    expect((mouvements[0] as any).referenceType).toBe('ordonnance_libre')
  })

  // ─── servir (partielle) ──────────────────────────────────────────

  it('serves partially and completes on the second pass', async () => {
    const med = await medicaments().findByName('Furosémide')
    const docId = await createOrdonnanceDoc([{ medicament: 'Furosémide', quantite: 10 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await lignesOf(created!.delivrance.id!))[0].id!
    await stock().entree({ medicamentId: med!.id!, quantite: 10, numeroLot: 'SRV-PART' })

    const partial = await service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 4 }],
      userId,
    })
    expect(partial.delivrance.statut).toBe('partielle')
    expect(partial.lignes[0].quantiteServie).toBe(4)
    expect((partial.delivrance as any).servedBy).toBeUndefined()

    const done = await service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 6 }],
      userId,
    })
    expect(done.delivrance.statut).toBe('servie')
    expect(done.lignes[0].quantiteServie).toBe(10)
  })

  it('skips zero quantities instead of rejecting them', async () => {
    const med = await medicaments().findByName('Paracétamol')
    const docId = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 6 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await lignesOf(created!.delivrance.id!))[0].id!
    await stock().entree({ medicamentId: med!.id!, quantite: 6, numeroLot: 'SRV-ZERO' })

    const result = await service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 0 }],
      userId,
    })
    expect(result.delivrance.statut).toBe('partielle')
    expect(result.lignes[0].quantiteServie).toBe(0)
    expect(await stockTotal(med!.id!)).toBe(6)
  })

  // ─── servir (couverture totale exigée) ───────────────────────────

  it('rejects servir when a mappable ligne is not covered', async () => {
    const medA = await medicaments().create({ dci: 'TEST-CouvA' })
    const medB = await medicaments().create({ dci: 'TEST-CouvB' })
    await stock().entree({ medicamentId: medA.id!, quantite: 10, numeroLot: 'SRV-COUV-A' })
    await stock().entree({ medicamentId: medB.id!, quantite: 10, numeroLot: 'SRV-COUV-B' })
    const docId = await createOrdonnanceDoc([
      { medicament: 'TEST-CouvA', quantite: 4 },
      { medicament: 'TEST-CouvB', quantite: 4 },
    ])
    const created = await service().createFromDocument(docId)
    const lignes = await lignesOf(created!.delivrance.id!)

    await expect(service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId: lignes[0].id!, quantite: 4 }],
      userId,
    })).rejects.toThrow(/Lignes non couvertes/)
    // rien n'a bougé
    expect(await stockTotal(medA.id!)).toBe(10)
    expect(await stockTotal(medB.id!)).toBe(10)
  })

  // ─── servir (rupture → rollback) ─────────────────────────────────

  it('refuses to serve on rupture with a detailed error and rolls everything back', async () => {
    const okMed = await medicaments().create({ dci: 'TEST-RuptureOK' })
    const koMed = await medicaments().create({ dci: 'TEST-RuptureKO' })
    await stock().entree({ medicamentId: okMed.id!, quantite: 20, numeroLot: 'SRV-RB-OK' })
    await stock().entree({ medicamentId: koMed.id!, quantite: 2, numeroLot: 'SRV-RB-KO' })
    const docId = await createOrdonnanceDoc([
      { medicament: 'TEST-RuptureOK', quantite: 5 },
      { medicament: 'TEST-RuptureKO', quantite: 9 },
    ])
    const created = await service().createFromDocument(docId)
    const lignes = await lignesOf(created!.delivrance.id!)
    const byLibelle = (lib: string) => lignes.find((l) => l.libelle === lib)!.id!

    await expect(service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [
        { ligneId: byLibelle('TEST-RuptureOK'), quantite: 5 },
        { ligneId: byLibelle('TEST-RuptureKO'), quantite: 9 },
      ],
      userId,
    })).rejects.toThrow(/insuffisant/i)

    // ROLLBACK : stock, lignes et statut inchangés
    expect(await stockTotal(okMed.id!)).toBe(20)
    expect(await stockTotal(koMed.id!)).toBe(2)
    const entry = await service().getById(created!.delivrance.id!)
    expect(entry!.delivrance.statut).toBe('a_servir')
    expect(entry!.lignes.every((l) => (l.quantiteServie ?? 0) === 0)).toBe(true)
  })

  it('rolls back everything when the imposed lot is short', async () => {
    const med = await medicaments().create({ dci: 'TEST-RbLot' })
    const lot = await stock().entree({ medicamentId: med.id!, quantite: 2, numeroLot: 'SRV-RB-LOT' })
    const docId = await createOrdonnanceDoc([{ medicament: 'TEST-RbLot', quantite: 6 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await lignesOf(created!.delivrance.id!))[0].id!

    // restant (6) couvre la demande, mais le lot imposé (2) est trop court
    await expect(service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 5, lotId: lot.id! }],
      userId,
    })).rejects.toThrow(/insuffisant/i)

    expect(await stockTotal(med.id!)).toBe(2)
    const entry = await service().getById(created!.delivrance.id!)
    expect(entry!.delivrance.statut).toBe('a_servir')
    expect(entry!.lignes[0].quantiteServie ?? 0).toBe(0)
  })

  it('refuses to serve an unmapped ligne (rupture détaillée)', async () => {
    const docId = await createOrdonnanceDoc([{ medicament: 'TEST-ZZ-NonMappe', quantite: 4 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await lignesOf(created!.delivrance.id!))[0].id!
    await expect(service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 4 }],
      userId,
    })).rejects.toThrow(/non mappée/i)
  })

  it('servir validates delivrance, lignes and quantities', async () => {
    await expect(service().servir({ delivranceId: 999999, lignes: [] })).rejects.toThrow('introuvable')

    const docId = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 6 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await lignesOf(created!.delivrance.id!))[0].id!
    // la garde de couverture passe (ligne réelle incluse), puis la ligne inconnue est rejetée
    await expect(service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 1 }, { ligneId: 999999, quantite: 1 }],
      userId,
    })).rejects.toThrow('Ligne 999999 introuvable')
    await expect(service().servir({ delivranceId: created!.delivrance.id!, lignes: [{ ligneId, quantite: -2 }], userId }))
      .rejects.toThrow('invalide')
    await expect(service().servir({ delivranceId: created!.delivrance.id!, lignes: [{ ligneId, quantite: 7 }], userId }))
      .rejects.toThrow('restant')
  })

  it('fige le prix catalogue au premier service et ne le réécrit jamais ensuite', async () => {
    const med = await medicaments().create({ dci: 'TEST-PrixFige', prixVente: 1500 })
    await stock().entree({ medicamentId: med.id!, quantite: 10, numeroLot: 'SRV-PRIX-FIGE' })
    const docId = await createOrdonnanceDoc([{ medicament: 'TEST-PrixFige', quantite: 10 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await lignesOf(created!.delivrance.id!))[0].id!

    const first = await service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 4 }],
      userId,
    })
    expect(first.delivrance.statut).toBe('partielle')
    expect(first.delivrance.montantTotal).toBe(6000)
    expect(first.lignes[0].prixUnitaire).toBe(1500)

    // Un changement de catalogue ne réécrit pas un prix déjà figé.
    await medicaments().update(med.id!, { prixVente: 2000 })
    const second = await service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 6 }],
      userId,
    })
    expect(second.delivrance.statut).toBe('servie')
    expect(second.delivrance.montantTotal).toBe(15000)
    expect(second.lignes[0].prixUnitaire).toBe(1500)
  })

  it('refuse une vente facturée sans prix en nommant le produit, sans consommer le stock', async () => {
    const med = await medicaments().create({ dci: 'TEST-SansPrix' })
    await stock().entree({ medicamentId: med.id!, quantite: 5, numeroLot: 'SRV-SANS-PRIX' })
    const docId = await createOrdonnanceDoc([{ medicament: 'TEST-SansPrix', quantite: 2 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await lignesOf(created!.delivrance.id!))[0].id!

    await expect(service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 2 }],
      userId,
    })).rejects.toThrow(/Prix de vente manquant.*TEST-SansPrix/)

    expect(await stockTotal(med.id!)).toBe(5)
    const entry = await service().getById(created!.delivrance.id!)
    expect(entry!.delivrance.statut).toBe('a_servir')
    expect(entry!.lignes[0].quantiteServie ?? 0).toBe(0)
  })

  it('accepte et fige un prix unitaire saisi quand le catalogue est muet', async () => {
    const med = await medicaments().create({ dci: 'TEST-PrixSaisi' })
    await stock().entree({ medicamentId: med.id!, quantite: 5, numeroLot: 'SRV-PRIX-SAISI' })
    const docId = await createOrdonnanceDoc([{ medicament: 'TEST-PrixSaisi', quantite: 2 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await lignesOf(created!.delivrance.id!))[0].id!

    await expect(service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 2, prixUnitaire: 0 }],
      userId,
    })).rejects.toThrow(/Prix unitaire invalide/)

    const result = await service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 2, prixUnitaire: 2500 }],
      userId,
    })
    expect(result.delivrance.montantTotal).toBe(5000)
    expect(result.lignes[0].prixUnitaire).toBe(2500)
  })

  it('refuse un encaissement supérieur au reste dû lors du service', async () => {
    const med = await medicaments().findByName('Paracétamol')
    await stock().entree({ medicamentId: med!.id!, quantite: 5, numeroLot: 'SRV-TROP-PAYE' })
    const docId = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 2 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await lignesOf(created!.delivrance.id!))[0].id!

    await expect(service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 2 }],
      userId,
      paiement: { montant: 5000, modePaiement: 'espèces' },
    })).rejects.toThrow(/reste à payer/i)
  })

  it('produit le reçu de service d’une vente servie', async () => {
    const med = await medicaments().findByName('Paracétamol')
    await stock().entree({ medicamentId: med!.id!, quantite: 4, numeroLot: 'SRV-RECU' })
    const docId = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 2 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await lignesOf(created!.delivrance.id!))[0].id!

    await service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 2 }],
      userId,
      paiement: { montant: 2000, modePaiement: 'espèces' },
    })

    const recu = await service().getRecuVente(created!.delivrance.id!)
    expect(recu.service).toBe('pharmacie')
    expect(recu.ref).toMatch(/^PH-\d{8}-\d{4}$/)
    expect(recu.patientNom).toBe('Dispense')
    expect(recu.lignes).toHaveLength(1)
    expect(recu.lignes[0].quantite).toBe(2)
    expect(recu.montantTotal).toBe(2000)
    expect(recu.montantPaye).toBe(2000)
    expect(recu.reste).toBe(0)
    expect(recu.statutPaiement).toBe('paye')
    expect(recu.paiements[0].numeroRecu).toMatch(/^RP-/)
  })

  it('présente une vente gratuite comme exonérée sur le reçu', async () => {
    const med = await medicaments().findByName('Paracétamol')
    await stock().entree({ medicamentId: med!.id!, quantite: 2, numeroLot: 'SRV-RECU-GRATUIT' })
    const docId = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 1 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await lignesOf(created!.delivrance.id!))[0].id!

    await service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 1 }],
      userId,
      typeVente: 'gratuite',
      motifGratuite: 'Patient indigent',
    })

    const recu = await service().getRecuVente(created!.delivrance.id!)
    expect(recu.statutPaiement).toBe('exonere')
    expect(recu.reste).toBe(0)
    expect(recu.paiements).toHaveLength(0)
    expect(recu.statut).toBe('Vente gratuite')
    expect(recu.lignes).toHaveLength(1)
  })

  it('auto-mappe un libellé DCI + dosage à la création de la demande', async () => {
    const docId = await createOrdonnanceDoc([{ medicament: 'Paracétamol 500 mg', quantite: 3 }])
    const created = await service().createFromDocument(docId)
    const ligne = (await lignesOf(created!.delivrance.id!))[0]
    const paracetamol = await medicaments().findByName('Paracétamol')
    expect(ligne.medicamentId).toBe(paracetamol!.id)
  })


  it('servir refuses an already served or cancelled demande', async () => {
    const med = await medicaments().findByName('Paracétamol')
    const docId = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 2 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await lignesOf(created!.delivrance.id!))[0].id!
    await stock().entree({ medicamentId: med!.id!, quantite: 5, numeroLot: 'SRV-REJ' })
    await service().servir({ delivranceId: created!.delivrance.id!, lignes: [{ ligneId, quantite: 2 }], userId })
    await expect(service().servir({ delivranceId: created!.delivrance.id!, lignes: [{ ligneId, quantite: 1 }], userId }))
      .rejects.toThrow('déjà servie')

    const docId2 = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 1 }])
    const created2 = await service().createFromDocument(docId2)
    const ligneId2 = (await lignesOf(created2!.delivrance.id!))[0].id!
    await service().annuler({ delivranceId: created2!.delivrance.id!, motif: 'test' })
    await expect(service().servir({ delivranceId: created2!.delivrance.id!, lignes: [{ ligneId: ligneId2, quantite: 1 }], userId }))
      .rejects.toThrow('annulée')
  })

  it('seals the demande: a second full servir is rejected, stock consumed exactly once', async () => {
    // NOTE : la garde optimiste « Demande déjà traitée » ne se déclenche qu'en
    // concurrence multi-connexion réelle (le driver mono-connexion refuse les
    // transactions imbriquées). En séquentiel, c'est le verrou « déjà servie »
    // qui scelle la demande — le contrat anti double-service testé ici.
    const med = await medicaments().create({ dci: 'TEST-Scelle', prixVente: 1000 })
    await stock().entree({ medicamentId: med.id!, quantite: 30, numeroLot: 'SRV-SCELLE' })
    const docId = await createOrdonnanceDoc([{ medicament: 'TEST-Scelle', quantite: 10 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await lignesOf(created!.delivrance.id!))[0].id!
    const payload = { delivranceId: created!.delivrance.id!, lignes: [{ ligneId, quantite: 10 }], userId }

    const first = await service().servir(payload)
    expect(first.delivrance.statut).toBe('servie')
    await expect(service().servir(payload)).rejects.toThrow('Demande déjà servie')
    expect(await stockTotal(med.id!)).toBe(20)
    expect((await service().getById(created!.delivrance.id!))!.delivrance.statut).toBe('servie')
  })

  // ─── servir (lotId imposé) ───────────────────────────────────────

  it('serves from an imposed lot and rejects a foreign lot', async () => {
    const med = await medicaments().findByName('Metformine')
    const other = await medicaments().findByName('Paracétamol')
    const lot = await stock().entree({ medicamentId: med!.id!, quantite: 10, numeroLot: 'SRV-IMPOSE' })
    const foreign = await stock().entree({ medicamentId: other!.id!, quantite: 10, numeroLot: 'SRV-IMPOSE-AUTRE' })
    const docId = await createOrdonnanceDoc([{ medicament: 'Metformine', quantite: 4 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await lignesOf(created!.delivrance.id!))[0].id!

    await expect(service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 2, lotId: foreign.id! }],
      userId,
    })).rejects.toThrow('Lot invalide')

    const result = await service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 4, lotId: lot.id! }],
      userId,
    })
    expect(result.delivrance.statut).toBe('servie')
    expect(result.lignes[0].lotId).toBe(lot.id)
    expect((await stock().lots(med!.id!)).find((l) => l.id === lot.id!)?.quantite).toBe(6)
  })

  // ─── annuler / reouvrir ──────────────────────────────────────────

  it('annuls a demande with a persisted motif, idempotently', async () => {
    const docId = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 1 }])
    const created = await service().createFromDocument(docId)

    const annulee = await service().annuler({ delivranceId: created!.delivrance.id!, motif: 'Doublon  ' })
    expect(annulee.statut).toBe('annulee')
    expect(annulee.motif).toBe('Doublon')

    const entry = await service().getById(created!.delivrance.id!)
    expect(entry!.delivrance.motif).toBe('Doublon')

    const again = await service().annuler({ delivranceId: created!.delivrance.id!, motif: 'Autre' })
    expect(again.statut).toBe('annulee')
  })

  it('annuler requires a motif and refuses a served demande', async () => {
    const med = await medicaments().findByName('Paracétamol')
    const docId = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 1 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await lignesOf(created!.delivrance.id!))[0].id!
    await expect(service().annuler({ delivranceId: created!.delivrance.id!, motif: '  ' })).rejects.toThrow('Motif')
    await expect(service().annuler({ delivranceId: 999999, motif: 'x' })).rejects.toThrow('introuvable')

    await stock().entree({ medicamentId: med!.id!, quantite: 5, numeroLot: 'SRV-ANN' })
    await service().servir({ delivranceId: created!.delivrance.id!, lignes: [{ ligneId, quantite: 1 }], userId })
    await expect(service().annuler({ delivranceId: created!.delivrance.id!, motif: 'trop tard' })).rejects.toThrow('déjà servie')
  })

  it('annuler refuses a partielle demande with already served stock', async () => {
    const med = await medicaments().findByName('Furosémide')
    const docId = await createOrdonnanceDoc([{ medicament: 'Furosémide', quantite: 10 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await lignesOf(created!.delivrance.id!))[0].id!
    await stock().entree({ medicamentId: med!.id!, quantite: 10, numeroLot: 'SRV-ANN-P' })
    await service().servir({ delivranceId: created!.delivrance.id!, lignes: [{ ligneId, quantite: 4 }], userId })

    await expect(service().annuler({ delivranceId: created!.delivrance.id!, motif: 'stop' }))
      .rejects.toThrow('restitution')
    expect((await service().getById(created!.delivrance.id!))!.delivrance.statut).toBe('partielle')
  })

  it('reouvrir returns an annulee demande to a_servir with a persisted motif', async () => {
    const docId = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 1 }])
    const created = await service().createFromDocument(docId)
    await service().annuler({ delivranceId: created!.delivrance.id!, motif: 'erreur' })

    const reopened = await service().reouvrir({ delivranceId: created!.delivrance.id!, motif: 'Reprise  ' })
    expect(reopened.statut).toBe('a_servir')
    expect(reopened.motif).toBe('Reprise')
    expect((await service().getById(created!.delivrance.id!))!.delivrance.statut).toBe('a_servir')
  })

  it('reouvrir refuses non-annulee demandes and requires a motif', async () => {
    const docId = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 1 }])
    const created = await service().createFromDocument(docId)
    await expect(service().reouvrir({ delivranceId: created!.delivrance.id!, motif: 'x' }))
      .rejects.toThrow('annulée')
    await expect(service().reouvrir({ delivranceId: created!.delivrance.id!, motif: '  ' }))
      .rejects.toThrow('Motif')
    await expect(service().reouvrir({ delivranceId: 999999, motif: 'x' })).rejects.toThrow('introuvable')
  })

  // ─── orphelines ──────────────────────────────────────────────────

  it('orphelines lists signed ordonnances without demande, excluding the rest', async () => {
    const clinical = container.resolve(ClinicalDocumentService)
    const withDemand = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 1 }])
    await clinical.signDocument(withDemand, String(userId))
    await service().createFromDocument(withDemand)

    // Signée SANS demande : insertion directe (la signature via le service
    // déclencherait le hook best-effort qui créerait la demande).
    const orphanDoc = `doc-orphelin-${Date.now()}`
    await db()
      .insertInto('patient_clinical_documents')
      .values({
        id: orphanDoc,
        contact_id: String(encounterId),
        document_type_id: ORDONNANCE_LIBRE_ID,
        title: 'Ordonnance orpheline',
        status: 'signed',
        signed_at: new Date().toISOString(),
        form_data: JSON.stringify({ items: [
          { medicament: 'Paracétamol', quantite: 2 },
          { medicament: 'Furosémide', quantite: 1 },
        ] }),
        created_by: String(userId),
      })
      .executeTakeFirstOrThrow()

    const draftDoc = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 1 }])

    const orphans = await service().orphelines()
    const mine = orphans.filter((o) => [withDemand, orphanDoc, draftDoc].includes(o.documentId))
    expect(mine).toHaveLength(1)
    expect(mine[0].documentId).toBe(orphanDoc)
    expect(mine[0].nbLignes).toBe(2)
    expect(mine[0].patient?.nom).toBe('Dispense')
    expect(mine[0].signedAt).toBeDefined()
  })

  // ─── file / getById ──────────────────────────────────────────────

  it('file returns demandes with patient and document context, filterable by statut', async () => {
    const docId = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 1 }])
    const created = await service().createFromDocument(docId)

    const all = await service().file()
    const found = all.find((e) => e.delivrance.id === created!.delivrance.id)!
    expect(found.patient?.nom).toBe('Dispense')
    expect(found.document?.id).toBe(docId)
    expect(found.lignes).toHaveLength(1)

    const filtered = await service().file({ statut: 'a_servir' })
    expect(filtered.find((e) => e.delivrance.id === created!.delivrance.id)).toBeDefined()
    const served = await service().file({ statut: 'servie' })
    expect(served.find((e) => e.delivrance.id === created!.delivrance.id)).toBeUndefined()
  })

  it('file rejects an invalid statut', async () => {
    await expect(service().file({ statut: 'foo' as any })).rejects.toThrow('statut invalide')
  })

  it('getById returns null for an unknown demande', async () => {
    expect(await service().getById(999999)).toBeNull()
  })

  // ─── lignesNonMappees / mapLigne ─────────────────────────────────

  it('lignesNonMappees returns only NULL lignes with their context', async () => {
    const docId = await createOrdonnanceDoc([
      { medicament: 'Paracétamol', quantite: 1 },
      { medicament: 'TEST-ZZ-Orpheline', quantite: 2 },
    ])
    const created = await service().createFromDocument(docId)

    const unmapped = await service().lignesNonMappees()
    const mine = unmapped.filter((u) => u.delivranceId === created!.delivrance.id)
    expect(mine).toHaveLength(1)
    expect(mine[0].ligne.libelle).toBe('TEST-ZZ-Orpheline')
    expect(mine[0].statut).toBe('a_servir')
    expect(mine[0].patient?.nom).toBe('Dispense')
    expect(mine[0].sourceDocumentId).toBe(docId)

    const filtered = await service().lignesNonMappees({ statut: 'servie' })
    expect(filtered.find((u) => u.delivranceId === created!.delivrance.id)).toBeUndefined()
  })

  it('lignesNonMappees rejects an invalid statut', async () => {
    await expect(service().lignesNonMappees({ statut: 'foo' as any })).rejects.toThrow('statut invalide')
  })

  it('mapLigne links a ligne then rejects inactive or unknown medicaments', async () => {
    const docId = await createOrdonnanceDoc([{ medicament: 'TEST-ZZ-AMapper', quantite: 2 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await lignesOf(created!.delivrance.id!))[0].id!

    const target = await medicaments().create({ dci: 'TEST-MapCible' })
    const mapped = await service().mapLigne({ ligneId, medicamentId: target.id! })
    expect(mapped.medicamentId).toBe(target.id)

    const inactive = await medicaments().create({ dci: 'TEST-MapInactif' })
    await medicaments().deactivate(inactive.id!)
    await expect(service().mapLigne({ ligneId, medicamentId: inactive.id! })).rejects.toThrow('inactif')
    await expect(service().mapLigne({ ligneId, medicamentId: 999999 })).rejects.toThrow('introuvable')
    await expect(service().mapLigne({ ligneId: 999999, medicamentId: target.id! })).rejects.toThrow('introuvable')
  })

  it('mapLigne unblocks servir up to servie', async () => {
    const target = await medicaments().create({ dci: 'TEST-MapServir', prixVente: 1000 })
    await stock().entree({ medicamentId: target.id!, quantite: 5, numeroLot: 'MAP-SRV' })
    const docId = await createOrdonnanceDoc([{ medicament: 'TEST-ZZ-AMapper2', quantite: 5 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await lignesOf(created!.delivrance.id!))[0].id!

    await expect(service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 5 }],
      userId,
    })).rejects.toThrow(/non mappée/i)

    await service().mapLigne({ ligneId, medicamentId: target.id! })
    const result = await service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 5 }],
      userId,
    })
    expect(result.delivrance.statut).toBe('servie')
    expect(result.lignes[0].quantiteServie).toBe(5)
  })

  // ─── Hook : signature ordonnance → demande pharmacie ─────────────

  it('signing an ORDONNANCE_LIBRE creates the a_servir demande (best-effort)', async () => {
    const docId = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 7 }])
    const clinical = container.resolve(ClinicalDocumentService)
    const signed = await clinical.signDocument(docId, String(userId))
    expect(signed.status).toBe('signed')

    const row = await db()
      .selectFrom('delivrances')
      .selectAll()
      .where('source_document_id', '=', docId)
      .executeTakeFirst()
    expect(row).toBeDefined()
    expect(row?.statut).toBe('a_servir')
    const lignes = await db()
      .selectFrom('delivrance_lignes')
      .selectAll()
      .where('delivrance_id', '=', row!.id!)
      .execute()
    expect(lignes).toHaveLength(1)
    expect(lignes[0].quantite_demandee).toBe(7)
  })

  it('re-signing stays idempotent (single demande)', async () => {
    const docId = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 1 }])
    const clinical = container.resolve(ClinicalDocumentService)
    await clinical.signDocument(docId, String(userId))
    await clinical.signDocument(docId, String(userId))

    const rows = await db()
      .selectFrom('delivrances')
      .selectAll()
      .where('source_document_id', '=', docId)
      .execute()
    expect(rows).toHaveLength(1)
  })

  it('signing a non-ordonnance document creates no demande', async () => {
    const docId = await createOrdonnanceDoc([{ medicament: 'Paracétamol', quantite: 1 }])
    await db().updateTable('patient_clinical_documents').set({ document_type_id: '11111111-1111-4111-1111-111111111111' }).where('id', '=', docId).execute()
    const clinical = container.resolve(ClinicalDocumentService)
    await clinical.signDocument(docId, String(userId))
    const row = await db()
      .selectFrom('delivrances')
      .selectAll()
      .where('source_document_id', '=', docId)
      .executeTakeFirst()
    expect(row).toBeUndefined()
  })

  it('a hook failure never blocks the signature', async () => {
    const docId = `doc-corrompu-${Date.now()}`
    await db()
      .insertInto('patient_clinical_documents')
      .values({
        id: docId,
        contact_id: String(encounterId),
        document_type_id: ORDONNANCE_LIBRE_ID,
        title: 'Ordonnance corrompue',
        status: 'draft',
        form_data: '{json invalide',
        created_by: String(userId),
      })
      .executeTakeFirstOrThrow()
    const clinical = container.resolve(ClinicalDocumentService)
    const signed = await clinical.signDocument(docId, String(userId))
    expect(signed.status).toBe('signed')
  })
})
