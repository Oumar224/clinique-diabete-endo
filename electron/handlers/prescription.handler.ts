import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { PrescriptionService } from '../services/prescription.service'

export function registerPrescriptionHandlers() {
  // ── List prescriptions for a patient ────────────────────────────
  createHandler('prescription:list', async (params: { patientId: number }) => {
    const { patientId } = params
    if (!patientId) throw new Error('patientId requis')
    const service = container.resolve(PrescriptionService)
    return await service.listByPatient(patientId)
  })

  // ── Get a single prescription by id ─────────────────────────────
  createHandler('prescription:get', async (params: { id: number }) => {
    const { id } = params
    if (!id) throw new Error('id requis')
    const service = container.resolve(PrescriptionService)
    return await service.getById(id)
  })

  // ── Create a prescription (and generate plan_soins_items) ───────
  createHandler('prescription:create', async (params: {
    patientId: number
    medicament: string
    dosage: string
    voie: string
    duree: number
    frequence: string[]
    prn: boolean
    instructions: string | null
    prescripteurId: number
  }) => {
    const { patientId, ...data } = params
    if (!patientId) throw new Error('patientId requis')
    const service = container.resolve(PrescriptionService)
    return await service.create({ patientId, ...data })
  })

  // ── Update a prescription (regenerates en_attente items) ────────
  createHandler('prescription:update', async (params: {
    id: number
    medicament?: string
    dosage?: string
    voie?: string
    duree?: number
    frequence?: string[]
    prn?: boolean
    instructions?: string | null
  }) => {
    const { id, ...data } = params
    if (!id) throw new Error('id requis')
    const service = container.resolve(PrescriptionService)
    return await service.update(id, data)
  })

  // ── Stop a prescription ─────────────────────────────────────────
  createHandler('prescription:stop', async (params: { id: number }) => {
    const { id } = params
    if (!id) throw new Error('id requis')
    const service = container.resolve(PrescriptionService)
    await service.stop(id)
  })

  // ── Delete a prescription ───────────────────────────────────────
  createHandler('prescription:delete', async (params: { id: number }) => {
    const { id } = params
    if (!id) throw new Error('id requis')
    const service = container.resolve(PrescriptionService)
    await service.delete(id)
  })
}
