export interface TrustedPersonDto {
  id?: number
  patient_id: number
  has_trusted: boolean
  nom?: string
  prenom?: string
  profession?: string
  residence?: string
  residence_code?: string
  telephone?: string
  email?: string
  complement_adresse?: string
  lien_parente?: string
  attachments?: string
  created_at?: string
  updated_at?: string
}
