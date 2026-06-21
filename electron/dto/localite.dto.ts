// ─── Localité (administrative division of Guinea) ───────────────
export interface LocaliteDto {
  id?: number
  code: string
  name: string
  type: 'region' | 'prefecture' | 'commune' | 'sous_prefecture'
  parent_id?: number | null
  country: string
  region?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
  children?: LocaliteDto[]
}

export interface LocaliteCreateDto {
  code: string
  name: string
  type: 'region' | 'prefecture' | 'commune' | 'sous_prefecture'
  parent_id?: number | null
  country?: string
  region?: string
}

export interface LocaliteUpdateDto {
  id: number
  name?: string
  is_active?: boolean
}
