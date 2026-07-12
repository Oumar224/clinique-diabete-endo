export interface ExamRequestDto {
  id?: number
  patientId: number
  encounterId?: number | null
  type: 'imagerie' | 'laboratoire'
  examenId?: number | null
  examIds?: number[]
  motif?: string
  statut: 'en_attente' | 'en_cours' | 'realise' | 'annule'
  prescripteurId?: number | null
  createdBy?: number | null
  createdAt?: string
  updatedAt?: string
  prescripteurNom?: string
  examenLabel?: string
}
