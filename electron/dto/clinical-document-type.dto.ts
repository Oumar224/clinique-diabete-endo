export interface FormFieldSchema {
  key?: string
  label?: string
  type?: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'checkbox' | 'radio' | 'file'
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
  id?: number
  code?: string
  label?: string
  description?: string
  formSchema?: FormFieldSchema[]
  category?: string
  isActive?: boolean
  createdAt?: string
  acteIdDeclenche?: number
  acteLabel?: string
  acteCode?: string
  prixUnitaire?: number
  contactTypes?: string[]
}