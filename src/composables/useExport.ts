import { ref, type Ref } from 'vue'
import { ElMessage } from 'element-plus'

const exportingPdf = ref(false)
const exportingExcel = ref(false)

function getApi() {
  return window.electronAPI
}

async function invokeExport(
  loadingRef: Ref<boolean>,
  channel: string,
  params?: unknown,
  errorMessage?: string,
): Promise<boolean> {
  const api = getApi()
  if (!api) return false

  loadingRef.value = true
  try {
    const result: any = await api.invoke(channel, params)
    if (result?.success) {
      ElMessage.success(`Fichier enregistré : ${result.data}`)
      return true
    }
    if (result?.message) ElMessage.error(result.message)
    return false
  } catch (e: any) {
    ElMessage.error(e.message || errorMessage || "Erreur lors de l'export")
    return false
  } finally {
    loadingRef.value = false
  }
}

export function useExport() {
  async function exportUsersListPdf(filters?: any): Promise<boolean> {
    return invokeExport(exportingPdf, 'export:users-list-pdf', filters, "Erreur lors de l'export PDF")
  }

  async function exportUsersListExcel(filters?: any): Promise<boolean> {
    return invokeExport(exportingExcel, 'export:users-list-excel', filters, "Erreur lors de l'export Excel")
  }

  async function exportUserProfilePdf(userId: number): Promise<boolean> {
    return invokeExport(exportingPdf, 'export:user-profile-pdf', { userId }, "Erreur lors de l'export PDF")
  }

  async function exportUserProfileExcel(userId: number): Promise<boolean> {
    return invokeExport(exportingExcel, 'export:user-profile-excel', { userId }, "Erreur lors de l'export Excel")
  }

  async function exportPatientProfilePdf(patientId: number): Promise<boolean> {
    return invokeExport(exportingPdf, 'export:patient-profile-pdf', { patientId }, "Erreur lors de l'export PDF patient")
  }

  async function exportPatientsListExcel(filters?: any): Promise<boolean> {
    return invokeExport(exportingExcel, 'export:patients-list-excel', filters, "Erreur lors de l'export Excel des patients")
  }

  async function exportCrhDiabetePdf(documentId: string): Promise<boolean> {
    return invokeExport(exportingPdf, 'export:crh-diabete-pdf', { documentId }, "Erreur lors de l'export PDF du CRH")
  }

  return {
    exportingPdf,
    exportingExcel,
    exportUsersListPdf,
    exportUsersListExcel,
    exportUserProfilePdf,
    exportUserProfileExcel,
    exportPatientProfilePdf,
    exportPatientsListExcel,
    exportCrhDiabetePdf,
  }
}
