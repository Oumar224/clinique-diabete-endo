export interface PatientActeDto {
  id?: number
  encounter_id?: number
  patient_id: number
  acte_id: number
  tarif_id?: number
  quantite: number
  statut_paiement: 'A_PAYER' | 'PAYE'
  created_at?: string
  acte_code?: string
  acte_label?: string
  prix_unitaire?: number
  code_tarif?: string
}

export interface PatientActeCreateDto {
  encounter_id?: number
  patient_id: number
  acte_id: number
  tarif_id?: number
  quantite?: number
}
