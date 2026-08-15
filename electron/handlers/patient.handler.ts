import { container } from 'tsyringe'
import { PatientService } from '../services/patient.service'
import { TrustedPersonService } from '../services/trusted-person.service'
import { AuthService } from '../services/auth.service'
import { PatientEntity } from '../entities/patient.entity'
import { TrustedPersonEntity } from '../entities/trusted-person.entity'
import type { PatientDto } from '../dto/patient.dto'
import type { TrustedPersonDto } from '../dto/trusted-person.dto'
import { createHandler } from '../utils/create-handler'

export function registerPatientHandlers() {
  createHandler('patients:list', async ({ search }: { search?: string }) => {
    const entities = await container.resolve(PatientService).list(search)
    return PatientEntity.toDtos(entities)
  })

  createHandler('patients:get', async ({ id }: { id: number }) => {
    const entity = await container.resolve(PatientService).getById(id)
    return entity ? PatientEntity.toDto(entity) : null
  })

  createHandler('patients:create', async (dto: PatientDto) => {
    const entity = PatientEntity.fromDto(dto)
    const created = await container.resolve(PatientService).create(entity)
    return PatientEntity.toDto(created)
  })

  createHandler('patients:update', async (dto: PatientDto) => {
    const entity = PatientEntity.fromDto(dto)
    const updated = await container.resolve(PatientService).update(entity)
    return PatientEntity.toDto(updated)
  })

  createHandler('patients:delete', async ({ id }: { id: number }) => {
    const deleted = await container.resolve(PatientService).delete(id)
    return PatientEntity.toDto(deleted)
  })

  createHandler('patients:exists', async ({ ids }: { ids: number[] }) => {
    return await container.resolve(PatientService).existByIds(ids)
  })

  createHandler('trusted-person:get', async ({ patientId }: { patientId: number }) => {
    const entity = await container.resolve(TrustedPersonService).getByPatientId(patientId)
    return entity ? TrustedPersonEntity.toDto(entity) : null
  })

  createHandler('trusted-person:upsert', async (dto: TrustedPersonDto) => {
    const entity = TrustedPersonEntity.fromDto(dto)
    const created = await container.resolve(TrustedPersonService).upsert(entity)
    return TrustedPersonEntity.toDto(created)
  })

  createHandler('trusted-person:delete', async ({ patientId }: { patientId: number }) => {
    await container.resolve(TrustedPersonService).delete(patientId)
  })

  // ════════════════════════════════════════════════════════════════
  // DOCTORS (médecins référents)
  // ════════════════════════════════════════════════════════════════
  createHandler('doctors:list-by-site', async ({ site_id }: { site_id?: number }) => {
    return await container.resolve(AuthService).listDoctorsBySite(site_id)
  })
}
