// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePatientActes } from '../usePatientActes'
import type { PatientActeDto } from '../usePatientActes'

const mockInvoke = vi.fn()
vi.stubGlobal('window', {
  electronAPI: {
    invoke: mockInvoke,
  },
})

const mockActes: PatientActeDto[] = [
  { id: 1, patient_id: 42, acte_id: 1, tarif_id: 1, quantite: 1, statut_paiement: 'A_PAYER', acte_code: 'CONS-GEN-001', acte_label: 'Consultation générale', prix_unitaire: 50000, code_tarif: 'TARIF.STANDARD' },
  { id: 2, patient_id: 42, acte_id: 2, tarif_id: 2, quantite: 2, statut_paiement: 'PAYE', acte_code: 'CONS-ENDO-001', acte_label: 'Consultation endocrinologie', prix_unitaire: 75000, code_tarif: 'TARIF.STANDARD' },
]

describe('usePatientActes', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    mockInvoke.mockResolvedValue({ success: true, data: [] })
  })

  describe('fetchPatientActes', () => {
    it('calls ipcInvoke with patient-actes:list-by-patient and sets patientActes ref', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockActes })
      const { fetchPatientActes, patientActes } = usePatientActes()

      expect(patientActes.value).toEqual([])
      await fetchPatientActes(42)

      expect(mockInvoke).toHaveBeenCalledWith('patient-actes:list-by-patient', { patient_id: 42 })
      expect(patientActes.value).toEqual(mockActes)
      expect(patientActes.value).toHaveLength(2)
    })

    it('sets empty array on non-array response', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: null })
      const { fetchPatientActes, patientActes } = usePatientActes()

      await fetchPatientActes(42)

      expect(patientActes.value).toEqual([])
    })

    it('sets error on IPC failure', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur réseau'))
      const { fetchPatientActes, patientActes, error } = usePatientActes()

      await fetchPatientActes(42)

      expect(patientActes.value).toEqual([])
      expect(error.value).toBe('Erreur réseau')
    })

    it('sets loading true during fetch', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockActes })
      const { fetchPatientActes, loading } = usePatientActes()

      const promise = fetchPatientActes(42)
      expect(loading.value).toBe(true)
      await promise
      expect(loading.value).toBe(false)
    })
  })

  describe('fetchEncounterActes', () => {
    it('calls patient-actes:list-by-encounter with encounter_id', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: [mockActes[0]] })
      const { fetchEncounterActes, patientActes } = usePatientActes()

      await fetchEncounterActes(1)

      expect(mockInvoke).toHaveBeenCalledWith('patient-actes:list-by-encounter', { encounter_id: 1 })
      expect(patientActes.value).toHaveLength(1)
    })
  })

  describe('createPatientActe', () => {
    it('calls patient-actes:create and returns the created acte', async () => {
      const newActe: PatientActeDto = { id: 3, patient_id: 42, acte_id: 1, quantite: 1, statut_paiement: 'A_PAYER', prix_unitaire: 50000 }
      mockInvoke.mockResolvedValue({ success: true, data: newActe })

      const { createPatientActe } = usePatientActes()
      const result = await createPatientActe({ patient_id: 42, acte_id: 1 })

      expect(mockInvoke).toHaveBeenCalledWith('patient-actes:create', { patient_id: 42, acte_id: 1 })
      expect(result).toEqual(newActe)
    })

    it('passes optional encounter_id and quantite', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: mockActes[0] })
      const { createPatientActe } = usePatientActes()

      await createPatientActe({ patient_id: 42, acte_id: 1, encounter_id: 5, quantite: 3 })

      expect(mockInvoke).toHaveBeenCalledWith('patient-actes:create', { patient_id: 42, acte_id: 1, encounter_id: 5, quantite: 3 })
    })

    it('returns null on error', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { createPatientActe } = usePatientActes()

      const result = await createPatientActe({ patient_id: 42, acte_id: 1 })

      expect(result).toBeNull()
    })
  })

  describe('updateStatut', () => {
    it('calls patient-actes:update-statut and updates ref locally', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: { ...mockActes[0], statut_paiement: 'PAYE' } })
      const { updateStatut, patientActes } = usePatientActes()
      patientActes.value = [...mockActes]

      const ok = await updateStatut(1, 'PAYE')

      expect(ok).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('patient-actes:update-statut', { id: 1, statut: 'PAYE' })
      expect(patientActes.value[0].statut_paiement).toBe('PAYE')
    })

    it('returns false on error', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { updateStatut } = usePatientActes()

      const ok = await updateStatut(999, 'PAYE')

      expect(ok).toBe(false)
    })
  })

  describe('deletePatientActe', () => {
    it('calls patient-actes:delete and removes from local ref', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: null })
      const { deletePatientActe, patientActes } = usePatientActes()
      patientActes.value = [...mockActes]

      const ok = await deletePatientActe(1)

      expect(ok).toBe(true)
      expect(mockInvoke).toHaveBeenCalledWith('patient-actes:delete', { id: 1 })
      expect(patientActes.value).toHaveLength(1)
      expect(patientActes.value.find(a => a.id === 1)).toBeUndefined()
    })

    it('returns false on error', async () => {
      mockInvoke.mockRejectedValue(new Error('Erreur'))
      const { deletePatientActe } = usePatientActes()

      const ok = await deletePatientActe(999)

      expect(ok).toBe(false)
    })
  })
})
