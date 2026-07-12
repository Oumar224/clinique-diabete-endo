// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getActiveStay,
  listStaysByPatient,
  getStayMovements,
} from '../useStays'
import type { StayDto, StayMovementDto } from '../useStays'

const mockInvoke = vi.fn()
vi.stubGlobal('window', {
  electronAPI: {
    invoke: mockInvoke,
  },
})

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
    mockInvoke.mockReset()
    mockInvoke.mockResolvedValue({ success: true, data: null })
  })

  describe('getActiveStay', () => {
    it('appelle stays:get-active et retourne le séjour actif', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockActiveStay })
      const result = await getActiveStay(42)
      expect(mockInvoke).toHaveBeenCalledWith('stays:get-active', { patient_id: 42 })
      expect(result).toEqual(mockActiveStay)
    })

    it('retourne null si pas de séjour actif', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: null })
      const result = await getActiveStay(42)
      expect(result).toBeNull()
    })

    it('propage l\'erreur IPC', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      await expect(getActiveStay(42)).rejects.toThrow('Erreur')
    })
  })

  describe('listStaysByPatient', () => {
    it('appelle stays:list-by-patient et retourne tous les séjours', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockStays })
      const result = await listStaysByPatient(42)
      expect(mockInvoke).toHaveBeenCalledWith('stays:list-by-patient', { patient_id: 42 })
      expect(result).toHaveLength(2)
      expect(result[0].status).toBe('en_cours')
      expect(result[1].status).toBe('cloture')
    })

    it('retourne un tableau vide si pas de séjours', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: [] })
      const result = await listStaysByPatient(42)
      expect(result).toHaveLength(0)
    })

    it('propage l\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      await expect(listStaysByPatient(42)).rejects.toThrow('Erreur')
    })
  })

  describe('getStayMovements', () => {
    it('appelle stays:get-movements et retourne les mouvements', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockMovements })
      const result = await getStayMovements(1)
      expect(mockInvoke).toHaveBeenCalledWith('stays:get-movements', { stay_id: 1 })
      expect(result).toEqual(mockMovements)
    })

    it('retourne les mouvements dans le bon ordre', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockMovements })
      const result = await getStayMovements(1)
      expect(result[0].movement_type).toBe('admission')
      expect(result[1].movement_type).toBe('transfert_service')
    })

    it('propage l\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      await expect(getStayMovements(1)).rejects.toThrow('Erreur')
    })
  })
})
