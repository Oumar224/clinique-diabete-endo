// ─── Medical Unit ──────────────────────────────────────────────
export interface MedicalUnitDto {
  id?: number
  code: string
  name: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface MedicalUnitCreateDto {
  code: string
  name: string
}

export interface MedicalUnitUpdateDto {
  id: number
  code?: string
  name?: string
  is_active?: boolean
}
