// ─── Site ──────────────────────────────────────────────────────
export interface SiteDto {
  id?: number
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  is_default: boolean
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface SiteCreateDto {
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
}

export interface SiteUpdateDto {
  id: number
  name?: string
  address?: string | null
  phone?: string | null
  email?: string | null
  is_active?: boolean
  is_default?: boolean
}
