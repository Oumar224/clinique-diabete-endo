import { ref, computed, provide, inject, watch, type Ref, type ComputedRef } from 'vue'
import { ElMessage } from 'element-plus'
import { ipcInvoke } from '@/utils/ipc'

/**
 * Vital signs frontend model (matches what the form produces).
 */
export interface VitalSigns {
  date: string
  taSystolique: number | null
  taDiastolique: number | null
  frequenceCardiaque: number | null
  temperature: number | null
  glycemie: number | null
  cetonemie: number | null
  glucosurie: string | null
  cetonurie: string | null
  saO2: number | null
  diurese: number | null
  poids: number | null
}

export interface VitalSignsRecord extends VitalSigns {
  id: number
  patientId: number
  createdBy: number
  createdAt: string
  updatedAt: string
}

// ── Provide/Inject key ────────────────────────────────────────────────────

const VITAL_SIGNS_KEY = Symbol('vitalSigns')

// ── Context type ──────────────────────────────────────────────────────────
export interface VitalSignsContext {
  /** The current patient's vital signs (null if none / not loaded). */
  vitalSigns: Ref<VitalSigns | null>
  /** True while fetching or saving. */
  loading: Ref<boolean>
  /** Last error message, if any. */
  error: Ref<string | null>
  /** True if glycemia > 0 was recorded today. */
  hasGlycemieToday: ComputedRef<boolean>
  /** Fetch vital signs from the backend for the current patient. */
  fetchVitalSigns: () => Promise<void>
  /**
   * Save vital signs to the backend for the current patient.
   * On success updates `vitalSigns` and shows a success toast.
   * On failure sets `error` and shows an error toast.
   */
  saveVitalSigns: (data: VitalSigns) => Promise<void>
  /** Reset local state to defaults. */
  resetVitalSigns: () => void
}

// ── Provider ──────────────────────────────────────────────────────────────

/**
 * Provide a scoped vital-signs context for a patient.
 *
 * Must be called in a parent component (e.g. `SoinsView`)
 * so that children can `inject` it via `useVitalSigns()`.
 *
 * @param patientId - Reactive reference to the current patient ID.
 *                    When this changes, data is auto-fetched.
 */
export function provideVitalSigns(patientId: Ref<number | null>): VitalSignsContext {
  const vitalSigns = ref<VitalSigns | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const hasGlycemieToday = computed(() => {
    if (!vitalSigns.value) return false
    const today = new Date().toISOString().slice(0, 10)
    if (!vitalSigns.value.date.startsWith(today)) return false
    return vitalSigns.value.glycemie != null && vitalSigns.value.glycemie > 0
  })

  async function fetchVitalSigns() {
    const pid = patientId.value
    if (!pid) {
      vitalSigns.value = null
      loading.value = false
      error.value = null
      return
    }

    loading.value = true
    error.value = null
    try {
      const record = await ipcInvoke<VitalSignsRecord | null>('vital-signs:get-today', { patientId: pid })
      vitalSigns.value = record ? toVitalSigns(record) : null
    } catch (e) {
      const msg = (e as Error).message
      error.value = msg
    } finally {
      loading.value = false
    }
  }

  async function saveVitalSigns(data: VitalSigns) {
    const pid = patientId.value
    if (!pid) {
      ElMessage.warning('Aucun patient sélectionné')
      return
    }

    loading.value = true
    error.value = null
    try {
      const record = await ipcInvoke<VitalSignsRecord>('vital-signs:save', { patientId: pid, ...data })
      vitalSigns.value = toVitalSigns(record)
      ElMessage.success('Constantes enregistrées')
    } catch (e) {
      const msg = (e as Error).message
      error.value = msg
      ElMessage.error(`Erreur lors de l'enregistrement: ${msg}`)
    } finally {
      loading.value = false
    }
  }

  function resetVitalSigns() {
    vitalSigns.value = null
    error.value = null
  }

  // Auto-fetch when patient ID changes
  watch(patientId, () => {
    fetchVitalSigns()
  }, { immediate: true })

  const context: VitalSignsContext = {
    vitalSigns,
    loading,
    error,
    hasGlycemieToday,
    fetchVitalSigns,
    saveVitalSigns,
    resetVitalSigns,
  }

  provide(VITAL_SIGNS_KEY, context)

  return context
}

// ── Consumer ──────────────────────────────────────────────────────────────
/**
 * Inject the vital-signs context provided by a parent component.
 *
 * Calling this outside of a component that has called
 * `provideVitalSigns(patientId)` will throw.
 */
export function useVitalSigns(): VitalSignsContext {
  const context = inject<VitalSignsContext>(VITAL_SIGNS_KEY)
  if (!context) {
    throw new Error(
      '[useVitalSigns] No vital-signs provider found. ' +
      'Ensure `provideVitalSigns(patientId)` is called in a parent component ' +
      '(e.g. SoinsView).',
    )
  }
  return context
}


// ── Private helpers ───────────────────────────────────────────────────────
function toVitalSigns(record: VitalSignsRecord): VitalSigns {
  return {
    date: record.date,
    taSystolique: record.taSystolique,
    taDiastolique: record.taDiastolique,
    frequenceCardiaque: record.frequenceCardiaque,
    temperature: record.temperature,
    glycemie: record.glycemie,
    cetonemie: record.cetonemie,
    glucosurie: record.glucosurie,
    cetonurie: record.cetonurie,
    saO2: record.saO2,
    diurese: record.diurese,
    poids: record.poids,
  }
}

export interface VitalSignsItemInput {
  date: string
  hour: number
  taSystolique: number | null
  taDiastolique: number | null
  frequenceCardiaque: number | null
  temperature: number | null
  glycemie: number | null
  cetonemie: number | null
  glucosurie: string | null
  cetonurie: string | null
  saO2: number | null
  diurese: number | null
  poids: number | null
}

export interface VitalSignsItemRecord extends VitalSignsItemInput {
  id: number
  patientId: number
  createdBy: number
  createdAt: string
  updatedAt: string
}

export function getVitalSignsList(patientId: number, startDate: string, endDate: string): Promise<VitalSignsRecord[]> {
  return ipcInvoke<VitalSignsRecord[]>('vital-signs:list', { patientId, startDate, endDate })
}

export function getVitalSignsItemsList(patientId: number, startDate: string, endDate: string): Promise<VitalSignsItemRecord[]> {
  return ipcInvoke<VitalSignsItemRecord[]>('vital-signs-items:list', { patientId, startDate, endDate })
}

/**
 * Distinct dates (YYYY-MM-DD) having vital-signs items for the patient,
 * most recent first. Used to build recorded-dates columns (cf. ResultatsBio).
 */
export function getVitalSignsItemsDates(patientId: number): Promise<string[]> {
  return ipcInvoke<string[]>('vital-signs-items:dates', { patientId })
}

export function saveVitalSignsItem(patientId: number, data: VitalSignsItemInput): Promise<VitalSignsItemRecord> {
  return ipcInvoke<VitalSignsItemRecord>('vital-signs-items:save', { patientId, ...data })
}

export function deleteVitalSignsItem(id: number): Promise<void> {
  return ipcInvoke<void>('vital-signs-items:delete', { id })
}
