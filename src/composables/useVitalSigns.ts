import { ref, computed, provide, inject, watch, type Ref, type ComputedRef } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getVitalSigns as apiGetVitalSigns,
  saveVitalSigns as apiSaveVitalSigns,
  type VitalSignsRecord,
} from '@/api/vitalSigns'

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
      const record = await apiGetVitalSigns(pid)
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
      const record = await apiSaveVitalSigns(pid, data)
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
  }
}
