export interface ContactOriginDto {
  id?: number
  value?: string
  label?: string
  sort_order?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface ContactOriginCreateDto {
  value?: string
  label?: string
  sort_order?: number
}

export interface ContactOriginUpdateDto {
  id?: number
  value?: string
  label?: string
  sort_order?: number
  is_active?: boolean
}