export interface PatientDto {
  id?: number
  civilite?: '' | 'M' | 'Mme' | 'Mlle'
  nom?: string
  prenom?: string
  date_naissance?: string
  nir?: string
  telephone?: string
  email?: string
  mutuelle?: string
  medecin_traitant?: string
  allergies?: string[]
  automerge_id?: string
  photo?: string
  nip?: string
  lieu_naissance?: string
  residence_code?: string
  complement_adresse?: string
  region?: string
  profession?: string
  site_id?: number
}
