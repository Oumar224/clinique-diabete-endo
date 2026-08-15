// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInvoke = vi.fn()
vi.stubGlobal('window', {
  electronAPI: {
    invoke: mockInvoke,
  },
})

import { useTrustedPerson } from '../useTrustedPerson'
import type { TrustedPersonDto } from '../useTrustedPerson'

const mockTrustedPerson: TrustedPersonDto = {
  id: 1,
  patient_id: 42,
  has_trusted: true,
  nom: 'TOURÉ',
  prenom: 'Amadou',
  profession: 'Enseignant',
  residence: 'Kaloum',
  telephone: '+224620000010',
  email: 'amadou@example.com',
  lien_parente: 'Frère',
}

describe('useTrustedPerson', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    mockInvoke.mockResolvedValue({ success: true, data: null })
  })

  describe('getTrustedPerson', () => {
    it('appelle trusted-person:get et retourne la personne de confiance', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockTrustedPerson })
      const { getTrustedPerson } = useTrustedPerson()

      const result = await getTrustedPerson(42)

      expect(mockInvoke).toHaveBeenCalledWith('trusted-person:get', { patientId: 42 })
      expect(result).toEqual(mockTrustedPerson)
    })

    it('retourne null si pas de personne de confiance', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: null })
      const { getTrustedPerson } = useTrustedPerson()

      const result = await getTrustedPerson(42)

      expect(result).toBeNull()
    })

    it('retourne null et set error en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur réseau'))
      const { getTrustedPerson, error } = useTrustedPerson()

      const result = await getTrustedPerson(42)

      expect(result).toBeNull()
      expect(error.value).toBe('Erreur réseau')
    })

    it('sets loading true during fetch and false after', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockTrustedPerson })
      const { getTrustedPerson, loading } = useTrustedPerson()

      const promise = getTrustedPerson(42)
      expect(loading.value).toBe(true)
      await promise
      expect(loading.value).toBe(false)
    })
  })

  describe('upsertTrustedPerson', () => {
    it('appelle trusted-person:upsert et retourne la personne créée', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockTrustedPerson })
      const { upsertTrustedPerson } = useTrustedPerson()

      const result = await upsertTrustedPerson({
        patient_id: 42,
        has_trusted: true,
        nom: 'TOURÉ',
        prenom: 'Amadou',
        lien_parente: 'Frère',
      })

      expect(mockInvoke).toHaveBeenCalledWith('trusted-person:upsert', {
        patient_id: 42,
        has_trusted: true,
        nom: 'TOURÉ',
        prenom: 'Amadou',
        lien_parente: 'Frère',
      })
      expect(result).toEqual(mockTrustedPerson)
    })

    it('retourne null et set error en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur upsert'))
      const { upsertTrustedPerson, error } = useTrustedPerson()

      const result = await upsertTrustedPerson({
        patient_id: 42,
        has_trusted: true,
      })

      expect(result).toBeNull()
      expect(error.value).toBe('Erreur upsert')
    })

    it('sets loading true during upsert and false after', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockTrustedPerson })
      const { upsertTrustedPerson, loading } = useTrustedPerson()

      const promise = upsertTrustedPerson({ patient_id: 42, has_trusted: false })
      expect(loading.value).toBe(true)
      await promise
      expect(loading.value).toBe(false)
    })
  })

  describe('deleteTrustedPerson', () => {
    it('appelle trusted-person:delete', async () => {
      mockInvoke.mockResolvedValue({ success: true })
      const { deleteTrustedPerson } = useTrustedPerson()

      await deleteTrustedPerson(42)

      expect(mockInvoke).toHaveBeenCalledWith('trusted-person:delete', { patientId: 42 })
    })

    it('set error en cas d\'erreur', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur delete'))
      const { deleteTrustedPerson, error } = useTrustedPerson()

      await deleteTrustedPerson(42)

      expect(error.value).toBe('Erreur delete')
    })

    it('sets loading true during delete and false after', async () => {
      mockInvoke.mockResolvedValue({ success: true })
      const { deleteTrustedPerson, loading } = useTrustedPerson()

      const promise = deleteTrustedPerson(42)
      expect(loading.value).toBe(true)
      await promise
      expect(loading.value).toBe(false)
    })
  })
})
