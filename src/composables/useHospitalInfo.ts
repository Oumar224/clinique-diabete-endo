import { ref } from 'vue'
import type { FormInstance } from 'element-plus'
import { ipcInvoke } from '@/utils/ipc'

export interface HospitalInfoDto {
  name: string
  address: string
  phone: string
  email: string
  city: string
  regNumber: string
}

export interface SaveResult {
  success: boolean
  error?: string
}

const info = ref<HospitalInfoDto>({
  name: '',
  address: '',
  phone: '',
  email: '',
  city: '',
  regNumber: '',
})
const loading = ref(false)
const loaded = ref(false)

export function useHospitalInfo() {
  async function loadInfo() {
    if (loaded.value) return
    loading.value = true
    try {
      const data = await ipcInvoke<HospitalInfoDto>('identity:get-info')
      if (data) {
        info.value = data
      }
    } catch {}
    loaded.value = true
    loading.value = false
  }

  async function saveInfo(formEl: FormInstance | undefined): Promise<SaveResult> {
    if (!formEl) return { success: false, error: 'Formulaire non trouvé' }
    const valid = await formEl.validate().catch(() => false)
    if (!valid) return { success: false, error: 'Veuillez corriger les erreurs de formulaire' }

    try {
      await ipcInvoke('identity:save-info', info.value)
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde des informations'
      return { success: false, error: message }
    }
  }

  async function saveLogo(base64Data: string): Promise<SaveResult> {
    try {
      await ipcInvoke('identity:save-logo', base64Data)
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde du logo'
      return { success: false, error: message }
    }
  }

  return {
    info,
    loading,
    loaded,
    loadInfo,
    saveInfo,
    saveLogo,
  }
}
