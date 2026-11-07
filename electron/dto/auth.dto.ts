export interface UserDto {
  id?: number
  nom?: string
  prenom?: string
  email?: string
  role?: 'MEDECIN' | 'SECRETAIRE' | 'PHARMACIEN' | 'COMPTABLE' | 'ADMIN' | 'INFIRMIER'
  service?: string
  photo?: string
  telephone?: string
  telephone_country_code?: string
  fonction?: string
  fonction_id?: number
  date_debut_contrat?: string
  date_fin_contrat?: string
  type_contrat?: string
  temps_travail: 'PLEIN' | 'PARTIEL'
  numero_securite_sociale?: string
  statut_resiliation?: string
  motif_resiliation?: string
  date_resiliation?: string
  resilie_par?: number
  is_active?: boolean
  is_validated?: boolean
  password?: string
}

export interface SessionDto {
  id?: string
  user_id?: number
  created_at?: string
  expires_at?: string
  last_activity?: string
  remember_me?: boolean
}

export interface LoginResult {
  token?: string
  user?: UserDto
  mustChangePassword?: boolean
}

export interface ValidatePasswordDto {
  userId?: number
  oldPassword?: string
  newPassword?: string
}

export interface SyncUserRelationsDto {
  id?: number
  specialty_ids?: number[]
  service_ids?: number[]
  site_ids?: number[]
  medical_unit_ids?: number[]
}

export interface TerminateContractDto {
  id?: number
  motif?: string
  resilie_par?: number
}
