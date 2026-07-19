// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useExamRequests } from '../useExamRequests'
import type { ExamRequestDto } from '../useExamRequests'

// ─── Mock ipcInvoke ────────────────────────────────────────────────
const mockIpcInvoke = vi.hoisted(() => vi.fn())
vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn(() => Promise.resolve()) },
}))

// ─── Test fixtures ─────────────────────────────────────────────────
const mockImagerieRequest: ExamRequestDto = {
  id: 1,
  patientId: 42,
  type: 'imagerie',
  examenId: 10,
  examIds: [],
  motif: 'Douleur thoracique',
  statut: 'en_attente',
  prescripteurId: 1,
  prescripteurNom: 'Dr. Diallo',
  examenLabel: 'Radiographie thoracique',
  createdAt: '2025-01-15T10:00:00.000Z',
}

const mockLaboratoireRequest: ExamRequestDto = {
  id: 2,
  patientId: 42,
  type: 'laboratoire',
  examenId: null,
  examIds: [101, 102],
  motif: 'Bilan annuel',
  statut: 'en_attente',
  prescripteurId: 1,
  prescripteurNom: 'Dr. Diallo',
  createdAt: '2025-01-14T09:00:00.000Z',
}

const mockAvisRequest: ExamRequestDto = {
  id: 3,
  patientId: 42,
  type: 'avis',
  specialite: 'Endocrinologie',
  specialtyId: 5,
  specialtyName: 'Endocrinologie',
  motif: 'Avis endocrinologique',
  statut: 'en_cours',
  prescripteurId: 2,
  prescripteurNom: 'Dr. Camara',
  createdAt: '2025-01-13T08:00:00.000Z',
}

describe('useExamRequests', () => {
  beforeEach(() => {
    mockIpcInvoke.mockReset()
    mockIpcInvoke.mockResolvedValue({ success: true, data: [] })
  })

  // ─── Initial state ───────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with empty requests, loading false, error null', () => {
      const { requests, loading, error } = useExamRequests()
      expect(requests.value).toEqual([])
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })
  })

  // ─── fetchRequests ───────────────────────────────────────────────

  describe('fetchRequests', () => {
    it('fetches exam requests for a patient and sets the requests ref', async () => {
      mockIpcInvoke.mockResolvedValue([mockImagerieRequest, mockLaboratoireRequest])
      const { fetchRequests, requests } = useExamRequests()

      await fetchRequests(42)

      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-request:list', { patientId: 42 })
      expect(requests.value).toHaveLength(2)
      expect(requests.value[0].type).toBe('imagerie')
      expect(requests.value[1].type).toBe('laboratoire')
    })

    it('sets requests to empty array when result is not an array', async () => {
      mockIpcInvoke.mockResolvedValue(null)
      const { fetchRequests, requests } = useExamRequests()

      await fetchRequests(42)

      expect(requests.value).toEqual([])
    })

    it('sets loading state correctly during fetch', async () => {
      let resolvePromise!: (val: unknown) => void
      mockIpcInvoke.mockReturnValue(new Promise(resolve => { resolvePromise = resolve }))

      const { fetchRequests, loading } = useExamRequests()
      const promise = fetchRequests(42)

      expect(loading.value).toBe(true)

      resolvePromise([])
      await promise

      expect(loading.value).toBe(false)
    })

    it('sets error on IPC failure', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur réseau'))
      const { fetchRequests, error, requests } = useExamRequests()

      await fetchRequests(42)

      expect(error.value).toBe('Erreur réseau')
      expect(requests.value).toEqual([])
    })
  })

  // ─── createRequest ───────────────────────────────────────────────

  describe('createRequest', () => {
    it('creates an "imagerie" exam request successfully', async () => {
      mockIpcInvoke.mockResolvedValue(mockImagerieRequest)
      const { createRequest } = useExamRequests()

      const result = await createRequest({
        patientId: 42,
        type: 'imagerie',
        examenId: 10,
        motif: 'Douleur thoracique',
        prescripteurId: 1,
      })

      expect(result).toEqual(mockImagerieRequest)
      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-request:create', {
        patientId: 42,
        type: 'imagerie',
        examenId: 10,
        motif: 'Douleur thoracique',
        prescripteurId: 1,
        statut: 'en_attente',
      })
    })

    it('creates a "laboratoire" exam request with examIds', async () => {
      mockIpcInvoke.mockResolvedValue(mockLaboratoireRequest)
      const { createRequest } = useExamRequests()

      const result = await createRequest({
        patientId: 42,
        type: 'laboratoire',
        examIds: [101, 102],
        motif: 'Bilan annuel',
        prescripteurId: 1,
      })

      expect(result).toEqual(mockLaboratoireRequest)
      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-request:create', {
        patientId: 42,
        type: 'laboratoire',
        examIds: [101, 102],
        motif: 'Bilan annuel',
        prescripteurId: 1,
        statut: 'en_attente',
      })
    })

    it('creates an "avis" exam request with specialty info', async () => {
      mockIpcInvoke.mockResolvedValue(mockAvisRequest)
      const { createRequest } = useExamRequests()

      const result = await createRequest({
        patientId: 42,
        type: 'avis',
        specialtyId: 5,
        specialite: 'Endocrinologie',
        motif: 'Avis endocrinologique',
        prescripteurId: 2,
      })

      expect(result).toEqual(mockAvisRequest)
      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-request:create', {
        patientId: 42,
        type: 'avis',
        specialtyId: 5,
        specialite: 'Endocrinologie',
        motif: 'Avis endocrinologique',
        prescripteurId: 2,
        statut: 'en_attente',
      })
    })

    it('returns null on creation failure and sets error', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur création'))
      const { createRequest, error } = useExamRequests()

      const result = await createRequest({
        patientId: 42,
        type: 'imagerie',
      })

      expect(result).toBeNull()
      expect(error.value).toBe('Erreur création')
    })

    it('always sends statut=en_attente on creation', async () => {
      mockIpcInvoke.mockResolvedValue(mockLaboratoireRequest)
      const { createRequest } = useExamRequests()

      await createRequest({
        patientId: 42,
        type: 'laboratoire',
      })

      // Verify statut is always en_attente regardless of what's passed
      const callArgs = mockIpcInvoke.mock.calls[0][1]
      expect(callArgs.statut).toBe('en_attente')
    })
  })

  // ─── updateStatut ────────────────────────────────────────────────

  describe('updateStatut', () => {
    it('updates the status successfully', async () => {
      mockIpcInvoke.mockResolvedValue(undefined)
      const { updateStatut } = useExamRequests()

      const result = await updateStatut(1, 'realise')

      expect(result).toBe(true)
      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-request:update', { id: 1, statut: 'realise' })
    })

    it('transitions through all statuses', async () => {
      mockIpcInvoke.mockResolvedValue(undefined)
      const { updateStatut } = useExamRequests()

      const statuses: ExamRequestDto['statut'][] = ['en_attente', 'en_cours', 'realise', 'annule']
      for (const statut of statuses) {
        const result = await updateStatut(1, statut)
        expect(result).toBe(true)
      }
    })

    it('returns false on failure and sets error', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur mise à jour'))
      const { updateStatut, error } = useExamRequests()

      const result = await updateStatut(999, 'realise')

      expect(result).toBe(false)
      expect(error.value).toBe('Erreur mise à jour')
    })
  })

  // ─── deleteRequest ───────────────────────────────────────────────

  describe('deleteRequest', () => {
    it('deletes a request successfully', async () => {
      mockIpcInvoke.mockResolvedValue(undefined)
      const { deleteRequest } = useExamRequests()

      const result = await deleteRequest(1)

      expect(result).toBe(true)
      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-request:delete', { id: 1 })
    })

    it('returns false on failure and sets error', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur suppression'))
      const { deleteRequest, error } = useExamRequests()

      const result = await deleteRequest(999)

      expect(result).toBe(false)
      expect(error.value).toBe('Erreur suppression')
    })
  })

  // ─── updateRequest ───────────────────────────────────────────────

  describe('updateRequest', () => {
    it('successfully updates all fields', async () => {
      const updated = { id: 1, patientId: 42, type: 'imagerie', motif: 'Nouveau motif', statut: 'en_cours' }
      mockIpcInvoke.mockResolvedValue(updated)
      const { updateRequest } = useExamRequests()

      const result = await updateRequest(1, {
        type: 'imagerie',
        motif: 'Nouveau motif',
        statut: 'en_cours',
        prescripteurId: 2,
      })

      expect(result).toEqual(updated)
      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-request:update', {
        id: 1,
        type: 'imagerie',
        motif: 'Nouveau motif',
        statut: 'en_cours',
        prescripteurId: 2,
      })
    })

    it('returns null on error and sets error message', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur mise à jour'))
      const { updateRequest, error } = useExamRequests()

      const result = await updateRequest(999, { statut: 'realise' })

      expect(result).toBeNull()
      expect(error.value).toBe('Erreur mise à jour')
    })

    it('allows partial update (only changing statut)', async () => {
      mockIpcInvoke.mockResolvedValue({ id: 1, patientId: 42, statut: 'annule' })
      const { updateRequest } = useExamRequests()

      const result = await updateRequest(1, { statut: 'annule' })

      expect(result).toBeDefined()
      expect(result).toHaveProperty('statut', 'annule')
      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-request:update', {
        id: 1,
        statut: 'annule',
      })
    })

    it('updates specialty_id for avis type', async () => {
      const updated = { id: 3, patientId: 42, type: 'avis', specialtyId: 5, statut: 'en_cours' }
      mockIpcInvoke.mockResolvedValue(updated)
      const { updateRequest } = useExamRequests()

      const result = await updateRequest(3, {
        type: 'avis',
        specialtyId: 5,
        statut: 'en_cours',
      })

      expect(result).toEqual(updated)
      expect(mockIpcInvoke).toHaveBeenCalledWith('exam-request:update', {
        id: 3,
        type: 'avis',
        specialtyId: 5,
        statut: 'en_cours',
      })
    })
  })

  // ─── DTO interface matches backend ───────────────────────────────

  describe('DTO interface', () => {
    it('supports all three request types', () => {
      const imagerie: ExamRequestDto = {
        patientId: 1, type: 'imagerie', statut: 'en_attente',
      }
      const laboratoire: ExamRequestDto = {
        patientId: 1, type: 'laboratoire', statut: 'en_attente',
      }
      const avis: ExamRequestDto = {
        patientId: 1, type: 'avis', statut: 'en_attente',
      }
      expect(imagerie.type).toBe('imagerie')
      expect(laboratoire.type).toBe('laboratoire')
      expect(avis.type).toBe('avis')
    })

    it('includes specialtyName field for avis type', () => {
      const avis: ExamRequestDto = {
        patientId: 1,
        type: 'avis',
        statut: 'en_attente',
        specialtyId: 5,
        specialtyName: 'Endocrinologie',
      }
      expect(avis.specialtyName).toBe('Endocrinologie')
    })

    it('includes examIds array for laboratoire type', () => {
      const labo: ExamRequestDto = {
        patientId: 1,
        type: 'laboratoire',
        statut: 'en_attente',
        examIds: [101, 102, 103],
      }
      expect(labo.examIds).toHaveLength(3)
    })

    it('includes examenId and examenLabel for imagerie type', () => {
      const imagerie: ExamRequestDto = {
        patientId: 1,
        type: 'imagerie',
        statut: 'en_attente',
        examenId: 10,
        examenLabel: 'Scanner cérébral',
      }
      expect(imagerie.examenId).toBe(10)
      expect(imagerie.examenLabel).toBe('Scanner cérébral')
    })
  })
})
