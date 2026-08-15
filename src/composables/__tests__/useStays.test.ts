// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockIpcInvoke = vi.hoisted(() => vi.fn())
vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

import { useStays } from '../useStays'
import type { StayDto, StayMovementDto } from '../useStays'

const mockActiveStay: StayDto = {
  id: 1,
  patient_id: 42,
  admission_date: '2024-06-10T08:00:00.000Z',
  mode_admission: 'urgences',
  service_id: 5,
  service_name: 'Cardiologie',
  chambre: 'A101',
  lit: 'L2',
  medecin_id: 10,
  medecin_name: 'Dr DIALLO',
  notes: 'Patient sous observation',
  status: 'en_cours',
}

const mockStays: StayDto[] = [
  mockActiveStay,
  {
    id: 2,
    patient_id: 42,
    admission_date: '2024-03-01T10:00:00.000Z',
    mode_admission: 'programmee',
    service_id: 3,
    service_name: 'Médecine Générale',
    status: 'cloture',
    sortie_date: '2024-03-05T14:00:00.000Z',
  },
]

const mockMovements: StayMovementDto[] = [
  {
    id: 1,
    stay_id: 1,
    movement_type: 'admission',
    to_service_id: 5,
    to_service_name: 'Cardiologie',
    moved_at: '2024-06-10T08:00:00.000Z',
    created_at: '2024-06-10T08:00:00.000Z',
  },
  {
    id: 2,
    stay_id: 1,
    movement_type: 'transfert_service',
    from_service_id: 5,
    to_service_id: 8,
    from_service_name: 'Cardiologie',
    to_service_name: 'Réanimation',
    moved_at: '2024-06-11T14:00:00.000Z',
    created_at: '2024-06-11T14:00:00.000Z',
  },
]

describe('useStays', () => {
  beforeEach(() => {
    mockIpcInvoke.mockReset()
    mockIpcInvoke.mockResolvedValue(null)
  })

  describe('getActiveStay', () => {
    it('appelle stays:get-active et retourne le séjour actif', async () => {
      mockIpcInvoke.mockResolvedValue(mockActiveStay)
      const { getActiveStay } = useStays()

      const result = await getActiveStay(42)

      expect(mockIpcInvoke).toHaveBeenCalledWith('stays:get-active', { patient_id: 42 })
      expect(result).toEqual(mockActiveStay)
    })

    it('retourne null si pas de séjour actif', async () => {
      mockIpcInvoke.mockResolvedValue(null)
      const { getActiveStay } = useStays()

      const result = await getActiveStay(42)

      expect(result).toBeNull()
    })

    it('retourne null et set error en cas d\'erreur IPC', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur'))
      const { getActiveStay, error } = useStays()

      const result = await getActiveStay(42)

      expect(result).toBeNull()
      expect(error.value).toBe('Erreur')
    })
  })

  describe('listStaysByPatient', () => {
    it('appelle stays:list-by-patient et retourne tous les séjours', async () => {
      mockIpcInvoke.mockResolvedValue(mockStays)
      const { listStaysByPatient } = useStays()

      const result = await listStaysByPatient(42)

      expect(mockIpcInvoke).toHaveBeenCalledWith('stays:list-by-patient', { patient_id: 42 })
      expect(result).toHaveLength(2)
      expect(result[0].status).toBe('en_cours')
      expect(result[1].status).toBe('cloture')
    })

    it('retourne un tableau vide si pas de séjours', async () => {
      mockIpcInvoke.mockResolvedValue([])
      const { listStaysByPatient } = useStays()

      const result = await listStaysByPatient(42)

      expect(result).toHaveLength(0)
    })

    it('retourne un tableau vide et set error en cas d\'erreur', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur'))
      const { listStaysByPatient, error } = useStays()

      const result = await listStaysByPatient(42)

      expect(result).toEqual([])
      expect(error.value).toBe('Erreur')
    })
  })

  describe('getStayMovements', () => {
    it('appelle stays:get-movements et retourne les mouvements', async () => {
      mockIpcInvoke.mockResolvedValue(mockMovements)
      const { getStayMovements } = useStays()

      const result = await getStayMovements(1)

      expect(mockIpcInvoke).toHaveBeenCalledWith('stays:get-movements', { stay_id: 1 })
      expect(result).toEqual(mockMovements)
    })

    it('retourne les mouvements dans le bon ordre', async () => {
      mockIpcInvoke.mockResolvedValue(mockMovements)
      const { getStayMovements } = useStays()

      const result = await getStayMovements(1)

      expect(result[0].movement_type).toBe('admission')
      expect(result[1].movement_type).toBe('transfert_service')
    })

    it('retourne un tableau vide et set error en cas d\'erreur', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur'))
      const { getStayMovements, error } = useStays()

      const result = await getStayMovements(1)

      expect(result).toEqual([])
      expect(error.value).toBe('Erreur')
    })
  })

  describe('loading state', () => {
    it('sets loading true during getActiveStay and false after', async () => {
      mockIpcInvoke.mockResolvedValue(mockActiveStay)
      const { getActiveStay, loading } = useStays()

      const promise = getActiveStay(42)
      expect(loading.value).toBe(true)
      await promise
      expect(loading.value).toBe(false)
    })

    it('sets loading true during listStaysByPatient and false after', async () => {
      mockIpcInvoke.mockResolvedValue(mockStays)
      const { listStaysByPatient, loading } = useStays()

      const promise = listStaysByPatient(42)
      expect(loading.value).toBe(true)
      await promise
      expect(loading.value).toBe(false)
    })
  })
})
