import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const exportingPdf = ref(false)
const exportingExcel = ref(false)

export function useExport() {
  async function exportUsersListPdf(filters?: any): Promise<boolean> {
    const api = (window as any).electronAPI
    if (!api) return false

    exportingPdf.value = true
    try {
      const result: any = await api.invoke('export:users-list-pdf', filters)
      if (result?.success) {
        ElMessage.success(`Fichier enregistré : ${result.data}`)
        return true
      }
      if (result?.message) ElMessage.error(result.message)
      return false
    } catch (e: any) {
      ElMessage.error(e.message || "Erreur lors de l'export PDF")
      return false
    } finally {
      exportingPdf.value = false
    }
  }

  async function exportUsersListExcel(filters?: any): Promise<boolean> {
    const api = (window as any).electronAPI
    if (!api) return false

    exportingExcel.value = true
    try {
      const result: any = await api.invoke('export:users-list-excel', filters)
      if (result?.success) {
        ElMessage.success(`Fichier enregistré : ${result.data}`)
        return true
      }
      if (result?.message) ElMessage.error(result.message)
      return false
    } catch (e: any) {
      ElMessage.error(e.message || "Erreur lors de l'export Excel")
      return false
    } finally {
      exportingExcel.value = false
    }
  }

  async function exportUserProfilePdf(userId: number): Promise<boolean> {
    const api = (window as any).electronAPI
    if (!api) return false

    exportingPdf.value = true
    try {
      const result: any = await api.invoke('export:user-profile-pdf', { userId })
      if (result?.success) {
        ElMessage.success(`Fichier enregistré : ${result.data}`)
        return true
      }
      if (result?.message) ElMessage.error(result.message)
      return false
    } catch (e: any) {
      ElMessage.error(e.message || "Erreur lors de l'export PDF")
      return false
    } finally {
      exportingPdf.value = false
    }
  }

  async function exportUserProfileExcel(userId: number): Promise<boolean> {
    const api = (window as any).electronAPI
    if (!api) return false

    exportingExcel.value = true
    try {
      const result: any = await api.invoke('export:user-profile-excel', { userId })
      if (result?.success) {
        ElMessage.success(`Fichier enregistré : ${result.data}`)
        return true
      }
      if (result?.message) ElMessage.error(result.message)
      return false
    } catch (e: any) {
      ElMessage.error(e.message || "Erreur lors de l'export Excel")
      return false
    } finally {
      exportingExcel.value = false
    }
  }

  return {
    exportingPdf,
    exportingExcel,
    exportUsersListPdf,
    exportUsersListExcel,
    exportUserProfilePdf,
    exportUserProfileExcel,
  }
}
