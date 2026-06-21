import { ref } from 'vue'
import type { FormInstance } from 'element-plus'

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
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.invoke('identity:get-info') as any
      if (result?.success && result.data) {
        info.value = result.data
      }
    } catch {}
    loaded.value = true
    loading.value = false
  }

  async function saveInfo(formEl: FormInstance | undefined): Promise<SaveResult> {
    if (!formEl) return { success: false, error: 'Formulaire non trouvé' }
    const valid = await formEl.validate().catch(() => false)
    if (!valid) return { success: false, error: 'Veuillez corriger les erreurs de formulaire' }

    if (!window.electronAPI) return { success: false, error: 'Application non initialisée' }
    try {
      const result = await window.electronAPI.invoke('identity:save-info', info.value) as any
      if (result?.success) {
        return { success: true }
      }
      return { success: false, error: result?.message || 'Erreur lors de la sauvegarde des informations' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde des informations'
      return { success: false, error: message }
    }
  }

  async function saveLogo(base64Data: string): Promise<SaveResult> {
    if (!window.electronAPI) return { success: false, error: 'Application non initialisée' }
    try {
      const result = await window.electronAPI.invoke('identity:save-logo', base64Data) as any
      if (result?.success) {
        return { success: true }
      }
      return { success: false, error: result?.message || 'Erreur lors de la sauvegarde du logo' }
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
