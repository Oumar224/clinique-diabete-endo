// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockIpcInvoke = vi.hoisted(() => vi.fn())
vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

import { usePatients } from '../usePatients'
import type { PatientDto } from '../usePatients'

const mockPatients: PatientDto[] = [
  {
    id: 1,
    civilite: 'M',
    nom: 'DIALLO',
    prenom: 'Mamadou',
    date_naissance: '1985-03-15',
    nir: '1234567890123',
    telephone: '+224620000001',
    allergies: [],
  },
  {
    id: 2,
    civilite: 'Mme',
    nom: 'CAMARA',
    prenom: 'Fatoumata',
    date_naissance: '1990-07-22',
    nir: '9876543210123',
    telephone: '+224620000002',
    allergies: ['Pénicilline'],
    email: 'fatou@example.com',
  },
]

describe('usePatients', () => {
  beforeEach(() => {
    mockIpcInvoke.mockReset()
    mockIpcInvoke.mockResolvedValue([])
  })

  describe('fetchPatients', () => {
    it('appelle patients:list et met à jour patients', async () => {
      mockIpcInvoke.mockResolvedValue(mockPatients)
      const { fetchPatients, patients } = usePatients()

      await fetchPatients()

      expect(mockIpcInvoke).toHaveBeenCalledWith('patients:list', { search: undefined })
      expect(patients.value).toEqual(mockPatients)
      expect(patients.value).toHaveLength(2)
    })

    it('passe le paramètre search', async () => {
      mockIpcInvoke.mockResolvedValue([mockPatients[0]])
      const { fetchPatients } = usePatients()

      await fetchPatients('DIALLO')

      expect(mockIpcInvoke).toHaveBeenCalledWith('patients:list', { search: 'DIALLO' })
    })

    it('set error en cas d\'échec IPC', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur réseau'))
      const { fetchPatients, error } = usePatients()

      await fetchPatients()

      expect(error.value).toBe('Erreur réseau')
    })

    it('sets loading true during fetch', async () => {
      mockIpcInvoke.mockResolvedValue(mockPatients)
      const { fetchPatients, loading } = usePatients()

      const promise = fetchPatients()
      expect(loading.value).toBe(true)
      await promise
      expect(loading.value).toBe(false)
    })
  })

  describe('getPatient', () => {
    it('appelle patients:get avec le bon id', async () => {
      mockIpcInvoke.mockResolvedValue(mockPatients[0])
      const { getPatient } = usePatients()

      const result = await getPatient(1)

      expect(mockIpcInvoke).toHaveBeenCalledWith('patients:get', { id: 1 })
      expect(result).toEqual(mockPatients[0])
    })

    it('retourne null et set error en cas d\'erreur', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Patient introuvable'))
      const { getPatient, error } = usePatients()

      const result = await getPatient(999)

      expect(result).toBeNull()
      expect(error.value).toBe('Patient introuvable')
    })
  })

  describe('createPatient', () => {
    it('crée un patient puis refresh la liste', async () => {
      const newPatient: PatientDto = { ...mockPatients[0], id: 3, nom: 'TOURÉ' }
      mockIpcInvoke
        .mockResolvedValueOnce(newPatient)
        .mockResolvedValueOnce([...mockPatients, newPatient])

      const { createPatient, patients } = usePatients()
      const result = await createPatient({
        civilite: 'M',
        nom: 'TOURÉ',
        prenom: 'Ibrahim',
        date_naissance: '1995-01-01',
        nir: '1112223334445',
        telephone: '+224620000003',
        allergies: [],
      })

      expect(result).toEqual(newPatient)
      expect(mockIpcInvoke).toHaveBeenNthCalledWith(1, 'patients:create', {
        civilite: 'M',
        nom: 'TOURÉ',
        prenom: 'Ibrahim',
        date_naissance: '1995-01-01',
        nir: '1112223334445',
        telephone: '+224620000003',
        allergies: [],
      })
      expect(patients.value).toHaveLength(3)
    })

    it('retourne null et set error en cas d\'erreur', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur création'))
      const { createPatient, error } = usePatients()

      const result = await createPatient({
        civilite: 'M',
        nom: 'X',
        prenom: 'Y',
        date_naissance: '2000-01-01',
        nir: '000',
        telephone: '000',
        allergies: [],
      })

      expect(result).toBeNull()
      expect(error.value).toBe('Erreur création')
    })
  })

  describe('updatePatient', () => {
    it('met à jour un patient puis refresh la liste', async () => {
      const updated = { ...mockPatients[0], nom: 'DIALLO Modifié' }
      mockIpcInvoke
        .mockResolvedValueOnce(updated)
        .mockResolvedValueOnce([updated, mockPatients[1]])

      const { updatePatient } = usePatients()
      const result = await updatePatient({ ...mockPatients[0], nom: 'DIALLO Modifié' })

      expect(result).toEqual(updated)
      expect(mockIpcInvoke).toHaveBeenNthCalledWith(1, 'patients:update', { ...mockPatients[0], nom: 'DIALLO Modifié' })
    })

    it('retourne null et set error en cas d\'erreur', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur update'))
      const { updatePatient, error } = usePatients()

      const result = await updatePatient({ ...mockPatients[0], nom: 'X' })

      expect(result).toBeNull()
      expect(error.value).toBe('Erreur update')
    })
  })

  describe('deletePatient', () => {
    it('supprime un patient puis refresh la liste', async () => {
      mockIpcInvoke
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([mockPatients[1]])

      const { deletePatient } = usePatients()
      await deletePatient(1)

      expect(mockIpcInvoke).toHaveBeenNthCalledWith(1, 'patients:delete', { id: 1 })
    })

    it('set error en cas d\'erreur', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur suppression'))
      const { deletePatient, error } = usePatients()

      await deletePatient(999)

      expect(error.value).toBe('Erreur suppression')
    })

    it('sets loading true during delete', async () => {
      mockIpcInvoke.mockResolvedValue(undefined)
      const { deletePatient, loading } = usePatients()

      const promise = deletePatient(1)
      expect(loading.value).toBe(true)
      await promise
      expect(loading.value).toBe(false)
    })
  })

  describe('checkPatientsExist', () => {
    it('appelle patients:exists et retourne le résultat', async () => {
      const existence = { 1: true, 2: false }
      mockIpcInvoke.mockResolvedValue(existence)
      const { checkPatientsExist } = usePatients()

      const result = await checkPatientsExist([1, 2])

      expect(mockIpcInvoke).toHaveBeenCalledWith('patients:exists', { ids: [1, 2] })
      expect(result).toEqual(existence)
    })

    it('retourne un objet vide et set error en cas d\'erreur', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur'))
      const { checkPatientsExist, error } = usePatients()

      const result = await checkPatientsExist([1])

      expect(result).toEqual({})
      expect(error.value).toBe('Erreur')
    })
  })
})
