import { ref, watch, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useVitalSigns } from '@/composables/useVitalSigns'
import { useAuth } from '@/composables/useAuth'
import { ipcInvoke } from '@/utils/ipc'
import type { SoinItem, BlocHoraire } from '@/types/soins'
import { isInsulin, voieColor } from '@/types/soins'

export { isInsulin, voieColor }

export interface PlanSoinsContext {
  /** List of hourly blocks with their medication items. */
  blocs: Ref<BlocHoraire[]>
  /** True while fetching or mutating data. */
  loading: Ref<boolean>
  /** Last error message, if any. */
  error: Ref<string | null>
  /** True if insulin administration is blocked (glycemia missing). */
  insulinBlocked: Ref<boolean>
  /** Fetch the plan for a given patient and date. */
  fetchPlan: (patientId: number, date: string) => Promise<void>
  /** Mark a soin item as administered. */
  valider: (soin: SoinItem) => Promise<void>
  /** Suspend a soin item with a reason prompt. */
  suspendre: (soin: SoinItem) => Promise<void>
}

/**
 * Composable for managing the medication distribution plan.
 *
 * Requires `provideVitalSigns(patientId)` to be called in a parent component
 * so that `useVitalSigns()` (used internally) can inject the vital-signs
 * context for insulin/glycemia checks.
 *
 * @param patientId - Reactive patient ID to scope data to.
 */
export function usePlanSoins(patientId: Ref<number | null>): PlanSoinsContext {
  const blocs = ref<BlocHoraire[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const insulinBlocked = ref(false)

  const { hasGlycemieToday } = useVitalSigns()
  const { user } = useAuth()

  /** Build today's date string for fetching (local timezone). */
  function todayDate(): string {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  async function fetchPlan(id: number, date: string) {
    if (!id) {
      blocs.value = []
      loading.value = false
      error.value = null
      return
    }

    loading.value = true
    error.value = null
    try {
      const record = await ipcInvoke<any>('plan-soins:list', { patientId: id, date })
      blocs.value = record?.blocs ?? []
    } catch (e) {
      const msg = (e as Error).message
      error.value = msg
      ElMessage.error(`Erreur de chargement du plan de soins: ${msg}`)
    } finally {
      loading.value = false
    }
  }

  /**
   * Replace a soin item inside the blocs array by its id (reactive).
   */
  function replaceSoinInBlocs(soinId: number, updated: SoinItem): void {
    const current = blocs.value
    for (let b = 0; b < current.length; b++) {
      const idx = current[b].soins.findIndex(s => s.id === soinId)
      if (idx !== -1) {
        // Create a new array reference to trigger Vue reactivity
        const newSoins = [...current[b].soins]
        newSoins[idx] = { ...newSoins[idx], ...updated }
        current[b] = { ...current[b], soins: newSoins }
        // Trigger reactivity by replacing the entire blocs array
        blocs.value = [...current]
        return
      }
    }
  }

  async function valider(soin: SoinItem) {
    // Insulin check: glycemia required
    if (isInsulin(soin.medicament) && !hasGlycemieToday.value) {
      insulinBlocked.value = true
      ElMessage.warning('⚠️ Glycémie requise avant administration d\'insuline')
      return
    }
    insulinBlocked.value = false

    try {
      const validePar = user.value
        ? `${user.value.prenom} ${user.value.nom}`
        : 'Utilisateur inconnu'
      const updated = await ipcInvoke<any>('plan-soins:valider', { soinId: soin.id, validePar })
      replaceSoinInBlocs(soin.id, updated)
      ElMessage.success(`Administration de ${soin.medicament} validée`)
    } catch (e) {
      const msg = (e as Error).message
      error.value = msg
      ElMessage.error(`Erreur de validation: ${msg}`)
    }
  }

  async function suspendre(soin: SoinItem) {
    try {
      const { value: motif } = await ElMessageBox.prompt(
        'Motif de suspension / refus patient',
        'Justification',
        {
          inputPlaceholder: 'Raison...',
          inputValidator: (v: string) => !!v.trim() || 'La justification est requise',
        },
      )

      const updated = await ipcInvoke<any>('plan-soins:suspendre', { soinId: soin.id, motif })
      replaceSoinInBlocs(soin.id, updated)
      ElMessage.info(`${soin.medicament} suspendu: ${motif}`)
    } catch (err: unknown) {
      if (err === 'cancel' || err === 'close') return // User cancelled the prompt
      const msg = err instanceof Error ? err.message : String(err)
      error.value = msg
      ElMessage.error(`Erreur de suspension: ${msg}`)
    }
  }

  // Auto-fetch for today when patientId changes
  watch(patientId, (pid) => {
    if (pid) {
      fetchPlan(pid, todayDate())
    } else {
      blocs.value = []
    }
  }, { immediate: true })

  return {
    blocs,
    loading,
    error,
    insulinBlocked,
    fetchPlan,
    valider,
    suspendre,
  }
}

export function getPlanSoins(patientId: number, date: string): Promise<PlanSoinsRecord | null> {
  return ipcInvoke<PlanSoinsRecord | null>('plan-soins:list', { patientId, date })
}

export interface ValideRecord {
  date: string
  heure: string
  medicament: string
  dosage: string
  voie: string
  validePar: string | null
  valideA: string | null
}

export interface PlanSoinsRecord {
  id: number
  patientId: number
  date: string
  blocs: import('@/types/soins').BlocHoraire[]
  createdBy: number
  createdAt: string
  updatedAt: string
}

export function getValidesPlanSoins(patientId: number, startDate: string, endDate: string): Promise<ValideRecord[]> {
  return ipcInvoke<ValideRecord[]>('plan-soins:valides', { patientId, startDate, endDate })
}

export function reprendreSoin(soinId: number): Promise<any> {
  return ipcInvoke('plan-soins:reprise', { soinId })
}

export function suspendrePrescription(prescriptionId: number, motif: string): Promise<any[]> {
  return ipcInvoke('plan-soins:suspendre-prescription', { prescriptionId, motif })
}

export function reprendrePrescription(prescriptionId: number): Promise<any[]> {
  return ipcInvoke('plan-soins:reprendre-prescription', { prescriptionId })
}
