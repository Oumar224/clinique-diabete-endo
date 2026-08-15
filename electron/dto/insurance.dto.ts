export interface InsuranceDto {
  id?: number
  name?: string
  code?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface InsuranceCreateDto {
  name?: string
  code?: string
}

export interface InsuranceUpdateDto {
  id?: number
  name?: string
  code?: string
  is_active?: boolean
}