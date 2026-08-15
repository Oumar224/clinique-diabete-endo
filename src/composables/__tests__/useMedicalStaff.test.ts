// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockIpcInvoke = vi.hoisted(() => vi.fn())
vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

import { useMedicalStaff, formatMedecinName } from '../useMedicalStaff'
import type { UserDto } from '../useUsers'

const mockMedicalStaff: UserDto[] = [
  {
    id: 1,
    nom: 'Diallo',
    prenom: 'Mamadou',
    role: 'MEDECIN',
    is_active: true,
    specialties: [{ id: 1, name: 'Endocrinologie', code: 'ENDO', title_prefix: 'Dr' }],
  },
  {
    id: 2,
    nom: 'Camara',
    prenom: 'Fatoumata',
    role: 'INFIRMIER',
    is_active: true,
    specialties: [],
  },
  {
    id: 3,
    nom: 'Sow',
    prenom: 'Ibrahima',
    role: 'MEDECIN',
    is_active: true,
    specialties: [{ id: 2, name: 'Cardiologie', code: 'CARDIO', title_prefix: 'Pr' }],
  },
  {
    id: 4,
    nom: 'Bah',
    prenom: 'Aissatou',
    role: 'SECRETAIRE',
    is_active: true,
    specialties: [],
  },
  {
    id: 5,
    nom: 'Touré',
    prenom: 'Moussa',
    role: 'MEDECIN',
    is_active: false,
    specialties: [],
  },
]

describe('formatMedecinName', () => {
  it('formate le nom avec prefix', () => {
    const user: UserDto = {
      nom: 'Diallo',
      prenom: 'Mamadou',
      specialties: [{ id: 1, name: 'Endocrinologie', code: 'ENDO', title_prefix: 'Dr' }],
    }
    expect(formatMedecinName(user)).toBe('Dr DIALLO Mamadou')
  })

  it('formate le nom sans prefix', () => {
    const user: UserDto = {
      nom: 'Camara',
      prenom: 'Fatoumata',
    }
    expect(formatMedecinName(user)).toBe('CAMARA Fatoumata')
  })

  it('gère les champs manquants', () => {
    const user: UserDto = {}
    expect(formatMedecinName(user)).toBe(' ')
  })
})

describe('useMedicalStaff', () => {
  beforeEach(() => {
    mockIpcInvoke.mockReset()
    mockIpcInvoke.mockResolvedValue([])
  })

  describe('fetchMedicalStaff', () => {
    it('récupère le personnel médical actif (MEDECIN + INFIRMIER)', async () => {
      mockIpcInvoke.mockResolvedValue(mockMedicalStaff)
      const { fetchMedicalStaff, cachedStaff } = useMedicalStaff()

      const result = await fetchMedicalStaff()

      expect(mockIpcInvoke).toHaveBeenCalledWith('users:list')
      expect(result).toHaveLength(3)
      expect(cachedStaff.value).toHaveLength(3)
      expect(result.every(u => u.is_active)).toBe(true)
      expect(result.every(u => u.role === 'MEDECIN' || u.role === 'INFIRMIER')).toBe(true)
    })

    it('exclut les utilisateurs inactifs', async () => {
      mockIpcInvoke.mockResolvedValue(mockMedicalStaff)
      const { fetchMedicalStaff } = useMedicalStaff()

      const result = await fetchMedicalStaff()

      expect(result.find(u => u.id === 5)).toBeUndefined()
    })

    it('exclut les non-personnel médical', async () => {
      mockIpcInvoke.mockResolvedValue(mockMedicalStaff)
      const { fetchMedicalStaff } = useMedicalStaff()

      const result = await fetchMedicalStaff()

      expect(result.find(u => u.role === 'SECRETAIRE')).toBeUndefined()
    })

    it('met en cache et ne refait pas d\'appel si déjà chargé', async () => {
      mockIpcInvoke.mockResolvedValue(mockMedicalStaff)
      const { fetchMedicalStaff } = useMedicalStaff()

      await fetchMedicalStaff()
      mockIpcInvoke.mockClear()

      const result = await fetchMedicalStaff()

      expect(mockIpcInvoke).not.toHaveBeenCalled()
      expect(result).toHaveLength(3)
    })

    it('force=true refait l\'appel même si déjà en cache', async () => {
      mockIpcInvoke.mockResolvedValue(mockMedicalStaff)
      const { fetchMedicalStaff } = useMedicalStaff()

      await fetchMedicalStaff()
      mockIpcInvoke.mockClear()

      await fetchMedicalStaff(true)

      expect(mockIpcInvoke).toHaveBeenCalledWith('users:list')
    })

    it('retourne un tableau vide et set error en cas d\'erreur', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur réseau'))
      const { fetchMedicalStaff, error } = useMedicalStaff()

      const result = await fetchMedicalStaff()

      expect(result).toEqual([])
      expect(error.value).toBe('Erreur réseau')
    })

    it('sets loading true during fetch and false after', async () => {
      mockIpcInvoke.mockResolvedValue(mockMedicalStaff)
      const { fetchMedicalStaff, loading } = useMedicalStaff()

      const promise = fetchMedicalStaff()
      expect(loading.value).toBe(true)
      await promise
      expect(loading.value).toBe(false)
    })
  })

  describe('searchMedicalStaff', () => {
    it('retourne vide si le cache est vide', () => {
      const { searchMedicalStaff } = useMedicalStaff()

      const result = searchMedicalStaff('Diallo')

      expect(result).toEqual([])
    })

    it('recherche par nom', async () => {
      mockIpcInvoke.mockResolvedValue(mockMedicalStaff)
      const { fetchMedicalStaff, searchMedicalStaff } = useMedicalStaff()

      await fetchMedicalStaff()

      const result = searchMedicalStaff('Diallo')

      expect(result).toHaveLength(1)
      expect(result[0].nom).toBe('Diallo')
    })

    it('recherche par prénom', async () => {
      mockIpcInvoke.mockResolvedValue(mockMedicalStaff)
      const { fetchMedicalStaff, searchMedicalStaff } = useMedicalStaff()

      await fetchMedicalStaff()

      const result = searchMedicalStaff('Fatou')

      expect(result).toHaveLength(1)
      expect(result[0].prenom).toBe('Fatoumata')
    })

    it('recherche insensible à la casse', async () => {
      mockIpcInvoke.mockResolvedValue(mockMedicalStaff)
      const { fetchMedicalStaff, searchMedicalStaff } = useMedicalStaff()

      await fetchMedicalStaff()

      const result = searchMedicalStaff('diallo')

      expect(result).toHaveLength(1)
    })

    it('retourne tous les résultats avec une chaîne vide', async () => {
      mockIpcInvoke.mockResolvedValue(mockMedicalStaff)
      const { fetchMedicalStaff, searchMedicalStaff } = useMedicalStaff()

      await fetchMedicalStaff()

      const result = searchMedicalStaff('')

      expect(result).toHaveLength(3)
    })

    it('respecte la limite', async () => {
      mockIpcInvoke.mockResolvedValue(mockMedicalStaff)
      const { fetchMedicalStaff, searchMedicalStaff } = useMedicalStaff()

      await fetchMedicalStaff()

      const result = searchMedicalStaff('', 2)

      expect(result).toHaveLength(2)
    })
  })

  describe('getMedicalStaffCache', () => {
    it('retourne le cache vide par défaut', () => {
      const { getMedicalStaffCache } = useMedicalStaff()
      expect(getMedicalStaffCache()).toEqual([])
    })

    it('retourne les données après fetch', async () => {
      mockIpcInvoke.mockResolvedValue(mockMedicalStaff)
      const { fetchMedicalStaff, getMedicalStaffCache } = useMedicalStaff()

      await fetchMedicalStaff()

      expect(getMedicalStaffCache()).toHaveLength(3)
    })
  })
})
