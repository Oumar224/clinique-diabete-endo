import { ref, type Ref } from 'vue'
import { ElMessage } from 'element-plus'

const exportingPdf = ref(false)
const exportingExcel = ref(false)
const error = ref<string | null>(null)

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

  error.value = null
  loadingRef.value = true
  try {
    const result: any = await api.invoke(channel, params)
    if (result?.success) {
      ElMessage.success(`Fichier enregistré : ${result.data}`)
      return true
    }
    if (result?.message) ElMessage.error(result.message)
    return false
  } catch (e) {
    error.value = (e as Error).message
    ElMessage.error((e as Error).message || errorMessage || "Erreur lors de l'export")
    return false
  } finally {
    loadingRef.value = false
  }
}

async function fetchPreview(
  channel: string,
  params: unknown,
  errorMessage: string,
  formData?: Record<string, any>,
): Promise<string | null> {
  const api = getApi()
  if (!api) return null

  error.value = null
  try {
    const payload = formData && params && typeof params === 'object'
      ? { ...(params as Record<string, any>), formData }
      : params
    const result: any = await api.invoke(channel, payload)
    if (result?.success && typeof result.data === 'string') {
      return result.data
    }
    ElMessage.error(result?.message || errorMessage)
    return null
  } catch (e) {
    error.value = (e as Error).message
    ElMessage.error((e as Error).message || errorMessage)
    return null
  }
}

export interface DiabeteExportParams {
  documentId?: string | null
  patientId?: number | null
  contactId?: string | number | null
  formData?: Record<string, any>
}

function normalizeDiabeteParams(
  params: DiabeteExportParams | string,
  legacyFormData?: Record<string, any>,
): DiabeteExportParams {
  if (typeof params === 'string') {
    return { documentId: params, formData: legacyFormData }
  }
  return params
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

  async function exportCrhDiabetePdf(params: DiabeteExportParams | string, formData?: Record<string, any>): Promise<boolean> {
    return invokeExport(exportingPdf, 'export:crh-diabete-pdf', normalizeDiabeteParams(params, formData), "Erreur lors de l'export PDF du CRH")
  }

  async function exportCrcDiabetePdf(params: DiabeteExportParams | string, formData?: Record<string, any>): Promise<boolean> {
    return invokeExport(exportingPdf, 'export:crc-diabete-pdf', normalizeDiabeteParams(params, formData), "Erreur lors de l'export PDF du CRC")
  }

  async function exportOrdonnancePdf(patientId: number): Promise<boolean> {
    return invokeExport(exportingPdf, 'export:prescription-pdf', { patientId }, "Erreur lors de l'export PDF de l'ordonnance")
  }

  function previewCrhDiabete(params: DiabeteExportParams | string, formData?: Record<string, any>): Promise<string | null> {
    return fetchPreview('export:crh-diabete-preview', typeof params === 'string' ? { documentId: params } : params, "Erreur lors de l'aperçu du CRH", formData)
  }

  function previewCrcDiabete(params: DiabeteExportParams | string, formData?: Record<string, any>): Promise<string | null> {
    return fetchPreview('export:crc-diabete-preview', typeof params === 'string' ? { documentId: params } : params, "Erreur lors de l'aperçu du CRC", formData)
  }

  return {
    exportingPdf,
    exportingExcel,
    error,
    exportUsersListPdf,
    exportUsersListExcel,
    exportUserProfilePdf,
    exportUserProfileExcel,
    exportPatientProfilePdf,
    exportPatientsListExcel,
    exportCrhDiabetePdf,
    exportCrcDiabetePdf,
    exportOrdonnancePdf,
    previewCrhDiabete,
    previewCrcDiabete,
  }
}
