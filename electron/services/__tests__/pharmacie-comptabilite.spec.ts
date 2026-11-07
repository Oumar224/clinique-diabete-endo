import 'reflect-metadata'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { MedicamentService } from '../medicament.service'
import { StockService } from '../stock.service'
import { DispensationService } from '../dispensation.service'
import { ORDONNANCE_LIBRE_ID } from '../ordonnance-libre.service'
import { todayIso } from '../../utils/date-utils'

describe('Pharmacie — comptabilité', () => {
  let tempDir: string
  let dbPath: string
  let patientId: number
  let userId: number
  let encounterId: number

  beforeAll(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-pharma-compta-test-'))
    dbPath = path.join(tempDir, 'test.db')
    container.register('DB_PATH', { useValue: dbPath })
    const datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()

    const db = datasource.getInstance()
    const p = await db
      .insertInto('patient')
      .values({
        civilite: 'M',
        nom: 'Compta',
        prenom: 'Patient',
        date_naissance: '1975-05-05',
        nir: 'TEST-CPT-001',
        telephone: '0622222222',
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    patientId = p.id!
    const u = await db
      .insertInto('user')
      .values({ nom: 'Compta', prenom: 'Pharma', email: 'pharma-compta@test.com', password_hash: 'hash', role: 'PHARMACIEN' })
      .returningAll()
      .executeTakeFirstOrThrow()
    userId = u.id!
    const s = await db
      .insertInto('services')
      .values({ name: 'Service Compta Test' })
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

  async function createOrdonnanceDoc(items: Array<Record<string, any>>): Promise<string> {
    const docId = `doc-cpt-${Date.now()}-${Math.random().toString(36).slice(2)}`
    await db()
      .insertInto('patient_clinical_documents')
      .values({
        id: docId,
        contact_id: String(encounterId),
        document_type_id: ORDONNANCE_LIBRE_ID,
        title: 'Ordonnance Compta',
        status: 'draft',
        form_data: JSON.stringify({ items }),
        created_by: String(userId),
      })
      .executeTakeFirstOrThrow()
    return docId
  }

  async function prepareServe(dci: string, prixAchat: number, prixVente: number, quantite: number) {
    const med = await medicaments().create({ dci, prixAchat, prixVente })
    await stock().entree({ medicamentId: med.id!, quantite, numeroLot: `${dci}-LOT`, prixAchat })
    const docId = await createOrdonnanceDoc([{ medicament: dci, quantite }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await service().getById(created!.delivrance.id!))!.lignes[0].id!
    return { med, delivranceId: created!.delivrance.id!, ligneId }
  }

  it('fige le prix de vente, calcule montant et coût, puis accepte les paiements', async () => {
    const { delivranceId, ligneId } = await prepareServe('TEST-CPT-PRIX', 1000, 1500, 4)

    const served = await service().servir({
      delivranceId,
      lignes: [{ ligneId, quantite: 4 }],
      userId,
    })

    expect(served.delivrance.statut).toBe('servie')
    expect(served.delivrance.dateVente).toBe(todayIso())
    expect(served.delivrance.typeVente).toBe('facturee')
    expect(served.delivrance.montantTotal).toBe(6000)
    expect(served.lignes[0]).toMatchObject({
      prixUnitaire: 1500,
      montant: 6000,
      coutAchatTotal: 4000,
    })

    const credit = await service().getVente(delivranceId)
    expect(credit).toMatchObject({
      montantTotal: 6000,
      montantPaye: 0,
      reste: 6000,
      statutFinancier: 'credit',
      prixManquant: false,
    })

    const first = await service().encaisser({
      delivranceId,
      montant: 2000,
      modePaiement: 'espèces',
      datePaiement: '2026-03-01',
    })
    expect(first.statutFinancier).toBe('partielle')
    expect(first.montantPaye).toBe(2000)
    expect(first.reste).toBe(4000)
    expect(first.paiements[0].numeroRecu).toMatch(/^RP-20260301-\d{4}$/)

    const second = await service().encaisser({
      delivranceId,
      montant: 4000,
      modePaiement: 'mobile_money',
      datePaiement: '2026-03-01',
    })
    expect(second.statutFinancier).toBe('payee')
    expect(second.reste).toBe(0)
    expect(second.paiements[1].numeroRecu! > second.paiements[0].numeroRecu!).toBe(true)

    await expect(service().encaisser({
      delivranceId,
      montant: 1,
      modePaiement: 'espèces',
    })).rejects.toThrow(/déjà entièrement payée/)
  })

  it('refuse un encaissement supérieur au reste à payer', async () => {
    const { delivranceId, ligneId } = await prepareServe('TEST-CPT-TROP', 500, 1200, 2)
    await service().servir({ delivranceId, lignes: [{ ligneId, quantite: 2 }], userId })

    await expect(service().encaisser({
      delivranceId,
      montant: 2401,
      modePaiement: 'carte_bancaire',
    })).rejects.toThrow(/reste à payer/)
  })

  it('gère une vente gratuite (motif obligatoire, aucun encaissement)', async () => {
    const { delivranceId, ligneId } = await prepareServe('TEST-CPT-GRATUIT', 700, 2000, 3)

    await expect(service().servir({
      delivranceId,
      lignes: [{ ligneId, quantite: 3 }],
      userId,
      typeVente: 'gratuite',
    })).rejects.toThrow(/Motif de gratuité requis/)

    const served = await service().servir({
      delivranceId,
      lignes: [{ ligneId, quantite: 3 }],
      userId,
      typeVente: 'gratuite',
      motifGratuite: 'Patient indigent',
    })

    expect(served.delivrance.typeVente).toBe('gratuite')
    expect(served.delivrance.motifGratuite).toBe('Patient indigent')
    expect(served.delivrance.montantTotal).toBe(0)
    expect(served.lignes[0].montant).toBe(6000)

    const vente = await service().getVente(delivranceId)
    expect(vente.statutFinancier).toBe('gratuite')

    await expect(service().encaisser({
      delivranceId,
      montant: 100,
      modePaiement: 'espèces',
    })).rejects.toThrow(/vente gratuite/)
  })

  it('regroupe les créances par patient', async () => {
    const a = await prepareServe('TEST-CPT-CRE1', 300, 1000, 2)
    await service().servir({ delivranceId: a.delivranceId, lignes: [{ ligneId: a.ligneId, quantite: 2 }], userId })
    await service().encaisser({ delivranceId: a.delivranceId, montant: 500, modePaiement: 'espèces' })

    const b = await prepareServe('TEST-CPT-CRE2', 300, 1000, 1)
    await service().servir({ delivranceId: b.delivranceId, lignes: [{ ligneId: b.ligneId, quantite: 1 }], userId })

    const creances = await service().getVentesCredit()
    const row = creances.find((c) => c.patientId === patientId)
    expect(row).toBeDefined()
    expect(row!.nbVentes).toBeGreaterThanOrEqual(2)
    expect(row!.reste).toBeGreaterThanOrEqual(1500)
    expect(row!.reste).toBe(row!.montantTotal - row!.montantPaye)
  })

  it('agrège la synthèse comptable et crée la dépense d’achat en crédit', async () => {
    const before = await service().getSynthesePharmacie()
    const dci = 'TEST-CPT-SYNTH'
    const med = await medicaments().create({ dci, prixAchat: 400_000, prixVente: 1_000_000 })

    await stock().entree({
      medicamentId: med.id!,
      quantite: 3,
      numeroLot: 'SYNTH-LOT',
      prixAchat: 400_000,
      refFacture: 'FA-SYNTH-001',
      fournisseurId: 1,
    })
    const depense = await db()
      .selectFrom('depense')
      .selectAll()
      .where('source', '=', 'stock_entree')
      .where('reference', '=', 'FA-SYNTH-001')
      .executeTakeFirstOrThrow()
    expect(depense).toMatchObject({
      montant: 1_200_000,
      statut_paiement: 'credit',
      fournisseur_id: 1,
    })
    expect(depense.date_paiement ?? null).toBeNull()

    const docId = await createOrdonnanceDoc([{ medicament: dci, quantite: 3 }])
    const created = await service().createFromDocument(docId)
    const ligneId = (await service().getById(created!.delivrance.id!))!.lignes[0].id!
    await service().servir({
      delivranceId: created!.delivrance.id!,
      lignes: [{ ligneId, quantite: 3 }],
      userId,
    })
    await service().encaisser({
      delivranceId: created!.delivrance.id!,
      montant: 500_000,
      modePaiement: 'virement',
    })

    const after = await service().getSynthesePharmacie()
    expect(after.caFacture - before.caFacture).toBe(3_000_000)
    expect(after.coutTotal - before.coutTotal).toBe(1_200_000)
    expect(after.coutFacture - before.coutFacture).toBe(1_200_000)
    expect(after.margeBrute - before.margeBrute).toBe(1_800_000)
    expect(after.achats - before.achats).toBe(1_200_000)
    expect(after.achatsCredit - before.achatsCredit).toBe(1_200_000)
    expect(after.encaisse - before.encaisse).toBe(500_000)
    expect(after.creances - before.creances).toBe(2_500_000)
    expect(after.topMedicamentsCA[0].medicamentId).toBe(med.id)
    expect(after.topMedicamentsCA[0].ca).toBeGreaterThanOrEqual(3_000_000)
  })

  it('n’insère aucune dépense sans facture fournisseur', async () => {
    const med = await medicaments().create({ dci: 'TEST-CPT-SANSFAC', prixAchat: 100 })
    const countBefore = await db()
      .selectFrom('depense')
      .select((eb) => eb.fn.count<number>('id').as('total'))
      .executeTakeFirst()
    await stock().entree({ medicamentId: med.id!, quantite: 5, numeroLot: 'SANSFAC', prixAchat: 100 })
    const countAfter = await db()
      .selectFrom('depense')
      .select((eb) => eb.fn.count<number>('id').as('total'))
      .executeTakeFirst()
    expect(Number(countAfter?.total ?? 0)).toBe(Number(countBefore?.total ?? 0))
  })

  // ─── B1 : un paiement ne peut pas dépasser le RESTE dû ─────────────

  it('refuse un paiement supérieur au reste dû lors d’un second service', async () => {
    // Vente de 1 000 GNF servie en deux moitiés de 500.
    const { delivranceId, ligneId } = await prepareServe('TEST-CPT-RESTE', 250, 500, 2)

    const first = await service().servir({
      delivranceId,
      lignes: [{ ligneId, quantite: 1 }],
      userId,
      paiement: { montant: 500, modePaiement: 'espèces' },
    })
    expect(first.delivrance.montantTotal).toBe(500)
    expect(first.paiement?.montant).toBe(500)

    // Second service : le total passe à 1 000, il reste 500 à payer.
    // Encaisser 1 000 (au lieu de 500) ferait 1 500 encaissés sur 1 000 facturés.
    await expect(service().servir({
      delivranceId,
      lignes: [{ ligneId, quantite: 1 }],
      userId,
      paiement: { montant: 1000, modePaiement: 'espèces' },
    })).rejects.toThrow(/reste à payer/)

    // Le service refusé est intégralement annulé (transaction) : un seul
    // paiement de 500 reste enregistré.
    const vente = await service().getVente(delivranceId)
    expect(vente.montantTotal).toBe(500)
    expect(vente.montantPaye).toBe(500)
    expect(vente.reste).toBe(0)
    expect(vente.paiements).toHaveLength(1)
  })

  it('accepte un paiement exactement égal au reste dû', async () => {
    const { delivranceId, ligneId } = await prepareServe('TEST-CPT-EGAL', 250, 500, 2)

    await service().servir({
      delivranceId,
      lignes: [{ ligneId, quantite: 1 }],
      userId,
      paiement: { montant: 500, modePaiement: 'espèces' },
    })

    const second = await service().servir({
      delivranceId,
      lignes: [{ ligneId, quantite: 1 }],
      userId,
      paiement: { montant: 500, modePaiement: 'mobile_money' },
    })

    expect(second.delivrance.montantTotal).toBe(1000)
    expect(second.paiement?.montant).toBe(500)

    const vente = await service().getVente(delivranceId)
    expect(vente.montantTotal).toBe(1000)
    expect(vente.montantPaye).toBe(1000)
    expect(vente.reste).toBe(0)
    expect(vente.statutFinancier).toBe('payee')
    expect(vente.anomalie).toBeUndefined()
  })

  it('refuse un encaissement supérieur au reste après un premier service', async () => {
    const { delivranceId, ligneId } = await prepareServe('TEST-CPT-RESTE-ENCAISS', 250, 500, 2)
    await service().servir({
      delivranceId,
      lignes: [{ ligneId, quantite: 1 }],
      userId,
      paiement: { montant: 500, modePaiement: 'espèces' },
    })
    await service().servir({ delivranceId, lignes: [{ ligneId, quantite: 1 }], userId })

    await expect(service().encaisser({
      delivranceId,
      montant: 600,
      modePaiement: 'espèces',
    })).rejects.toThrow(/reste à payer/)

    const vente = await service().getVente(delivranceId)
    expect(vente.montantPaye).toBe(500)
    expect(vente.reste).toBe(500)
  })

  // ─── M2 : les créances sont un stock « au plus tard à dateFin » ─────

  it('inclut dans les créances une vente antérieure à dateDebut', async () => {
    const { delivranceId, ligneId } = await prepareServe('TEST-CPT-ASOF', 300, 1000, 2)
    await service().servir({ delivranceId, lignes: [{ ligneId, quantite: 2 }], userId })

    // Vente datée du 10 janvier, impayée.
    await db()
      .updateTable('delivrances')
      .set({ date_vente: '2026-01-10' })
      .where('id', '=', delivranceId)
      .execute()

    // Le rapport des VENTES reste borné à la période...
    const ventesPeriode = await service().listVentes({ dateDebut: '2026-02-01', dateFin: '2026-02-28' })
    expect(ventesPeriode.find((v) => v.id === delivranceId)).toBeUndefined()

    // ...mais les CRÉANCES (périmètre « as of ») incluent la vente de janvier.
    const creances = await service().getVentesCredit({ dateDebut: '2026-02-01', dateFin: '2026-02-28' })
    const row = creances.find((c) => c.patientId === patientId)
    expect(row).toBeDefined()
    expect(row!.reste).toBeGreaterThanOrEqual(2000)
    expect(row!.dateReference).toBe('2026-02-28')
    expect(row!.datePremiereVente).toBe('2026-01-10')
  })

  // ─── N4 : délivrance servie AVANT la migration 109 ─────────────────

  it('refuse de servir une délivrance legacy déjà servie et l’exclut des agrégats', async () => {
    const { delivranceId, ligneId } = await prepareServe('TEST-CPT-LEGACY', 100, 500, 3)

    // État d'une délivrance servie AVANT la migration 109 : du stock est
    // sorti (`quantite_servie > 0`) mais `date_vente` est NULL et aucun prix
    // de vente n'a été figé.
    await db()
      .updateTable('delivrance_lignes')
      .set({ quantite_servie: 1, prix_unitaire: 0, montant: 0 })
      .where('id', '=', ligneId)
      .execute()
    await db()
      .updateTable('delivrances')
      .set({ statut: 'partielle', date_vente: null, montant_total: 0 })
      .where('id', '=', delivranceId)
      .execute()

    const before = await service().getSynthesePharmacie()

    await expect(service().servir({
      delivranceId,
      lignes: [{ ligneId, quantite: 2 }],
      userId,
    })).rejects.toThrow(/avant la mise en place du module de comptabilité/)

    // Refus avant toute écriture (transaction annulée) : aucun stock
    // supplémentaire n'est sorti et aucun prix n'est figé.
    const ligne = await db()
      .selectFrom('delivrance_lignes')
      .selectAll()
      .where('id', '=', ligneId)
      .executeTakeFirstOrThrow()
    expect(ligne.quantite_servie).toBe(1)
    expect(ligne.prix_unitaire).toBe(0)

    // La délivrance reste hors périmètre comptable : ni dans les ventes,
    // ni dans la synthèse (date_vente NULL).
    const ventes = await service().listVentes()
    expect(ventes.find((v) => v.id === delivranceId)).toBeUndefined()

    const after = await service().getSynthesePharmacie()
    expect(after.caFacture).toBe(before.caFacture)
    expect(after.coutTotal).toBe(before.coutTotal)
    expect(after.creances).toBe(before.creances)
  })

  // ─── M4 : état financier calculé par le serveur ────────────────────

  it('expose l’état financier sur la délivrance servie (servir + getById)', async () => {
    const { delivranceId, ligneId } = await prepareServe('TEST-CPT-FIN', 400, 1000, 2)

    const served = await service().servir({
      delivranceId,
      lignes: [{ ligneId, quantite: 2 }],
      userId,
      paiement: { montant: 500, modePaiement: 'espèces' },
    })

    expect(served.delivrance).toMatchObject({
      montantTotal: 2000,
      montantPaye: 500,
      reste: 1500,
      statutFinancier: 'partielle',
      prixManquant: false,
    })

    // `dispensation:file` / `getById` doit renvoyer le MÊME état financier :
    // le renderer n'a plus rien à recalculer.
    const file = await service().getById(delivranceId)
    expect(file).not.toBeNull()
    expect(file!.delivrance).toMatchObject({
      montantTotal: 2000,
      montantPaye: 500,
      reste: 1500,
      statutFinancier: 'partielle',
      prixManquant: false,
    })
  })

  // ─── M7 : coût et marge des top produits / motifs ──────────────────

  it('expose coût et marge par produit et coût par motif de gratuité', async () => {
    const dci = 'TEST-CPT-COUT'
    const med = await medicaments().create({ dci, prixAchat: 1000, prixVente: 1500 })
    await stock().entree({ medicamentId: med.id!, quantite: 5, numeroLot: 'COUT-LOT', prixAchat: 1000 })

    // 4 unités facturées : CA 6 000, coût 4 000, marge 2 000.
    const docFacture = await createOrdonnanceDoc([{ medicament: dci, quantite: 4 }])
    const vente = await service().createFromDocument(docFacture)
    const ligneVente = (await service().getById(vente!.delivrance.id!))!.lignes[0].id!
    await service().servir({
      delivranceId: vente!.delivrance.id!,
      lignes: [{ ligneId: ligneVente, quantite: 4 }],
      userId,
    })

    // 1 unité gratuite : comptée en coût (1 000) mais JAMAIS en CA.
    const docGratuit = await createOrdonnanceDoc([{ medicament: dci, quantite: 1 }])
    const don = await service().createFromDocument(docGratuit)
    const ligneDon = (await service().getById(don!.delivrance.id!))!.lignes[0].id!
    await service().servir({
      delivranceId: don!.delivrance.id!,
      lignes: [{ ligneId: ligneDon, quantite: 1 }],
      userId,
      typeVente: 'gratuite',
      motifGratuite: 'Motif Coût Test',
    })

    const synthese = await service().getSynthesePharmacie({
      dateDebut: todayIso(),
      dateFin: todayIso(),
    })

    // topCA et topQuantite portent sur la même population (ventes
    // facturées) : la gratuité n'apparaît dans aucun des deux.
    const caRow = synthese.topMedicamentsCA.find((r) => r.medicamentId === med.id)
    expect(caRow).toMatchObject({ quantite: 4, ca: 6000, cout: 4000, marge: 2000 })

    const quantiteRow = synthese.topMedicamentsQuantite.find((r) => r.medicamentId === med.id)
    expect(quantiteRow).toMatchObject({ quantite: 4, ca: 6000, cout: 4000, marge: 2000 })

    const motif = synthese.topMotifsGratuits.find((m) => m.motif === 'Motif Coût Test')
    expect(motif).toMatchObject({ count: 1, valeur: 1500, cout: 1000 })
  })
})
