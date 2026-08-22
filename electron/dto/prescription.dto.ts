export type FrequenceType = 'moments' | 'fixed-times' | 'interval'

export interface PrescriptionDto {
  id?: number
  patientId?: number
  medicament?: string
  dosage?: string
  voie?: string
  duree?: number
  dureeType?: 'courte' | 'longue'
  frequence?: string[] // array from comma-separated
  frequenceType?: FrequenceType
  prn?: boolean
  instructions?: string 
  datePrescription?: string
  prescripteurId?: number
  prescripteurNom?: string   // resolved from user table
  prescripteurRole?: string  // "MEDECIN", "INFIRMIER", etc.
  statut?: string
  type?: 'medicament' | 'soins'
  createdAt?: string
  updatedAt?: string
}
