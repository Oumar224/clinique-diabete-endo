import crypto from 'crypto'
import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { ClinicalDocumentEntity } from '../entities/clinical-document.entity'
import type { ClinicalDocumentDTO, ClinicalDocumentRow } from '../entities/clinical-document.entity'
import { ClinicalDocumentTypeEntity } from '../entities/clinical-document-type.entity'
import type { ClinicalDocumentTypeDTO } from '../entities/clinical-document-type.entity'

export interface CreateDocumentParams {
  contactId: string
  serviceId?: string | null
  documentTypeId: string
  createdBy: string
}

export interface CreateDocumentWithActeResult {
  document: ClinicalDocumentDTO
  acteId?: number
  acteLabel?: string
  prixUnitaire?: number
}

@singleton()
export class ClinicalDocumentService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  // ─── Document Types ────────────────────────────────────────────

  async getDocumentTypes(): Promise<ClinicalDocumentTypeDTO[]> {
    const rows = await this.db
      .selectFrom('clinical_document_types')
      .selectAll()
      .where('is_active', '=', 1)
      .orderBy('label', 'asc')
      .execute()

    return ClinicalDocumentTypeEntity.toDtos(rows as ClinicalDocumentTypeEntity[])
  }

  // ─── Document Types with pricing (for ContactFormSelector) ────────

  async getDocumentTypesWithPricing(): Promise<ClinicalDocumentTypeDTO[]> {
    const rows = await this.db
      .selectFrom('clinical_document_types')
      .leftJoin('medical_acts', 'medical_acts.id', 'clinical_document_types.acte_id_declenche')
      .leftJoin('config_tarifs', (join) =>
        join
          .onRef('config_tarifs.acte_id', '=', 'clinical_document_types.acte_id_declenche')
          .on('config_tarifs.code_tarif', '=', 'TARIF.STANDARD')
      )
      .select([
        'clinical_document_types.id',
        'clinical_document_types.code',
        'clinical_document_types.label',
        'clinical_document_types.description',
        'clinical_document_types.form_schema',
        'clinical_document_types.category',
        'clinical_document_types.is_active',
        'clinical_document_types.created_at',
        'clinical_document_types.acte_id_declenche',
        'medical_acts.label as acte_label',
        'medical_acts.code as acte_code',
        'config_tarifs.prix_unitaire',
      ])
      .where('clinical_document_types.is_active', '=', 1)
      .orderBy('clinical_document_types.label', 'asc')
      .execute()

    // Deduplicate: only the latest pricing per doc type (highest id)
    const map = new Map<string, any>()
    for (const row of rows) {
      const key = row.id!
      if (!map.has(key) || (row as any).prix_unitaire != null) {
        map.set(key, row)
      }
    }

    return ClinicalDocumentTypeEntity.toDtos(
      Array.from(map.values()) as ClinicalDocumentTypeEntity[],
    )
  }

  // ─── Document Types CRUD (admin) ──────────────────────────────────

  async getAllDocumentTypes(): Promise<ClinicalDocumentTypeDTO[]> {
    const rows = await this.db
      .selectFrom('clinical_document_types')
      .selectAll()
      .orderBy('label', 'asc')
      .execute()

    return ClinicalDocumentTypeEntity.toDtos(rows as ClinicalDocumentTypeEntity[])
  }

  async createDocumentType(dto: {
    code: string
    label: string
    description?: string | null
    formSchema: any[]
    category: string
    acteIdDeclenche?: number | null
  }): Promise<ClinicalDocumentTypeDTO> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await this.db
      .insertInto('clinical_document_types')
      .values({
        id,
        code: dto.code,
        label: dto.label,
        description: dto.description ?? null,
        form_schema: JSON.stringify(dto.formSchema),
        category: dto.category,
        acte_id_declenche: dto.acteIdDeclenche ?? null,
        is_active: 1,
        created_at: now,
      })
      .execute()

    const created = await this.getDocumentTypeById(id)
    if (!created) throw new Error("Échec de la création du type de document")
    return created
  }

  async updateDocumentType(id: string, dto: {
    code?: string
    label?: string
    description?: string | null
    formSchema?: any[]
    category?: string
    acteIdDeclenche?: number | null
    isActive?: boolean
  }): Promise<ClinicalDocumentTypeDTO> {
    const existing = await this.db
      .selectFrom('clinical_document_types')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!existing) throw new Error('Type de document introuvable')

    const updateData: Record<string, any> = {}
    if (dto.code !== undefined) updateData.code = dto.code
    if (dto.label !== undefined) updateData.label = dto.label
    if (dto.description !== undefined) updateData.description = dto.description
    if (dto.formSchema !== undefined) updateData.form_schema = JSON.stringify(dto.formSchema)
    if (dto.category !== undefined) updateData.category = dto.category
    if (dto.acteIdDeclenche !== undefined) updateData.acte_id_declenche = dto.acteIdDeclenche
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive ? 1 : 0

    if (Object.keys(updateData).length > 0) {
      await this.db
        .updateTable('clinical_document_types')
        .set(updateData)
        .where('id', '=', id)
        .execute()
    }

    const updated = await this.getDocumentTypeById(id)
    if (!updated) throw new Error('Type de document introuvable après mise à jour')
    return updated
  }

  async deleteDocumentType(id: string): Promise<void> {
    const existing = await this.db
      .selectFrom('clinical_document_types')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!existing) throw new Error('Type de document introuvable')

    // Soft delete
    await this.db
      .updateTable('clinical_document_types')
      .set({ is_active: 0 })
      .where('id', '=', id)
      .execute()
  }

  private async getDocumentTypeById(id: string): Promise<ClinicalDocumentTypeDTO | null> {
    const row = await this.db
      .selectFrom('clinical_document_types')
      .leftJoin('medical_acts', 'medical_acts.id', 'clinical_document_types.acte_id_declenche')
      .leftJoin('config_tarifs', (join) =>
        join
          .onRef('config_tarifs.acte_id', '=', 'clinical_document_types.acte_id_declenche')
          .on('config_tarifs.code_tarif', '=', 'TARIF.STANDARD')
      )
      .select([
        'clinical_document_types.id',
        'clinical_document_types.code',
        'clinical_document_types.label',
        'clinical_document_types.description',
        'clinical_document_types.form_schema',
        'clinical_document_types.category',
        'clinical_document_types.is_active',
        'clinical_document_types.created_at',
        'clinical_document_types.acte_id_declenche',
        'medical_acts.label as acte_label',
        'medical_acts.code as acte_code',
        'config_tarifs.prix_unitaire',
      ])
      .where('clinical_document_types.id', '=', id)
      .executeTakeFirst()

    return row
      ? ClinicalDocumentTypeEntity.toDto(row as ClinicalDocumentTypeEntity)
      : null
  }

  // ─── Documents by Contact ───────────────────────────────────────

  async getDocumentsByContact(contactId: string): Promise<ClinicalDocumentDTO[]> {
    const rows = await this.db
      .selectFrom('patient_clinical_documents')
      .innerJoin(
        'clinical_document_types',
        'clinical_document_types.id',
        'patient_clinical_documents.document_type_id',
      )
      .select([
        'patient_clinical_documents.id',
        'patient_clinical_documents.contact_id',
        'patient_clinical_documents.service_id',
        'patient_clinical_documents.document_type_id',
        'clinical_document_types.label as document_type_label',
        'clinical_document_types.code as document_type_code',
        'patient_clinical_documents.title',
        'patient_clinical_documents.status',
        'patient_clinical_documents.form_data',
        'patient_clinical_documents.signed_at',
        'patient_clinical_documents.signed_by',
        'patient_clinical_documents.created_by',
        'patient_clinical_documents.created_at',
        'patient_clinical_documents.updated_at',
      ])
      .where('patient_clinical_documents.contact_id', '=', contactId)
      .orderBy('patient_clinical_documents.created_at', 'desc')
      .execute()

    return ClinicalDocumentEntity.toDtos(rows as ClinicalDocumentRow[])
  }

  // ─── Documents by Patient ───────────────────────────────────────

  async getDocumentsByPatient(patientId: number): Promise<ClinicalDocumentDTO[]> {
    const rows = await this.db
      .selectFrom('patient_clinical_documents')
      .innerJoin(
        'clinical_document_types',
        'clinical_document_types.id',
        'patient_clinical_documents.document_type_id',
      )
      .innerJoin(
        'encounters',
        'encounters.id',
        'patient_clinical_documents.contact_id',
      )
      .select([
        'patient_clinical_documents.id',
        'patient_clinical_documents.contact_id',
        'patient_clinical_documents.service_id',
        'patient_clinical_documents.document_type_id',
        'clinical_document_types.label as document_type_label',
        'clinical_document_types.code as document_type_code',
        'patient_clinical_documents.title',
        'patient_clinical_documents.status',
        'patient_clinical_documents.form_data',
        'patient_clinical_documents.signed_at',
        'patient_clinical_documents.signed_by',
        'patient_clinical_documents.created_by',
        'patient_clinical_documents.created_at',
        'patient_clinical_documents.updated_at',
      ])
      .where('encounters.patient_id', '=', patientId)
      .orderBy('patient_clinical_documents.created_at', 'desc')
      .execute()

    return ClinicalDocumentEntity.toDtos(rows as ClinicalDocumentRow[])
  }

  // ─── Single Document ────────────────────────────────────────────

  async getDocumentById(id: string): Promise<ClinicalDocumentDTO | null> {
    const row = await this.db
      .selectFrom('patient_clinical_documents')
      .innerJoin(
        'clinical_document_types',
        'clinical_document_types.id',
        'patient_clinical_documents.document_type_id',
      )
      .select([
        'patient_clinical_documents.id',
        'patient_clinical_documents.contact_id',
        'patient_clinical_documents.service_id',
        'patient_clinical_documents.document_type_id',
        'clinical_document_types.label as document_type_label',
        'clinical_document_types.code as document_type_code',
        'patient_clinical_documents.title',
        'patient_clinical_documents.status',
        'patient_clinical_documents.form_data',
        'patient_clinical_documents.signed_at',
        'patient_clinical_documents.signed_by',
        'patient_clinical_documents.created_by',
        'patient_clinical_documents.created_at',
        'patient_clinical_documents.updated_at',
      ])
      .where('patient_clinical_documents.id', '=', id)
      .executeTakeFirst()

    return row ? ClinicalDocumentEntity.toDto(row as ClinicalDocumentRow) : null
  }

  // ─── Create Document ────────────────────────────────────────────

  async createDocument(params: CreateDocumentParams): Promise<ClinicalDocumentDTO> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    // Inherit service_id from the contact (encounter) if not explicitly provided
    let serviceId: string | null = params.serviceId ?? null
    // Normalize empty string to null so FK constraint doesn't fail
    if (serviceId === '') serviceId = null
    if (!serviceId) {
      const encounter = await this.db
        .selectFrom('encounters')
        .select(['encounters.service_id'])
        .where('encounters.id', '=', Number(params.contactId))
        .executeTakeFirst()

      if (encounter) {
        serviceId = String(encounter.service_id)
      }
    }

    // Get the document type to build a default title
    const docType = await this.db
      .selectFrom('clinical_document_types')
      .select(['label'])
      .where('id', '=', params.documentTypeId)
      .executeTakeFirst()

    const title = docType ? docType.label : 'Document'

    await this.db
      .insertInto('patient_clinical_documents')
      .values({
        id,
        contact_id: params.contactId,
        service_id: serviceId,
        document_type_id: params.documentTypeId,
        title,
        status: 'draft',
        form_data: '{}',
        created_by: params.createdBy,
        created_at: now,
        updated_at: now,
      })
      .execute()

    const created = await this.getDocumentById(id)
    if (!created) throw new Error('Échec de la création du document')
    return created
  }

  // ─── Create Document + Acte (atomic, linked to contact) ───────────

  async createDocumentWithActe(
    params: CreateDocumentParams,
  ): Promise<CreateDocumentWithActeResult> {
    const docType = await this.db
      .selectFrom('clinical_document_types')
      .select(['label', 'acte_id_declenche'])
      .where('id', '=', params.documentTypeId)
      .executeTakeFirst()

    if (!docType) throw new Error('Type de document introuvable')

    const result: CreateDocumentWithActeResult = {
      document: await this.createDocument(params),
    }

    // If the document type triggers an acte, create the patient_acte too
    if (docType.acte_id_declenche) {
      const encounter = await this.db
        .selectFrom('encounters')
        .select(['patient_id'])
        .where('id', '=', Number(params.contactId))
        .executeTakeFirst()

      if (!encounter) throw new Error('Contact introuvable')

      // Look up active TARIF.STANDARD for this acte
      const tarif = await this.db
        .selectFrom('config_tarifs')
        .select(['id', 'prix_unitaire'])
        .where('acte_id', '=', docType.acte_id_declenche)
        .where('code_tarif', '=', 'TARIF.STANDARD')
        .orderBy('date_application', 'desc')
        .orderBy('id', 'desc')
        .limit(1)
        .executeTakeFirst()

      await this.db
        .insertInto('patient_actes')
        .values({
          encounter_id: Number(params.contactId),
          patient_id: encounter.patient_id,
          acte_id: docType.acte_id_declenche,
          tarif_id: tarif ? tarif.id : undefined,
          quantite: 1,
          statut_paiement: 'A_PAYER',
        })
        .execute()

      result.acteId = docType.acte_id_declenche
      result.prixUnitaire = tarif?.prix_unitaire ?? 0
    }

    return result
  }

  // ─── Update Form Data ───────────────────────────────────────────

  async updateDocumentData(id: string, formData: Record<string, unknown>): Promise<ClinicalDocumentDTO> {
    const canModify = await this.canModifyDocument(id)
    if (!canModify) {
      throw new Error('Impossible de modifier un document signé ou lié à un contact expiré')
    }

    const now = new Date().toISOString()
    const formDataJson = JSON.stringify(formData)

    await this.db
      .updateTable('patient_clinical_documents')
      .set({
        form_data: formDataJson,
        updated_at: now,
      })
      .where('id', '=', id)
      .execute()

    const updated = await this.getDocumentById(id)
    if (!updated) throw new Error('Document introuvable après mise à jour')
    return updated
  }

  // ─── Sign Document ──────────────────────────────────────────────

  async signDocument(id: string, userId: string): Promise<ClinicalDocumentDTO> {
    const doc = await this.getDocumentById(id)
    if (!doc) throw new Error('Document introuvable')
    if (doc.status === 'signed') throw new Error('Le document est déjà signé')

    const now = new Date().toISOString()

    // Compute integrity hash from current document state
    const hashPayload = JSON.stringify({
      documentId: id,
      formData: doc.formData,
      timestamp: now,
      userId,
    })
    const signatureHash = crypto.createHash('sha256').update(hashPayload).digest('hex')

    await this.db
      .updateTable('patient_clinical_documents')
      .set({
        status: 'signed',
        signed_at: now,
        signed_by: userId,
        updated_at: now,
      })
      .where('id', '=', id)
      .execute()

    // Create signature audit record
    await this.db
      .insertInto('clinical_document_signatures')
      .values({
        id: crypto.randomUUID(),
        document_id: id,
        user_id: userId,
        signature_hash: signatureHash,
        signed_at: now,
      })
      .execute()

    const signed = await this.getDocumentById(id)
    if (!signed) throw new Error('Document introuvable après signature')
    return signed
  }

  // ─── Delete Document ────────────────────────────────────────────

  async deleteDocument(id: string): Promise<void> {
    const doc = await this.getDocumentById(id)
    if (!doc) throw new Error('Document introuvable')
    if (doc.status === 'signed') {
      throw new Error('Impossible de supprimer un document signé')
    }

    // Delete signature records first (foreign key)
    await this.db
      .deleteFrom('clinical_document_signatures')
      .where('document_id', '=', id)
      .execute()

    await this.db
      .deleteFrom('patient_clinical_documents')
      .where('id', '=', id)
      .execute()
  }

  // ─── Get Patient ID from Document (via contact) ─────────────────

  async getPatientIdByDocument(contactId: string): Promise<number> {
    const encounter = await this.db
      .selectFrom('encounters')
      .select(['patient_id'])
      .where('encounters.id', '=', Number(contactId))
      .executeTakeFirst()

    if (!encounter || !encounter.patient_id) throw new Error('Contact introuvable')
    return encounter.patient_id
  }

  // ─── Contact Expiration Check ───────────────────────────────────

  async isContactExpired(contactId: string): Promise<boolean> {
    const encounter = await this.db
      .selectFrom('encounters')
      .select(['created_at'])
      .where('encounters.id', '=', Number(contactId))
      .executeTakeFirst()

    if (!encounter || !encounter.created_at) return true

    const createdTime = new Date(encounter.created_at).getTime()
    const now = Date.now()
    const twentyFourHoursMs = 24 * 60 * 60 * 1000

    return now - createdTime > twentyFourHoursMs
  }

  // ─── Modification Guard ─────────────────────────────────────────

  async canModifyDocument(id: string): Promise<boolean> {
    const doc = await this.db
      .selectFrom('patient_clinical_documents')
      .select(['status', 'contact_id'])
      .where('id', '=', id)
      .executeTakeFirst()

    if (!doc) return false
    if (doc.status === 'signed') return false
    if (!doc.contact_id) return false

    const expired = await this.isContactExpired(doc.contact_id)
    return !expired
  }
}
