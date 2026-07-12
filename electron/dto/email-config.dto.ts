export interface EmailConfigDto {
  id?: number
  smtp_host: string
  smtp_port: number
  smtp_user: string
  sender_email: string
  sender_name: string
  is_configured: boolean
  created_at?: string
  updated_at?: string
}

export interface EmailConfigSaveDto {
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_pass: string
  sender_email: string
  sender_name: string
}
