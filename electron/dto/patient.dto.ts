export interface PatientDto {
  id?: number
  civilite?: 'M' | 'Mme' | 'Mlle'
  nom?: string
  prenom?: string
  date_naissance?: string
  nir?: string
  telephone?: string
  email?: string
  adresse?: string
  mutuelle?: string
  medecin_traitant?: string
  allergies?: string[]
}
