import { inject, singleton } from 'tsyringe'
import { sql, type Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { ExamRequestEntity } from '../entities/exam-request.entity'
import type { ExamRequestDto, ExamRequestStatut, ExamRequestStatutPaiement } from '../dto/exam-request.dto'
import type { LaboComptabiliteSyntheseDto, LaboModePaiement } from '../dto/laboratoire.dto'
import { LaboPaiementEntity } from '../entities/laboratoire.entity'
import { entityEventBus } from '../automerge/event-bus'
import { nextExamRequestNumero } from '../utils/exam-request-numero'
import { parseExamIds, resolveExamMontant } from '../utils/exam-pricing'
import type { RecuServiceDto, RecuServiceLigneDto } from '../dto/recu-service.dto'

export interface LaboWorklistFilters {
  statut?: ExamRequestStatut | 'tous'
  dateFrom?: string
  dateTo?: string
  priorite?: string
  patientExterne?: boolean
  search?: string
  limit?: number
}

const STATUTS_AUTORISES: readonly ExamRequestStatut[] = ['en_attente', 'en_cours', 'realise', 'annule']

/** Transitions autorisées du cycle de vie d'une demande de laboratoire. */
const TRANSITIONS: Record<ExamRequestStatut, ExamRequestStatut[]> = {
  en_attente: ['en_cours', 'annule'],
  en_cours: ['realise', 'annule', 'en_attente'],
  realise: ['en_cours'],
  annule: ['en_attente'],
}

/**
 * Service du module Laboratoire.
 *
 * Il s'appuie sur la table `exam_requests` (partagée avec le dossier patient)
 * mais expose la vision « laboratoire » : worklist globale, demandes sans
 * dossier patient (externes), numérotation, prélèvement et statuts.
 */
@singleton()
export class LaboratoireService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  /** Numéro de demande : `LB-AAAAMMJJ-NNNN`, séquence journalière. */
  async nextNumero(date = new Date()): Promise<string> {
    return nextExamRequestNumero(this.db, date)
  }

  async listWorklist(filters: LaboWorklistFilters = {}): Promise<ExamRequestEntity[]> {
    let query = this.db
      .selectFrom('exam_requests')
      .leftJoin('patient', 'patient.id', 'exam_requests.patient_id')
      .leftJoin('user', 'user.id', 'exam_requests.prescripteur_id')
      .leftJoin('lab_exams', 'lab_exams.id', 'exam_requests.examen_id')
      .leftJoin('specialties', 'specialties.id', 'exam_requests.specialty_id')
      .select([
        'exam_requests.id',
        'exam_requests.numero',
        'exam_requests.patient_id',
        'exam_requests.encounter_id',
        'exam_requests.type',
        'exam_requests.examen_id',
        'exam_requests.exam_ids',
        'exam_requests.specialite',
        'exam_requests.specialty_id',
        'exam_requests.planned_hour',
        'exam_requests.planned_date',
        'exam_requests.motif',
        'exam_requests.statut',
        'exam_requests.priorite',
        'exam_requests.patient_externe',
        'exam_requests.externe_nom',
        'exam_requests.externe_prenom',
        'exam_requests.externe_sexe',
        'exam_requests.externe_date_naissance',
        'exam_requests.externe_telephone',
        'exam_requests.externe_adresse',
        'exam_requests.prescripteur_externe_nom',
        'exam_requests.prescripteur_externe_structure',
        'exam_requests.prescripteur_externe_telephone',
        'exam_requests.prelevement_type',
        'exam_requests.prelevement_at',
        'exam_requests.prelevement_par',
        'exam_requests.validated_at',
        'exam_requests.realized_at',
        'exam_requests.resultat',
        'exam_requests.prescripteur_id',
        'exam_requests.facture_id',
        'exam_requests.montant',
        'exam_requests.statut_paiement',
        'exam_requests.created_by',
        'exam_requests.created_at',
        'exam_requests.updated_at',
      ])
      .select([
        'patient.nom as patient_nom',
        'patient.prenom as patient_prenom',
        'user.prenom as prescripteur_nom',
        'lab_exams.name as examen_label',
        'specialties.name as specialty_name',
        sql<number>`(
          SELECT COALESCE(SUM(lp.montant), 0)
          FROM labo_paiements lp
          WHERE lp.exam_request_id = exam_requests.id
        )`.as('montant_paye'),
      ])
      .where('exam_requests.type', '=', 'laboratoire')

    if (filters.statut && filters.statut !== 'tous') {
      query = query.where('exam_requests.statut', '=', filters.statut)
    }
    if (filters.dateFrom) {
      query = query.where('exam_requests.planned_date', '>=', filters.dateFrom)
    }
    if (filters.dateTo) {
      query = query.where('exam_requests.planned_date', '<=', filters.dateTo)
    }
    if (filters.priorite) {
      query = query.where('exam_requests.priorite', '=', filters.priorite)
    }
    if (filters.patientExterne !== undefined) {
      query = query.where('exam_requests.patient_externe', '=', filters.patientExterne ? 1 : 0)
    }
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`
      query = query.where((eb) =>
        eb.or([
          eb('exam_requests.numero', 'like', term),
          eb('patient.nom', 'like', term),
          eb('patient.prenom', 'like', term),
          eb('exam_requests.externe_nom', 'like', term),
          eb('exam_requests.externe_prenom', 'like', term),
        ]),
      )
    }

    const rows = await query
      .orderBy(sql`CASE WHEN exam_requests.priorite = 'urgente' THEN 0 ELSE 1 END`, 'asc')
      .orderBy('exam_requests.planned_date', 'desc')
      .orderBy('exam_requests.id', 'desc')
      .limit(filters.limit ?? 500)
      .execute()
    return rows as unknown as ExamRequestEntity[]
  }

  async getDetail(id: number): Promise<ExamRequestEntity | null> {
    const row = await this.db
      .selectFrom('exam_requests')
      .leftJoin('patient', 'patient.id', 'exam_requests.patient_id')
      .leftJoin('user', 'user.id', 'exam_requests.prescripteur_id')
      .leftJoin('lab_exams', 'lab_exams.id', 'exam_requests.examen_id')
      .selectAll('exam_requests')
      .select([
        'patient.nom as patient_nom',
        'patient.prenom as patient_prenom',
        'user.prenom as prescripteur_nom',
        'lab_exams.name as examen_label',
        sql<number>`(
          SELECT COALESCE(SUM(lp.montant), 0)
          FROM labo_paiements lp
          WHERE lp.exam_request_id = exam_requests.id
        )`.as('montant_paye'),
      ])
      .where('exam_requests.id', '=', id)
      .executeTakeFirst()
    return row ? (row as unknown as ExamRequestEntity) : null
  }

  /**
   * Données du reçu de service d'une demande de laboratoire.
   *
   * Fonctionne pour les demandes internes (patient du dossier) comme pour les
   * demandes externes. Les lignes reprennent les analyses demandées et leur
   * tarif configuré ; le total reste celui figé sur la demande.
   */
  async getRecu(id: number): Promise<RecuServiceDto> {
    const demande = await this.getDetail(id)
    if (!demande) throw new Error('Demande introuvable')

    const ids = [...new Set([...parseExamIds(demande.exam_ids), ...(demande.examen_id != null ? [demande.examen_id] : [])])]
    const exams = ids.length > 0
      ? await this.db
        .selectFrom('lab_exams')
        .select(['id', 'name', 'prix'])
        .where('id', 'in', ids)
        .execute()
      : []

    const lignes: RecuServiceLigneDto[] = exams.map((examen) => {
      const prix = Number(examen.prix ?? 0)
      return { label: examen.name ?? `Examen #${examen.id}`, quantite: 1, prixUnitaire: prix, montant: prix }
    })

    const sommeLignes = lignes.reduce((total, ligne) => total + ligne.montant, 0)
    const montantTotal = demande.montant != null && demande.montant > 0
      ? Number(demande.montant)
      : sommeLignes
    // Total figé supérieur à la somme des tarifs (frais, ajustement manuel).
    if (montantTotal > sommeLignes) {
      const complement = montantTotal - sommeLignes
      lignes.push({
        label: 'Frais complémentaires',
        quantite: 1,
        prixUnitaire: complement,
        montant: complement,
      })
    }

    const paiements = await this.listPaiements(id)
    const montantPaye = paiements.reduce((total, paiement) => total + Number(paiement.montant ?? 0), 0)
    const exonere = demande.statut_paiement === 'exonere'
    // Une demande interne est facturée au dossier patient : sans règlement
    // au laboratoire, il n'y a ni « réglé » ni « reste dû » à réclamer ici.
    const factureAuDossier = !demande.patient_externe && !exonere && montantPaye === 0
    const reste = exonere || factureAuDossier ? 0 : Math.max(0, montantTotal - montantPaye)

    let patientNom = demande.patient_nom
    let patientPrenom = demande.patient_prenom
    let patientNip: string | null = null
    let patientTelephone: string | null = null
    if (demande.patient_id != null) {
      const patient = await this.db
        .selectFrom('patient')
        .select(['nom', 'prenom', 'nip', 'telephone'])
        .where('id', '=', demande.patient_id)
        .executeTakeFirst()
      if (patient) {
        patientNom = patient.nom ?? patientNom
        patientPrenom = patient.prenom ?? patientPrenom
        patientNip = patient.nip ?? null
        patientTelephone = patient.telephone ?? null
      }
    } else {
      patientNom = demande.externe_nom
      patientPrenom = demande.externe_prenom
      patientTelephone = demande.externe_telephone ?? null
    }

    const dernierPaiement = paiements.find((paiement) => paiement.created_by != null)
    let caissier: string | null = null
    if (dernierPaiement?.created_by != null) {
      const user = await this.db
        .selectFrom('user')
        .select(['nom', 'prenom'])
        .where('id', '=', dernierPaiement.created_by)
        .executeTakeFirst()
      if (user) caissier = `${user.prenom ?? ''} ${(user.nom ?? '').toUpperCase()}`.trim() || null
    }

    const statuts: Record<string, string> = {
      en_attente: 'En attente',
      en_cours: 'En cours',
      realise: 'Réalisé',
      annule: 'Annulé',
    }

    return {
      ref: demande.numero ?? `LB-${id}`,
      date: (demande.planned_date ?? demande.created_at ?? new Date().toISOString()).slice(0, 10),
      service: 'laboratoire',
      origine: demande.patient_externe ? 'Externe' : 'Interne',
      patientNom: patientNom ?? '',
      patientPrenom: patientPrenom ?? '',
      patientNip,
      patientTelephone,
      prescripteur: demande.prescripteur_externe_nom ?? demande.prescripteur_nom ?? null,
      statut: statuts[demande.statut ?? 'en_attente'] ?? demande.statut ?? null,
      statutPaiement: (demande.statut_paiement ?? 'non_paye') as RecuServiceDto['statutPaiement'],
      factureAuDossier: factureAuDossier || undefined,
      lignes,
      paiements: paiements.map((paiement) => ({
        date: paiement.date_paiement ?? '',
        montant: Number(paiement.montant ?? 0),
        mode: paiement.mode_paiement ?? 'espece',
        reference: paiement.reference ?? null,
        numeroRecu: null,
      })),
      montantTotal,
      montantPaye,
      reste,
      caissier,
    }
  }

  /** Convertit un DTO en entité et valide les champs métier. */
  private async prepare(dto: ExamRequestDto): Promise<ExamRequestEntity> {
    const entity = ExamRequestEntity.fromDto(dto)

    if (!entity.type) throw new Error("Le type d'examen est requis")
    if (!['laboratoire', 'imagerie', 'avis'].includes(entity.type)) {
      throw new Error("Type d'examen invalide")
    }
    if (entity.statut && !STATUTS_AUTORISES.includes(entity.statut as ExamRequestStatut)) {
      throw new Error('Statut invalide')
    }
    if (entity.priorite && !['normale', 'urgente'].includes(entity.priorite)) {
      throw new Error('Priorité invalide')
    }

    const externe = Boolean(entity.patient_externe)
    if (externe) {
      if (!entity.externe_nom?.trim()) throw new Error('Le nom du patient externe est requis')
      if (!entity.externe_prenom?.trim()) throw new Error('Le prénom du patient externe est requis')
      // Une demande externe ne doit pas être rattachée à un dossier patient.
      entity.patient_id = undefined
      entity.encounter_id = undefined
    } else {
      if (entity.patient_id == null) throw new Error('Le patient est requis')
    }

    const hasExam = (entity.examen_id != null) ||
      (entity.exam_ids != null && entity.exam_ids !== '[]')
    if (entity.type === 'laboratoire' && !hasExam) {
      throw new Error('Au moins un examen est requis')
    }

    // Le montant n'est jamais saisi par l'utilisateur : il découle des prix
    // configurés dans le catalogue des examens.
    if (entity.type === 'laboratoire') {
      const examIds = parseExamIds(entity.exam_ids)
      if (entity.examen_id != null) examIds.push(entity.examen_id)
      entity.montant = await resolveExamMontant(this.db, examIds, entity.montant)
    }

    if (!entity.numero) entity.numero = await this.nextNumero()
    if (!entity.planned_date) entity.planned_date = new Date().toISOString().slice(0, 10)
    if (!entity.statut) entity.statut = 'en_attente'

    return entity
  }

  async createDemande(dto: ExamRequestDto): Promise<ExamRequestEntity> {
    const entity = await this.prepare(dto)

    const result = await this.db
      .insertInto('exam_requests')
      .values({
        numero: entity.numero,
        patient_id: entity.patient_id,
        encounter_id: entity.encounter_id,
        type: entity.type!,
        examen_id: entity.examen_id,
        exam_ids: entity.exam_ids,
        specialite: entity.specialite,
        specialty_id: entity.specialty_id,
        planned_hour: entity.planned_hour,
        planned_date: entity.planned_date,
        motif: entity.motif,
        statut: entity.statut ?? 'en_attente',
        priorite: entity.priorite ?? 'normale',
        patient_externe: entity.patient_externe ? 1 : 0,
        externe_nom: entity.externe_nom,
        externe_prenom: entity.externe_prenom,
        externe_sexe: entity.externe_sexe,
        externe_date_naissance: entity.externe_date_naissance,
        externe_telephone: entity.externe_telephone,
        externe_adresse: entity.externe_adresse,
        prescripteur_externe_nom: entity.prescripteur_externe_nom,
        prescripteur_externe_structure: entity.prescripteur_externe_structure,
        prescripteur_externe_telephone: entity.prescripteur_externe_telephone,
        prescripteur_id: entity.prescripteur_id,
        montant: entity.montant,
        statut_paiement: entity.statut_paiement ?? 'non_paye',
        created_by: entity.created_by,
      })
      .returningAll()
      .executeTakeFirst()

    if (!result) throw new Error("Échec de la création de la demande d'examen")
    entityEventBus.emitEntityChange({
      entityType: 'exam_request',
      action: 'created',
      id: result.id!,
      entity: result,
      source: 'local',
      timestamp: Date.now(),
    })
    return (await this.getDetail(result.id!)) as ExamRequestEntity
  }

  async updateStatut(id: number, statut: ExamRequestStatut): Promise<ExamRequestEntity> {
    if (!STATUTS_AUTORISES.includes(statut)) throw new Error('Statut invalide')
    const existing = await this.getDetail(id)
    if (!existing) throw new Error('Demande introuvable')

    const current = (existing.statut ?? 'en_attente') as ExamRequestStatut
    if (current !== statut && !TRANSITIONS[current].includes(statut)) {
      throw new Error(`Transition de statut impossible (${current} → ${statut})`)
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const patch: Record<string, unknown> = { statut, updated_at: now }
    if (statut === 'realise') patch.realized_at = new Date().toISOString()
    if (statut === 'en_attente') {
      patch.realized_at = null
      patch.validated_at = null
    }

    await this.db.updateTable('exam_requests').set(patch).where('id', '=', id).execute()
    entityEventBus.emitEntityChange({
      entityType: 'exam_request',
      action: 'updated',
      id,
      entity: { id, statut },
      source: 'local',
      timestamp: Date.now(),
    })
    return (await this.getDetail(id)) as ExamRequestEntity
  }

  async enregistrerPrelevement(
    id: number,
    payload: { prelevementType?: string; prelevementAt?: string; prelevementPar?: number },
  ): Promise<ExamRequestEntity> {
    const existing = await this.getDetail(id)
    if (!existing) throw new Error('Demande introuvable')
    if (existing.statut === 'annule') throw new Error('Une demande annulée ne peut pas être prélevée')

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    await this.db
      .updateTable('exam_requests')
      .set({
        prelevement_type: payload.prelevementType ?? existing.prelevement_type ?? 'sang',
        prelevement_at: payload.prelevementAt ?? now,
        prelevement_par: payload.prelevementPar ?? existing.prelevement_par,
        statut: 'en_cours',
        updated_at: now,
      })
      .where('id', '=', id)
      .execute()

    entityEventBus.emitEntityChange({
      entityType: 'exam_request',
      action: 'updated',
      id,
      entity: { id, statut: 'en_cours' },
      source: 'local',
      timestamp: Date.now(),
    })
    return (await this.getDetail(id)) as ExamRequestEntity
  }

  // ═══════════════════════ Encaissements ═══════════════════════

  async listPaiements(examRequestId: number): Promise<LaboPaiementEntity[]> {
    const rows = await this.db
      .selectFrom('labo_paiements')
      .selectAll()
      .where('exam_request_id', '=', examRequestId)
      .orderBy('date_paiement', 'desc')
      .orderBy('id', 'desc')
      .execute()
    return rows as unknown as LaboPaiementEntity[]
  }

  /**
   * Enregistre un encaissement et recalcule le statut de paiement.
   *
   * Un patient externe n'ayant pas de dossier, il n'y a pas de facture :
   * le montant dû et les règlements vivent sur la demande elle-même.
   */
  async enregistrerPaiement(
    id: number,
    payload: {
      montant?: number
      modePaiement?: LaboModePaiement
      datePaiement?: string
      reference?: string
      exonere?: boolean
      createdBy?: number
    },
  ): Promise<ExamRequestEntity> {
    const existing = await this.getDetail(id)
    if (!existing) throw new Error('Demande introuvable')
    if (existing.statut === 'annule') throw new Error('Une demande annulée ne peut pas être encaissée')

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    if (payload.exonere || payload.modePaiement === 'exonere') {
      await this.db
        .updateTable('exam_requests')
        .set({ statut_paiement: 'exonere', updated_at: now })
        .where('id', '=', id)
        .execute()
      return (await this.getDetail(id)) as ExamRequestEntity
    }

    if (!Number.isFinite(payload.montant) || (payload.montant ?? 0) <= 0) {
      throw new Error('Le montant encaissé doit être strictement positif')
    }

    await this.db.transaction().execute(async (trx) => {
      await trx
        .insertInto('labo_paiements')
        .values({
          exam_request_id: id,
          montant: payload.montant!,
          mode_paiement: payload.modePaiement ?? 'espece',
          date_paiement: payload.datePaiement || new Date().toISOString().slice(0, 10),
          reference: payload.reference?.trim() || null,
          created_by: payload.createdBy ?? null,
        })
        .execute()

      const total = await trx
        .selectFrom('labo_paiements')
        .select(sql<number>`COALESCE(SUM(montant), 0)`.as('total'))
        .where('exam_request_id', '=', id)
        .executeTakeFirst()
      const montantPaye = Number(total?.total ?? 0)
      const montantDu = existing.montant != null && existing.montant > 0
        ? existing.montant
        : montantPaye
      const statut: ExamRequestStatutPaiement = montantPaye >= montantDu ? 'paye' : 'partiel'

      await trx
        .updateTable('exam_requests')
        .set({
          montant: existing.montant ?? montantDu,
          statut_paiement: statut,
          updated_at: now,
        })
        .where('id', '=', id)
        .execute()
    })

    entityEventBus.emitEntityChange({
      entityType: 'exam_request',
      action: 'updated',
      id,
      entity: { id, statut_paiement: 'paye' },
      source: 'local',
      timestamp: Date.now(),
    })
    return (await this.getDetail(id)) as ExamRequestEntity
  }

  /** Compteurs pour le tableau de bord laboratoire. */
  async stats(): Promise<{ enAttente: number; enCours: number; realise: number; urgentes: number; externes: number }> {
    const row = await sql<{
      en_attente: number; en_cours: number; realise: number; urgentes: number; externes: number
    }>`
      SELECT
        SUM(CASE WHEN statut = 'en_attente' THEN 1 ELSE 0 END) AS en_attente,
        SUM(CASE WHEN statut = 'en_cours' THEN 1 ELSE 0 END) AS en_cours,
        SUM(CASE WHEN statut = 'realise' THEN 1 ELSE 0 END) AS realise,
        SUM(CASE WHEN priorite = 'urgente' AND statut != 'realise' AND statut != 'annule' THEN 1 ELSE 0 END) AS urgentes,
        SUM(CASE WHEN patient_externe = 1 THEN 1 ELSE 0 END) AS externes
      FROM exam_requests
      WHERE type = 'laboratoire'
    `.execute(this.db)
    const r = row.rows[0]
    return {
      enAttente: Number(r?.en_attente ?? 0),
      enCours: Number(r?.en_cours ?? 0),
      realise: Number(r?.realise ?? 0),
      urgentes: Number(r?.urgentes ?? 0),
      externes: Number(r?.externes ?? 0),
    }
  }

  /**
   * Liste des analyses de laboratoire actives, pour le formulaire de demande.
   *
   * Seule la catégorie `laboratoire` est exposée : le catalogue `lab_exams`
   * contient aussi l'imagerie, qui ne doit pas apparaître dans le module.
   */
  async listExamens(): Promise<Array<{
    id: number
    name: string
    categoryId: number
    categoryName: string
  }>> {
    const rows = await this.db
      .selectFrom('lab_exams')
      .innerJoin('lab_exam_categories', 'lab_exam_categories.id', 'lab_exams.category_id')
      .select([
        'lab_exams.id',
        'lab_exams.name',
        'lab_exams.category_id as categoryId',
        'lab_exam_categories.name as categoryName',
      ])
      .where('lab_exams.is_active', '=', 1)
      .where('lab_exam_categories.code', '=', 'laboratoire')
      .orderBy('lab_exams.sort_order', 'asc')
      .orderBy('lab_exams.name', 'asc')
      .execute()
    return rows as unknown as Array<{
      id: number
      name: string
      categoryId: number
      categoryName: string
    }>
  }

  /**
   * Synthèse comptable de la période (canal `labo:comptabilite`).
   *
   * Les bornes `dateDebut` / `dateFin` sont inclusives (`AAAA-MM-JJ`) et
   * facultatives. Elles filtrent la date planifiée des demandes pour le
   * facturé et la date d'encaissement pour les règlements — les deux
   * périmètres peuvent donc différer sur une période glissante.
   */
  async syntheseComptable(
    dateDebut?: string | null,
    dateFin?: string | null,
  ): Promise<LaboComptabiliteSyntheseDto> {
    const debut = dateDebut?.trim() ? dateDebut.trim() : null
    const fin = dateFin?.trim() ? dateFin.trim() : null

    const totaux = await sql<{
      demandes: number | null
      realisees: number | null
      annulees: number | null
      internes: number | null
      externes: number | null
      ca_facture: number | null
      exonerations: number | null
      impayes_count: number | null
    }>`
      SELECT
        COUNT(*) AS demandes,
        SUM(CASE WHEN statut = 'realise' THEN 1 ELSE 0 END) AS realisees,
        SUM(CASE WHEN statut = 'annule' THEN 1 ELSE 0 END) AS annulees,
        SUM(CASE WHEN patient_externe = 0 THEN 1 ELSE 0 END) AS internes,
        SUM(CASE WHEN patient_externe = 1 THEN 1 ELSE 0 END) AS externes,
        COALESCE(SUM(
          CASE WHEN statut != 'annule' AND montant > 0 THEN montant ELSE 0 END
        ), 0) AS ca_facture,
        COALESCE(SUM(
          CASE WHEN statut != 'annule' AND statut_paiement = 'exonere' THEN montant ELSE 0 END
        ), 0) AS exonerations,
        SUM(
          CASE
            WHEN statut != 'annule' AND montant > 0
             AND statut_paiement IN ('non_paye', 'partiel')
            THEN 1 ELSE 0
          END
        ) AS impayes_count
      FROM exam_requests
      WHERE type = 'laboratoire'
        AND (${debut} IS NULL OR planned_date >= ${debut})
        AND (${fin} IS NULL OR planned_date <= ${fin})
    `.execute(this.db)

    const encaisseRow = await sql<{ encaisse: number | null }>`
      SELECT COALESCE(SUM(montant), 0) AS encaisse
      FROM labo_paiements
      WHERE (${debut} IS NULL OR date_paiement >= ${debut})
        AND (${fin} IS NULL OR date_paiement <= ${fin})
    `.execute(this.db)

    const modeRows = await sql<{ mode: LaboModePaiement; count: number; montant: number | null }>`
      SELECT mode_paiement AS mode, COUNT(*) AS count, COALESCE(SUM(montant), 0) AS montant
      FROM labo_paiements
      WHERE (${debut} IS NULL OR date_paiement >= ${debut})
        AND (${fin} IS NULL OR date_paiement <= ${fin})
      GROUP BY mode_paiement
      ORDER BY montant DESC
    `.execute(this.db)

    const paiementRows = await sql<{
      id: number
      exam_request_id: number
      numero: string | null
      patient_externe: number
      externe_nom: string | null
      externe_prenom: string | null
      patient_nom: string | null
      patient_prenom: string | null
      montant: number
      mode_paiement: LaboModePaiement
      date_paiement: string
      reference: string | null
    }>`
      SELECT
        lp.id,
        lp.exam_request_id,
        er.numero,
        er.patient_externe,
        er.externe_nom,
        er.externe_prenom,
        patient.nom AS patient_nom,
        patient.prenom AS patient_prenom,
        lp.montant,
        lp.mode_paiement,
        lp.date_paiement,
        lp.reference
      FROM labo_paiements lp
      INNER JOIN exam_requests er ON er.id = lp.exam_request_id
      LEFT JOIN patient ON patient.id = er.patient_id
      WHERE er.type = 'laboratoire'
        AND (${debut} IS NULL OR lp.date_paiement >= ${debut})
        AND (${fin} IS NULL OR lp.date_paiement <= ${fin})
      ORDER BY lp.date_paiement DESC, lp.id DESC
      LIMIT 500
    `.execute(this.db)

    const impayeRows = await sql<{
      id: number
      numero: string | null
      patient_externe: number
      externe_nom: string | null
      externe_prenom: string | null
      patient_nom: string | null
      patient_prenom: string | null
      planned_date: string | null
      montant: number
      montant_paye: number | null
      statut_paiement: 'non_paye' | 'partiel' | 'paye' | 'exonere'
    }>`
      SELECT
        er.id,
        er.numero,
        er.patient_externe,
        er.externe_nom,
        er.externe_prenom,
        patient.nom AS patient_nom,
        patient.prenom AS patient_prenom,
        er.planned_date,
        er.montant,
        er.statut_paiement,
        (
          SELECT COALESCE(SUM(lp.montant), 0)
          FROM labo_paiements lp
          WHERE lp.exam_request_id = er.id
        ) AS montant_paye
      FROM exam_requests er
      LEFT JOIN patient ON patient.id = er.patient_id
      WHERE er.type = 'laboratoire'
        AND er.statut != 'annule'
        AND er.montant > 0
        AND er.statut_paiement IN ('non_paye', 'partiel')
        AND (${debut} IS NULL OR er.planned_date >= ${debut})
        AND (${fin} IS NULL OR er.planned_date <= ${fin})
      ORDER BY (er.montant - (
        SELECT COALESCE(SUM(lp.montant), 0)
        FROM labo_paiements lp
        WHERE lp.exam_request_id = er.id
      )) DESC
      LIMIT 500
    `.execute(this.db)

    const examRows = await sql<{
      examen_id: number | null
      exam_ids: string | null
      montant: number | null
    }>`
      SELECT examen_id, exam_ids, montant
      FROM exam_requests
      WHERE type = 'laboratoire'
        AND statut != 'annule'
        AND (${debut} IS NULL OR planned_date >= ${debut})
        AND (${fin} IS NULL OR planned_date <= ${fin})
    `.execute(this.db)

    const examCatalog = await this.db
      .selectFrom('lab_exams')
      .select(['id', 'name'])
      .execute()
    const examLabels = new Map<number, string>(
      examCatalog.map((e) => [Number(e.id), e.name ?? ''] as [number, string]),
    )

    const topMap = new Map<number | null, { libelle: string; count: number; montant: number }>()
    for (const row of examRows.rows) {
      let ids: number[] = []
      if (row.exam_ids) {
        try {
          const parsed: unknown = JSON.parse(row.exam_ids)
          if (Array.isArray(parsed)) {
            ids = parsed.filter((id): id is number => typeof id === 'number')
          }
        } catch {
          ids = []
        }
      }
      if (ids.length === 0 && row.examen_id != null) ids = [row.examen_id]
      if (ids.length === 0) ids = [Number.NaN]

      const part = (Number(row.montant ?? 0)) / ids.length
      for (const id of ids) {
        const key = Number.isNaN(id) ? null : id
        const libelle = key == null ? 'Examens multiples' : (examLabels.get(key) ?? `Examen #${key}`)
        const courant = topMap.get(key) ?? { libelle, count: 0, montant: 0 }
        courant.count += 1
        courant.montant += part
        topMap.set(key, courant)
      }
    }

    const caFacture = Number(totaux.rows[0]?.ca_facture ?? 0)
    const encaisse = Number(encaisseRow.rows[0]?.encaisse ?? 0)
    const t = totaux.rows[0]

    return {
      dateDebut: debut,
      dateFin: fin,
      demandes: Number(t?.demandes ?? 0),
      realisees: Number(t?.realisees ?? 0),
      annulees: Number(t?.annulees ?? 0),
      internes: Number(t?.internes ?? 0),
      externes: Number(t?.externes ?? 0),
      caFacture,
      encaisse,
      creances: Math.max(0, caFacture - encaisse),
      exonerations: Number(t?.exonerations ?? 0),
      impayesCount: Number(t?.impayes_count ?? 0),
      parMode: modeRows.rows.map((row) => ({
        mode: row.mode,
        count: Number(row.count ?? 0),
        montant: Number(row.montant ?? 0),
      })),
      topExamens: Array.from(topMap.entries())
        .map(([examenId, valeur]) => ({
          examenId,
          libelle: valeur.libelle,
          count: valeur.count,
          montant: Math.round(valeur.montant),
        }))
        .sort((a, b) => b.montant - a.montant || a.libelle.localeCompare(b.libelle))
        .slice(0, 10),
      paiements: paiementRows.rows.map((row) => ({
        id: row.id,
        examRequestId: row.exam_request_id,
        numero: row.numero,
        patient: nomAffiche(row.patient_externe === 1, row.externe_prenom, row.externe_nom, row.patient_prenom, row.patient_nom),
        externe: row.patient_externe === 1,
        montant: Number(row.montant ?? 0),
        modePaiement: row.mode_paiement,
        datePaiement: row.date_paiement,
        reference: row.reference,
      })),
      impayes: impayeRows.rows.map((row) => {
        const montant = Number(row.montant ?? 0)
        const montantPaye = Number(row.montant_paye ?? 0)
        return {
          id: row.id,
          numero: row.numero,
          patient: nomAffiche(row.patient_externe === 1, row.externe_prenom, row.externe_nom, row.patient_prenom, row.patient_nom),
          externe: row.patient_externe === 1,
          date: row.planned_date,
          montant,
          montantPaye,
          reste: Math.max(0, montant - montantPaye),
          statutPaiement: row.statut_paiement,
        }
      }),
    }
  }
}

/** Compose « prénom nom » pour les demandes internes comme externes. */
function nomAffiche(
  externe: boolean,
  externePrenom: string | null,
  externeNom: string | null,
  patientPrenom: string | null,
  patientNom: string | null,
): string {
  const prenom = (externe ? externePrenom : patientPrenom)?.trim()
  const nom = (externe ? externeNom : patientNom)?.trim()
  return [prenom, nom].filter(Boolean).join(' ') || '—'
}
