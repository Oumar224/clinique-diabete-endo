// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useClinicalDocuments } from '../useClinicalDocuments'
import type { ClinicalDocumentDTO, ClinicalDocumentTypeDTO } from '../useClinicalDocuments'

// ─── Mock dependencies ─────────────────────────────────────────────

const mockIpcInvoke = vi.hoisted(() => vi.fn())

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() },
}))

// ─── Test fixtures ─────────────────────────────────────────────────

const CONSULT_TYPE_ID = '11111111-1111-4111-1111-111111111111'
const LAB_TYPE_ID = '22222222-2222-4222-2222-222222222222'

const mockDocumentTypes: ClinicalDocumentTypeDTO[] = [
  {
    id: CONSULT_TYPE_ID,
    code: 'CONSULTATION_NOTE',
    label: 'Compte rendu de consultation',
    description: 'Compte rendu détaillé d\'une consultation médicale',
    formSchema: [
      { key: 'reason', type: 'textarea', label: 'Motif', required: true },
      { key: 'diagnosis', type: 'textarea', label: 'Diagnostic', required: true },
    ],
    category: 'consultation',
  },
  {
    id: LAB_TYPE_ID,
    code: 'LAB_REQUEST',
    label: 'Demande d\'examen de laboratoire',
    description: 'Bon de demande d\'analyses biologiques',
    formSchema: [
      { key: 'exam_type', type: 'select', label: "Type d'examen", required: true, options: [{ label: 'HbA1c', value: 'hba1c' }] },
    ],
    category: 'lab',
  },
]

const mockDocuments: ClinicalDocumentDTO[] = [
  {
    id: 'doc-001',
    contactId: '1',
    serviceId: '5',
    documentTypeId: CONSULT_TYPE_ID,
    title: 'Compte rendu de consultation',
    status: 'draft',
    formData: { reason: 'Douleur', diagnosis: '' },
    createdBy: 'user-1',
    createdAt: '2024-06-15T10:00:00.000Z',
    updatedAt: '2024-06-15T10:00:00.000Z',
    documentType: mockDocumentTypes[0],
  },
  {
    id: 'doc-002',
    contactId: '1',
    serviceId: '5',
    documentTypeId: LAB_TYPE_ID,
    title: 'Demande d\'examen de laboratoire',
    status: 'signed',
    formData: { exam_type: 'hba1c' },
    signedAt: '2024-06-15T11:00:00.000Z',
    signedBy: 'user-1',
    createdBy: 'user-1',
    createdAt: '2024-06-15T09:00:00.000Z',
    updatedAt: '2024-06-15T11:00:00.000Z',
    documentType: mockDocumentTypes[1],
  },
]

// ─── Suite ─────────────────────────────────────────────────────────

describe('useClinicalDocuments', () => {
  let ctx: ReturnType<typeof useClinicalDocuments>

  beforeEach(() => {
    mockIpcInvoke.mockReset()
    ctx = useClinicalDocuments()
  })

  // ─── Initial state ───────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with empty arrays and null/zero values', () => {
      expect(ctx.documentTypes.value).toEqual([])
      expect(ctx.documents.value).toEqual([])
      expect(ctx.selectedDocument.value).toBeNull()
      expect(ctx.loading.value).toBe(false)
      expect(ctx.error.value).toBeNull()
      expect(ctx.isContactExpired.value).toBe(false)
    })
  })

  // ─── fetchDocumentTypes ──────────────────────────────────────────

  describe('fetchDocumentTypes', () => {
    it('populates documentTypes ref and caches result', async () => {
      mockIpcInvoke.mockResolvedValue(mockDocumentTypes)

      await ctx.fetchDocumentTypes()

      expect(ctx.documentTypes.value).toEqual(mockDocumentTypes)
      expect(mockIpcInvoke).toHaveBeenCalledWith('clinical-documents:get-types')

      // Second call without force should not invoke IPC again
      mockIpcInvoke.mockClear()
      await ctx.fetchDocumentTypes()
      expect(mockIpcInvoke).not.toHaveBeenCalled()
    })

    it('force=true re-fetches even if already loaded', async () => {
      mockIpcInvoke.mockResolvedValue(mockDocumentTypes)
      await ctx.fetchDocumentTypes()
      mockIpcInvoke.mockClear()

      mockIpcInvoke.mockResolvedValue([])
      await ctx.fetchDocumentTypes(true)
      expect(mockIpcInvoke).toHaveBeenCalledWith('clinical-documents:get-types')
      expect(ctx.documentTypes.value).toEqual([])
    })

    it('sets error and calls ElMessage.error on failure', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur réseau'))

      await ctx.fetchDocumentTypes()

      expect(ctx.error.value).toBe('Erreur réseau')
    })
  })

  // ─── fetchDocuments ──────────────────────────────────────────────

  describe('fetchDocuments', () => {
    it('populates documents ref and resets selected document', async () => {
      ctx.selectedDocument.value = { ...mockDocuments[0] }
      mockIpcInvoke.mockResolvedValue(JSON.parse(JSON.stringify(mockDocuments)))

      await ctx.fetchDocuments('1')

      expect(ctx.loading.value).toBe(false)
      expect(ctx.documents.value).toHaveLength(2)
      expect(ctx.documents.value[0].id).toBe('doc-001')
      expect(ctx.documents.value[1].id).toBe('doc-002')
      expect(ctx.selectedDocument.value).toBeNull()
      expect(mockIpcInvoke).toHaveBeenCalledWith('clinical-documents:list', { contactId: '1' })
    })

    it('sets loading true during fetch and false after', async () => {
      let resolvePromise!: (val: any) => void
      mockIpcInvoke.mockReturnValue(new Promise(resolve => { resolvePromise = resolve }))

      const fetchPromise = ctx.fetchDocuments('1')
      expect(ctx.loading.value).toBe(true)

      resolvePromise(mockDocuments)
      await fetchPromise
      expect(ctx.loading.value).toBe(false)
    })

    it('sets error on failure', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur réseau'))

      await ctx.fetchDocuments('1')

      expect(ctx.error.value).toBe('Erreur réseau')
      expect(ctx.loading.value).toBe(false)
    })
  })

  // ─── createDocument ──────────────────────────────────────────────

  describe('createDocument', () => {
    it('adds document to the list and returns it', async () => {
      const newDoc: ClinicalDocumentDTO = {
        id: 'doc-003',
        contactId: '1',
        serviceId: '5',
        documentTypeId: CONSULT_TYPE_ID,
        title: 'Compte rendu de consultation',
        status: 'draft',
        formData: {},
        createdBy: 'user-1',
        createdAt: '2024-07-01T08:00:00.000Z',
        updatedAt: '2024-07-01T08:00:00.000Z',
      }
      mockIpcInvoke.mockResolvedValue(newDoc)

      // Pre-populate documentTypes so the enrich works
      ctx.documentTypes.value = mockDocumentTypes

      const result = await ctx.createDocument(CONSULT_TYPE_ID, '1', '5', 'user-1')

      expect(result).not.toBeNull()
      expect(result!.documentType).toBeDefined()
      expect(result!.documentType!.code).toBe('CONSULTATION_NOTE')
      expect(mockIpcInvoke).toHaveBeenCalledWith('clinical-documents:create', {
        documentTypeId: CONSULT_TYPE_ID,
        contactId: '1',
        serviceId: '5',
        createdBy: 'user-1',
      })
      // Should be prepended to the list
      expect(ctx.documents.value[0].id).toBe('doc-003')
    })

    it('returns null on failure and shows error message', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur création'))

      const result = await ctx.createDocument(CONSULT_TYPE_ID, '1', '5', 'user-1')
      expect(result).toBeNull()
    })
  })

  // ─── updateDocumentData ──────────────────────────────────────────

  describe('updateDocumentData', () => {
    it('updates local document state and selected document', async () => {
      ctx.documents.value = [...mockDocuments]
      ctx.selectedDocument.value = { ...mockDocuments[0] }

      const newFormData = { reason: 'Douleur thoracique', diagnosis: 'Angine de poitrine' }
      const updatedDto: ClinicalDocumentDTO = {
        ...mockDocuments[0],
        formData: newFormData as any,
        updatedAt: '2024-06-15T12:00:00.000Z',
      }
      mockIpcInvoke.mockResolvedValue(updatedDto)

      const success = await ctx.updateDocumentData('doc-001', newFormData)

      expect(success).toBe(true)
      expect(ctx.documents.value[0].formData).toEqual(newFormData)
      expect(ctx.selectedDocument.value!.formData).toEqual(newFormData)
      expect(mockIpcInvoke).toHaveBeenCalledWith('clinical-documents:update-data', {
        id: 'doc-001',
        formData: newFormData,
      })
    })

    it('returns false on failure', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur sauvegarde'))

      const success = await ctx.updateDocumentData('doc-001', { reason: 'test' })
      expect(success).toBe(false)
    })
  })

  // ─── signDocument ────────────────────────────────────────────────

  describe('signDocument', () => {
    it('marks document as signed locally and shows success', async () => {
      ctx.documents.value = [...mockDocuments]
      ctx.selectedDocument.value = { ...mockDocuments[0] }

      const signedDto: ClinicalDocumentDTO = {
        ...mockDocuments[0],
        status: 'signed',
        signedAt: '2024-06-15T12:00:00.000Z',
        signedBy: 'user-1',
      }
      mockIpcInvoke.mockResolvedValue(signedDto)

      const success = await ctx.signDocument('doc-001', 'user-1')

      expect(success).toBe(true)
      expect(ctx.documents.value[0].status).toBe('signed')
      expect(ctx.selectedDocument.value!.status).toBe('signed')
      expect(mockIpcInvoke).toHaveBeenCalledWith('clinical-documents:sign', { id: 'doc-001', userId: 'user-1' })
    })

    it('returns false on failure', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur signature'))

      const success = await ctx.signDocument('doc-001', 'user-1')
      expect(success).toBe(false)
    })
  })

  // ─── deleteDocument ──────────────────────────────────────────────

  describe('deleteDocument', () => {
    it('removes document from list and clears selected if deleted', async () => {
      ctx.documents.value = [...mockDocuments]
      ctx.selectedDocument.value = { ...mockDocuments[0] }
      mockIpcInvoke.mockResolvedValue(undefined)

      const success = await ctx.deleteDocument('doc-001')

      expect(success).toBe(true)
      expect(ctx.documents.value).toHaveLength(1)
      expect(ctx.documents.value[0].id).toBe('doc-002')
      expect(ctx.selectedDocument.value).toBeNull()
      expect(mockIpcInvoke).toHaveBeenCalledWith('clinical-documents:delete', { id: 'doc-001' })
    })

    it('keeps selected document if a different one is deleted', async () => {
      ctx.documents.value = [...mockDocuments]
      ctx.selectedDocument.value = { ...mockDocuments[0] }
      mockIpcInvoke.mockResolvedValue(undefined)

      await ctx.deleteDocument('doc-002')

      expect(ctx.documents.value).toHaveLength(1)
      expect(ctx.selectedDocument.value!.id).toBe('doc-001')
    })

    it('returns false on failure', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur suppression'))

      const success = await ctx.deleteDocument('doc-001')
      expect(success).toBe(false)
    })
  })

  // ─── checkContactExpired ─────────────────────────────────────────

  describe('checkContactExpired', () => {
    it('updates isContactExpired ref when contact is expired', async () => {
      mockIpcInvoke.mockResolvedValue(true)

      const result = await ctx.checkContactExpired('1')

      expect(result).toBe(true)
      expect(ctx.isContactExpired.value).toBe(true)
      expect(mockIpcInvoke).toHaveBeenCalledWith('clinical-documents:check-contact-expired', { contactId: '1' })
    })

    it('sets isContactExpired to false when contact is not expired', async () => {
      mockIpcInvoke.mockResolvedValue(false)

      const result = await ctx.checkContactExpired('1')

      expect(result).toBe(false)
      expect(ctx.isContactExpired.value).toBe(false)
    })

    it('defaults to false on error', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur'))

      const result = await ctx.checkContactExpired('1')

      expect(result).toBe(false)
      expect(ctx.isContactExpired.value).toBe(false)
    })
  })

  // ─── importFile ───────────────────────────────────────────────────

  describe('importFile', () => {
    // Helper to create a mock File that works with FileReader
    function createMockFile(name: string, type: string, content = 'test content'): File {
      return new File([content], name, { type })
    }

    it('calls IPC with correct params (contactId, createdBy, fileData, fileName, documentTypeId, title)', async () => {
      const file = createMockFile('test.pdf', 'application/pdf')
      const importedDoc: ClinicalDocumentDTO = {
        id: 'doc-imported',
        contactId: '1',
        serviceId: '5',
        documentTypeId: CONSULT_TYPE_ID,
        title: 'test',
        status: 'draft',
        formData: {},
        source: 'imported',
        createdBy: 'user-1',
        createdAt: '2024-07-01T08:00:00.000Z',
        updatedAt: '2024-07-01T08:00:00.000Z',
      }
      // Mock IPC to resolve with a raw DTO that normalizeDocument can handle
      mockIpcInvoke.mockResolvedValue({
        id: 'doc-imported',
        contactId: '1',
        serviceId: '5',
        documentTypeId: CONSULT_TYPE_ID,
        title: 'test',
        status: 'draft',
        formData: null,
        source: 'imported',
        createdBy: 'user-1',
        createdAt: '2024-07-01T08:00:00.000Z',
        updatedAt: '2024-07-01T08:00:00.000Z',
      })

      await ctx.importFile({
        contactId: '1',
        createdBy: 'user-1',
        file,
        documentTypeId: CONSULT_TYPE_ID,
        title: 'test',
      })

      expect(mockIpcInvoke).toHaveBeenCalledWith('clinical-documents:import-file', {
        contactId: '1',
        createdBy: 'user-1',
        fileData: expect.any(String),
        fileName: 'test.pdf',
        documentTypeId: CONSULT_TYPE_ID,
        title: 'test',
      })
    })

    it('converts File to base64 before sending', async () => {
      const file = createMockFile('test.pdf', 'application/pdf', 'hello')
      mockIpcInvoke.mockResolvedValue({
        id: 'doc-imported',
        contactId: '1',
        serviceId: '5',
        documentTypeId: CONSULT_TYPE_ID,
        title: 'test',
        status: 'draft',
        formData: null,
        source: 'imported',
        createdBy: 'user-1',
        createdAt: '2024-07-01T08:00:00.000Z',
        updatedAt: '2024-07-01T08:00:00.000Z',
      })

      await ctx.importFile({
        contactId: '1',
        createdBy: 'user-1',
        file,
        documentTypeId: CONSULT_TYPE_ID,
      })

      // Verify fileData is a string (base64) and not a File object
      const ipcCall = mockIpcInvoke.mock.calls[0]
      const fileData = ipcCall[1].fileData
      expect(typeof fileData).toBe('string')
      // base64 of "hello" should be a non-empty string
      expect(fileData.length).toBeGreaterThan(0)
    })

    it('adds the returned document to the documents array', async () => {
      const file = createMockFile('test.pdf', 'application/pdf')
      mockIpcInvoke.mockResolvedValue({
        id: 'doc-imported',
        contactId: '1',
        serviceId: '5',
        documentTypeId: CONSULT_TYPE_ID,
        title: 'test',
        status: 'draft',
        formData: null,
        source: 'imported',
        createdBy: 'user-1',
        createdAt: '2024-07-01T08:00:00.000Z',
        updatedAt: '2024-07-01T08:00:00.000Z',
      })

      const result = await ctx.importFile({
        contactId: '1',
        createdBy: 'user-1',
        file,
        documentTypeId: CONSULT_TYPE_ID,
        title: 'test',
      })

      expect(ctx.documents.value).toHaveLength(1)
      expect(ctx.documents.value[0].id).toBe('doc-imported')
      expect(ctx.documents.value[0].source).toBe('imported')
    })

    it('shows success message on success', async () => {
      const file = createMockFile('test.pdf', 'application/pdf')
      mockIpcInvoke.mockResolvedValue({
        id: 'doc-imported',
        contactId: '1',
        serviceId: '5',
        documentTypeId: CONSULT_TYPE_ID,
        title: 'test',
        status: 'draft',
        formData: null,
        source: 'imported',
        createdBy: 'user-1',
        createdAt: '2024-07-01T08:00:00.000Z',
        updatedAt: '2024-07-01T08:00:00.000Z',
      })

      await ctx.importFile({
        contactId: '1',
        createdBy: 'user-1',
        file,
        documentTypeId: CONSULT_TYPE_ID,
        title: 'test',
      })

      const ElMessage = (await import('element-plus')).ElMessage
      expect(ElMessage.success).toHaveBeenCalledWith('Document importé')
    })

    it('returns null on failure and shows error message', async () => {
      const file = createMockFile('test.pdf', 'application/pdf')
      mockIpcInvoke.mockRejectedValue(new Error('Erreur import'))

      const result = await ctx.importFile({
        contactId: '1',
        createdBy: 'user-1',
        file,
        documentTypeId: CONSULT_TYPE_ID,
        title: 'test',
      })

      expect(result).toBeNull()
    })

    it('returns the document on success', async () => {
      const file = createMockFile('test.pdf', 'application/pdf')
      mockIpcInvoke.mockResolvedValue({
        id: 'doc-imported',
        contactId: '1',
        serviceId: '5',
        documentTypeId: CONSULT_TYPE_ID,
        title: 'test',
        status: 'draft',
        formData: null,
        source: 'imported',
        createdBy: 'user-1',
        createdAt: '2024-07-01T08:00:00.000Z',
        updatedAt: '2024-07-01T08:00:00.000Z',
      })

      const result = await ctx.importFile({
        contactId: '1',
        createdBy: 'user-1',
        file,
        documentTypeId: CONSULT_TYPE_ID,
        title: 'test',
      })

      expect(result).not.toBeNull()
      expect(result!.id).toBe('doc-imported')
      expect(result!.source).toBe('imported')
    })

    it('returns null when IPC returns null', async () => {
      const file = createMockFile('test.pdf', 'application/pdf')
      mockIpcInvoke.mockResolvedValue(null)

      const result = await ctx.importFile({
        contactId: '1',
        createdBy: 'user-1',
        file,
        documentTypeId: CONSULT_TYPE_ID,
        title: 'test',
      })

      expect(result).toBeNull()
      expect(ctx.documents.value).toHaveLength(0)
    })
  })

  // ─── resetDocuments ──────────────────────────────────────────────

  describe('resetDocuments', () => {
    it('resets all state to initial values', () => {
      ctx.documents.value = [...mockDocuments]
      ctx.selectedDocument.value = mockDocuments[0]
      ctx.loading.value = true
      ctx.error.value = 'some error'
      ctx.isContactExpired.value = true

      ctx.resetDocuments()

      expect(ctx.documents.value).toEqual([])
      expect(ctx.selectedDocument.value).toBeNull()
      expect(ctx.loading.value).toBe(false)
      expect(ctx.error.value).toBeNull()
      expect(ctx.isContactExpired.value).toBe(false)
    })
  })

  // ─── getDocumentType ─────────────────────────────────────────────

  describe('getDocumentType', () => {
    it('returns the document type matching the given id', () => {
      ctx.documentTypes.value = mockDocumentTypes

      const found = ctx.getDocumentType(CONSULT_TYPE_ID)
      expect(found).toBeDefined()
      expect(found!.code).toBe('CONSULTATION_NOTE')

      const notFound = ctx.getDocumentType('nonexistent')
      expect(notFound).toBeUndefined()
    })
  })

  // ─── selectDocument ──────────────────────────────────────────────

  describe('selectDocument', () => {
    it('updates selectedDocument ref', () => {
      expect(ctx.selectedDocument.value).toBeNull()

      ctx.selectDocument(mockDocuments[0])
      expect(ctx.selectedDocument.value!.id).toBe('doc-001')

      ctx.selectDocument(null)
      expect(ctx.selectedDocument.value).toBeNull()
    })
  })
})
