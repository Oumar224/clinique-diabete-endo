import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { PrescriptionService } from '../services/prescription.service'
import { PrescriptionEntity } from '../entities/prescription.entity'
import { normalizeVoieOrThrow } from '../constants/voies'
import type { PrescriptionDto } from '../dto/prescription.dto'

export function registerPrescriptionHandlers() {
  // ── List prescriptions for a patient ────────────────────────────
  createHandler('prescription:list', async (params: { patientId: number }) => {
    const { patientId } = params
    if (!patientId) throw new Error('patientId requis')
    const service = container.resolve(PrescriptionService)
    const entities = await service.listByPatient(patientId)
    return PrescriptionEntity.toDtos(entities)
  })

  // ── Get a single prescription by id ─────────────────────────────
  createHandler('prescription:get', async (params: { id: number }) => {
    const { id } = params
    if (!id) throw new Error('id requis')
    const service = container.resolve(PrescriptionService)
    const entity = await service.getById(id)
    return entity ? PrescriptionEntity.toDto(entity) : null
  })

  // ── Create a prescription (and generate plan_soins_items) ───────
  createHandler('prescription:create', async (dto: PrescriptionDto) => {
    // Validation pré-insert : message métier au lieu du SQLITE CHECK brut.
    normalizeVoieOrThrow((dto as PrescriptionDto).voie)
    const entity = PrescriptionEntity.fromDto(dto)
    const service = container.resolve(PrescriptionService)
    const result = await service.create(entity)
    return { prescription: PrescriptionEntity.toDto(result.prescription), itemsGenerated: result.itemsGenerated }
  })

  // ── Update a prescription (regenerates en_attente items) ────────
  createHandler('prescription:update', async (dto: PrescriptionDto) => {
    if ((dto as PrescriptionDto).voie != null) normalizeVoieOrThrow((dto as PrescriptionDto).voie)
    const entity = PrescriptionEntity.fromDto(dto)
    const service = container.resolve(PrescriptionService)
    const result = await service.update(entity)
    return { prescription: PrescriptionEntity.toDto(result.prescription), itemsGenerated: result.itemsGenerated }
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
