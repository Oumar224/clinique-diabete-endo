// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  listEncountersByPatient,
  getEncounter,
  createEncounter,
  getEncounterMovements,
  closeEncounter,
} from '../useEncounters'
import type { EncounterDto, EncounterMovementDto } from '../useEncounters'

const mockInvoke = vi.fn()
vi.stubGlobal('window', {
  electronAPI: {
    invoke: mockInvoke,
  },
})

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
    mockInvoke.mockReset()
    mockInvoke.mockResolvedValue({ success: true, data: [] })
  })

  describe('listEncountersByPatient', () => {
    it('appelle encounters:list-by-patient et retourne les données', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockEncounters })

      // ipcInvoke sanitize convertit undefined en null via JSON.stringify
      const result = await listEncountersByPatient(42)
      expect(mockInvoke).toHaveBeenCalledWith('encounters:list-by-patient', { patient_id: 42, status: null })
      expect(result).toEqual(mockEncounters)
    })

    it('filtre par statut actif', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: [mockEncounters[0]] })
      const result = await listEncountersByPatient(42, 'active')
      expect(mockInvoke).toHaveBeenCalledWith('encounters:list-by-patient', { patient_id: 42, status: 'active' })
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('active')
    })

    it('propage l\'erreur IPC', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur réseau'))
      await expect(listEncountersByPatient(42)).rejects.toThrow('Erreur réseau')
    })

    it('propage l\'erreur du backend (success: false)', async () => {
      mockInvoke.mockResolvedValue({ success: false, message: 'Patient introuvable' })
      await expect(listEncountersByPatient(99999)).rejects.toThrow('Patient introuvable')
    })
  })

  describe('getEncounter', () => {
    it('appelle encounters:get avec le bon id', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockEncounters[0] })
      const result = await getEncounter(1)
      expect(mockInvoke).toHaveBeenCalledWith('encounters:get', { id: 1 })
      expect(result).toEqual(mockEncounters[0])
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
      mockInvoke.mockResolvedValue({ success: true, data: newEncounter })

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
      expect(mockInvoke).toHaveBeenCalledWith('encounters:create', payload)
      expect(result).toEqual(newEncounter)
    })

    it('envoie les champs optionnels', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockEncounters[0] })

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
      expect(mockInvoke).toHaveBeenCalledWith('encounters:create', payload)
    })
  })

  describe('getEncounterMovements', () => {
    it('appelle encounters:get-movements et retourne les mouvements', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockMovements })
      const result = await getEncounterMovements(1)
      expect(mockInvoke).toHaveBeenCalledWith('encounters:get-movements', { encounter_id: 1 })
      expect(result).toEqual(mockMovements)
    })

    it('retourne un tableau vide si pas de mouvements', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: [] })
      const result = await getEncounterMovements(1)
      expect(result).toHaveLength(0)
    })

    it('propage l\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      await expect(getEncounterMovements(1)).rejects.toThrow('Erreur')
    })
  })

  describe('closeEncounter', () => {
    it('appelle encounters:close avec le bon id', async () => {
      mockInvoke.mockResolvedValue({ success: true })
      await closeEncounter(1)
      expect(mockInvoke).toHaveBeenCalledWith('encounters:close', { id: 1 })
    })
  })
})
