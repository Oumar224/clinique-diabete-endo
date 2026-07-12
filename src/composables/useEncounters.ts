import { ipcInvoke } from '@/utils/ipc'

export interface EncounterDto {
  id?: number
  patient_id: number
  contact_type: 'consultation' | 'hospitalisation' | 'urgence' | 'soin_externe' | 'autre'
  contact_type_precision?: string | null
  start_date: string
  end_date?: string | null
  service_id: number
  service_name?: string
  medecin_id?: number | null
  medecin_name?: string | null
  responsable_id?: number | null
  responsable_name?: string | null
  origin: string
  origin_precision?: string | null
  zone_situation: string
  zone_precision?: string | null
  prise_en_charge: string
  prise_en_charge_precision?: string | null
  sinistre_info?: string | null
  notes?: string | null
  contact_category_id?: number | null
  care_unit_id?: number | null
  status: 'active' | 'closed'
  created_by?: number | null
  created_at?: string
  updated_at?: string
}

export interface EncounterMovementDto {
  id?: number
  encounter_id: number
  service_id?: number | null
  service_name?: string
  step_label: string
  entered_at: string
  exited_at?: string | null
  notes?: string | null
  created_at?: string
}

export async function listEncountersByPatient(patientId: number, status?: string): Promise<EncounterDto[]> {
  return ipcInvoke<EncounterDto[]>('encounters:list-by-patient', { patient_id: patientId, status })
}

export async function getEncounter(id: number): Promise<EncounterDto> {
  return ipcInvoke<EncounterDto>('encounters:get', { id })
}

export async function createEncounter(data: {
  patient_id: number
  contact_type: string
  contact_type_precision?: string | null
  start_date: string
  end_date?: string | null
  service_id: number
  medecin_id?: number | null
  responsable_id?: number | null
  origin: string
  origin_precision?: string | null
  zone_situation: string
  zone_precision?: string | null
  prise_en_charge: string
  prise_en_charge_precision?: string | null
  sinistre_info?: string | null
  notes?: string | null
  contact_category_id?: number | null
  care_unit_id?: number | null
  created_by?: number | null
}): Promise<EncounterDto> {
  return ipcInvoke<EncounterDto>('encounters:create', data)
}

export async function getEncounterMovements(encounterId: number): Promise<EncounterMovementDto[]> {
  return ipcInvoke<EncounterMovementDto[]>('encounters:get-movements', { encounter_id: encounterId })
}

export async function updateEncounter(id: number, data: Partial<{
  contact_type: string
  contact_type_precision?: string | null
  start_date: string
  end_date?: string | null
  service_id: number
  medecin_id?: number | null
  responsable_id?: number | null
  origin: string
  origin_precision?: string | null
  zone_situation: string
  zone_precision?: string | null
  prise_en_charge: string
  prise_en_charge_precision?: string | null
  sinistre_info?: string | null
  notes?: string | null
  contact_category_id?: number | null
  care_unit_id?: number | null
}>): Promise<EncounterDto> {
  return ipcInvoke<EncounterDto>('encounters:update', { id, ...data })
}

export async function deleteEncounter(id: number): Promise<void> {
  await ipcInvoke('encounters:delete', { id })
}

export async function closeEncounter(id: number): Promise<void> {
  await ipcInvoke('encounters:close', { id })
}
