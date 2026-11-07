import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Kysely, sql } from 'kysely'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { NodeSqliteDialect } from '../../driver/node-sqlite-dialect'
import { MigrationService } from '../migration.service'
import { LaboratoireService } from '../laboratoire.service'
import { LaboratoireStockService } from '../laboratoire-stock.service'
import { ExamRequestService } from '../exam-request.service'
import { ExamRequestEntity } from '../../entities/exam-request.entity'
import { CaisseService } from '../caisse.service'
import type { DB } from '../../entities/database'

/**
 * Parcours laboratoire de bout en bout sur une base SQLite réelle :
 * migrations → demande interne/externe → prélèvement → résultat,
 * puis catalogue → entrée/sortie de stock → commande → réception.
 */
describe('Laboratoire (demandes + stock)', () => {
  let db: Kysely<DB>
  let dbDir: string
  let labo: LaboratoireService
  let stock: LaboratoireStockService

  const fakeDatasource = { getInstance: () => db }

  beforeEach(async () => {
    dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-labo-'))
    const dialect = new NodeSqliteDialect(path.join(dbDir, 'test.db'))
    db = new Kysely<DB>({ dialect })
    await new MigrationService(db).runMigrations()
    labo = new LaboratoireService(fakeDatasource as never)
    stock = new LaboratoireStockService(fakeDatasource as never)
  })

  afterEach(async () => {
    await db.destroy().catch(() => {})
    fs.rmSync(dbDir, { recursive: true, force: true })
  })

  it('crée une demande interne, la prélève et la réalise', async () => {
    const patient = await db
      .insertInto('patient')
      .values({
        civilite: 'M',
        nom: 'Diallo',
        prenom: 'Amadou',
        date_naissance: '1980-01-01',
        nir: 'NIR-LABO-1',
        telephone: '+224600000001',
      } as never)
      .returning('id')
      .executeTakeFirstOrThrow()

    const examens = await labo.listExamens()
    expect(examens.length).toBeGreaterThan(0)
    const examenId = examens[0].id

    const created = await labo.createDemande({
      type: 'laboratoire',
      patientId: patient.id,
      examIds: [examenId],
      examenId,
      priorite: 'normale',
      plannedHour: 9,
    })

    expect(created.numero).toMatch(/^LB-\d{8}-\d{4}$/)
    expect(created.statut).toBe('en_attente')
    expect(created.patient_id).toBe(patient.id)
    // Le patient du dossier et l'heure planifiée remontent dans la worklist.
    expect(created.patient_nom).toBe('Diallo')
    expect(created.patient_prenom).toBe('Amadou')
    const worklist = await labo.listWorklist({})
    const ligne = worklist.find((r) => r.id === created.id)
    expect(ligne?.patient_nom).toBe('Diallo')
    expect(ligne?.patient_prenom).toBe('Amadou')
    expect(ligne?.planned_hour).toBe(9)
    const dto = ExamRequestEntity.toDto(ligne!)
    expect(dto.patientNom).toBe('Diallo')
    expect(dto.patientPrenom).toBe('Amadou')

    const preleve = await labo.enregistrerPrelevement(created.id!, {
      prelevementType: 'Sang',
    })
    expect(preleve.statut).toBe('en_cours')
    expect(preleve.prelevement_type).toBe('Sang')

    const realise = await labo.updateStatut(created.id!, 'realise')
    expect(realise.statut).toBe('realise')
    expect(realise.realized_at).toBeTruthy()
  })

  it('crée une demande externe sans dossier patient', async () => {
    const examens = await labo.listExamens()
    const created = await labo.createDemande({
      type: 'laboratoire',
      patientExterne: true,
      externeNom: 'Camara',
      externePrenom: 'Fatou',
      externeSexe: 'F',
      externeTelephone: '+224600000002',
      prescripteurExterneNom: 'Dr Bah',
      prescripteurExterneStructure: 'Cabinet Espoir',
      examIds: [examens[0].id],
      priorite: 'urgente',
      montant: 150000,
    })

    expect(created.patient_id).toBeFalsy()
    expect(created.patient_externe).toBe(1)
    expect(created.externe_nom).toBe('Camara')
    expect(created.priorite).toBe('urgente')
    expect(created.statut_paiement).toBe('non_paye')

    const worklist = await labo.listWorklist({ patientExterne: true })
    expect(worklist.some((r) => r.id === created.id)).toBe(true)

    const stats = await labo.stats()
    expect(stats.externes).toBeGreaterThanOrEqual(1)

    // Encaissement partiel puis solde.
    const partiel = await labo.enregistrerPaiement(created.id!, {
      montant: 50_000,
      modePaiement: 'espece',
      reference: 'REC-001',
    })
    expect(partiel.statut_paiement).toBe('partiel')
    expect(partiel.montant_paye).toBe(50_000)

    const solde = await labo.enregistrerPaiement(created.id!, {
      montant: 100_000,
      modePaiement: 'mobile_money',
    })
    expect(solde.statut_paiement).toBe('paye')
    expect(solde.montant_paye).toBe(150_000)

    const paiements = await labo.listPaiements(created.id!)
    expect(paiements).toHaveLength(2)

    // Les encaissements laboratoire remontent dans la caisse unifiée.
    const caisse = new CaisseService(fakeDatasource as never)
    const synthese = await caisse.getSynthese()
    const sourceLabo = synthese.parSource.find((s) => s.source === 'laboratoire')
    expect(sourceLabo?.entrees).toBe(150_000)
  })

  it('calcule le montant depuis les prix configurés des examens', async () => {
    const examens = await labo.listExamens()
    expect(examens.length).toBeGreaterThanOrEqual(2)
    const [premier, second] = examens

    // Les prix se configurent dans « Configuration Clinique > Examens ».
    await db.updateTable('lab_exams').set({ prix: 15_000 }).where('id', '=', premier.id).execute()
    await db.updateTable('lab_exams').set({ prix: 5_000 }).where('id', '=', second.id).execute()

    // Aucun montant n'est transmis : le backend additionne les tarifs.
    const created = await labo.createDemande({
      type: 'laboratoire',
      patientExterne: true,
      externeNom: 'Barry',
      externePrenom: 'Aissatou',
      examIds: [premier.id, second.id],
      examenId: premier.id,
    })

    expect(created.montant).toBe(20_000)
  })

  it('produit un reçu de service pour une demande interne comme externe', async () => {
    const patient = await db
      .insertInto('patient')
      .values({
        civilite: 'M',
        nom: 'Keita',
        prenom: 'Mamadou',
        date_naissance: '1975-04-12',
        nir: 'NIR-RECU-1',
        nip: 'NIP-RECU-1',
        telephone: '+224600000010',
      } as never)
      .returning('id')
      .executeTakeFirstOrThrow()

    const examens = await labo.listExamens()
    const [premier, second] = examens
    await db.updateTable('lab_exams').set({ prix: 15_000 }).where('id', '=', premier.id).execute()
    await db.updateTable('lab_exams').set({ prix: 5_000 }).where('id', '=', second.id).execute()

    const interne = await labo.createDemande({
      type: 'laboratoire',
      patientId: patient.id,
      examIds: [premier.id, second.id],
      examenId: premier.id,
    })

    const recu = await labo.getRecu(interne.id!)
    expect(recu.service).toBe('laboratoire')
    expect(recu.ref).toBe(interne.numero)
    expect(recu.origine).toBe('Interne')
    expect(recu.patientNom).toBe('Keita')
    expect(recu.patientNip).toBe('NIP-RECU-1')
    expect(recu.lignes).toHaveLength(2)
    expect(recu.lignes.map((l) => l.label)).toEqual(expect.arrayContaining([premier.name, second.name]))
    expect(recu.montantTotal).toBe(20_000)
    expect(recu.montantPaye).toBe(0)
    expect(recu.reste).toBe(0)
    expect(recu.statutPaiement).toBe('non_paye')
    // Demande interne non réglée : les honoraires sont portés au dossier patient.
    expect(recu.factureAuDossier).toBe(true)

    // Un règlement partiel se reflète immédiatement dans le reçu.
    await labo.enregistrerPaiement(interne.id!, { montant: 8_000, modePaiement: 'espece' })
    const apres = await labo.getRecu(interne.id!)
    expect(apres.factureAuDossier).toBeUndefined()
    expect(apres.montantPaye).toBe(8_000)
    expect(apres.reste).toBe(12_000)
    expect(apres.statutPaiement).toBe('partiel')
    expect(apres.paiements).toHaveLength(1)

    // Demande externe : mêmes règles, et total figé supérieur aux tarifs.
    const externe = await labo.createDemande({
      type: 'laboratoire',
      patientExterne: true,
      externeNom: 'Camara',
      externePrenom: 'Fatou',
      externeTelephone: '+224600000011',
      prescripteurExterneNom: 'Dr Bah',
      examIds: [premier.id],
      montant: 30_000,
    })

    const recuExterne = await labo.getRecu(externe.id!)
    expect(recuExterne.origine).toBe('Externe')
    expect(recuExterne.patientNom).toBe('Camara')
    expect(recuExterne.prescripteur).toBe('Dr Bah')
    expect(recuExterne.montantTotal).toBe(30_000)
    expect(recuExterne.factureAuDossier).toBeUndefined()
    expect(recuExterne.lignes.map((l) => l.label)).toContain('Frais complémentaires')
    expect(recuExterne.reste).toBe(30_000)
  })

  it('exonère une demande externe', async () => {
    const examens = await labo.listExamens()
    const created = await labo.createDemande({
      type: 'laboratoire',
      patientExterne: true,
      externeNom: 'Sylla',
      externePrenom: 'Aminata',
      examIds: [examens[0].id],
      montant: 80_000,
    })
    const exonere = await labo.enregistrerPaiement(created.id!, { exonere: true })
    expect(exonere.statut_paiement).toBe('exonere')
  })

  it('calcule la synthèse comptable de la période', async () => {
    const examens = await labo.listExamens()
    const examenId = examens[0].id

    const partiel = await labo.createDemande({
      type: 'laboratoire',
      patientExterne: true,
      externeNom: 'Keita',
      externePrenom: 'Mariam',
      examIds: [examenId],
      montant: 100_000,
      plannedDate: '2026-03-15',
    })
    // Paiement partiel dans la période.
    await labo.enregistrerPaiement(partiel.id!, {
      montant: 40_000,
      modePaiement: 'espece',
      datePaiement: '2026-03-20',
    })
    // Paiement antérieur à la période : exclu de l'encaissé.
    await labo.enregistrerPaiement(partiel.id!, {
      montant: 10_000,
      modePaiement: 'espece',
      datePaiement: '2020-01-01',
    })

    const externePaye = await labo.createDemande({
      type: 'laboratoire',
      patientExterne: true,
      externeNom: 'Camara',
      externePrenom: 'Fatou',
      examIds: [examenId],
      montant: 60_000,
      plannedDate: '2026-03-16',
    })
    await labo.enregistrerPaiement(externePaye.id!, {
      montant: 60_000,
      modePaiement: 'mobile_money',
      datePaiement: '2026-03-21',
    })

    const exonere = await labo.createDemande({
      type: 'laboratoire',
      patientExterne: true,
      externeNom: 'Sylla',
      externePrenom: 'Aminata',
      examIds: [examenId],
      montant: 30_000,
      plannedDate: '2026-03-17',
    })
    await labo.enregistrerPaiement(exonere.id!, { exonere: true })

    const annulee = await labo.createDemande({
      type: 'laboratoire',
      patientExterne: true,
      externeNom: 'Barry',
      externePrenom: 'Kadiatou',
      examIds: [examenId],
      montant: 999_999,
      plannedDate: '2026-03-18',
    })
    await labo.updateStatut(annulee.id!, 'annule')

    const synthese = await labo.syntheseComptable('2026-03-01', '2026-03-31')

    expect(synthese.demandes).toBe(4)
    expect(synthese.annulees).toBe(1)
    expect(synthese.realisees).toBe(0)
    expect(synthese.internes).toBe(0)
    expect(synthese.externes).toBe(4)
    expect(synthese.caFacture).toBe(190_000)
    expect(synthese.encaisse).toBe(100_000)
    expect(synthese.creances).toBe(90_000)
    expect(synthese.exonerations).toBe(30_000)
    expect(synthese.impayesCount).toBe(1)
    expect(synthese.parMode.map((m) => m.mode).sort()).toEqual(['espece', 'mobile_money'])
    expect(synthese.parMode.find((m) => m.mode === 'espece')?.montant).toBe(40_000)
    expect(synthese.paiements).toHaveLength(2)
    expect(synthese.impayes).toHaveLength(1)
    expect(synthese.impayes[0].reste).toBe(50_000)
    expect(synthese.topExamens[0].count).toBe(3)
    expect(synthese.topExamens[0].montant).toBe(190_000)
  })

  it('numérote aussi les demandes créées depuis le dossier patient', async () => {
    const patient = await db
      .insertInto('patient')
      .values({
        civilite: 'Mme', nom: 'Barry', prenom: 'Kadiatou',
        date_naissance: '1992-02-02', nir: 'NIR-LABO-2', telephone: '+224600000003',
      } as never)
      .returning('id')
      .executeTakeFirstOrThrow()
    const examen = await labo.listExamens()

    const service = new ExamRequestService(fakeDatasource as never)
    const entity = ExamRequestEntity.fromDto({
      type: 'laboratoire',
      patientId: patient.id,
      examIds: [examen[0].id],
      examenId: examen[0].id,
    })
    const created = await service.create(entity)
    expect(created.numero).toMatch(/^LB-\d{8}-\d{4}$/)
  })

  it('refuse une demande interne sans patient', async () => {
    await expect(
      labo.createDemande({
        type: 'laboratoire',
        examIds: [1],
        examenId: 1,
      }),
    ).rejects.toThrow(/patient/i)
  })

  it('gère le stock FIFO, les alertes et les commandes fournisseurs', async () => {
    const fournisseur = await db
      .insertInto('fournisseurs')
      .values({ nom: 'Bio Réactifs SARL' } as never)
      .returning('id')
      .executeTakeFirstOrThrow()

    const article = await stock.createArticle({
      nom: 'Tubes EDTA',
      categorie: 'consommable',
      uniteStock: 'tube',
      seuilAlerte: 10,
      prixAchat: 500,
    })
    expect(article.id).toBeTruthy()

    // Entrée de deux lots avec péremptions différentes.
    await stock.entreeStock({
      articleId: article.id!,
      quantite: 5,
      numeroLot: 'LOT-A',
      datePeremption: '2027-06-30',
      prixAchat: 500,
    })
    await stock.entreeStock({
      articleId: article.id!,
      quantite: 100,
      numeroLot: 'LOT-B',
      datePeremption: '2028-06-30',
      prixAchat: 500,
    })

    let rows = await stock.listArticles({ search: 'EDTA' })
    expect(rows[0].stock_total).toBe(105)

    // Le lot qui périme le plus tôt est consommé en premier (FIFO).
    await stock.sortieStock({ articleId: article.id!, quantite: 8 })
    const lots = await stock.listLots({ articleId: article.id!, includeEmpty: true })
    const lotA = lots.find((l) => l.numero_lot === 'LOT-A')
    const lotB = lots.find((l) => l.numero_lot === 'LOT-B')
    expect(lotA?.quantite_restante).toBe(0)
    expect(lotB?.quantite_restante).toBe(97)

    await expect(
      stock.sortieStock({ articleId: article.id!, quantite: 10_000 }),
    ).rejects.toThrow(/insuffisant/i)

    // Alerte sous le seuil.
    const alertes = await stock.listAlertes()
    expect(alertes.some((a) => a.id === article.id)).toBe(false)

    const commande = await stock.createCommande({
      fournisseurId: fournisseur.id,
      lignes: [{ articleId: article.id!, quantite: 20, prixUnitaire: 450 }],
    })
    expect(commande.numero).toMatch(/^LBC-\d{8}-\d{4}$/)
    expect(commande.statut).toBe('brouillon')
    expect(commande.montantTotal).toBe(9000)
    expect(commande.lignes).toHaveLength(1)

    await stock.updateStatutCommande(commande.id!, 'envoyee')

    const recu = await stock.enregistrerReception({
      commandeId: commande.id!,
      numeroBon: 'BL-001',
      lignes: [{
        ligneId: commande.lignes![0].id!,
        quantite: 20,
        numeroLot: 'LOT-C',
        datePeremption: '2029-01-31',
      }],
    })
    expect(recu.statut).toBe('livree')
    expect(recu.avancement).toBe(100)

    rows = await stock.listArticles({ search: 'EDTA' })
    expect(rows[0].stock_total).toBe(117)

    const receptions = await stock.listReceptions(commande.id!)
    expect(receptions).toHaveLength(1)
    expect(receptions[0].numeroBon).toBe('BL-001')

    const stats = await stock.stats()
    expect(stats.articles).toBeGreaterThanOrEqual(1)
    expect(stats.commandesEnCours).toBe(0)
  })
})
