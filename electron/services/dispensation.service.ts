import { inject, singleton } from 'tsyringe'
import { type Kysely, type Transaction, sql } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { DelivranceEntity, DelivranceLigneEntity } from '../entities/delivrance.entity'
import { VentePharmaciePaiementEntity } from '../entities/vente-pharmacie-paiement.entity'
import type {
  DelivranceDto,
  DelivranceLigneDto,
  DelivranceStatut,
  DelivranceTypeVente,
  EncaisserVenteDto,
  ServirPaiementDto,
  StatutFinancierVente,
  SynthesePharmacieCreancePatientDto,
  SynthesePharmacieDto,
  SynthesePharmacieTopMotifDto,
  SynthesePharmacieTopProduitDto,
  VenteCreditPatientDto,
  VentePharmacieDto,
  VentePharmacieFiltres,
  VentePharmaciePaiementDto,
} from '../dto/delivrance.dto'
import type { ModePaiement } from '../dto/invoice.dto'
import type { RecuServiceDto, RecuServiceLigneDto, RecuServiceStatutPaiement } from '../dto/recu-service.dto'
import { ClinicalDocumentService } from './clinical-document.service'
import { MedicamentService } from './medicament.service'
import { StockService, toUserId } from './stock.service'
import { ORDONNANCE_LIBRE_ID, extractMedicamentLines } from './ordonnance-libre.service'
import { nowIso, todayIso } from '../utils/date-utils'
import { entityEventBus } from '../automerge/event-bus'

const DELIVRANCE_STATUTS: DelivranceStatut[] = ['a_servir', 'partielle', 'servie', 'annulee']
const TYPE_VENTE: readonly DelivranceTypeVente[] = ['facturee', 'gratuite']
const MODES_PAIEMENT: readonly ModePaiement[] = [
  'espèces',
  'carte_bancaire',
  'chèque',
  'virement',
  'mobile_money',
  'assurance',
  'autre',
]
const STATUTS_FINANCIERS: readonly StatutFinancierVente[] = [
  'gratuite',
  'sans_montant',
  'credit',
  'partielle',
  'payee',
]
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const RECU_RE = /^RP-(\d{8})-(\d{4})$/

type DbExecutor = Kysely<DB> | Transaction<DB>

function assertPositiveId(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} invalide`)
  }
  return value
}

function assertDateString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    throw new Error(`${field} invalide (format attendu AAAA-MM-JJ)`)
  }
  return value
}

function assertModePaiement(value: unknown): ModePaiement {
  if (typeof value !== 'string' || !MODES_PAIEMENT.includes(value as ModePaiement)) {
    throw new Error('Mode de paiement invalide')
  }
  return value as ModePaiement
}

function assertTypeVente(value: unknown): DelivranceTypeVente {
  if (typeof value !== 'string' || !TYPE_VENTE.includes(value as DelivranceTypeVente)) {
    throw new Error('Type de vente invalide')
  }
  return value as DelivranceTypeVente
}

function assertStatutFinancier(value: unknown): StatutFinancierVente {
  if (typeof value !== 'string' || !STATUTS_FINANCIERS.includes(value as StatutFinancierVente)) {
    throw new Error('Statut financier invalide')
  }
  return value as StatutFinancierVente
}

function normalizeMontantPaiement(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Montant invalide')
  const montant = Math.round(value)
  if (montant <= 0) throw new Error('Le montant doit être supérieur à zéro')
  return montant
}

/**
 * Retourne un prix unitaire strictement positif, ou `null` si absent/nul.
 *
 * Un prix à 0 est traité comme « non renseigné » : c'est ce qui permettait
 * auparavant de vendre silencieusement à 0 GNF.
 */
function toPrixUnitaire(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const prix = Math.round(value)
  return prix > 0 ? prix : null
}

function assertPrixUnitaire(value: unknown): number {
  const prix = toPrixUnitaire(value)
  if (prix == null) throw new Error('Prix unitaire invalide (montant positif attendu)')
  return prix
}

function trimOrUndefined(value: string | null | undefined): string | undefined {
  if (value == null) return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

export function computeStatutFinancier(
  typeVente: string | null | undefined,
  montantTotal: number,
  montantPaye: number,
): StatutFinancierVente {
  if ((typeVente ?? 'facturee') === 'gratuite') return 'gratuite'
  if (montantTotal <= 0) return 'sans_montant'
  if (montantPaye <= 0) return 'credit'
  if (montantPaye >= montantTotal) return 'payee'
  return 'partielle'
}

/** Lignes (partielles) nécessaires au calcul de l'état financier d'une vente. */
export interface DelivranceLigneFinanciere {
  quantite_servie?: number | null
  prix_unitaire?: number | null
}

/** État financier d'une délivrance, calculé par le serveur. */
export interface DelivranceFinancierDto {
  montantTotal: number
  montantPaye: number
  reste: number
  statutFinancier: StatutFinancierVente
  prixManquant: boolean
}

/**
 * Calcule l'état financier d'une délivrance (défaut M4).
 *
 * Le serveur est la SOURCE DE VÉRITÉ du montant de la vente : le prix de
 * vente est figé au PREMIER service (colonne `delivrance_lignes.prix_unitaire`)
 * et ne suit plus le catalogue. Le renderer ne doit donc jamais recalculer le
 * total à partir du prix catalogue, sous peine de rejeter un paiement
 * légitime (« Montant supérieur au total de la vente »).
 *
 * - `montantTotal` : 0 pour une vente gratuite, sinon le total figé.
 * - `montantPaye`  : somme des paiements encaissés.
 * - `reste`       : `montantTotal - montantPaye` (peut être négatif si la
 *                   vente a été sur-encaissée : c'est une anomalie comptable).
 * - `prixManquant`: une ligne servie sans prix de vente (délivrance antérieure
 *                   au module de comptabilité). Toujours `false` pour une
 *                   vente GRATUITE : le prix nul y est intentionnel.
 */
export function computeDelivranceFinancier(params: {
  typeVente?: string | null
  montantTotal?: number | null
  montantPaye?: number | null
  lignes?: readonly DelivranceLigneFinanciere[]
}): DelivranceFinancierDto {
  const typeVente = params.typeVente ?? 'facturee'
  const montantTotal = typeVente === 'gratuite' ? 0 : Number(params.montantTotal ?? 0)
  const montantPaye = Number(params.montantPaye ?? 0)
  const lignes = params.lignes ?? []
  return {
    montantTotal,
    montantPaye,
    reste: montantTotal - montantPaye,
    statutFinancier: computeStatutFinancier(typeVente, montantTotal, montantPaye),
    // Une gratuité a légitimement un prix nul : ne pas la signaler comme
    // « prix manquant », sinon toute délivrance gratuite remonte une alerte.
    prixManquant:
      typeVente !== 'gratuite' &&
      lignes.some(
        (ligne) => Number(ligne.quantite_servie ?? 0) > 0 && Number(ligne.prix_unitaire ?? 0) === 0,
      ),
  }
}

export interface OrdonnanceItemQuantite {
  quantite?: number | string
  frequence?: string[] | string
  duree?: number
  renouvellement?: boolean
  nbRenouvellements?: number
}

export function computeQuantiteDemandee(item: OrdonnanceItemQuantite | null | undefined): number {
  const raw = typeof item?.quantite === 'string' && item.quantite.trim() !== '' ? Number(item.quantite) : item?.quantite
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return Math.floor(raw)
  const freq = Array.isArray(item?.frequence)
    ? item.frequence.filter(Boolean).length
    : (typeof item?.frequence === 'string' && item.frequence.trim() ? 1 : 0)
  const duree = typeof item?.duree === 'number' && item.duree > 0 ? Math.floor(item.duree) : 0
  if (freq === 0 || duree === 0) return 0
  const renouvellements = item?.renouvellement
    ? (typeof item?.nbRenouvellements === 'number' && item.nbRenouvellements > 0 ? Math.floor(item.nbRenouvellements) : 0)
    : 0
  return freq * duree * (1 + renouvellements)
}

function isUniqueViolation(error: unknown): boolean {
  if ((error as { code?: string })?.code === 'SQLITE_CONSTRAINT_UNIQUE') return true
  return /UNIQUE constraint failed/i.test((error as Error)?.message ?? '')
}

export interface DelivranceFileEntry {
  delivrance: DelivranceDto
  lignes: DelivranceLigneDto[]
  patient: { id: number; nom?: string; prenom?: string } | null
  document: { id: string; title?: string } | null
}

export interface LigneNonMappee {
  ligne: DelivranceLigneDto
  delivranceId: number
  statut: string
  patient: { id: number; nom?: string } | null
  sourceDocumentId?: string
}

export interface OrdonnanceOrpheline {
  documentId: string
  patient: { id: number; nom?: string; prenom?: string } | null
  nbLignes: number
  signedAt?: string
}

@singleton()
export class DispensationService {
  public db: Kysely<DB>

  constructor(
    @inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource,
    @inject(ClinicalDocumentService) private clinicalDocumentService: ClinicalDocumentService,
    @inject(MedicamentService) private medicamentService: MedicamentService,
    @inject(StockService) private stockService: StockService,
  ) {
    this.db = datasource.getInstance()
  }

  /**
   * Somme des paiements encaissés par délivrance.
   *
   * Utilisé pour calculer l'état financier côté serveur (défaut M4) : le
   * renderer ne doit jamais recalculer le total d'une vente.
   */
  private async loadPaiementsParDelivrance(
    delivranceIds: number[],
  ): Promise<Map<number, number>> {
    if (delivranceIds.length === 0) return new Map()
    const rows = await this.db
      .selectFrom('vente_pharmacie_paiement')
      .select(['delivrance_id', (eb) => eb.fn.sum<number>('montant').as('total')])
      .where('delivrance_id', 'in', delivranceIds)
      .groupBy('delivrance_id')
      .execute()
    return new Map(
      rows.map((row) => [Number(row.delivrance_id), Number(row.total ?? 0)] as const),
    )
  }

  /**
   * Complète un DTO de délivrance avec son état financier calculé par le
   * serveur (défaut M4) : `montantTotal`, `montantPaye`, `reste`,
   * `statutFinancier` et `prixManquant`.
   */
  private attachFinancier(
    delivrance: DelivranceDto,
    lignes: DelivranceLigneDto[],
    montantPaye: number,
  ): DelivranceDto {
    const financier = computeDelivranceFinancier({
      typeVente: delivrance.typeVente,
      montantTotal: delivrance.montantTotal,
      montantPaye,
      lignes: lignes.map((ligne) => ({
        quantite_servie: ligne.quantiteServie,
        prix_unitaire: ligne.prixUnitaire,
      })),
    })
    return { ...delivrance, ...financier }
  }

  /**
   * Résout en une seule passe les libellés non mappés d'un lot de lignes.
   *
   * @param lignes - Lignes potentiellement non mappées (`medicament_id` nul).
   * @returns Une correspondance `libellé normalisé → medicament_id`. Vide si le
   *   catalogue est indisponible : l'appelant doit alors simplement ignorer le
   *   rattachement, sans bloquer l'affichage.
   */
  private async resolveUnmappedMatches(
    lignes: Array<{ libelle?: string | null; medicament_id?: number | null }>,
  ): Promise<Map<string, number>> {
    const libelles = [
      ...new Set(
        lignes
          .filter((ligne) => ligne.medicament_id == null && (ligne.libelle ?? '').trim() !== '')
          .map((ligne) => (ligne.libelle as string).trim()),
      ),
    ]
    if (libelles.length === 0) return new Map()

    try {
      return await this.medicamentService.findIdsByLibelles(libelles)
    } catch {
      // Un catalogue indisponible ne doit pas bloquer l'affichage de la file.
      return new Map()
    }
  }

  /**
   * Rattache automatiquement les lignes non mappées d'une délivrance active.
   *
   * Les ordonnances libres contiennent souvent un libellé enrichi
   * (« Amoxicilline 500 mg ») que l'ancien matching exact DCI/nom commercial
   * ne reconnaissait pas. `findIdsByLibelles` résout désormais DCI + dosage ;
   * on répare donc les lignes existantes à la lecture, sans jamais toucher aux
   * délivrances servies ou annulées (leurs prix sont figés).
   *
   * L'opération est idempotente. Les correspondances sont calculées une fois
   * pour tout l'écran (`resolveUnmappedMatches`) afin d'éviter le N+1.
   *
   * @param executor - Connexion ou transaction d'écriture.
   * @param statut - Statut de la délivrance ; seules `a_servir` et `partielle`
   *   sont réparées.
   * @param lignes - Lignes de la délivrance, mutées en place après mise à jour.
   * @param matches - Correspondances pré-résolues.
   */
  private async autoMapUnmappedLignes(
    executor: DbExecutor,
    statut: string | null | undefined,
    lignes: Array<{ id?: number; libelle?: string | null; medicament_id?: number | null }>,
    matches: Map<string, number>,
  ): Promise<void> {
    if (statut !== 'a_servir' && statut !== 'partielle') return
    const candidates = lignes.filter(
      (ligne) => ligne.medicament_id == null && ligne.id != null && (ligne.libelle ?? '').trim() !== '',
    )

    for (const ligne of candidates) {
      const medicamentId = matches.get((ligne.libelle as string).trim())
      if (medicamentId == null) continue
      await executor
        .updateTable('delivrance_lignes')
        .set({ medicament_id: medicamentId })
        .where('id', '=', ligne.id!)
        .execute()
      ligne.medicament_id = medicamentId
    }
  }

  async file(filters?: { statut?: DelivranceStatut }): Promise<DelivranceFileEntry[]> {
    let query = this.db.selectFrom('delivrances').selectAll()
    if (filters?.statut != null) {
      if (!DELIVRANCE_STATUTS.includes(filters.statut)) throw new Error('statut invalide')
      query = query.where('statut', '=', filters.statut)
    }
    const delivrances = await query.orderBy('id', 'desc').execute()
    if (delivrances.length === 0) return []

    const ids = delivrances.map((d) => d.id!)
    const lignes = await this.db
      .selectFrom('delivrance_lignes')
      .selectAll()
      .where('delivrance_id', 'in', ids)
      .orderBy('id', 'asc')
      .execute()

    const patientIds = [...new Set(delivrances.map((d) => d.patient_id as number).filter((id) => id != null))]
    const patients = patientIds.length > 0
      ? await this.db.selectFrom('patient').select(['id', 'nom', 'prenom']).where('id', 'in', patientIds).execute()
      : []
    const docIds = [...new Set(
      delivrances
        .filter((d) => d.source === 'ordonnance_libre')
        .map((d) => d.source_document_id as string)
        .filter((id) => id != null),
    )]
    const docs = docIds.length > 0
      ? await this.db.selectFrom('patient_clinical_documents').select(['id', 'title']).where('id', 'in', docIds).execute()
      : []

    const lignesByDelivrance = new Map<number, typeof lignes>()
    for (const ligne of lignes) {
      const list = lignesByDelivrance.get(ligne.delivrance_id as number) ?? []
      list.push(ligne)
      lignesByDelivrance.set(ligne.delivrance_id as number, list)
    }
    const patientById = new Map(patients.map((p) => [p.id as number, p]))
    const docById = new Map(docs.map((d) => [d.id as string, d]))
    const paiementsByDelivrance = await this.loadPaiementsParDelivrance(ids)

    // Une seule résolution de catalogue pour toute la file (évite le N+1).
    const activeLignes = delivrances
      .filter((d) => d.statut === 'a_servir' || d.statut === 'partielle')
      .flatMap((d) => lignesByDelivrance.get(d.id!) ?? [])
    const matches = await this.resolveUnmappedMatches(activeLignes)
    for (const delivrance of delivrances) {
      await this.autoMapUnmappedLignes(
        this.db,
        delivrance.statut as string,
        lignesByDelivrance.get(delivrance.id!) ?? [],
        matches,
      )
    }

    return delivrances.map((d) => {
      const patient = patientById.get(d.patient_id as number)
      const document = docById.get(d.source_document_id as string)
      const lignesDto = DelivranceLigneEntity.toDtos(
        (lignesByDelivrance.get(d.id!) ?? []) as unknown as DelivranceLigneEntity[],
      )
      return {
        delivrance: this.attachFinancier(
          DelivranceEntity.toDto(d as unknown as DelivranceEntity),
          lignesDto,
          paiementsByDelivrance.get(d.id!) ?? 0,
        ),
        lignes: lignesDto,
        patient: patient ? { id: patient.id as number, nom: patient.nom ?? undefined, prenom: patient.prenom ?? undefined } : null,
        document: document ? { id: document.id as string, title: (document.title as string | null) ?? undefined } : null,
      }
    })
  }

  async getById(id: number): Promise<DelivranceFileEntry | null> {
    const delivrance = await this.db
      .selectFrom('delivrances')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    if (!delivrance) return null
    const lignes = await this.db
      .selectFrom('delivrance_lignes')
      .selectAll()
      .where('delivrance_id', '=', delivrance.id!)
      .orderBy('id', 'asc')
      .execute()
    const patient = await this.db
      .selectFrom('patient')
      .select(['id', 'nom', 'prenom'])
      .where('id', '=', delivrance.patient_id as number)
      .executeTakeFirst()
    const document = delivrance.source === 'ordonnance_libre'
      ? await this.db
        .selectFrom('patient_clinical_documents')
        .select(['id', 'title'])
        .where('id', '=', delivrance.source_document_id as string)
        .executeTakeFirst()
      : undefined
    const matches = await this.resolveUnmappedMatches(lignes)
    await this.autoMapUnmappedLignes(this.db, delivrance.statut as string, lignes, matches)
    const lignesDto = DelivranceLigneEntity.toDtos(lignes as unknown as DelivranceLigneEntity[])
    const paiements = await this.loadPaiementsParDelivrance([delivrance.id!])
    return {
      delivrance: this.attachFinancier(
        DelivranceEntity.toDto(delivrance as unknown as DelivranceEntity),
        lignesDto,
        paiements.get(delivrance.id!) ?? 0,
      ),
      lignes: lignesDto,
      patient: patient ? { id: patient.id as number, nom: patient.nom ?? undefined, prenom: patient.prenom ?? undefined } : null,
      document: document ? { id: document.id as string, title: (document.title as string | null) ?? undefined } : null,
    }
  }

  async createFromDocument(documentId: string): Promise<{ delivrance: DelivranceDto; created: boolean } | null> {
    const doc = await this.clinicalDocumentService.getDocumentById(documentId)
    if (!doc) throw new Error('Document introuvable')
    if (doc.documentTypeId !== ORDONNANCE_LIBRE_ID) return null
    let formData: unknown = null
    try {
      formData = doc.formData ? JSON.parse(doc.formData) : null
    } catch {
      return null
    }
    // Source unique (partagée avec les drapeaux de l'UI) : `items` pour les
    // documents générés depuis un CRH/CRC, `ordonnanceSortie` pour les
    // ordonnances libres, `inlinePrescriptions` pour l'ancien format.
    const medicamentItems = extractMedicamentLines(formData)
    if (medicamentItems.length === 0) return null

    const findExisting = (db: Kysely<DB> | Transaction<DB>) => db
      .selectFrom('delivrances')
      .selectAll()
      .where('source', '=', 'ordonnance_libre')
      .where('source_document_id', '=', documentId)
      .executeTakeFirst()

    const existing = await findExisting(this.db)
    if (existing) {
      return { delivrance: DelivranceEntity.toDto(existing as unknown as DelivranceEntity), created: false }
    }

    const patientId = await this.clinicalDocumentService.getPatientIdByDocument(doc.contactId!)
    // Une seule lecture du catalogue pour toutes les lignes de l'ordonnance.
    const matches = await this.medicamentService.findIdsByLibelles(
      medicamentItems.map((item) => String(item.medicament).trim()),
    )

    try {
      return await this.db.transaction().execute(async (trx) => {
        const again = await findExisting(trx)
        if (again) {
          return { delivrance: DelivranceEntity.toDto(again as unknown as DelivranceEntity), created: false }
        }
        const created = await trx
          .insertInto('delivrances')
          .values({
            source: 'ordonnance_libre',
            source_document_id: documentId,
            patient_id: patientId,
            statut: 'a_servir',
          })
          .returningAll()
          .executeTakeFirstOrThrow()
        for (const item of medicamentItems) {
          await trx
            .insertInto('delivrance_lignes')
            .values({
              delivrance_id: created.id!,
              medicament_id: matches.get(String(item.medicament).trim()) ?? undefined,
              libelle: String(item.medicament),
              quantite_demandee: computeQuantiteDemandee(item),
              quantite_servie: 0,
            })
            .execute()
        }
        entityEventBus.emitEntityChange({ entityType: 'delivrance', action: 'created', id: created.id!, entity: created, source: 'local', timestamp: Date.now() })
        return { delivrance: DelivranceEntity.toDto(created as unknown as DelivranceEntity), created: true }
      })
    } catch (error) {
      if (isUniqueViolation(error)) {
        const raced = await findExisting(this.db)
        if (raced) {
          return { delivrance: DelivranceEntity.toDto(raced as unknown as DelivranceEntity), created: false }
        }
      }
      throw error
    }
  }

  async servir(params: {
    delivranceId: number
    lignes: Array<{
      ligneId: number
      quantite: number
      lotId?: number
      /**
       * Prix unitaire saisi pour cette délivrance, utilisé uniquement si aucun
       * prix n'est déjà figé et si le catalogue n'en fournit pas. Réservé aux
       * rôles d'encaissement (contrôle dans le handler IPC).
       */
      prixUnitaire?: number
    }>
    userId?: number | string
    /** Type de vente, figé au premier service. Défaut : facturee. */
    typeVente?: DelivranceTypeVente
    /** Motif obligatoire pour une vente gratuite. */
    motifGratuite?: string
    /** Encaissement immédiat optionnel (vente facturée uniquement). */
    paiement?: ServirPaiementDto
  }): Promise<{
    delivrance: DelivranceDto
    lignes: DelivranceLigneDto[]
    paiement?: VentePharmaciePaiementDto
  }> {
    const userId = toUserId(params.userId)
    if (params.typeVente !== undefined) assertTypeVente(params.typeVente)
    if (params.typeVente === 'gratuite') {
      if (!params.motifGratuite?.trim()) throw new Error('Motif de gratuité requis')
      if (params.paiement) throw new Error('Paiement impossible pour une vente gratuite')
    }

    return this.db.transaction().execute(async (trx) => {
      const delivrance = await trx
        .selectFrom('delivrances')
        .selectAll()
        .where('id', '=', params.delivranceId)
        .executeTakeFirst()
      if (!delivrance) throw new Error('Demande introuvable')
      if (delivrance.statut === 'servie') throw new Error('Demande déjà servie')
      if (delivrance.statut === 'annulee') throw new Error('Demande annulée')

      const allLignes = await trx
        .selectFrom('delivrance_lignes')
        .selectAll()
        .where('delivrance_id', '=', delivrance.id!)
        .execute()

      // ─── N4 : délivrance legacy (servie avant la migration 109) ───────
      // `date_vente IS NULL` ne suffit PAS à dire « jamais servie » : une
      // délivrance partiellement servie AVANT la migration 109 a des
      // `quantite_servie > 0` mais aucun `date_vente`. La traiter comme un
      // premier service l'aurait fait entrer dans la comptabilité avec un
      // `montant_total` calculé sur les seules lignes neuves (les anciennes
      // restant à `prix_unitaire = 0`).
      // « Déjà servie » = AU MOINS UNE ligne avec `quantite_servie > 0`.
      const dejaServie = allLignes.some((l) => Number(l.quantite_servie ?? 0) > 0)
      if (delivrance.date_vente == null && dejaServie) {
        throw new Error(
          'Cette délivrance a été servie avant la mise en place du module de comptabilité pharmacie : ' +
            'elle ne peut plus être servie et reste exclue des comptes.',
        )
      }

      const firstServe = delivrance.date_vente == null
      const existingType = ((delivrance.type_vente as DelivranceTypeVente | null) ?? 'facturee')
      const typeVente = firstServe
        ? (params.typeVente ?? existingType)
        : existingType
      if (!firstServe && params.typeVente !== undefined && params.typeVente !== existingType) {
        throw new Error('Type de vente déjà défini pour cette délivrance')
      }
      const motifGratuite = typeVente === 'gratuite'
        ? (firstServe ? params.motifGratuite!.trim() : trimOrUndefined(delivrance.motif_gratuite))
        : undefined
      if (typeVente === 'gratuite' && !motifGratuite) {
        throw new Error('Motif de gratuité requis')
      }
      if (typeVente === 'gratuite' && params.paiement) {
        throw new Error('Paiement impossible pour une vente gratuite')
      }

      const docId = delivrance.source === 'ordonnance_libre' ? (delivrance.source_document_id as string) : undefined

      // Répare les libellés enrichis (« Amoxicilline 500 mg ») avant de
      // calculer la couverture : sans cela, la ligne resterait non mappée et
      // le service serait refusé.
      const matches = await this.resolveUnmappedMatches(allLignes)
      await this.autoMapUnmappedLignes(trx, delivrance.statut as string, allLignes, matches)

      const mappablesRestantes = allLignes.filter(
        (l) => (l.quantite_demandee as number) - (l.quantite_servie as number) > 0 && l.medicament_id != null,
      )
      const requises = new Set(params.lignes.map((r) => r.ligneId))
      const manquantes = mappablesRestantes.filter((l) => !requises.has(l.id!))
      if (manquantes.length > 0) {
        throw new Error(`Lignes non couvertes : ${manquantes.map((l) => `« ${l.libelle} »`).join(', ')}`)
      }

      const plans: Array<{
        ligne: (typeof allLignes)[number]
        quantite: number
        lotId?: number
        prixAchat?: number | null
        /** Prix saisi pour cette délivrance (fallback si catalogue absent). */
        prixUnitaire?: number
      }> = []
      const ruptures: string[] = []
      for (const req of params.lignes) {
        const ligne = allLignes.find((l) => l.id === req.ligneId)
        if (!ligne) throw new Error(`Ligne ${req.ligneId} introuvable`)
        const quantite = Math.floor(req.quantite)
        if (!Number.isFinite(quantite) || quantite < 0) {
          throw new Error(`Quantité invalide pour la ligne « ${ligne.libelle} »`)
        }
        if (quantite === 0) continue
        const restant = (ligne.quantite_demandee as number) - (ligne.quantite_servie as number)
        if (quantite > restant) {
          throw new Error(`Quantité supérieure au restant pour « ${ligne.libelle} » (restant ${restant})`)
        }
        if (ligne.medicament_id == null) {
          ruptures.push(`« ${ligne.libelle} » : ligne non mappée au catalogue`)
          continue
        }
        const prixSaisi = req.prixUnitaire === undefined ? undefined : assertPrixUnitaire(req.prixUnitaire)
        if (req.lotId != null) {
          const lot = await trx
            .selectFrom('stock_lots')
            .selectAll()
            .where('id', '=', req.lotId)
            .executeTakeFirst()
          if (!lot || (lot.medicament_id as number) !== (ligne.medicament_id as number)) {
            throw new Error(`Lot invalide pour « ${ligne.libelle} »`)
          }
          if ((lot.quantite as number) < quantite) {
            ruptures.push(`« ${ligne.libelle} » : stock insuffisant dans le lot (demandé ${quantite}, disponible ${lot.quantite})`)
            continue
          }
          plans.push({
            ligne,
            quantite,
            lotId: lot.id!,
            prixAchat: (lot.prix_achat as number | null) ?? null,
            prixUnitaire: prixSaisi,
          })
        } else {
          const disponible = await trx
            .selectFrom('stock_lots')
            .select((eb) => eb.fn.sum<number | null>('quantite').as('total'))
            .where('medicament_id', '=', ligne.medicament_id as number)
            .executeTakeFirst()
            .then((row) => Number(row?.total ?? 0))
          if (disponible < quantite) {
            ruptures.push(`« ${ligne.libelle} » : stock insuffisant (demandé ${quantite}, disponible ${disponible})`)
            continue
          }
          plans.push({ ligne, quantite, prixUnitaire: prixSaisi })
        }
      }
      if (ruptures.length > 0) throw new Error(`Stock insuffisant : ${ruptures.join(' ; ')}`)

      for (const plan of plans) {
        const mouvementBase = {
          type: 'delivrance' as const,
          referenceType: 'ordonnance_libre' as const,
          referenceId: docId,
          userId,
        }
        const medicament = await trx
          .selectFrom('medicaments')
          .select(['id', 'prix_achat', 'prix_vente'])
          .where('id', '=', plan.ligne.medicament_id as number)
          .executeTakeFirst()

        let lotPrincipal: number | undefined = plan.lotId
        let coutBatch = 0
        if (plan.lotId != null) {
          await this.stockService.decrementLot(trx, {
            lotId: plan.lotId,
            medicamentId: plan.ligne.medicament_id as number,
            quantite: plan.quantite,
            ...mouvementBase,
          })
          const unitCost = plan.prixAchat ?? (medicament?.prix_achat as number | null | undefined) ?? 0
          coutBatch = Math.round(unitCost * plan.quantite)
        } else {
          const consumed = await this.stockService.consumeFifo(trx, {
            medicamentId: plan.ligne.medicament_id as number,
            quantite: plan.quantite,
            ...mouvementBase,
          })
          lotPrincipal = consumed[0]?.lotId
          const fallbackCost = (medicament?.prix_achat as number | null | undefined) ?? 0
          coutBatch = Math.round(
            consumed.reduce(
              (total, item) => total + (item.prixAchat ?? fallbackCost) * item.quantite,
              0,
            ),
          )
        }

        // Snapshot du prix de vente au premier service : un prix déjà figé
        // n'est jamais réécrit. Sinon on prend le prix catalogue, puis, en
        // dernier recours, le prix saisi pour cette délivrance.
        const prixFige = toPrixUnitaire(plan.ligne.prix_unitaire)
        const prixCatalogue = toPrixUnitaire(medicament?.prix_vente)
        const prixUnitaire = prixFige ?? prixCatalogue ?? toPrixUnitaire(plan.prixUnitaire)
        if (prixUnitaire == null && typeVente === 'facturee') {
          throw new Error(
            `Prix de vente manquant pour « ${plan.ligne.libelle} ». ` +
              'Renseignez un prix de vente au catalogue ou saisissez un prix unitaire pour cette délivrance.',
          )
        }
        // Une vente gratuite conserve la valeur catalogue sur la ligne (pour
        // valoriser le don) ; seul le `montant_total` de la délivrance est 0.
        const prixRetenu = prixUnitaire ?? 0
        const nouvelleQuantite = Number(plan.ligne.quantite_servie ?? 0) + plan.quantite

        await trx
          .updateTable('delivrance_lignes')
          .set({
            quantite_servie: nouvelleQuantite,
            lot_id: lotPrincipal,
            prix_unitaire: prixRetenu,
            montant: prixRetenu * nouvelleQuantite,
            cout_achat_total: Number(plan.ligne.cout_achat_total ?? 0) + coutBatch,
          })
          .where('id', '=', plan.ligne.id!)
          .execute()
      }

      const refreshed = await trx
        .selectFrom('delivrance_lignes')
        .selectAll()
        .where('delivrance_id', '=', delivrance.id!)
        .execute()
      const montantTotal = typeVente === 'gratuite'
        ? 0
        : refreshed.reduce((total, ligne) => total + Number(ligne.montant ?? 0), 0)

      let paiement: VentePharmaciePaiementDto | undefined
      if (params.paiement) {
        const montant = normalizeMontantPaiement(params.paiement.montant)
        // Le contrôle porte sur le RESTE dû (montant total courant - paiements
        // déjà saisis), pas sur le seul total : sans cela, une vente servie en
        // deux fois peut être encaissée au-delà de ce qui est facturé.
        await this.assertPaiementDansLeReste(trx, delivrance.id!, montant, montantTotal)
        paiement = await this.insertVentePaiement(trx, {
          delivranceId: delivrance.id!,
          montant,
          modePaiement: assertModePaiement(params.paiement.modePaiement),
          datePaiement: params.paiement.datePaiement
            ? assertDateString(params.paiement.datePaiement, 'Date de paiement')
            : todayIso(),
          reference: trimOrUndefined(params.paiement.reference),
          createdBy: userId,
        })
      }

      const significatives = refreshed.filter((l) => (l.quantite_demandee as number) > 0)
      const toutServi =
        significatives.length === 0 ||
        significatives.every(
          (l) => l.medicament_id != null && (l.quantite_servie as number) >= (l.quantite_demandee as number),
        )
      const statut = toutServi ? 'servie' : 'partielle'
      const now = nowIso()
      const updateResult = await trx
        .updateTable('delivrances')
        .set({
          ...(toutServi ? { statut, served_by: userId, served_at: now } : { statut }),
          ...(firstServe && plans.length > 0
            ? { date_vente: todayIso(), type_vente: typeVente }
            : {}),
          motif_gratuite: typeVente === 'gratuite' ? (motifGratuite ?? undefined) : undefined,
          montant_total: montantTotal,
        })
        .where('id', '=', delivrance.id!)
        .where('statut', 'in', ['a_servir', 'partielle'])
        .executeTakeFirst()
      if (Number(updateResult.numUpdatedRows) !== 1) throw new Error('Demande déjà traitée')

      const finalLignes = await trx
        .selectFrom('delivrance_lignes')
        .selectAll()
        .where('delivrance_id', '=', delivrance.id!)
        .orderBy('id', 'asc')
        .execute()
      const updatedDelivrance = await trx
        .selectFrom('delivrances')
        .selectAll()
        .where('id', '=', delivrance.id!)
        .executeTakeFirstOrThrow()

      const paiementsCumules = await trx
        .selectFrom('vente_pharmacie_paiement')
        .select((eb) => eb.fn.sum<number>('montant').as('total'))
        .where('delivrance_id', '=', delivrance.id!)
        .executeTakeFirst()
      const montantPaye = Number(paiementsCumules?.total ?? 0)

      entityEventBus.emitEntityChange({ entityType: 'delivrance', action: 'updated', id: delivrance.id!, entity: null, source: 'local', timestamp: Date.now() })
      if (paiement) {
        entityEventBus.emitEntityChange({ entityType: 'vente_pharmacie_paiement', action: 'created', id: paiement.id!, entity: paiement, source: 'local', timestamp: Date.now() })
      }
      const finalLignesDto = DelivranceLigneEntity.toDtos(finalLignes as unknown as DelivranceLigneEntity[])
      return {
        delivrance: this.attachFinancier(
          DelivranceEntity.toDto(updatedDelivrance as unknown as DelivranceEntity),
          finalLignesDto,
          montantPaye,
        ),
        lignes: finalLignesDto,
        ...(paiement ? { paiement } : {}),
      }
    })
  }

  // ─── Comptabilité pharmacie ───────────────────────────────────────

  /**
   * Vérifie qu'un paiement tient dans le RESTE dû sur une délivrance.
   *
   * Le reste est calculé sur le montant TOTAL courant de la vente (post-servi
   * pour `servir()`, montant enregistré pour `encaisser()`), diminué de la
   * somme des paiements déjà saisis. Comparer le paiement au seul total
   * autoriserait un encaissement « du double » sur une vente servie en deux
   * fois (ex. 500 puis 1 000 sur une vente de 1 000).
   *
   * @param montantTotal Montant total courant de la vente (>= 0).
   * @returns Le reste à payer avant ce paiement (>= 0).
   * @throws Si le montant est nul/négatif, si la vente est soldée ou si le
   *         paiement dépasse le reste.
   */
  private async assertPaiementDansLeReste(
    executor: DbExecutor,
    delivranceId: number,
    montant: number,
    montantTotal: number,
  ): Promise<number> {
    if (!Number.isFinite(montant) || montant <= 0) {
      throw new Error('Le montant doit être supérieur à zéro')
    }
    const paid = await executor
      .selectFrom('vente_pharmacie_paiement')
      .select((eb) => eb.fn.sum<number | null>('montant').as('total'))
      .where('delivrance_id', '=', delivranceId)
      .executeTakeFirst()
    const dejaPaye = Number(paid?.total ?? 0)
    const reste = Math.max(0, Number(montantTotal ?? 0) - dejaPaye)
    if (reste <= 0) throw new Error('Vente déjà entièrement payée')
    if (montant > reste) {
      throw new Error(`Montant supérieur au reste à payer (${reste})`)
    }
    return reste
  }

  private async nextNumeroRecuBase(executor: DbExecutor, datePaiement: string): Promise<number> {
    const day = datePaiement.replace(/-/g, '')
    const last = await executor
      .selectFrom('vente_pharmacie_paiement')
      .select('numero_recu')
      .where('numero_recu', 'like', `RP-${day}-%`)
      .orderBy('numero_recu', 'desc')
      .limit(1)
      .executeTakeFirst()
    const match = last?.numero_recu ? RECU_RE.exec(last.numero_recu) : null
    return match ? Number(match[2]) + 1 : 1
  }

  private async insertVentePaiement(
    executor: DbExecutor,
    params: {
      delivranceId: number
      montant: number
      modePaiement: ModePaiement
      datePaiement: string
      reference?: string
      createdBy?: number
    },
  ): Promise<VentePharmaciePaiementDto> {
    const day = params.datePaiement.replace(/-/g, '')
    const base = await this.nextNumeroRecuBase(executor, params.datePaiement)

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const sequence = base + attempt
      if (sequence > 9999) throw new Error('Impossible de générer un numéro de reçu unique')
      const numeroRecu = `RP-${day}-${String(sequence).padStart(4, '0')}`
      try {
        const inserted = await executor
          .insertInto('vente_pharmacie_paiement')
          .values({
            delivrance_id: params.delivranceId,
            montant: params.montant,
            mode_paiement: params.modePaiement,
            date_paiement: params.datePaiement,
            reference: params.reference,
            numero_recu: numeroRecu,
            created_by: params.createdBy,
          })
          .returningAll()
          .executeTakeFirstOrThrow()
        return VentePharmaciePaiementEntity.toDto(
          inserted as unknown as VentePharmaciePaiementEntity,
        )
      } catch (error) {
        // Collision de numéro de reçu (course concurrente) : on incrémente.
        if (!isUniqueViolation(error)) throw error
      }
    }
    throw new Error('Impossible de générer un numéro de reçu unique')
  }

  private buildVenteDto(
    row: DelivranceEntity,
    lignes: DelivranceLigneEntity[],
    paiements: VentePharmaciePaiementEntity[],
    patient: { id?: number; nom?: string | null; prenom?: string | null } | null,
  ): VentePharmacieDto {
    const montantTotal = Number(row.montant_total ?? 0)
    const montantPaye = paiements.reduce((total, paiement) => total + Number(paiement.montant ?? 0), 0)
    const typeVente = ((row.type_vente as DelivranceTypeVente | null) ?? 'facturee')
    const financier = computeDelivranceFinancier({
      typeVente,
      montantTotal,
      montantPaye,
      lignes,
    })
    // Le reste n'est plus borné à 0 : un encaissement excédentaire est une
    // ANOMALIE qui doit remonter, pas un simple reste nul.
    const reste = financier.reste
    const anomalie = reste < 0
      ? `Encaissement excédentaire : ${montantPaye} encaissés pour ${financier.montantTotal} facturés`
      : undefined
    return {
      id: row.id as number,
      dateVente: (row.date_vente as string | null) ?? undefined,
      typeVente,
      motifGratuite: (row.motif_gratuite as string | null) ?? undefined,
      statut: row.statut as DelivranceStatut,
      patient: patient
        ? { id: patient.id!, nom: patient.nom ?? undefined, prenom: patient.prenom ?? undefined }
        : null,
      lignes: DelivranceLigneEntity.toDtos(lignes),
      paiements: VentePharmaciePaiementEntity.toDtos(paiements),
      ...financier,
      ...(anomalie ? { anomalie } : {}),
    }
  }

  private async loadVente(executor: DbExecutor, delivranceId: number): Promise<VentePharmacieDto> {
    const row = await executor
      .selectFrom('delivrances')
      .selectAll()
      .where('id', '=', delivranceId)
      .executeTakeFirst()
    if (!row) throw new Error('Vente introuvable')
    const lignes = await executor
      .selectFrom('delivrance_lignes')
      .selectAll()
      .where('delivrance_id', '=', delivranceId)
      .orderBy('id', 'asc')
      .execute()
    const paiements = await executor
      .selectFrom('vente_pharmacie_paiement')
      .selectAll()
      .where('delivrance_id', '=', delivranceId)
      .orderBy('id', 'asc')
      .execute()
    const patient = row.patient_id != null
      ? await executor
        .selectFrom('patient')
        .select(['id', 'nom', 'prenom'])
        .where('id', '=', row.patient_id as number)
        .executeTakeFirst()
      : undefined
    return this.buildVenteDto(row, lignes, paiements, patient ?? null)
  }

  private assertVenteFiltres(filtres?: VentePharmacieFiltres): VentePharmacieFiltres {
    const dateDebut = filtres?.dateDebut
      ? assertDateString(filtres.dateDebut, 'Date de début')
      : undefined
    const dateFin = filtres?.dateFin
      ? assertDateString(filtres.dateFin, 'Date de fin')
      : undefined
    if (dateDebut && dateFin && dateDebut > dateFin) {
      throw new Error('La date de début doit précéder la date de fin')
    }
    if (filtres?.patientId != null) assertPositiveId(filtres.patientId, 'Patient')
    if (filtres?.statut != null) assertStatutFinancier(filtres.statut)
    return { dateDebut, dateFin, patientId: filtres?.patientId, statut: filtres?.statut }
  }

  async getVente(delivranceId: number): Promise<VentePharmacieDto> {
    return this.loadVente(this.db, assertPositiveId(delivranceId, 'Vente'))
  }

  /**
   * Données du reçu de service d'une vente pharmacie.
   *
   * Les lignes ne reprennent que les quantités réellement servies, aux prix
   * figés lors de la délivrance. Une vente gratuite est présentée comme
   * exonérée et son reste dû est nul.
   */
  async getRecuVente(delivranceId: number): Promise<RecuServiceDto> {
    const vente = await this.getVente(delivranceId)
    const date = vente.dateVente ?? new Date().toISOString().slice(0, 10)

    const lignes: RecuServiceLigneDto[] = vente.lignes
      .filter((ligne) => (ligne.quantiteServie ?? 0) > 0)
      .map((ligne) => ({
        label: ligne.libelle ?? 'Médicament',
        quantite: Number(ligne.quantiteServie ?? 0),
        prixUnitaire: Number(ligne.prixUnitaire ?? 0),
        montant: Number(ligne.montant ?? 0),
      }))

    const statuts: Record<StatutFinancierVente, RecuServiceStatutPaiement> = {
      payee: 'paye',
      partielle: 'partiel',
      credit: 'non_paye',
      sans_montant: 'non_paye',
      gratuite: 'exonere',
    }

    const patientNom = vente.patient?.nom ?? ''
    const patientPrenom = vente.patient?.prenom ?? ''
    let patientNip: string | null = null
    let patientTelephone: string | null = null
    if (vente.patient?.id != null) {
      const patient = await this.db
        .selectFrom('patient')
        .select(['nip', 'telephone'])
        .where('id', '=', vente.patient.id)
        .executeTakeFirst()
      patientNip = patient?.nip ?? null
      patientTelephone = patient?.telephone ?? null
    }

    const dernierPaiement = [...vente.paiements].reverse().find((paiement) => paiement.createdBy != null)
    let caissier: string | null = null
    if (dernierPaiement?.createdBy != null) {
      const user = await this.db
        .selectFrom('user')
        .select(['nom', 'prenom'])
        .where('id', '=', dernierPaiement.createdBy)
        .executeTakeFirst()
      if (user) caissier = `${user.prenom ?? ''} ${(user.nom ?? '').toUpperCase()}`.trim() || null
    }

    const exonere = vente.typeVente === 'gratuite'
    return {
      ref: `PH-${date.replace(/-/g, '')}-${String(delivranceId).padStart(4, '0')}`,
      date,
      service: 'pharmacie',
      patientNom,
      patientPrenom,
      patientNip,
      patientTelephone,
      prescripteur: null,
      statut: vente.typeVente === 'gratuite' ? 'Vente gratuite' : 'Servie',
      statutPaiement: statuts[vente.statutFinancier] ?? 'non_paye',
      lignes,
      paiements: vente.paiements.map((paiement) => ({
        date: paiement.datePaiement ?? '',
        montant: Number(paiement.montant ?? 0),
        mode: paiement.modePaiement ?? 'espece',
        reference: paiement.reference ?? null,
        numeroRecu: paiement.numeroRecu ?? null,
      })),
      montantTotal: Number(vente.montantTotal ?? 0),
      montantPaye: Number(vente.montantPaye ?? 0),
      reste: exonere ? 0 : Math.max(0, Number(vente.reste ?? 0)),
      caissier,
    }
  }

  async encaisser(dto: EncaisserVenteDto): Promise<VentePharmacieDto> {
    const delivranceId = assertPositiveId(dto?.delivranceId, 'Vente')
    const montant = normalizeMontantPaiement(dto?.montant)
    const modePaiement = assertModePaiement(dto?.modePaiement)
    const datePaiement = dto.datePaiement
      ? assertDateString(dto.datePaiement, 'Date de paiement')
      : todayIso()
    const reference = trimOrUndefined(dto.reference)
    const createdBy = toUserId(dto.createdBy)

    return this.db.transaction().execute(async (trx) => {
      const vente = await trx
        .selectFrom('delivrances')
        .selectAll()
        .where('id', '=', delivranceId)
        .executeTakeFirst()
      if (!vente) throw new Error('Vente introuvable')
      if (vente.statut === 'annulee') throw new Error('Vente annulée')
      if (vente.date_vente == null) throw new Error('Vente non encore réalisée')
      if ((vente.type_vente ?? 'facturee') !== 'facturee') {
        throw new Error('Encaissement impossible pour une vente gratuite')
      }

      const montantTotal = Number(vente.montant_total ?? 0)
      // Même garde-fou que `servir()` : le montant est comparé au RESTE dû.
      await this.assertPaiementDansLeReste(trx, delivranceId, montant, montantTotal)

      const paiement = await this.insertVentePaiement(trx, {
        delivranceId,
        montant,
        modePaiement,
        datePaiement,
        reference,
        createdBy,
      })
      entityEventBus.emitEntityChange({
        entityType: 'vente_pharmacie_paiement',
        action: 'created',
        id: paiement.id!,
        entity: paiement,
        source: 'local',
        timestamp: Date.now(),
      })
      return this.loadVente(trx, delivranceId)
    })
  }

  /**
   * Ventes de la PÉRIODE (bornée par `dateDebut`/`dateFin`) : rapport des
   * ventes. Les filtres `statut`/`patientId` s'appliquent après chargement.
   */
  async listVentes(filtres?: VentePharmacieFiltres): Promise<VentePharmacieDto[]> {
    const f = this.assertVenteFiltres(filtres)
    return this.loadVentes({ ...f, scope: 'periode' })
  }

  /**
   * Charge les ventes selon un périmètre :
   *  - `periode` : `date_vente` comprise entre `dateDebut` et `dateFin` ;
   *  - `as_of`   : toutes les ventes datées au plus tard à `dateFin`
   *                (aucune borne basse). C'est le périmètre des CRÉANCES :
   *                une vente de janvier reste due en février tant qu'elle
   *                n'a pas été encaissée.
   */
  private async loadVentes(
    f: VentePharmacieFiltres & { scope: 'periode' | 'as_of' },
  ): Promise<VentePharmacieDto[]> {
    let query = this.db
      .selectFrom('delivrances')
      .selectAll()
      .where('date_vente', 'is not', null)
      .where('statut', '!=', 'annulee')
    if (f.scope === 'periode' && f.dateDebut) {
      query = query.where('date_vente', '>=', f.dateDebut)
    }
    if (f.dateFin) query = query.where('date_vente', '<=', f.dateFin)
    if (f.patientId != null) query = query.where('patient_id', '=', f.patientId)
    const rows = await query.orderBy('date_vente', 'desc').orderBy('id', 'desc').execute()
    if (rows.length === 0) return []

    const ids = rows.map((row) => row.id as number)
    const lignes = await this.db
      .selectFrom('delivrance_lignes')
      .selectAll()
      .where('delivrance_id', 'in', ids)
      .orderBy('id', 'asc')
      .execute()
    const paiements = await this.db
      .selectFrom('vente_pharmacie_paiement')
      .selectAll()
      .where('delivrance_id', 'in', ids)
      .orderBy('id', 'asc')
      .execute()
    const patientIds = [...new Set(rows.map((row) => row.patient_id as number).filter((id) => id != null))]
    const patients = patientIds.length > 0
      ? await this.db
        .selectFrom('patient')
        .select(['id', 'nom', 'prenom'])
        .where('id', 'in', patientIds)
        .execute()
      : []
    const patientById = new Map(patients.map((p) => [p.id as number, p]))
    const lignesByVente = new Map<number, typeof lignes>()
    for (const ligne of lignes) {
      const list = lignesByVente.get(ligne.delivrance_id as number) ?? []
      list.push(ligne)
      lignesByVente.set(ligne.delivrance_id as number, list)
    }
    const paiementsByVente = new Map<number, typeof paiements>()
    for (const paiement of paiements) {
      const list = paiementsByVente.get(paiement.delivrance_id as number) ?? []
      list.push(paiement)
      paiementsByVente.set(paiement.delivrance_id as number, list)
    }

    const ventes = rows.map((row) => {
      const patient = row.patient_id != null ? patientById.get(row.patient_id as number) : undefined
      return this.buildVenteDto(
        row,
        lignesByVente.get(row.id as number) ?? [],
        paiementsByVente.get(row.id as number) ?? [],
        patient ?? null,
      )
    })
    return f.statut ? ventes.filter((vente) => vente.statutFinancier === f.statut) : ventes
  }

  /**
   * Créances par patient, périmètre « as of `dateFin` » : toutes les ventes
   * facturées datées au plus tard à `dateFin` et encore impayées, quelle que
   * soit leur date de vente. Le tableau des créances et la carte de la
   * synthèse utilisent donc EXACTEMENT le même périmètre.
   */
  async getVentesCredit(filtres?: VentePharmacieFiltres): Promise<VenteCreditPatientDto[]> {
    const f = this.assertVenteFiltres(filtres)
    const dateReference = f.dateFin ?? todayIso()
    const ventes = await this.loadVentes({
      ...f,
      statut: undefined,
      scope: 'as_of',
    })
    const grouped = new Map<number | null, VenteCreditPatientDto>()

    for (const vente of ventes) {
      if (vente.typeVente !== 'facturee' || vente.reste <= 0) continue
      const key = vente.patient?.id ?? null
      const current = grouped.get(key) ?? {
        patientId: key,
        patientNom: vente.patient?.nom ?? 'Patient inconnu',
        patientPrenom: vente.patient?.prenom,
        nbVentes: 0,
        montantTotal: 0,
        montantPaye: 0,
        reste: 0,
        datePremiereVente: vente.dateVente,
        dateDerniereVente: vente.dateVente,
        dateReference,
      }
      current.nbVentes += 1
      current.montantTotal += vente.montantTotal
      current.montantPaye += vente.montantPaye
      current.reste += vente.reste
      if (vente.dateVente && (!current.datePremiereVente || vente.dateVente < current.datePremiereVente)) {
        current.datePremiereVente = vente.dateVente
      }
      if (vente.dateVente && (!current.dateDerniereVente || vente.dateVente > current.dateDerniereVente)) {
        current.dateDerniereVente = vente.dateVente
      }
      grouped.set(key, current)
    }

    return [...grouped.values()].sort((a, b) => b.reste - a.reste)
  }

  async getSynthesePharmacie(filtres?: {
    dateDebut?: string
    dateFin?: string
  }): Promise<SynthesePharmacieDto> {
    const dateDebut = filtres?.dateDebut
      ? assertDateString(filtres.dateDebut, 'Date de début')
      : undefined
    const dateFin = filtres?.dateFin
      ? assertDateString(filtres.dateFin, 'Date de fin')
      : undefined
    if (dateDebut && dateFin && dateDebut > dateFin) {
      throw new Error('La date de début doit précéder la date de fin')
    }

    const venteDebut = dateDebut ? sql`AND d.date_vente >= ${dateDebut}` : sql``
    const venteFin = dateFin ? sql`AND d.date_vente <= ${dateFin}` : sql``
    const venteDebutSansAlias = dateDebut ? sql`AND date_vente >= ${dateDebut}` : sql``
    const venteFinSansAlias = dateFin ? sql`AND date_vente <= ${dateFin}` : sql``
    const paiementDebut = dateDebut ? sql`AND date_paiement >= ${dateDebut}` : sql``
    const paiementFin = dateFin ? sql`AND date_paiement <= ${dateFin}` : sql``
    const depenseDebut = dateDebut ? sql`AND date >= ${dateDebut}` : sql``
    const depenseFin = dateFin ? sql`AND date <= ${dateFin}` : sql``
    const creancesFin = dateFin ?? '9999-12-31'

    const sales = await sql<{
      caFacture: number
      gratuiteCount: number
    }>`
      SELECT
        coalesce(sum(CASE WHEN type_vente = 'facturee' THEN montant_total ELSE 0 END), 0) AS caFacture,
        coalesce(sum(CASE WHEN type_vente = 'gratuite' THEN 1 ELSE 0 END), 0) AS gratuiteCount
      FROM delivrances
      WHERE date_vente IS NOT NULL
        AND statut != 'annulee'
      ${venteDebutSansAlias}
      ${venteFinSansAlias}
    `.execute(this.db)

    const lines = await sql<{
      coutTotal: number
      coutFacture: number
      gratuiteValeur: number
      gratuiteCout: number
    }>`
      SELECT
        coalesce(sum(l.cout_achat_total), 0) AS coutTotal,
        coalesce(sum(CASE WHEN d.type_vente = 'facturee' THEN l.cout_achat_total ELSE 0 END), 0) AS coutFacture,
        coalesce(sum(CASE WHEN d.type_vente = 'gratuite' THEN l.montant ELSE 0 END), 0) AS gratuiteValeur,
        coalesce(sum(CASE WHEN d.type_vente = 'gratuite' THEN l.cout_achat_total ELSE 0 END), 0) AS gratuiteCout
      FROM delivrance_lignes l
      INNER JOIN delivrances d ON d.id = l.delivrance_id
      WHERE d.date_vente IS NOT NULL
        AND d.statut != 'annulee'
        AND l.quantite_servie > 0
      ${venteDebut}
      ${venteFin}
    `.execute(this.db)

    const encaissements = await sql<{ encaisse: number }>`
      SELECT coalesce(sum(montant), 0) AS encaisse
      FROM vente_pharmacie_paiement
      WHERE 1 = 1
      ${paiementDebut}
      ${paiementFin}
    `.execute(this.db)

    const creances = await sql<{ creances: number }>`
      SELECT coalesce(sum(
        CASE
          WHEN d.montant_total - coalesce(p.paye, 0) > 0
            THEN d.montant_total - coalesce(p.paye, 0)
          ELSE 0
        END
      ), 0) AS creances
      FROM delivrances d
      LEFT JOIN (
        SELECT delivrance_id, sum(montant) AS paye
        FROM vente_pharmacie_paiement
        GROUP BY delivrance_id
      ) p ON p.delivrance_id = d.id
      WHERE d.type_vente = 'facturee'
        AND d.statut != 'annulee'
        AND d.date_vente IS NOT NULL
        AND d.date_vente <= ${creancesFin}
    `.execute(this.db)

    const achats = await sql<{
      achats: number
      achatsPayes: number
      achatsCredit: number
    }>`
      SELECT
        coalesce(sum(montant), 0) AS achats,
        coalesce(sum(CASE WHEN statut_paiement = 'payee' THEN montant ELSE 0 END), 0) AS achatsPayes,
        coalesce(sum(CASE WHEN statut_paiement = 'credit' THEN montant ELSE 0 END), 0) AS achatsCredit
      FROM depense
      WHERE source = 'stock_entree'
      ${depenseDebut}
      ${depenseFin}
    `.execute(this.db)

    // ─── M7 : top produits / motifs, calculés EN SQL côté serveur ──────
    // Le renderer ne doit plus recalculer ces agrégats (il le faisait avec
    // une clé de regroupement différente, ce qui rendait les deux versions
    // divergentes selon laquelle était chargée en dernier).
    //
    // Clé de regroupement UNIFIQUE : `medicament_id` quand il existe, sinon
    // le libellé de la ligne (lignes non mappées au catalogue).
    // `topCA` et `topQuantite` portent sur la MÊME population : ventes
    // FACTURÉES uniquement (une gratuité n'est pas un chiffre d'affaires).
    const topCA = await sql<SynthesePharmacieTopProduitDto>`
      SELECT
        max(l.medicament_id) AS medicamentId,
        max(l.libelle) AS libelle,
        sum(l.quantite_servie) AS quantite,
        sum(l.montant) AS ca,
        sum(l.cout_achat_total) AS cout
      FROM delivrance_lignes l
      INNER JOIN delivrances d ON d.id = l.delivrance_id
      WHERE d.date_vente IS NOT NULL
        AND d.statut != 'annulee'
        AND d.type_vente = 'facturee'
        AND l.quantite_servie > 0
      ${venteDebut}
      ${venteFin}
      GROUP BY CASE
        WHEN l.medicament_id IS NOT NULL THEN 'M:' || CAST(l.medicament_id AS TEXT)
        ELSE 'L:' || COALESCE(l.libelle, '')
      END
      ORDER BY ca DESC
      LIMIT 10
    `.execute(this.db)

    const topQuantite = await sql<SynthesePharmacieTopProduitDto>`
      SELECT
        max(l.medicament_id) AS medicamentId,
        max(l.libelle) AS libelle,
        sum(l.quantite_servie) AS quantite,
        sum(l.montant) AS ca,
        sum(l.cout_achat_total) AS cout
      FROM delivrance_lignes l
      INNER JOIN delivrances d ON d.id = l.delivrance_id
      WHERE d.date_vente IS NOT NULL
        AND d.statut != 'annulee'
        AND d.type_vente = 'facturee'
        AND l.quantite_servie > 0
      ${venteDebut}
      ${venteFin}
      GROUP BY CASE
        WHEN l.medicament_id IS NOT NULL THEN 'M:' || CAST(l.medicament_id AS TEXT)
        ELSE 'L:' || COALESCE(l.libelle, '')
      END
      ORDER BY quantite DESC
      LIMIT 10
    `.execute(this.db)

    const topMotifs = await sql<SynthesePharmacieTopMotifDto>`
      SELECT
        d.motif_gratuite AS motif,
        count(DISTINCT d.id) AS count,
        coalesce(sum(l.montant), 0) AS valeur,
        coalesce(sum(l.cout_achat_total), 0) AS cout
      FROM delivrances d
      LEFT JOIN delivrance_lignes l
        ON l.delivrance_id = d.id
        AND l.quantite_servie > 0
      WHERE d.type_vente = 'gratuite'
        AND d.statut != 'annulee'
        AND d.date_vente IS NOT NULL
        AND d.motif_gratuite IS NOT NULL
        AND d.motif_gratuite <> ''
      ${venteDebut}
      ${venteFin}
      GROUP BY d.motif_gratuite
      ORDER BY count DESC, valeur DESC
      LIMIT 10
    `.execute(this.db)

    const creancesParPatient = await sql<SynthesePharmacieCreancePatientDto>`
      SELECT
        d.patient_id AS patientId,
        max(p.nom) AS patientNom,
        max(p.prenom) AS patientPrenom,
        sum(d.montant_total) AS montantTotal,
        coalesce(sum(pay.paye), 0) AS montantPaye,
        sum(
          CASE
            WHEN d.montant_total - coalesce(pay.paye, 0) > 0
              THEN d.montant_total - coalesce(pay.paye, 0)
            ELSE 0
          END
        ) AS reste
      FROM delivrances d
      LEFT JOIN patient p ON p.id = d.patient_id
      LEFT JOIN (
        SELECT delivrance_id, sum(montant) AS paye
        FROM vente_pharmacie_paiement
        GROUP BY delivrance_id
      ) pay ON pay.delivrance_id = d.id
      WHERE d.type_vente = 'facturee'
        AND d.statut != 'annulee'
        AND d.date_vente IS NOT NULL
        AND d.date_vente <= ${creancesFin}
      GROUP BY d.patient_id
      HAVING reste > 0
      ORDER BY reste DESC
      LIMIT 10
    `.execute(this.db)

    const caFacture = Number(sales.rows[0]?.caFacture ?? 0)
    const gratuiteCount = Number(sales.rows[0]?.gratuiteCount ?? 0)
    const coutTotal = Number(lines.rows[0]?.coutTotal ?? 0)
    const coutFacture = Number(lines.rows[0]?.coutFacture ?? 0)

    return {
      dateDebut,
      dateFin,
      caFacture,
      encaisse: Number(encaissements.rows[0]?.encaisse ?? 0),
      creances: Number(creances.rows[0]?.creances ?? 0),
      gratuiteCount,
      gratuiteValeur: Number(lines.rows[0]?.gratuiteValeur ?? 0),
      gratuiteCout: Number(lines.rows[0]?.gratuiteCout ?? 0),
      coutTotal,
      coutFacture,
      margeBrute: caFacture - coutFacture,
      margeNette: caFacture - coutTotal,
      achats: Number(achats.rows[0]?.achats ?? 0),
      achatsPayes: Number(achats.rows[0]?.achatsPayes ?? 0),
      achatsCredit: Number(achats.rows[0]?.achatsCredit ?? 0),
      topMedicamentsCA: topCA.rows.map((row) => {
        const ca = Number(row.ca ?? 0)
        const cout = Number(row.cout ?? 0)
        return {
          medicamentId: row.medicamentId ?? null,
          libelle: String(row.libelle ?? ''),
          quantite: Number(row.quantite ?? 0),
          ca,
          cout,
          marge: ca - cout,
        }
      }),
      topMedicamentsQuantite: topQuantite.rows.map((row) => {
        const ca = Number(row.ca ?? 0)
        const cout = Number(row.cout ?? 0)
        return {
          medicamentId: row.medicamentId ?? null,
          libelle: String(row.libelle ?? ''),
          quantite: Number(row.quantite ?? 0),
          ca,
          cout,
          marge: ca - cout,
        }
      }),
      topMotifsGratuits: topMotifs.rows.map((row) => ({
        motif: String(row.motif ?? ''),
        count: Number(row.count ?? 0),
        valeur: Number(row.valeur ?? 0),
        cout: Number(row.cout ?? 0),
      })),
      creancesParPatient: creancesParPatient.rows.map((row) => ({
        patientId: row.patientId ?? null,
        patientNom: String(row.patientNom ?? 'Patient inconnu'),
        patientPrenom: row.patientPrenom ?? undefined,
        montantTotal: Number(row.montantTotal ?? 0),
        montantPaye: Number(row.montantPaye ?? 0),
        reste: Number(row.reste ?? 0),
      })),
    }
  }

  async annuler(params: { delivranceId: number; motif: string }): Promise<DelivranceDto> {
    if (!params.motif?.trim()) throw new Error('Motif d\u2019annulation requis')
    const delivrance = await this.db
      .selectFrom('delivrances')
      .selectAll()
      .where('id', '=', params.delivranceId)
      .executeTakeFirst()
    if (!delivrance) throw new Error('Demande introuvable')
    if (delivrance.statut === 'servie') throw new Error('Demande déjà servie : annulation impossible')
    if (delivrance.statut === 'partielle') {
      const served = await this.db
        .selectFrom('delivrance_lignes')
        .select((eb) => eb.fn.sum<number | null>('quantite_servie').as('total'))
        .where('delivrance_id', '=', params.delivranceId)
        .executeTakeFirst()
      if (Number(served?.total ?? 0) > 0) {
        throw new Error('Stock déjà sorti : aucune restitution automatique, annulation impossible')
      }
    }
    if (delivrance.statut === 'annulee') return DelivranceEntity.toDto(delivrance as unknown as DelivranceEntity)
    await this.db
      .updateTable('delivrances')
      .set({ statut: 'annulee', motif: params.motif.trim() })
      .where('id', '=', params.delivranceId)
      .execute()
    const updated = await this.db
      .selectFrom('delivrances')
      .selectAll()
      .where('id', '=', params.delivranceId)
      .executeTakeFirstOrThrow()
    entityEventBus.emitEntityChange({ entityType: 'delivrance', action: 'updated', id: params.delivranceId, entity: null, source: 'local', timestamp: Date.now() })
    return DelivranceEntity.toDto(updated as unknown as DelivranceEntity)
  }

  async reouvrir(params: { delivranceId: number; motif: string }): Promise<DelivranceDto> {
    if (!params.motif?.trim()) throw new Error('Motif de réouverture requis')
    const delivrance = await this.db
      .selectFrom('delivrances')
      .selectAll()
      .where('id', '=', params.delivranceId)
      .executeTakeFirst()
    if (!delivrance) throw new Error('Demande introuvable')
    if (delivrance.statut !== 'annulee') throw new Error('Seule une demande annulée peut être rouverte')
    await this.db
      .updateTable('delivrances')
      .set({ statut: 'a_servir', motif: params.motif.trim() })
      .where('id', '=', params.delivranceId)
      .execute()
    const updated = await this.db
      .selectFrom('delivrances')
      .selectAll()
      .where('id', '=', params.delivranceId)
      .executeTakeFirstOrThrow()
    entityEventBus.emitEntityChange({ entityType: 'delivrance', action: 'updated', id: params.delivranceId, entity: null, source: 'local', timestamp: Date.now() })
    return DelivranceEntity.toDto(updated as unknown as DelivranceEntity)
  }

  async orphelines(): Promise<OrdonnanceOrpheline[]> {
    const docs = await this.db
      .selectFrom('patient_clinical_documents')
      .innerJoin('encounters', 'encounters.id', 'patient_clinical_documents.contact_id')
      .select([
        'patient_clinical_documents.id as documentId',
        'patient_clinical_documents.form_data as formData',
        'patient_clinical_documents.signed_at as signedAt',
        'encounters.patient_id as patientId',
      ])
      .where('patient_clinical_documents.document_type_id', '=', ORDONNANCE_LIBRE_ID)
      .where('patient_clinical_documents.status', '=', 'signed')
      .execute()
    const candidates: Array<{ documentId: string; patientId: number; nbLignes: number; signedAt?: string }> = []
    for (const doc of docs) {
      let nbLignes = 0
      try {
        const fd = doc.formData ? JSON.parse(doc.formData as string) : null
        nbLignes = extractMedicamentLines(fd).length
      } catch {
        continue
      }
      if (nbLignes > 0) {
        candidates.push({
          documentId: doc.documentId as string,
          patientId: doc.patientId as number,
          nbLignes,
          signedAt: (doc.signedAt as string | null) ?? undefined,
        })
      }
    }
    if (candidates.length === 0) return []
    const existing = await this.db
      .selectFrom('delivrances')
      .select('source_document_id')
      .where('source', '=', 'ordonnance_libre')
      .where('source_document_id', 'in', candidates.map((c) => c.documentId))
      .execute()
    const existingIds = new Set(existing.map((e) => e.source_document_id as string))
    const orphans = candidates.filter((c) => !existingIds.has(c.documentId))
    if (orphans.length === 0) return []
    const patientIds = [...new Set(orphans.map((o) => o.patientId))]
    const patients = await this.db
      .selectFrom('patient')
      .select(['id', 'nom', 'prenom'])
      .where('id', 'in', patientIds)
      .execute()
    const patientById = new Map(patients.map((p) => [p.id as number, p]))
    return orphans.map((o) => {
      const patient = patientById.get(o.patientId)
      return {
        documentId: o.documentId,
        patient: patient
          ? { id: patient.id as number, nom: (patient.nom as string | null) ?? undefined, prenom: (patient.prenom as string | null) ?? undefined }
          : null,
        nbLignes: o.nbLignes,
        signedAt: o.signedAt,
      }
    })
  }

  async lignesNonMappees(filters?: { statut?: DelivranceStatut }): Promise<LigneNonMappee[]> {
    let query = this.db
      .selectFrom('delivrance_lignes')
      .innerJoin('delivrances', 'delivrances.id', 'delivrance_lignes.delivrance_id')
      .selectAll('delivrance_lignes')
      .select([
        'delivrances.statut as statut',
        'delivrances.patient_id as patientId',
        'delivrances.source_document_id as sourceDocumentId',
      ])
      .where('delivrance_lignes.medicament_id', 'is', null)
    if (filters?.statut != null) {
      if (!DELIVRANCE_STATUTS.includes(filters.statut)) throw new Error('statut invalide')
      query = query.where('delivrances.statut', '=', filters.statut)
    }
    const rows = await query
      .orderBy('delivrance_lignes.created_at', 'desc')
      .orderBy('delivrance_lignes.id', 'desc')
      .execute()
    if (rows.length === 0) return []
    const patientIds = [...new Set(rows.map((r) => r.patientId as number).filter((id) => id != null))]
    const patients = patientIds.length > 0
      ? await this.db.selectFrom('patient').select(['id', 'nom']).where('id', 'in', patientIds).execute()
      : []
    const patientById = new Map(patients.map((p) => [p.id as number, p]))
    return rows.map((r) => {
      const { statut, patientId, sourceDocumentId, ...ligne } = r
      const patient = patientById.get(patientId as number)
      return {
        ligne: DelivranceLigneEntity.toDto(ligne as unknown as DelivranceLigneEntity),
        delivranceId: ligne.delivrance_id as number,
        statut: statut as string,
        patient: patient ? { id: patient.id as number, nom: (patient.nom as string | null) ?? undefined } : null,
        sourceDocumentId: (sourceDocumentId as string | null) ?? undefined,
      }
    })
  }

  async mapLigne(params: { ligneId: number; medicamentId: number }): Promise<DelivranceLigneDto> {
    const ligne = await this.db
      .selectFrom('delivrance_lignes')
      .selectAll()
      .where('id', '=', params.ligneId)
      .executeTakeFirst()
    if (!ligne) throw new Error('Ligne introuvable')
    const medicament = await this.medicamentService.getById(params.medicamentId)
    if (!medicament) throw new Error('Médicament introuvable')
    if (medicament.actif !== 1) throw new Error('Médicament inactif : réactivez-le avant de mapper la ligne')
    const updated = await this.db.transaction().execute(async (trx) =>
      trx
        .updateTable('delivrance_lignes')
        .set({ medicament_id: medicament.id! })
        .where('id', '=', params.ligneId)
        .returningAll()
        .executeTakeFirstOrThrow(),
    )
    entityEventBus.emitEntityChange({ entityType: 'delivrance_ligne', action: 'updated', id: params.ligneId, entity: null, source: 'local', timestamp: Date.now() })
    return DelivranceLigneEntity.toDto(updated as unknown as DelivranceLigneEntity)
  }
}
