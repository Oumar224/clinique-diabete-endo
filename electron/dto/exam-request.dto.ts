export interface ExamRequestDto {
  id?: number
  patientId?: number
  encounterId?: number
  type?: 'imagerie' | 'laboratoire' | 'avis'
  examenId?: number
  examIds?: number[]
  specialite?: string
  specialtyId?: number
  plannedHour?: number
  plannedDate?: string
  motif?: string
  statut?: 'en_attente' | 'en_cours' | 'realise' | 'annule'
  validatedAt?: string
  realizedAt?: string
  resultat?: string
  prescripteurId?: number
  createdBy?: number
  createdAt?: string
  updatedAt?: string
  prescripteurNom?: string
  examenLabel?: string
  specialtyName?: string
}
