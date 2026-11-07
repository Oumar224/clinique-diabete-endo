import { ref } from 'vue'
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
  case_type?: 'diabete' | 'thyroide_endocrino' | 'autre' | null
  is_new_case?: number | null
  /** Type du séjour miroir (hospitalisation) — stocké dans `stays.type`. */
  stay_type?: 'jour' | 'complete' | null
  care_unit_id?: number | null
  care_unit_name?: string | null
  status: 'active' | 'closed'
  created_by?: number | null
  created_at?: string
  updated_at?: string
}

export interface EncounterMovementDto {
  id?: number
  encounter_id: number
  from_service_id?: number | null
  from_service_name?: string
  service_id?: number | null
  service_name?: string
  step_label: string
  entered_at: string
  exited_at?: string | null
  motif?: string | null
  notes?: string | null
  created_by?: number | null
  created_at?: string
}

export interface EncounterMovementCreateDto {
  encounter_id: number
  from_service_id?: number | null
  service_id: number
  step_label: string
  entered_at: string
  exited_at?: string | null
  motif?: string | null
  notes?: string | null
  created_by?: number | null
}

const loading = ref(false)
const error = ref<string | null>(null)

export function useEncounters() {
  async function listEncountersByPatient(patientId: number, status?: string): Promise<EncounterDto[]> {
    loading.value = true
    error.value = null
    try {
      return await ipcInvoke<EncounterDto[]>('encounters:list-by-patient', { patient_id: patientId, status })
    } catch (e) {
      error.value = (e as Error).message
      return []
    } finally {
      loading.value = false
    }
  }

  async function getEncounter(id: number): Promise<EncounterDto | null> {
    loading.value = true
    error.value = null
    try {
      return await ipcInvoke<EncounterDto>('encounters:get', { id })
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function createEncounter(data: {
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
    case_type?: 'diabete' | 'thyroide_endocrino' | 'autre' | null
    is_new_case?: number | null
    stay_type?: 'jour' | 'complete' | null
    care_unit_id?: number | null
    created_by?: number | null
  }): Promise<EncounterDto | null> {
    loading.value = true
    error.value = null
    try {
      return await ipcInvoke<EncounterDto>('encounters:create', data)
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function getEncounterMovements(encounterId: number): Promise<EncounterMovementDto[]> {
    loading.value = true
    error.value = null
    try {
      return await ipcInvoke<EncounterMovementDto[]>('encounters:get-movements', { encounter_id: encounterId })
    } catch (e) {
      error.value = (e as Error).message
      return []
    } finally {
      loading.value = false
    }
  }

  async function updateEncounter(id: number, data: Partial<{
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
    case_type?: 'diabete' | 'thyroide_endocrino' | 'autre' | null
    is_new_case?: number | null
    stay_type?: 'jour' | 'complete' | null
    care_unit_id?: number | null
  }>): Promise<EncounterDto | null> {
    loading.value = true
    error.value = null
    try {
      return await ipcInvoke<EncounterDto>('encounters:update', { id, ...data })
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteEncounter(id: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await ipcInvoke('encounters:delete', { id })
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function closeEncounter(id: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await ipcInvoke('encounters:close', { id })
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function addEncounterMovement(dto: EncounterMovementCreateDto): Promise<EncounterMovementDto | null> {
    loading.value = true
    error.value = null
    try {
      return await ipcInvoke<EncounterMovementDto>('encounters:add-movement', dto)
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  async function closeCurrentEncounterMovement(encounterId: number): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await ipcInvoke('encounters:close-current-movement', { encounter_id: encounterId })
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    listEncountersByPatient,
    getEncounter,
    createEncounter,
    updateEncounter,
    deleteEncounter,
    getEncounterMovements,
    addEncounterMovement,
    closeCurrentEncounterMovement,
    closeEncounter,
  }
}
