import type { VoieCode } from '../constants/voies'

export type FrequenceType = 'moments' | 'fixed-times' | 'interval'

/**
 * Voie côté DTO : le frontend peut envoyer un code ('PO') ou un label
 * long issu du seed ('PO (Per Os)'). La normalisation vers VoieCode
 * est appliquée dans PrescriptionEntity.fromDto / PrescriptionService.
 */
export type VoieInput = VoieCode | string

export interface PrescriptionDto {
  id?: number
  patientId?: number
  medicament?: string
  dosage?: string
  voie?: VoieInput
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
