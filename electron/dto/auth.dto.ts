export interface UserDto {
  id?: number
  nom?: string
  prenom?: string
  email?: string
  role?: 'MEDECIN' | 'SECRETAIRE' | 'PHARMACIEN' | 'COMPTABLE' | 'ADMIN'
  service?: string
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
  user: UserDto
  mustChangePassword?: boolean
}
