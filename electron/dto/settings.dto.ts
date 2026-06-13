// ─── Clinic Service ────────────────────────────────────────────
export interface ServiceDto {
  id?: number
  name: string
  description?: string | null
  duration: number
  color?: string | null
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface ServiceCreateDto {
  name: string
  description?: string | null
  duration?: number
  color?: string | null
}

export interface ServiceUpdateDto {
  id: number
  name?: string
  description?: string | null
  duration?: number
  color?: string | null
}

export interface ServiceToggleDto {
  id: number
  is_active: boolean
}

export interface ServiceReorderDto {
  ids: number[]
}

// ─── Currency ──────────────────────────────────────────────────
export interface CurrencyDto {
  code: string
  name: string
  symbol: string
  decimals: number
  is_active: boolean
}

export interface CurrencyCreateDto {
  code: string
  name: string
  symbol: string
  decimals?: number
}

export interface CurrencyUpdateDto {
  name?: string
  symbol?: string
  decimals?: number
  is_active?: boolean
}

// ─── Medical Act ───────────────────────────────────────────────
export interface MedicalActDto {
  id?: number
  code: string
  label: string
  price: number
  currency_code?: string
  service_id: number
  service_name?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface MedicalActCreateDto {
  code: string
  label: string
  price: number
  currency_code?: string
  service_id: number
}

export interface MedicalActUpdateDto {
  id: number
  code?: string
  label?: string
  price?: number
  currency_code?: string
  service_id?: number
  is_active?: boolean
}

// ─── Price History ────────────────────────────────────────────
export interface ActPriceHistoryDto {
  id: number
  act_id: number
  old_price: number | null
  new_price: number
  change_reason?: string | null
  changed_at: string
}

// ─── System ────────────────────────────────────────────────────
export interface SystemInfoDto {
  app_version: string
  electron_version: string
  node_version: string
  sqlite_version: string
  platform: string
  platform_arch: string
  db_size_bytes: number
  db_size_human: string
  record_counts: Record<string, number>
}

export interface DbStatsDto {
  db_size_bytes: number
  db_size_human: string
  record_counts: Record<string, number>
}

export interface BackupResultDto {
  file_path: string
  date: string
  size_bytes: number
}

export interface RestoreResultDto {
  needs_restart: boolean
  safety_backup: string | null
}

export interface AppInfoDto {
  app_version: string
  electron_version: string
  node_version: string
  sqlite_version: string
  platform: string
  platform_arch: string
}
