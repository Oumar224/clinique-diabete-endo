// ─── Service ──────────────────────────────────────────────────
export interface ServiceDto {
  id?: number
  name?: string
  description?: string
  duration?: number
  color?: string
  sort_order?: number
  is_active?: boolean
  category?: string
  site_ids?: number[]
  created_at?: string
  updated_at?: string
}

export interface ServiceCreateDto {
  name?: string
  description?: string
  duration?: number
  color?: string
  category?: string
  site_ids?: number[]
}

export interface ServiceUpdateDto {
  id?: number
  name?: string
  description?: string
  duration?: number
  color?: string
  category?: string
  site_ids?: number[]
}

export interface ServiceToggleDto {
  id?: number
  is_active?: boolean
}

export interface ServiceReorderDto {
  ids?: number[]
}

// ─── Currency ──────────────────────────────────────────────────
export interface CurrencyDto {
  code?: string
  name?: string
  symbol?: string
  decimals?: number
  is_active?: boolean
}

export interface CurrencyCreateDto {
  code?: string
  name?: string
  symbol?: string
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
  code?: string
  label?: string
  service_id?: number
  service_name?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface MedicalActCreateDto {
  code?: string
  label?: string
  service_id?: number
}

export interface MedicalActUpdateDto {
  id?: number
  code?: string
  label?: string
  service_id?: number
  is_active?: boolean
}

// ─── Price History ────────────────────────────────────────────
export interface ActPriceHistoryDto {
  id?: number
  act_id?: number
  old_price?: number
  new_price?: number
  change_reason?: string
  changed_at?: string
}

// ─── Tarifs (pricing) ──────────────────────────────────────────
export interface TarifDto {
  id?: number
  acte_id?: number
  code_tarif?: string
  prix_unitaire?: number
  date_application?: string
  created_at?: string
  updated_at?: string
  acte_code?: string
  acte_label?: string
  service_name?: string
}

export interface TarifCreateDto {
  acte_id?: number
  code_tarif?: string
  prix_unitaire?: number
  date_application?: string
}

export interface TarifBulkUpdateItem {
  acte_id?: number
  code_tarif?: string
  prix_unitaire?: number
}

export interface TarifBulkUpdateDto {
  items?: TarifBulkUpdateItem[]
  date_application?: string
}

// ─── System ────────────────────────────────────────────────────
export interface SystemInfoDto {
  app_version?: string
  electron_version?: string
  node_version?: string
  sqlite_version?: string
  platform?: string
  platform_arch?: string
  db_size_bytes?: number
  db_size_human?: string
  record_counts?: Record<string, number>
}

export interface DbStatsDto {
  db_size_bytes?: number
  db_size_human?: string
  record_counts?: Record<string, number>
}

export interface BackupResultDto {
  file_path?: string
  date?: string
  size_bytes?: number
}

export interface RestoreResultDto {
  needs_restart?: boolean
  safety_backup?: string
}

export interface AppInfoDto {
  app_version?: string
  electron_version?: string
  node_version?: string
  sqlite_version?: string
  platform?: string
  platform_arch?: string
}

// ─── Fonction ─────────────────────────────────────────────────
export interface FonctionDto {
  id?: number
  name?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface FonctionCreateDto {
  name?: string
}

export interface FonctionUpdateDto {
  name?: string
  is_active?: boolean
}

// ─── Service Favorites ──────────────────────────────────────────
export interface ServiceFavoriteDto {
  user_id?: number
  service_id?: number
  created_at?: string
}

// ─── Dispositif Type (catalog of device types) ──────────────────
export interface DispositifTypeDto {
  id?: number
  label?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

// ─── Voie Type (catalog of administration routes) ──────────────
export interface VoieTypeDto {
  id?: number
  label?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

// ─── Hospital Identity ──────────────────────────────────────────
export interface HospitalInfoDto {
  name?: string
  address?: string
  phone?: string
  email?: string
  city?: string
  regNumber?: string
}

// ─── Exam Categories ────────────────────────────────────────────
export interface ExamCategoryDto {
  id?: number
  code?: string
  label?: string
  sort_order?: number
}

// ─── Exam Types ─────────────────────────────────────────────────
export interface ExamTypeDto {
  id?: number
  category_id?: number
  parent_id?: number
  code?: string
  label?: string
  is_active?: boolean
  prix?: number
  category_label?: string
  parent_label?: string
  created_at?: string
  updated_at?: string
}

// ─── Exam Parameters ──────────────────────────────────────────
export interface ExamParameterReferenceValues {
  min?: number
  max?: number
  min_h?: number
  max_h?: number
  min_f?: number
  max_f?: number
  options?: Array<{ value: string; is_normal: boolean }>
  normal_value?: string
}

export interface ExamParameterDto {
  id?: number
  examId?: number
  sortOrder?: number
  name?: string
  unit?: string
  inputType?: 'numeric' | 'text' | 'select' | 'boolean'
  referenceValues?: ExamParameterReferenceValues
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
  examName?: string
}

// ─── Exam Results ─────────────────────────────────────────────
export interface ExamResultDto {
  id?: number
  examRequestId?: number
  parameterId?: number
  value?: string
  isNormal?: boolean
  filledBy?: number
  filledAt?: string
  createdAt?: string
  parameterName?: string
  parameterUnit?: string
  parameterInputType?: 'numeric' | 'text' | 'select' | 'boolean'
  parameterReferenceValues?: ExamParameterReferenceValues
  filledByName?: string
  requestDate?: string
  requestStatus?: string
  examName?: string
  validatedAt?: string | null
}
