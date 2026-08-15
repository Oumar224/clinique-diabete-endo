import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

const hasDraft = ref(false)
const currentFormType = ref<'patient_create' | 'patient_edit' | null>(null)
const currentPatientId = ref<number | null>(null)
const error = ref<string | null>(null)

export function usePatientFormDraft() {
  async function loadDraft(formType: string, patientId?: number): Promise<{ formData: any; activeStep: number } | null> {
    try {
      const result = await ipcInvoke<any>('form-draft:get', { formType, patientId })
      if (result) {
        const parsed = JSON.parse(result.form_data)
        currentFormType.value = formType as any
        currentPatientId.value = patientId ?? null
        hasDraft.value = true
        return { formData: parsed, activeStep: result.active_step }
      }
    } catch (e) {
      error.value = (e as Error).message
    }
    return null
  }

  async function saveDraft(formType: string, data: Record<string, any>, step: number, patientId?: number) {
    try {
      await ipcInvoke('form-draft:upsert', {
        form_type: formType,
        form_data: JSON.stringify(data),
        patient_id: patientId,
        active_step: step,
      })
      currentFormType.value = formType as any
      currentPatientId.value = patientId ?? null
      hasDraft.value = true
    } catch (e) {
      error.value = (e as Error).message
    }
  }

  async function clearDraft() {
    try {
      await ipcInvoke('form-draft:delete', {
        formType: currentFormType.value || 'patient_create',
        patientId: currentPatientId.value ?? undefined,
      })
    } catch (e) {
      error.value = (e as Error).message
    }
    hasDraft.value = false
    currentFormType.value = null
    currentPatientId.value = null
  }

  return { hasDraft, currentFormType, currentPatientId, loadDraft, saveDraft, clearDraft, error }
}
