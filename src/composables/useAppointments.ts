import { ipcInvoke } from '@/utils/ipc'

export interface AppointmentDto {
  id?: number
  patient_id?: number
  date?: string
  time?: string
  motif?: string
  status?: 'confirmed' | 'pending' | 'cancelled' | 'done'
  medecin_id?: number
  medecin_name?: string
  service_id?: number
  service_name?: string
  care_unit_id?: number
  care_unit_name?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface AppointmentCreateDto {
  patient_id: number
  date: string
  time: string
  motif?: string
  status?: 'confirmed' | 'pending' | 'cancelled' | 'done'
  medecin_id?: number | null
  service_id?: number | null
  care_unit_id?: number | null
  notes?: string | null
}

export async function listAppointmentsByPatient(patientId: number): Promise<AppointmentDto[]> {
  return ipcInvoke<AppointmentDto[]>('appointments:list-by-patient', { patient_id: patientId })
}

export async function getAppointment(id: number): Promise<AppointmentDto> {
  return ipcInvoke<AppointmentDto>('appointments:get', { id })
}

export async function createAppointment(data: AppointmentCreateDto): Promise<AppointmentDto> {
  return ipcInvoke<AppointmentDto>('appointments:create', data)
}

export async function updateAppointment(id: number, data: Partial<AppointmentCreateDto>): Promise<AppointmentDto> {
  return ipcInvoke<AppointmentDto>('appointments:update', { id, ...data })
}

export async function deleteAppointment(id: number): Promise<void> {
  await ipcInvoke('appointments:delete', { id })
}

export async function updateAppointmentStatus(id: number, status: AppointmentDto['status']): Promise<void> {
  await ipcInvoke('appointments:update-status', { id, status })
}
