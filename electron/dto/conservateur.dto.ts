// ─── Stockage Physique ───────────────────────────────────────────
export interface StockagePhysiqueDto {
  id?: number
  code: string
  name: string
  description?: string | null
  sort_order: number
  champs_count?: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface StockagePhysiqueCreateDto {
  code: string
  name: string
  description?: string | null
}

export interface StockagePhysiqueUpdateDto {
  id: number
  code?: string
  name?: string
  description?: string | null
  is_active?: boolean
}

// ─── Champ de Localisation ──────────────────────────────────────
export interface ChampLocalisationDto {
  id?: number
  stockage_id: number
  cle: string
  label: string
  type: string
  sort_order: number
  created_at?: string
}

export interface ChampLocalisationCreateDto {
  stockage_id: number
  cle: string
  label: string
  type?: string
}

export interface ChampLocalisationUpdateDto {
  id: number
  cle?: string
  label?: string
  type?: string
}
