// ─── Specialty ─────────────────────────────────────────────────
export interface SpecialtyDto {
  id?: number
  name: string
  code: string
  title_prefix: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface SpecialtyCreateDto {
  name: string
  code: string
  title_prefix?: string
}

export interface SpecialtyUpdateDto {
  id: number
  name?: string
  code?: string
  title_prefix?: string
  is_active?: boolean
}
