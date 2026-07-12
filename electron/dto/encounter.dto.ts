export interface EncounterDto {
  id?: number
  patient_id: number
  contact_type: 'consultation' | 'hospitalisation'
  contact_type_precision?: string | null
  start_date: string
  end_date?: string
  service_id: number
  service_name?: string
  medecin_id?: number | null
  medecin_name?: string | null
  responsable_id: number | null
  responsable_name?: string | null
  contact_category_id: number | null
  contact_category_label?: string | null
  care_unit_id: number | null
  care_unit_name?: string | null
  origin: string
  origin_precision?: string | null
  zone_situation: string
  zone_precision?: string | null
  prise_en_charge: string
  prise_en_charge_precision?: string | null
  sinistre_info?: string | null
  notes?: string | null
  status: 'active' | 'closed'
  created_by?: number | null
  created_at?: string
  updated_at?: string
}

export interface EncounterUpdateDto {
  id: number
  contact_type?: string
  contact_type_precision?: string | null
  start_date?: string
  end_date?: string | null
  service_id?: number
  medecin_id?: number | null
  responsable_id?: number | null
  contact_category_id?: number | null
  care_unit_id?: number | null
  origin?: string
  origin_precision?: string | null
  zone_situation?: string
  zone_precision?: string | null
  prise_en_charge?: string
  prise_en_charge_precision?: string | null
  sinistre_info?: string | null
  notes?: string | null
}

export interface EncounterCreateDto {
  patient_id: number
  contact_type: string
  contact_type_precision?: string | null
  start_date: string
  end_date?: string | null
  service_id: number
  medecin_id?: number | null
  responsable_id?: number | null
  contact_category_id?: number | null
  care_unit_id?: number | null
  origin: string
  origin_precision?: string | null
  zone_situation: string
  zone_precision?: string | null
  prise_en_charge: string
  prise_en_charge_precision?: string | null
  sinistre_info?: string | null
  notes?: string | null
  created_by?: number | null
}

export interface EncounterMovementDto {
  id?: number
  encounter_id: number
  service_id?: number | null
  service_name?: string
  step_label: string
  entered_at: string
  exited_at?: string | null
  notes?: string | null
  created_at?: string
}

export interface EncounterListFilters {
  patient_id: number
  status?: string
}
