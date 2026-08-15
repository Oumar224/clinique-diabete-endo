import type { ClinicalDocumentTypeDTO, FormFieldSchema } from '../dto/clinical-document-type.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { ClinicalDocumentTypeConverter } from '../automerge/converters/clinical-document-type.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class ClinicalDocumentTypeEntity {
  @SchemaField() id?: number
  @SchemaField() code?: string
  @SchemaField() label?: string
  @SchemaField() description?: string
  @SchemaField() form_schema?: string
  @SchemaField() category?: string
  @SchemaField() is_active?: number
  @SchemaField() created_at?: string
  @SchemaField() acte_id_declenche?: number
  @SchemaField() acte_label?: string
  @SchemaField() acte_code?: string
  @SchemaField() prix_unitaire?: number
  @SchemaField() contact_types?: string

  static toDto(entity: ClinicalDocumentTypeEntity): ClinicalDocumentTypeDTO {
    const rawSchema: any[] = entity.form_schema ? JSON.parse(entity.form_schema) : []
    const formSchema: FormFieldSchema[] = rawSchema.map((f: any) => ({
      key: f.key ?? f.name ?? '',
      label: f.label ?? '',
      type: f.type ?? 'text',
      required: f.required ?? false,
      defaultValue: f.defaultValue,
      placeholder: f.placeholder,
      helpText: f.helpText,
      options: f.options,
      validators: f.validators,
      conditional: f.conditional,
      layout: f.layout,
    }))

    return {
      id: entity.id!,
      code: entity.code!,
      label: entity.label!,
      description: entity.description,
      formSchema,
      category: entity.category ?? 'other',
      isActive: entity.is_active === 1,
      createdAt: entity.created_at!,
      acteIdDeclenche: entity.acte_id_declenche,
      acteLabel: entity.acte_label,
      acteCode: entity.acte_code,
      prixUnitaire: entity.prix_unitaire,
      contactTypes: entity.contact_types ? JSON.parse(entity.contact_types) : [] as string[],
    }
  }

  static toDtos(entities: ClinicalDocumentTypeEntity[]): ClinicalDocumentTypeDTO[] {
    return entities.map(ClinicalDocumentTypeEntity.toDto)
  }

  static fromDto(dto: ClinicalDocumentTypeDTO): ClinicalDocumentTypeEntity {
    const e = new ClinicalDocumentTypeEntity()
    e.id = dto.id
    e.code = dto.code
    e.label = dto.label
    e.description = dto.description
    e.form_schema = JSON.stringify(dto.formSchema)
    e.category = dto.category
    e.is_active = dto.isActive ? 1 : 0
    e.acte_id_declenche = dto.acteIdDeclenche
    e.contact_types = JSON.stringify(dto.contactTypes ?? [])
    return e
  }

  static documentType(): string {
    return 'ClinicalDocumentType'
  }

  static documentSchema(): AutomergeDocument<ClinicalDocumentTypeEntity> {
    return buildDocumentSchema(ClinicalDocumentTypeEntity) as AutomergeDocument<ClinicalDocumentTypeEntity>
  }

  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'clinical_document_type',
      documentSchema: this.documentSchema(),
      converter: { toDocument: ClinicalDocumentTypeConverter.toDocument, toEntity: ClinicalDocumentTypeConverter.toEntity },
    })
  }
}