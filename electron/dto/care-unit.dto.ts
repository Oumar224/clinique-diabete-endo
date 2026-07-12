// ─── Care Unit (Unité de soins) ─────────────────────────────────
export interface CareUnitDto {
  id?: number
  service_id: number
  name: string
  code?: string | null
  description?: string | null
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface CareUnitCreateDto {
  service_id: number
  name: string
  code?: string | null
  description?: string | null
}

export interface CareUnitUpdateDto {
  id: number
  service_id?: number
  name?: string
  code?: string | null
  description?: string | null
  is_active?: boolean
}
