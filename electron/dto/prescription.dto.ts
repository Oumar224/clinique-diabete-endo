export interface PrescriptionDto {
  id: number
  patientId: number
  medicament: string
  dosage: string
  voie: string
  duree: number
  frequence: string[] // array from comma-separated
  prn: boolean
  instructions: string | null
  datePrescription: string
  prescripteurId: number
  prescripteurNom?: string   // resolved from user table
  prescripteurRole?: string  // "MEDECIN", "INFIRMIER", etc.
  statut: string
  createdAt: string
  updatedAt: string
}
