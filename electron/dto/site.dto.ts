// ─── Site ──────────────────────────────────────────────────────
export interface SiteDto {
  id?: number
  name?: string
  address?: string
  phone?: string
  email?: string
  is_default?: boolean
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface SiteCreateDto {
  name?: string
  address?: string
  phone?: string
  email?: string
}

export interface SiteUpdateDto {
  id?: number
  name?: string
  address?: string
  phone?: string
  email?: string
  is_active?: boolean
  is_default?: boolean
}
