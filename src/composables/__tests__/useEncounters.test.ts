// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockIpcInvoke = vi.hoisted(() => vi.fn())
vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

import { useEncounters } from '../useEncounters'
import type { EncounterDto, EncounterMovementDto } from '../useEncounters'

const mockEncounters: EncounterDto[] = [
  {
    id: 1,
    patient_id: 42,
    contact_type: 'consultation',
    start_date: '2024-06-15T10:00:00.000Z',
    end_date: '2024-06-16T10:00:00.000Z',
    service_id: 5,
    service_name: 'Médecine Générale',
    origin: 'auto_refere',
    zone_situation: 'zone_responsabilite',
    prise_en_charge: 'maladie_naturelle',
    status: 'active',
  },
  {
    id: 2,
    patient_id: 42,
    contact_type: 'urgence',
    start_date: '2024-05-01T14:00:00.000Z',
    end_date: '2024-05-02T14:00:00.000Z',
    service_id: 3,
    service_name: 'Cardiologie',
    origin: 'domicile',
    zone_situation: 'hors_zone',
    zone_precision: 'Région X',
    prise_en_charge: 'accident_circulation',
    sinistre_info: 'SIN123',
    status: 'closed',
  },
]

const mockMovements: EncounterMovementDto[] = [
  {
    id: 1,
    encounter_id: 1,
    service_id: 5,
    service_name: 'Médecine Générale',
    step_label: 'Accueil',
    entered_at: '2024-06-15T10:00:00.000Z',
  },
  {
    id: 2,
    encounter_id: 1,
    service_id: 3,
    service_name: 'Cardiologie',
    step_label: 'Consultation spécialiste',
    entered_at: '2024-06-15T11:30:00.000Z',
  },
]

describe('useEncounters', () => {
  beforeEach(() => {
    mockIpcInvoke.mockReset()
    mockIpcInvoke.mockResolvedValue([])
  })

  describe('listEncountersByPatient', () => {
    it('appelle encounters:list-by-patient et retourne les données', async () => {
      mockIpcInvoke.mockResolvedValue(mockEncounters)
      const { listEncountersByPatient } = useEncounters()

      const result = await listEncountersByPatient(42)

      expect(mockIpcInvoke).toHaveBeenCalledWith('encounters:list-by-patient', { patient_id: 42, status: undefined })
      expect(result).toEqual(mockEncounters)
    })

    it('filtre par statut actif', async () => {
      mockIpcInvoke.mockResolvedValue([mockEncounters[0]])
      const { listEncountersByPatient } = useEncounters()

      const result = await listEncountersByPatient(42, 'active')

      expect(mockIpcInvoke).toHaveBeenCalledWith('encounters:list-by-patient', { patient_id: 42, status: 'active' })
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('active')
    })

    it('retourne un tableau vide et set error en cas d\'erreur IPC', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur réseau'))
      const { listEncountersByPatient, error } = useEncounters()

      const result = await listEncountersByPatient(42)

      expect(result).toEqual([])
      expect(error.value).toBe('Erreur réseau')
    })

    it('retourne un tableau vide et set error pour success: false', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Patient introuvable'))
      const { listEncountersByPatient, error } = useEncounters()

      const result = await listEncountersByPatient(99999)

      expect(result).toEqual([])
      expect(error.value).toBe('Patient introuvable')
    })
  })

  describe('getEncounter', () => {
    it('appelle encounters:get avec le bon id', async () => {
      mockIpcInvoke.mockResolvedValue(mockEncounters[0])
      const { getEncounter } = useEncounters()

      const result = await getEncounter(1)

      expect(mockIpcInvoke).toHaveBeenCalledWith('encounters:get', { id: 1 })
      expect(result).toEqual(mockEncounters[0])
    })

    it('retourne null et set error en cas d\'erreur', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Introuvable'))
      const { getEncounter, error } = useEncounters()

      const result = await getEncounter(999)

      expect(result).toBeNull()
      expect(error.value).toBe('Introuvable')
    })
  })

  describe('createEncounter', () => {
    it('appelle encounters:create et retourne l\'encounter créé', async () => {
      const newEncounter: EncounterDto = {
        id: 3,
        patient_id: 42,
        contact_type: 'consultation',
        start_date: '2024-07-01T09:00:00.000Z',
        end_date: '2024-07-02T09:00:00.000Z',
        service_id: 5,
        service_name: 'Médecine Générale',
        origin: 'auto_refere',
        zone_situation: 'zone_responsabilite',
        prise_en_charge: 'maladie_naturelle',
        status: 'active',
      }
      mockIpcInvoke.mockResolvedValue(newEncounter)
      const { createEncounter } = useEncounters()

      const payload = {
        patient_id: 42,
        contact_type: 'consultation',
        start_date: '2024-07-01T09:00:00.000Z',
        service_id: 5,
        origin: 'auto_refere',
        zone_situation: 'zone_responsabilite',
        prise_en_charge: 'maladie_naturelle',
      }

      const result = await createEncounter(payload)
      expect(mockIpcInvoke).toHaveBeenCalledWith('encounters:create', payload)
      expect(result).toEqual(newEncounter)
    })

    it('envoie les champs optionnels', async () => {
      mockIpcInvoke.mockResolvedValue(mockEncounters[0])
      const { createEncounter } = useEncounters()

      const payload = {
        patient_id: 42,
        contact_type: 'urgence',
        contact_type_precision: 'Urgence vitale',
        start_date: '2024-07-01T09:00:00.000Z',
        service_id: 3,
        medecin_id: 10,
        origin: 'domicile',
        origin_precision: 'Domicile',
        zone_situation: 'hors_zone',
        zone_precision: 'Région Y',
        prise_en_charge: 'accident_travail',
        prise_en_charge_precision: 'Assurance ABC',
        sinistre_info: 'SIN456',
        notes: 'Patient stable',
        created_by: 1,
      }

      await createEncounter(payload)
      expect(mockIpcInvoke).toHaveBeenCalledWith('encounters:create', payload)
    })

    it('transmet case_type, is_new_case et stay_type', async () => {
      mockIpcInvoke.mockResolvedValue(mockEncounters[0])
      const { createEncounter } = useEncounters()

      await createEncounter({
        patient_id: 42,
        contact_type: 'hospitalisation',
        start_date: '2024-07-01T09:00:00.000Z',
        service_id: 3,
        origin: 'domicile',
        zone_situation: 'hors_zone',
        prise_en_charge: 'maladie_naturelle',
        case_type: 'diabete',
        is_new_case: 1,
        stay_type: 'jour',
      })

      expect(mockIpcInvoke).toHaveBeenCalledWith('encounters:create', expect.objectContaining({
        case_type: 'diabete',
        is_new_case: 1,
        stay_type: 'jour',
      }))
    })

    it('retourne null et set error en cas d\'erreur', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur création'))
      const { createEncounter, error } = useEncounters()

      const result = await createEncounter({
        patient_id: 42,
        contact_type: 'consultation',
        start_date: '2024-07-01T09:00:00.000Z',
        service_id: 5,
        origin: 'auto_refere',
        zone_situation: 'zone_responsabilite',
        prise_en_charge: 'maladie_naturelle',
      })

      expect(result).toBeNull()
      expect(error.value).toBe('Erreur création')
    })
  })

  describe('updateEncounter', () => {
    it('appelle encounters:update et retourne l\'encounter mis à jour', async () => {
      const updated = { ...mockEncounters[0], notes: 'Mis à jour' }
      mockIpcInvoke.mockResolvedValue(updated)
      const { updateEncounter } = useEncounters()

      const result = await updateEncounter(1, { notes: 'Mis à jour' })

      expect(mockIpcInvoke).toHaveBeenCalledWith('encounters:update', { id: 1, notes: 'Mis à jour' })
      expect(result).toEqual(updated)
    })

    it('retourne null et set error en cas d\'erreur', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur update'))
      const { updateEncounter, error } = useEncounters()

      const result = await updateEncounter(1, { notes: 'X' })

      expect(result).toBeNull()
      expect(error.value).toBe('Erreur update')
    })
  })

  describe('deleteEncounter', () => {
    it('appelle encounters:delete', async () => {
      mockIpcInvoke.mockResolvedValue(undefined)
      const { deleteEncounter } = useEncounters()

      await deleteEncounter(1)

      expect(mockIpcInvoke).toHaveBeenCalledWith('encounters:delete', { id: 1 })
    })

    it('set error en cas d\'erreur', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur delete'))
      const { deleteEncounter, error } = useEncounters()

      await deleteEncounter(1)

      expect(error.value).toBe('Erreur delete')
    })
  })

  describe('getEncounterMovements', () => {
    it('appelle encounters:get-movements et retourne les mouvements', async () => {
      mockIpcInvoke.mockResolvedValue(mockMovements)
      const { getEncounterMovements } = useEncounters()

      const result = await getEncounterMovements(1)

      expect(mockIpcInvoke).toHaveBeenCalledWith('encounters:get-movements', { encounter_id: 1 })
      expect(result).toEqual(mockMovements)
    })

    it('retourne un tableau vide si pas de mouvements', async () => {
      mockIpcInvoke.mockResolvedValue([])
      const { getEncounterMovements } = useEncounters()

      const result = await getEncounterMovements(1)

      expect(result).toHaveLength(0)
    })

    it('retourne un tableau vide et set error en cas d\'erreur', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur'))
      const { getEncounterMovements, error } = useEncounters()

      const result = await getEncounterMovements(1)

      expect(result).toEqual([])
      expect(error.value).toBe('Erreur')
    })
  })

  describe('addEncounterMovement', () => {
    it('appelle encounters:add-movement et retourne le mouvement créé', async () => {
      const newMovement: EncounterMovementDto = { ...mockMovements[0], id: 3 }
      mockIpcInvoke.mockResolvedValue(newMovement)
      const { addEncounterMovement } = useEncounters()

      const dto = {
        encounter_id: 1,
        service_id: 5,
        step_label: 'Accueil',
        entered_at: '2024-06-15T10:00:00.000Z',
      }

      const result = await addEncounterMovement(dto)

      expect(mockIpcInvoke).toHaveBeenCalledWith('encounters:add-movement', dto)
      expect(result).toEqual(newMovement)
    })

    it('retourne null et set error en cas d\'erreur', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur mouvement'))
      const { addEncounterMovement, error } = useEncounters()

      const result = await addEncounterMovement({
        encounter_id: 1,
        service_id: 5,
        step_label: 'Test',
        entered_at: '2024-06-15T10:00:00.000Z',
      })

      expect(result).toBeNull()
      expect(error.value).toBe('Erreur mouvement')
    })
  })

  describe('closeEncounter', () => {
    it('appelle encounters:close avec le bon id', async () => {
      mockIpcInvoke.mockResolvedValue(undefined)
      const { closeEncounter } = useEncounters()

      await closeEncounter(1)

      expect(mockIpcInvoke).toHaveBeenCalledWith('encounters:close', { id: 1 })
    })

    it('set error en cas d\'erreur', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur close'))
      const { closeEncounter, error } = useEncounters()

      await closeEncounter(1)

      expect(error.value).toBe('Erreur close')
    })
  })

  describe('closeCurrentEncounterMovement', () => {
    it('appelle encounters:close-current-movement', async () => {
      mockIpcInvoke.mockResolvedValue(undefined)
      const { closeCurrentEncounterMovement } = useEncounters()

      await closeCurrentEncounterMovement(1)

      expect(mockIpcInvoke).toHaveBeenCalledWith('encounters:close-current-movement', { encounter_id: 1 })
    })

    it('set error en cas d\'erreur', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur'))
      const { closeCurrentEncounterMovement, error } = useEncounters()

      await closeCurrentEncounterMovement(1)

      expect(error.value).toBe('Erreur')
    })
  })

  describe('loading state', () => {
    it('sets loading true during listEncountersByPatient and false after', async () => {
      mockIpcInvoke.mockResolvedValue(mockEncounters)
      const { listEncountersByPatient, loading } = useEncounters()

      const promise = listEncountersByPatient(42)
      expect(loading.value).toBe(true)
      await promise
      expect(loading.value).toBe(false)
    })
  })
})
