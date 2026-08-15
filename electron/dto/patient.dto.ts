export interface PatientDto {
  id?: number
  civilite?: '' | 'M' | 'Mme' | 'Mlle'
  nom?: string
  prenom?: string
  date_naissance?: string
  nir?: string
  telephone?: string
  email?: string
  medecin_traitant?: string
  allergies?: Array<string | { libelle: string; type: string }>
  automerge_id?: string
  photo?: string
  nip?: string
  lieu_naissance?: string
  residence_code?: string
  adresse?: string
  complement_adresse?: string
  region?: string
  profession?: string
  site_id?: number
  assuranceMutuelle?: string
  consentementEtude?: string
}
