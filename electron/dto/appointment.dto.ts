export interface AppointmentDto {
  id?: number
  patient_id?: number
  date?: string
  time?: string
  motif?: string
  status?: 'confirmed' | 'pending' | 'cancelled' | 'done'
  medecin_id?: number
  notes?: string
}
