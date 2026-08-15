export interface EncounterDto {
  id?: number
  patient_id?: number
  contact_type?: 'consultation' | 'hospitalisation'
  contact_type_precision?: string
  start_date?: string
  end_date?: string
  service_id?: number
  service_name?: string
  medecin_id?: number
  medecin_name?: string
  responsable_id?: number 
  responsable_name?: string
  care_unit_id?: number 
  care_unit_name?: string
  origin?: string
  origin_precision?: string
  zone_situation?: string
  zone_precision?: string
  prise_en_charge?: string
  prise_en_charge_precision?: string
  sinistre_info?: string
  notes?: string
  status?: 'active' | 'closed'
  created_by?: number
  created_at?: string
  updated_at?: string
}

export interface EncounterUpdateDto {
  id?: number
  contact_type?: string
  contact_type_precision?: string
  start_date?: string
  end_date?: string
  service_id?: number
  medecin_id?: number
  responsable_id?: number
  care_unit_id?: number
  origin?: string
  origin_precision?: string
  zone_situation?: string
  zone_precision?: string
  prise_en_charge?: string
  prise_en_charge_precision?: string
  sinistre_info?: string
  notes?: string
}

export interface EncounterCreateDto {
  patient_id?: number
  contact_type?: string
  contact_type_precision?: string
  start_date?: string
  end_date?: string
  service_id?: number
  medecin_id?: number
  responsable_id?: number
  care_unit_id?: number
  origin?: string
  origin_precision?: string
  zone_situation?: string
  zone_precision?: string
  prise_en_charge?: string
  prise_en_charge_precision?: string
  sinistre_info?: string
  notes?: string
  created_by?: number
}

export interface EncounterMovementDto {
  id?: number
  encounter_id?: number
  from_service_id?: number
  from_service_name?: string
  service_id?: number
  service_name?: string
  step_label?: string
  entered_at?: string
  exited_at?: string
  motif?: string
  notes?: string
  created_by?: number
  created_at?: string
}

export interface EncounterMovementCreateDto {
  encounter_id?: number
  from_service_id?: number
  service_id?: number
  step_label?: string
  entered_at?: string
  exited_at?: string
  motif?: string
  notes?: string
  created_by?: number
}

export interface EncounterListFilters {
  patient_id?: number
  status?: string
}
