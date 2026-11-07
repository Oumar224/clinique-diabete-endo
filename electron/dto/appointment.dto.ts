export interface AppointmentDto {
  id?: number
  patient_id?: number
  date?: string
  time?: string
  motif?: string
  status?: 'confirmed' | 'pending' | 'cancelled' | 'done'
  medecin_id?: number
  medecin_name?: string
  service_id?: number
  service_name?: string
  care_unit_id?: number
  care_unit_name?: string
  notes?: string
  patient_nom?: string
  created_at?: string
  updated_at?: string
}
