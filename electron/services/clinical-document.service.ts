import crypto from 'crypto'
import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { ClinicalDocumentEntity } from '../entities/clinical-document.entity'
import type { ClinicalDocumentDTO } from '../dto/clinical-document.dto'
import { ClinicalDocumentTypeEntity } from '../entities/clinical-document-type.entity'
import type { ClinicalDocumentTypeDTO } from '../dto/clinical-document-type.dto'
import { validateForeignKeys } from './utils/fk-validator'
import { entityEventBus } from '../automerge/event-bus'

export interface CreateDocumentParams {
  contactId: string
  serviceId?: string | null
  siteId?: number | null
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
      const key = row.id! as any
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
    contactTypes?: string[]
  }): Promise<ClinicalDocumentTypeDTO> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await this.db
      .insertInto('clinical_document_types')
      .values({
        id: id as any,
        code: dto.code,
        label: dto.label,
        description: dto.description ?? undefined,
        form_schema: JSON.stringify(dto.formSchema),
        category: dto.category,
        acte_id_declenche: dto.acteIdDeclenche ?? undefined,
        contact_types: JSON.stringify(dto.contactTypes ?? []),
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
    contactTypes?: string[]
  }): Promise<ClinicalDocumentTypeDTO> {
    const existing = await this.db
      .selectFrom('clinical_document_types')
      .selectAll()
      .where('id', '=', id as any)
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
    if (dto.contactTypes !== undefined) updateData.contact_types = JSON.stringify(dto.contactTypes)

    if (Object.keys(updateData).length > 0) {
      await this.db
        .updateTable('clinical_document_types')
        .set(updateData)
        .where('id', '=', id as any)
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
      .where('id', '=', id as any)
      .executeTakeFirst()

    if (!existing) throw new Error('Type de document introuvable')

    // Soft delete
    await this.db
      .updateTable('clinical_document_types')
      .set({ is_active: 0 })
      .where('id', '=', id as any)
      .execute()
  }

  async getDocumentTypeById(id: string): Promise<ClinicalDocumentTypeDTO | null> {
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
      .where('clinical_document_types.id', '=', id as any)
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
      .leftJoin('sites', 'sites.id', 'patient_clinical_documents.site_id')
      .select([
        'patient_clinical_documents.id',
        'patient_clinical_documents.contact_id',
        'patient_clinical_documents.service_id',
        'patient_clinical_documents.site_id',
        'patient_clinical_documents.document_type_id',
        'clinical_document_types.label as document_type_label',
        'clinical_document_types.code as document_type_code',
        'sites.name as site_name',
        'patient_clinical_documents.title',
        'patient_clinical_documents.status',
        'patient_clinical_documents.form_data',
        'patient_clinical_documents.source',
        'patient_clinical_documents.pdf_path',
        'patient_clinical_documents.signed_at',
        'patient_clinical_documents.signed_by',
        'patient_clinical_documents.created_by',
        'patient_clinical_documents.created_at',
        'patient_clinical_documents.updated_at',
      ])
      .where('patient_clinical_documents.contact_id', '=', contactId)
      .orderBy('patient_clinical_documents.created_at', 'desc')
      .execute()

    return ClinicalDocumentEntity.toDtos(rows as any)
  }

  async countDocumentsByContact(contactId: string): Promise<number> {
    const { count } = await this.db
      .selectFrom('patient_clinical_documents')
      .select(({ fn }) => fn.countAll().as('count'))
      .where('patient_clinical_documents.contact_id', '=', contactId)
      .executeTakeFirstOrThrow()

    return Number(count)
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
      .leftJoin('sites', 'sites.id', 'patient_clinical_documents.site_id')
      .select([
        'patient_clinical_documents.id',
        'patient_clinical_documents.contact_id',
        'patient_clinical_documents.service_id',
        'patient_clinical_documents.site_id',
        'patient_clinical_documents.document_type_id',
        'clinical_document_types.label as document_type_label',
        'clinical_document_types.code as document_type_code',
        'sites.name as site_name',
        'patient_clinical_documents.title',
        'patient_clinical_documents.status',
        'patient_clinical_documents.form_data',
        'patient_clinical_documents.source',
        'patient_clinical_documents.pdf_path',
        'patient_clinical_documents.signed_at',
        'patient_clinical_documents.signed_by',
        'patient_clinical_documents.created_by',
        'patient_clinical_documents.created_at',
        'patient_clinical_documents.updated_at',
      ])
      .where('encounters.patient_id', '=', patientId)
      .orderBy('patient_clinical_documents.created_at', 'desc')
      .execute()

    return ClinicalDocumentEntity.toDtos(rows as any)
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
      .leftJoin('sites', 'sites.id', 'patient_clinical_documents.site_id')
      .select([
        'patient_clinical_documents.id',
        'patient_clinical_documents.contact_id',
        'patient_clinical_documents.service_id',
        'patient_clinical_documents.site_id',
        'patient_clinical_documents.document_type_id',
        'clinical_document_types.label as document_type_label',
        'clinical_document_types.code as document_type_code',
        'sites.name as site_name',
        'patient_clinical_documents.title',
        'patient_clinical_documents.status',
        'patient_clinical_documents.form_data',
        'patient_clinical_documents.source',
        'patient_clinical_documents.pdf_path',
        'patient_clinical_documents.signed_at',
        'patient_clinical_documents.signed_by',
        'patient_clinical_documents.created_by',
        'patient_clinical_documents.created_at',
        'patient_clinical_documents.updated_at',
      ])
      .where('patient_clinical_documents.id', '=', id)
      .executeTakeFirst()

    return row ? ClinicalDocumentEntity.toDto(row as any) : null
  }

  // ─── Create Document ────────────────────────────────────────────

  async createDocument(params: CreateDocumentParams): Promise<ClinicalDocumentDTO> {
    // Validate foreign keys before insert
    // Note: contactId references encounters.id (number, passed as string),
    // documentTypeId references clinical_document_types.id (TEXT UUID),
    // serviceId references services.id (number, passed as string),
    // createdBy references user.id (number, passed as string)
    await validateForeignKeys(this.db as any, [
      { table: 'encounters', column: 'contact_id', value: params.contactId },
      { table: 'clinical_document_types', column: 'document_type_id', value: params.documentTypeId },
      { table: 'services', column: 'service_id', value: params.serviceId },
      { table: 'user', column: 'created_by', value: params.createdBy },
    ])

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
      .where('id', '=', params.documentTypeId as any)
      .executeTakeFirst()

    const title = docType ? docType.label : 'Document'

    const siteId = await this.resolveSiteId(params.createdBy, params.siteId)

    await this.db
      .insertInto('patient_clinical_documents')
      .values({
        id,
        contact_id: params.contactId,
        service_id: serviceId ?? undefined,
        site_id: siteId ?? undefined,
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
    entityEventBus.emitEntityChange({ entityType: 'clinical_document', action: 'created', id, entity: created, source: 'local', timestamp: Date.now() })
    return created
  }

  // ─── Import PDF (store file + record with source='imported') ─────

  async importPdf(params: {
    contactId: string
    serviceId?: string | null
    siteId?: number | null
    createdBy: string
    pdfPath: string
    title?: string
    documentTypeId?: string
  }): Promise<ClinicalDocumentDTO> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    const title = params.title || `Document importé (${new Date().toLocaleDateString('fr-FR')})`

    const siteId = await this.resolveSiteId(params.createdBy, params.siteId)

    await this.db
      .insertInto('patient_clinical_documents')
      .values({
        id,
        contact_id: params.contactId,
        service_id: params.serviceId ?? undefined,
        site_id: siteId ?? undefined,
        document_type_id: params.documentTypeId || '',
        title,
        status: 'draft',
        form_data: '{}',
        source: 'imported',
        pdf_path: params.pdfPath,
        created_by: params.createdBy,
        created_at: now,
        updated_at: now,
      })
      .execute()

    const created = await this.getDocumentById(id)
    if (!created) throw new Error('Échec de l\'import du document')
    return created
  }

  // ─── Create Document + Acte (atomic, linked to contact) ───────────

  async createDocumentWithActe(
    params: CreateDocumentParams,
  ): Promise<CreateDocumentWithActeResult> {
    const docType = await this.db
      .selectFrom('clinical_document_types')
      .select(['label', 'acte_id_declenche'])
      .where('id', '=', params.documentTypeId as any)
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
    entityEventBus.emitEntityChange({ entityType: 'clinical_document', action: 'updated', id, entity: updated, source: 'local', timestamp: Date.now() })
    return updated
  }

  // ─── Sign Document ──────────────────────────────────────────────

  async signDocument(id: string, userId: string): Promise<ClinicalDocumentDTO> {
    const doc = await this.getDocumentById(id)
    if (!doc) throw new Error('Document introuvable')

    const now = new Date().toISOString()

    // Compute integrity hash from current document state
    const hashPayload = JSON.stringify({
      documentId: id,
      formData: doc.formData,
      timestamp: now,
      userId,
    })
    const signatureHash = crypto.createHash('sha256').update(hashPayload).digest('hex')

    const signedAt = now

    await this.db.transaction().execute(async (trx) => {
      await trx
        .updateTable('patient_clinical_documents')
        .set({
          status: 'signed',
          signed_at: signedAt,
          signed_by: userId,
          updated_at: signedAt,
        })
        .where('id', '=', id)
        .execute()

      await trx
        .deleteFrom('clinical_document_signatures')
        .where('document_id', '=', id)
        .execute()

      await trx
        .insertInto('clinical_document_signatures')
        .values({
          id: crypto.randomUUID() as any,
          document_id: id,
          user_id: userId,
          signature_hash: signatureHash,
          signed_at: signedAt,
        })
        .execute()

      // Partie B: Injecter dateSortie = aujourd'hui si absente, puis fermer contact + stay
      let formData: Record<string, any> = {}
      try {
        formData = JSON.parse(doc.formData || '{}')
      } catch { /* ignore */ }

      // Forcer dateSortie = date courante si non renseignée
      if (!formData.sortie) formData.sortie = {}
      if (!formData.sortie.dateSortie) {
        const nowDate = new Date(signedAt)
        formData.sortie.dateSortie = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}-${String(nowDate.getDate()).padStart(2, '0')}`

        // Persister le form_data mis à jour
        await trx
          .updateTable('patient_clinical_documents')
          .set({ form_data: JSON.stringify(formData) })
          .where('id', '=', id)
          .execute()
      }

      const sortieDate: string | undefined = formData.sortie?.dateSortie
      if (sortieDate) {
        const contactId = Number(doc.contactId)
        if (!isNaN(contactId) && contactId > 0) {
          const sortieISO = new Date(sortieDate).toISOString()

          await trx
            .updateTable('encounters')
            .set({
              end_date: sortieISO,
              status: 'closed',
              updated_at: signedAt,
            })
            .where('id', '=', contactId)
            .where('status', '=', 'active')
            .execute()

          // Close the last open encounter_movement
          const openMvt = await trx
            .selectFrom('encounter_movements')
            .select('id')
            .where('encounter_id', '=', contactId)
            .where('exited_at', 'is', null)
            .orderBy('entered_at', 'desc')
            .limit(1)
            .executeTakeFirst()

          if (openMvt) {
            await trx
              .updateTable('encounter_movements')
              .set({ exited_at: sortieISO })
              .where('id', '=', openMvt.id)
              .execute()
          }

          // Get patient_id from the encounter to close the stay
          const encounter = await trx
            .selectFrom('encounters')
            .select('patient_id')
            .where('id', '=', contactId)
            .executeTakeFirst()

          if (encounter) {
            const activeStay = await trx
              .selectFrom('stays')
              .select('id')
              .where('patient_id', '=', encounter.patient_id)
              .where('status', '=', 'en_cours')
              .executeTakeFirst()

            if (activeStay) {
              await trx
                .updateTable('stays')
                .set({
                  status: 'cloture',
                  sortie_date: sortieISO,
                  updated_at: signedAt,
                })
                .where('id', '=', activeStay.id)
                .execute()

              // Add sortie movement to stay_movements
              await trx
                .insertInto('stay_movements')
                .values({
                  stay_id: activeStay.id,
                  movement_type: 'sortie',
                  moved_at: sortieISO,
                })
                .execute()
            }
          }
        }
      }
    })

    const signed = await this.getDocumentById(id)
    if (!signed) throw new Error('Document introuvable après signature')
    entityEventBus.emitEntityChange({ entityType: 'clinical_document', action: 'updated', id, entity: signed, source: 'local', timestamp: Date.now() })
    return signed
  }

  // ─── Set PDF Path (after PDF generation) ─────────────────────────

  async setDocumentPdfPath(id: string, pdfPath: string): Promise<ClinicalDocumentDTO> {
    const now = new Date().toISOString()

    await this.db
      .updateTable('patient_clinical_documents')
      .set({
        pdf_path: pdfPath,
        updated_at: now,
      })
      .where('id', '=', id)
      .execute()

    const updated = await this.getDocumentById(id)
    if (!updated) throw new Error('Document introuvable après mise à jour du PDF')
    entityEventBus.emitEntityChange({ entityType: 'clinical_document', action: 'updated', id, entity: updated, source: 'local', timestamp: Date.now() })
    return updated
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
    entityEventBus.emitEntityChange({ entityType: 'clinical_document', action: 'deleted', id, entity: doc, source: 'local', timestamp: Date.now() })
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
      .select(['created_at', 'contact_type', 'end_date'])
      .where('encounters.id', '=', Number(contactId))
      .executeTakeFirst()

    if (!encounter) return true

    if (encounter.end_date) {
      const endTime = toTimestamp(encounter.end_date)
      return !Number.isNaN(endTime) && endTime < Date.now()
    }

    if (encounter.contact_type === 'hospitalisation') return false

    if (!encounter.created_at) return true

    const createdTime = toTimestamp(encounter.created_at)
    if (Number.isNaN(createdTime)) return true

    return Date.now() - createdTime > 24 * 60 * 60 * 1000
  }

  // ─── Modification Guard ─────────────────────────────────────────

  async canModifyDocument(id: string): Promise<boolean> {
    const doc = await this.db
      .selectFrom('patient_clinical_documents')
      .select(['status', 'contact_id'])
      .where('id', '=', id)
      .executeTakeFirst()

    if (!doc) return false
    if (doc.status === 'signed') return true
    if (!doc.contact_id) return false

    const expired = await this.isContactExpired(doc.contact_id)
    return !expired
  }

  // ─── Site Resolution ────────────────────────────────────────────

  private async resolveSiteId(createdBy: string, siteId?: number | null): Promise<number | null> {
    if (siteId != null) return siteId
    const row = await this.db
      .selectFrom('user_sites')
      .select('site_id')
      .where('user_id', '=', Number(createdBy))
      .orderBy('site_id', 'asc')
      .limit(1)
      .executeTakeFirst()
    return row?.site_id ?? null
  }
}

function toTimestamp(value: string): number {
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)
    ? `${value.replace(' ', 'T')}Z`
    : value
  return new Date(normalized).getTime()
}
