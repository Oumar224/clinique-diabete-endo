export interface FormFieldSchema {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'checkbox' | 'radio' | 'file'
  required?: boolean
  options?: { label: string; value: string }[]
  placeholder?: string
  defaultValue?: unknown
  helpText?: string
  validators?: { type: string; params?: any }[]
  conditional?: { field: string; value: any }
  layout?: { width: number }
}

export interface ClinicalDocumentTypeDTO {
  id: string
  code: string
  label: string
  description: string | null
  formSchema: FormFieldSchema[]
  category: string
  isActive: boolean
  createdAt: string
  acteIdDeclenche: number | null
  acteLabel: string | null
  acteCode: string | null
  prixUnitaire: number | null
}

export class ClinicalDocumentTypeEntity {
  id?: string
  code?: string
  label?: string
  description?: string | null
  form_schema?: string
  category?: string
  is_active?: number
  created_at?: string
  acte_id_declenche?: number | null
  acte_label?: string | null
  acte_code?: string | null
  prix_unitaire?: number | null

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
      description: entity.description ?? null,
      formSchema,
      category: entity.category ?? 'other',
      isActive: entity.is_active === 1,
      createdAt: entity.created_at!,
      acteIdDeclenche: entity.acte_id_declenche ?? null,
      acteLabel: entity.acte_label ?? null,
      acteCode: entity.acte_code ?? null,
      prixUnitaire: entity.prix_unitaire ?? null,
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
    e.description = dto.description ?? null
    e.form_schema = JSON.stringify(dto.formSchema)
    e.category = dto.category
    e.is_active = dto.isActive ? 1 : 0
    e.acte_id_declenche = dto.acteIdDeclenche
    return e
  }

  static documentType(): string {
    return 'ClinicalDocumentType'
  }

  static documentSchema(): unknown {
    return {}
  }

  static register(): void {
    /* No Automerge sync needed */
  }
}
