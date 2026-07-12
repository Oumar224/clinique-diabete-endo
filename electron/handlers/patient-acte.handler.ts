import { container } from 'tsyringe'
import { PatientActeService } from '../services/patient-acte.service'
import { PatientActeEntity } from '../entities/patient-acte.entity'
import { createHandler } from '../utils/create-handler'
import type { PatientActeCreateDto } from '../dto/patient-acte.dto'

export function registerPatientActeHandlers() {
  createHandler('patient-actes:list-by-patient', async ({ patient_id }: { patient_id: number }) => {
    const entities = await container.resolve(PatientActeService).listByPatient(patient_id)
    return PatientActeEntity.toDtos(entities)
  })

  createHandler('patient-actes:list-by-encounter', async ({ encounter_id }: { encounter_id: number }) => {
    const entities = await container.resolve(PatientActeService).listByEncounter(encounter_id)
    return PatientActeEntity.toDtos(entities)
  })

  createHandler('patient-actes:create', async (dto: PatientActeCreateDto) => {
    const entity = await container.resolve(PatientActeService).create(dto)
    return PatientActeEntity.toDto(entity)
  })

  createHandler('patient-actes:update-statut', async ({ id, statut }: { id: number; statut: 'A_PAYER' | 'PAYE' }) => {
    const entity = await container.resolve(PatientActeService).updateStatut(id, statut)
    return PatientActeEntity.toDto(entity)
  })

  createHandler('patient-actes:delete', async ({ id }: { id: number }) => {
    await container.resolve(PatientActeService).delete(id)
    return { deleted: true }
  })
}
