import { inject, singleton } from 'tsyringe'
import { type Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { ClinicalDocumentService } from './clinical-document.service'

export const ORDONNANCE_LIBRE_ID = '22222222-2222-4222-2222-222222222222'

/** Allowlist des catégories d'ordonnance libre (source unique, partagée handler + service). */
export const ORDONNANCE_LIBRE_CATEGORIES = ['medicament', 'soins', 'examen', 'avis'] as const
export type OrdonnanceLibreCategorie = (typeof ORDONNANCE_LIBRE_CATEGORIES)[number]

/**
 * Validation partagée de l'entrée `create-from-group` (handler IPC + service).
 * Garantit à la couche appelante que `items` est un tableau non vide et que
 * `categorie` appartient à l'allowlist.
 */
export function validateCreateFromGroup(params: {
  items: unknown
  categorie: unknown
}): asserts params is { items: any[]; categorie: OrdonnanceLibreCategorie } {
  if (!Array.isArray(params.items) || params.items.length === 0) {
    throw new Error('items doit être un tableau non vide')
  }
  if (!ORDONNANCE_LIBRE_CATEGORIES.includes(params.categorie as OrdonnanceLibreCategorie)) {
    throw new Error('categorie invalide')
  }
}

export interface CreateFromGroupParams {
  patientId: number
  contactId: string
  serviceId?: string | null
  siteId?: number | null
  createdBy: string
  title: string
  sourceDocumentId: string
  categorie: OrdonnanceLibreCategorie
  items: any[]
}

export interface CreateFromGroupResult {
  documentId: string
  replaced: boolean
}

/**
 * Item brut sérialisé dans `patient_clinical_documents.form_data`.
 *
 * Le JSON n'est pas validé à la lecture : tous les champs sont optionnels.
 */
export interface OrdonnanceFormItem {
  categorie?: string
  medicament?: string
  quantite?: number | string
  frequence?: string[] | string
  duree?: number
  renouvellement?: boolean
  nbRenouvellements?: number
}

/**
 * Extrait les lignes d'une ordonnance depuis son `form_data` déchiffré.
 *
 * Trois formats coexistent :
 * - `items` : ordonnances générées depuis un groupe CRH/CRC ;
 * - `ordonnanceSortie` : ordonnances libres éditées dans l'onglet Sortie ;
 * - `inlinePrescriptions` : ancien format (documents historiques).
 *
 * @param formData - Objet `form_data` déjà parsé (jamais une chaîne JSON).
 * @returns Les items trouvés, ou un tableau vide si le format est inconnu.
 */
export function extractOrdonnanceItems(formData: unknown): OrdonnanceFormItem[] {
  if (!formData || typeof formData !== 'object' || Array.isArray(formData)) return []
  const fd = formData as Record<string, unknown>
  if (Array.isArray(fd.items)) return fd.items as OrdonnanceFormItem[]
  if (Array.isArray(fd.ordonnanceSortie)) return fd.ordonnanceSortie as OrdonnanceFormItem[]
  if (Array.isArray(fd.inlinePrescriptions)) return fd.inlinePrescriptions as OrdonnanceFormItem[]
  return []
}

/**
 * Lignes réellement transférables à la pharmacie : catégorie « médicament »
 * (défaut) et libellé médicament non vide.
 *
 * Source unique partagée par le transfert (`DispensationService`) et les
 * drapeaux de lecture (`OrdonnanceLibreService`) : l'UI et le backend ne
 * peuvent pas diverger sur l'éligibilité d'une ordonnance.
 *
 * @param formData - Objet `form_data` déjà parsé.
 * @returns Les items médicament transférables.
 */
export function extractMedicamentLines(formData: unknown): OrdonnanceFormItem[] {
  return extractOrdonnanceItems(formData).filter((item) => {
    const categorie = item.categorie ?? 'medicament'
    const medicament = typeof item.medicament === 'string' ? item.medicament.trim() : ''
    return categorie === 'medicament' && medicament !== ''
  })
}

/**
 * Indique si une ordonnance possède au moins une ligne médicament transférable.
 *
 * @param formData - Objet `form_data` déjà parsé.
 * @returns `true` si le transfert pharmacie peut créer des lignes.
 */
export function hasMedicamentLines(formData: unknown): boolean {
  return extractMedicamentLines(formData).length > 0
}

export interface OrdonnanceLibreRecord {
  id: string
  contact_id: string
  document_type_id: string
  title: string | null
  status: string
  form_data: string | null
  source: string | null
  created_at: string | null
  updated_at: string | null
  /** Au moins une ligne médicament transférable (calculé dans `listByPatient` et `getById`). */
  hasMedicamentLines?: boolean
  /** Une délivrance pharmacie existe déjà pour ce document (calculé dans `listByPatient` et `getById`). */
  dejaTransferee?: boolean
}

@singleton()
export class OrdonnanceLibreService {
  public db: Kysely<DB>

  constructor(
    @inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource,
    @inject(ClinicalDocumentService) private clinicalDocumentService: ClinicalDocumentService,
  ) {
    this.db = datasource.getInstance()
  }

  /**
   * Create (or replace) an ordonnance libre document from a CRH/CRC group of items.
   * If an existing ordonnance libre matches the (source=crh, sourceDocumentId, categorie)
   * fingerprint, its form_data is updated in place. Otherwise a new draft ORDONNANCE_LIBRE
   * document is created. The document always stays draft — the stay is NOT closed.
   */
  async createOrReplaceFromGroup(params: CreateFromGroupParams): Promise<CreateFromGroupResult> {
    validateCreateFromGroup(params)
    const documents = await this.listByPatient(params.patientId)
    const target = documents.find((doc: any) => {
      const fd = this.safeParseFormData(doc.form_data)
      return fd != null
        && typeof fd === 'object'
        && !Array.isArray(fd)
        && fd.source === 'crh'
        && String(fd.sourceDocumentId) === String(params.sourceDocumentId)
        && fd.categorie === params.categorie
        && Number(doc.patient_id) === Number(params.patientId)
    })

    const formData = {
      title: params.title,
      source: 'crh',
      sourceDocumentId: params.sourceDocumentId,
      categorie: params.categorie,
      items: params.items,
    }

    if (target) {
      console.warn('[ordonnance-libre] replace matched', {
        patientId: params.patientId,
        sourceDocumentId: params.sourceDocumentId,
        categorie: params.categorie,
      })
      await this.clinicalDocumentService.updateDocumentData(target.id, formData)
      return { documentId: target.id, replaced: true }
    }

    const created = await this.clinicalDocumentService.createDocument({
      contactId: params.contactId,
      serviceId: params.serviceId ?? null,
      siteId: params.siteId ?? null,
      documentTypeId: ORDONNANCE_LIBRE_ID,
      createdBy: params.createdBy,
      title: params.title,
    })
    if (!created.id) throw new Error('Échec de la création de l\'ordonnance libre')
    await this.clinicalDocumentService.updateDocumentData(created.id, formData)
    return { documentId: created.id, replaced: false }
  }

  private safeParseFormData(formData: string | null): Record<string, any> | null {
    if (!formData) return null
    try {
      return JSON.parse(formData)
    } catch {
      return null
    }
  }

  async listByPatient(patientId: number): Promise<any[]> {
    const rows = await this.db
      .selectFrom('patient_clinical_documents')
      .innerJoin('clinical_document_types', 'clinical_document_types.id', 'patient_clinical_documents.document_type_id')
      .innerJoin('encounters', 'encounters.id', 'patient_clinical_documents.contact_id')
      .leftJoin('user', 'user.id', 'encounters.medecin_id')
      .select([
        'patient_clinical_documents.id',
        'patient_clinical_documents.contact_id',
        'patient_clinical_documents.document_type_id',
        'patient_clinical_documents.title',
        'patient_clinical_documents.status',
        'patient_clinical_documents.form_data',
        'patient_clinical_documents.created_at',
        'patient_clinical_documents.updated_at',
        'encounters.patient_id',
        'clinical_document_types.code as document_type_code',
        'user.nom as medecin_nom',
        'user.prenom as medecin_prenom',
      ])
      .where('clinical_document_types.code', '=', 'ORDONNANCE_LIBRE')
      .where('encounters.patient_id', '=', patientId)
      .orderBy('patient_clinical_documents.created_at', 'desc')
      .execute()

    // Transfert pharmacie : une ligne `delivrances` (source ordonnance_libre)
    // existe au plus une fois par document (contrainte UNIQUE). Une seule
    // requête pour toute la liste — pas d'appel par ligne.
    const documentIds = rows.map((row) => String(row.id))
    const dejaTransfereeIds = new Set<string>()
    if (documentIds.length > 0) {
      const delivrances = await this.db
        .selectFrom('delivrances')
        .select('source_document_id')
        .where('source', '=', 'ordonnance_libre')
        .where('source_document_id', 'in', documentIds)
        .execute()
      for (const delivrance of delivrances) {
        dejaTransfereeIds.add(String(delivrance.source_document_id))
      }
    }

    const results = []
    for (const row of rows) {
      let linkedPrescriptions: any[] = []
      let hasMeds = false
      if (row.form_data) {
        try {
          const fd = JSON.parse(row.form_data as string)
          hasMeds = hasMedicamentLines(fd)
          if (fd.linkedPrescriptionIds?.length) {
            linkedPrescriptions = await this.db
              .selectFrom('prescriptions')
              .selectAll()
              .where('id', 'in', fd.linkedPrescriptionIds)
              .execute()
          }
        } catch { /* ignore parse errors */ }
      }
      results.push({
        ...row,
        linkedPrescriptions,
        hasMedicamentLines: hasMeds,
        dejaTransferee: dejaTransfereeIds.has(String(row.id)),
      })
    }
    return results
  }

  async getById(id: string): Promise<any | undefined> {
    const row = await this.db
      .selectFrom('patient_clinical_documents')
      .innerJoin('clinical_document_types', 'clinical_document_types.id', 'patient_clinical_documents.document_type_id')
      .select([
        'patient_clinical_documents.id',
        'patient_clinical_documents.contact_id',
        'patient_clinical_documents.document_type_id',
        'patient_clinical_documents.title',
        'patient_clinical_documents.status',
        'patient_clinical_documents.form_data',
        'patient_clinical_documents.created_at',
        'patient_clinical_documents.updated_at',
        'clinical_document_types.code as document_type_code',
      ])
      .where('patient_clinical_documents.id', '=', id)
      .executeTakeFirst()

    if (!row) return undefined

    let linkedPrescriptions: any[] = []
    let hasMeds = false
    if (row.form_data) {
      try {
        const fd = JSON.parse(row.form_data as string)
        hasMeds = hasMedicamentLines(fd)
        if (fd.linkedPrescriptionIds?.length) {
          linkedPrescriptions = await this.db
            .selectFrom('prescriptions')
            .selectAll()
            .where('id', 'in', fd.linkedPrescriptionIds)
            .execute()
        }
      } catch { /* ignore */ }
    }
    const dejaTransferee = await this.db
      .selectFrom('delivrances')
      .select('id')
      .where('source', '=', 'ordonnance_libre')
      .where('source_document_id', '=', String(row.id))
      .executeTakeFirst()
    return {
      ...row,
      linkedPrescriptions,
      hasMedicamentLines: hasMeds,
      dejaTransferee: dejaTransferee != null,
    }
  }
}
