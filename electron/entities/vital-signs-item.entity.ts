export interface VitalSignsItemEntity {
  id?: number
  patient_id: number
  date: string
  hour: number
  ta_systolique: number | null
  ta_diastolique: number | null
  frequence_cardiaque: number | null
  temperature: number | null
  glycemie: number | null
  cetonemie: number | null
  glucosurie: string | null
  cetonurie: string | null
  sa_o2: number | null
  diurese: number | null
  poids: number | null
  created_by: number
  created_at?: string
  updated_at?: string
}
