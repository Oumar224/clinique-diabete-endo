export interface StayDto {
  id?: number
  patient_id?: number
  admission_date?: string
  mode_admission?: 'urgences' | 'programmee' | 'transfert'
  service_id?: number
  service_name?: string
  chambre?: string
  lit?: string
  medecin_id?: number
  medecin_name?: string
  notes?: string
  status?: 'en_cours' | 'cloture' | 'transfere'
  sortie_date?: string
  created_by?: number
  created_at?: string
  updated_at?: string
}

export interface StayCreateDto {
  patient_id?: number
  admission_date?: string
  mode_admission?: 'urgences' | 'programmee' | 'transfert'
  service_id?: number
  medecin_id?: number
  chambre?: string
  lit?: string
  notes?: string
  created_by?: number
}

export interface StayMovementDto {
  id?: number
  stay_id?: number
  movement_type?: 'admission' | 'transfert_chambre' | 'transfert_service' | 'sortie'
  from_service_id?: number
  from_service_name?: string
  to_service_id?: number
  to_service_name?: string
  chambre?: string
  lit?: string
  moved_at?: string
  notes?: string
  created_at?: string
}
