export type ExamRequestStatut = 'en_attente' | 'en_cours' | 'realise' | 'annule'
export type ExamRequestPriorite = 'normale' | 'urgente'
export type ExamRequestStatutPaiement = 'non_paye' | 'partiel' | 'paye' | 'exonere'

export interface ExamRequestDto {
  id?: number
  numero?: string
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
  statut?: ExamRequestStatut
  priorite?: ExamRequestPriorite

  /** Patient externe : demande sans dossier patient. */
  patientExterne?: boolean
  externeNom?: string
  externePrenom?: string
  externeSexe?: string
  externeDateNaissance?: string
  externeTelephone?: string
  externeAdresse?: string

  /** Prescripteur externe (hors clinique). */
  prescripteurExterneNom?: string
  prescripteurExterneStructure?: string
  prescripteurExterneTelephone?: string

  /** Prélèvement. */
  prelevementType?: string
  prelevementAt?: string
  prelevementPar?: number

  /** Facturation. */
  factureId?: number
  montant?: number
  statutPaiement?: ExamRequestStatutPaiement
  /** Somme des encaissements enregistrés (lecture). */
  montantPaye?: number

  validatedAt?: string
  realizedAt?: string
  resultat?: string
  prescripteurId?: number
  createdBy?: number
  createdAt?: string
  updatedAt?: string

  // Champs de lecture (jointures)
  prescripteurNom?: string
  examenLabel?: string
  specialtyName?: string
  patientNom?: string
  patientPrenom?: string
}
