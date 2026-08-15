import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ipcInvoke } from '@/utils/ipc'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FormFieldValidator {
  type: string
  params?: any
}

export interface FormFieldSchema {
  key: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'radio' | 'checkbox' | 'autocomplete'
  label: string
  required?: boolean
  defaultValue?: any
  options?: { label: string; value: any }[]
  validators?: FormFieldValidator[]
  placeholder?: string
  helpText?: string
  conditional?: { field: string; value: any }
  layout?: { width: number }
}

export interface ClinicalDocumentTypeDTO {
  id: string
  code: string
  label: string
  description?: string
  formSchema: FormFieldSchema[]
  category: string
  isActive: boolean
  acteIdDeclenche?: number | null
  acteLabel?: string | null
  acteCode?: string | null
  prixUnitaire?: number | null
  contactTypes?: string[]
}

// ─── Internal raw DTO matching the backend shape ────────────────────────────
// The backend stores form_data as a JSON string; we parse it into an object
// via the normalizeDocument helper below.
interface RawClinicalDocumentDTO {
  id: string
  contactId: string
  serviceId: string | null
  documentTypeId: string
  title: string | null
  status: 'draft' | 'signed'
  formData: string | null
  source?: string
  pdfPath?: string | null
  signedAt: string | null
  signedBy: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ClinicalDocumentDTO {
  id: string
  contactId: string
  serviceId?: string
  documentTypeId: string
  title?: string
  status: 'draft' | 'signed'
  formData: Record<string, any>
  source?: string
  pdfPath?: string | null
  signedAt?: string
  signedBy?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  // Enriched at the composable level by matching against cached document types
  documentType?: ClinicalDocumentTypeDTO
}

// ─── Normalization helpers ───────────────────────────────────────────────────
function parseFormData(raw: string | null): Record<string, any> {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function normalizeDocument(
  raw: RawClinicalDocumentDTO,
  docTypes: ClinicalDocumentTypeDTO[],
): ClinicalDocumentDTO {
  return {
    id: raw.id,
    contactId: raw.contactId,
    serviceId: raw.serviceId ?? undefined,
    documentTypeId: raw.documentTypeId,
    title: raw.title ?? undefined,
    status: raw.status,
    formData: parseFormData(raw.formData),
    source: raw.source ?? 'created',
    pdfPath: raw.pdfPath ?? null,
    signedAt: raw.signedAt ?? undefined,
    signedBy: raw.signedBy ?? undefined,
    createdBy: raw.createdBy,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    documentType: docTypes.find(t => t.id === raw.documentTypeId),
  }
}

// ─── Composable ──────────────────────────────────────────────────────────────

export function useClinicalDocuments() {
  const documentTypes = ref<ClinicalDocumentTypeDTO[]>([])
  const documents = ref<ClinicalDocumentDTO[]>([])
  const selectedDocument = ref<ClinicalDocumentDTO | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isContactExpired = ref(false)

  let documentTypesLoaded = false

  async function fetchDocumentTypes(force = false): Promise<void> {
    if (documentTypesLoaded && !force) return
    try {
      documentTypes.value = await ipcInvoke<ClinicalDocumentTypeDTO[]>('clinical-documents:get-types')
      documentTypesLoaded = true
    } catch (e) {
      const msg = (e as Error).message
      error.value = msg
      ElMessage.error(`Erreur lors du chargement des types de documents: ${msg}`)
    }
  }

  async function fetchDocumentTypesWithPricing(): Promise<ClinicalDocumentTypeDTO[]> {
    try {
      return await ipcInvoke<ClinicalDocumentTypeDTO[]>('clinical-documents:get-types-with-pricing')
    } catch (e) {
      const msg = (e as Error).message
      ElMessage.error(`Erreur lors du chargement des types: ${msg}`)
      return []
    }
  }

  async function fetchDocuments(contactId: string): Promise<void> {
    loading.value = true
    error.value = null
    documents.value = []
    selectedDocument.value = null
    try {
      const result = await ipcInvoke<RawClinicalDocumentDTO[]>('clinical-documents:list', { contactId })
      documents.value = result.map(d => normalizeDocument(d, documentTypes.value))
    } catch (e) {
      const msg = (e as Error).message
      error.value = msg
      ElMessage.error(`Erreur lors du chargement des documents: ${msg}`)
    } finally {
      loading.value = false
    }
  }

  async function fetchDocumentsByPatient(patientId: number): Promise<void> {
    loading.value = true
    error.value = null
    documents.value = []
    selectedDocument.value = null
    try {
      const result = await ipcInvoke<RawClinicalDocumentDTO[]>('clinical-documents:list-by-patient', { patientId })
      documents.value = result.map(d => normalizeDocument(d, documentTypes.value))
    } catch (e) {
      const msg = (e as Error).message
      error.value = msg
      ElMessage.error(`Erreur lors du chargement des documents: ${msg}`)
    } finally {
      loading.value = false
    }
  }

  async function createDocument(
    typeId: string,
    contactId: string,
    serviceId: string,
    createdBy: string,
  ): Promise<ClinicalDocumentDTO | null> {
    try {
      const raw = await ipcInvoke<RawClinicalDocumentDTO>('clinical-documents:create', {
        documentTypeId: typeId,
        contactId,
        serviceId,
        createdBy,
      })
      const normalized = normalizeDocument(raw, documentTypes.value)
      documents.value.unshift(normalized)
      return normalized
    } catch (e) {
      const msg = (e as Error).message
      ElMessage.error(`Erreur lors de la création du document: ${msg}`)
      return null
    }
  }

  async function createDocumentWithActe(
    typeId: string,
    contactId: string,
    serviceId: string,
    createdBy: string,
  ): Promise<{ document: ClinicalDocumentDTO | null; acteId?: number; prixUnitaire?: number }> {
    try {
      const result = await ipcInvoke<any>('clinical-documents:create-with-acte', {
        documentTypeId: typeId,
        contactId,
        serviceId,
        createdBy,
      })
      const normalized = normalizeDocument(result.document, documentTypes.value)
      documents.value.unshift(normalized)
      return {
        document: normalized,
        acteId: result.acteId,
        prixUnitaire: result.prixUnitaire,
      }
    } catch (e) {
      const msg = (e as Error).message
      ElMessage.error(`Erreur lors de la création: ${msg}`)
      return { document: null }
    }
  }

  async function updateDocumentData(id: string, formData: Record<string, any>): Promise<boolean> {
    try {
      const raw = await ipcInvoke<RawClinicalDocumentDTO>('clinical-documents:update-data', {
        id,
        formData,
      })
      const normalized = normalizeDocument(raw, documentTypes.value)
      // Preserve the actual formData object we sent (normalizeDocument re-parses
      // the JSON string from the backend, which is identical — safe to keep either)
      normalized.formData = formData
      const idx = documents.value.findIndex(d => d.id === id)
      if (idx !== -1) {
        documents.value[idx] = normalized
      }
      if (selectedDocument.value?.id === id) {
        selectedDocument.value = normalized
      }
      return true
    } catch (e) {
      const msg = (e as Error).message
      ElMessage.error(`Erreur lors de l'enregistrement: ${msg}`)
      return false
    }
  }

  async function signDocument(id: string, userId: string): Promise<boolean> {
    try {
      const raw = await ipcInvoke<RawClinicalDocumentDTO>('clinical-documents:sign', { id, userId })
      const normalized = normalizeDocument(raw, documentTypes.value)
      const idx = documents.value.findIndex(d => d.id === id)
      if (idx !== -1) {
        documents.value[idx] = { ...documents.value[idx], ...normalized, status: 'signed' }
      }
      if (selectedDocument.value?.id === id) {
        selectedDocument.value = { ...selectedDocument.value, ...normalized, status: 'signed' }
      }
      ElMessage.success('Document signé et verrouillé')
      return true
    } catch (e) {
      const msg = (e as Error).message
      ElMessage.error(`Erreur lors de la signature: ${msg}`)
      return false
    }
  }

  async function deleteDocument(id: string): Promise<boolean> {
    try {
      await ipcInvoke('clinical-documents:delete', { id })
      documents.value = documents.value.filter(d => d.id !== id)
      if (selectedDocument.value?.id === id) {
        selectedDocument.value = null
      }
      ElMessage.success('Document supprimé')
      return true
    } catch (e) {
      const msg = (e as Error).message
      ElMessage.error(`Erreur lors de la suppression: ${msg}`)
      return false
    }
  }

  async function importPdf(contactId: string, createdBy: string): Promise<ClinicalDocumentDTO | null> {
    try {
      const raw = await ipcInvoke<RawClinicalDocumentDTO | null>('clinical-documents:import-pdf', { contactId, createdBy })
      if (!raw) return null
      const normalized = normalizeDocument(raw, documentTypes.value)
      documents.value.unshift(normalized)
      ElMessage.success('PDF importé')
      return normalized
    } catch (e) {
      const msg = (e as Error).message
      ElMessage.error(`Erreur lors de l'import PDF: ${msg}`)
      return null
    }
  }

  /**
   * Convert a File object to a base64 data string (without the data-URL prefix).
   * This is necessary because Electron's IPC cannot transfer raw File objects;
   * base64 encoding lets us send the binary payload as a JSON-safe string.
   */
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        // Strip "data:<mime>;base64," prefix to get raw base64
        const base64 = dataUrl.split(',')[1] ?? ''
        resolve(base64)
      }
      reader.onerror = () => reject(new Error('Impossible de lire le fichier'))
      reader.readAsDataURL(file)
    })
  }

  async function importFile(params: {
    contactId: string
    createdBy: string
    file: File
    documentTypeId?: string
    title?: string
  }): Promise<ClinicalDocumentDTO | null> {
    try {
      // Convert the File to base64 so it can be sent over IPC as JSON
      const fileData = await fileToBase64(params.file)
      const raw = await ipcInvoke<RawClinicalDocumentDTO | null>('clinical-documents:import-file', {
        contactId: params.contactId,
        createdBy: params.createdBy,
        fileData,
        fileName: params.file.name,
        documentTypeId: params.documentTypeId,
        title: params.title,
      })
      if (!raw) return null
      const normalized = normalizeDocument(raw, documentTypes.value)
      documents.value.unshift(normalized)
      ElMessage.success('Document importé')
      return normalized
    } catch (e) {
      const msg = (e as Error).message
      ElMessage.error(`Erreur lors de l'import du document: ${msg}`)
      return null
    }
  }

  async function openPdf(pdfPath: string): Promise<void> {
    try {
      await ipcInvoke('clinical-documents:open-pdf', { pdfPath })
    } catch (e) {
      ElMessage.error(`Erreur lors de l'ouverture du PDF: ${(e as Error).message}`)
    }
  }

  async function checkContactExpired(contactId: string): Promise<boolean> {
    try {
      isContactExpired.value = await ipcInvoke<boolean>('clinical-documents:check-contact-expired', { contactId })
      return isContactExpired.value
    } catch {
      isContactExpired.value = false
      return false
    }
  }

  function resetDocuments() {
    documents.value = []
    selectedDocument.value = null
    loading.value = false
    error.value = null
    isContactExpired.value = false
  }

  function getDocumentType(typeId: string): ClinicalDocumentTypeDTO | undefined {
    return documentTypes.value.find(t => t.id === typeId)
  }

  function selectDocument(doc: ClinicalDocumentDTO | null) {
    selectedDocument.value = doc
  }

  return {
    // State
    documentTypes,
    documents,
    selectedDocument,
    loading,
    error,
    isContactExpired,
    // Actions
    fetchDocumentTypes,
    fetchDocumentTypesWithPricing,
    fetchDocuments,
    fetchDocumentsByPatient,
    createDocument,
    createDocumentWithActe,
    importPdf,
    importFile,
    openPdf,
    updateDocumentData,
    signDocument,
    deleteDocument,
    checkContactExpired,
    resetDocuments,
    getDocumentType,
    selectDocument,
  }
}
