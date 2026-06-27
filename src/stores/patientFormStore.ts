import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export const usePatientFormStore = defineStore('patientForm', () => {
  const hasDraft = ref(false)
  const currentFormType = ref<'patient_create' | 'patient_edit' | null>(null)
  const currentPatientId = ref<number | null>(null)

  async function loadDraft(formType: string, patientId?: number): Promise<{ formData: any; activeStep: number } | null> {
    try {
      const result = await ipcInvoke<any>('form-draft:get', { formType, patientId })
      if (result) {
        const parsed = JSON.parse(result.formData)
        currentFormType.value = formType as any
        currentPatientId.value = patientId ?? null
        hasDraft.value = true
        return { formData: parsed, activeStep: result.activeStep }
      }
    } catch {}
    return null
  }

  async function saveDraft(formType: string, data: Record<string, any>, step: number, patientId?: number) {
    try {
      await ipcInvoke('form-draft:upsert', {
        formType,
        formData: JSON.stringify(data),
        patientId,
        activeStep: step,
      })
      currentFormType.value = formType as any
      currentPatientId.value = patientId ?? null
      hasDraft.value = true
    } catch {}
  }

  async function clearDraft() {
    try {
      await ipcInvoke('form-draft:delete', {
        formType: currentFormType.value || 'patient_create',
        patientId: currentPatientId.value ?? undefined,
      })
    } catch {}
    hasDraft.value = false
    currentFormType.value = null
    currentPatientId.value = null
  }

  return { hasDraft, currentFormType, currentPatientId, loadDraft, saveDraft, clearDraft }
})
