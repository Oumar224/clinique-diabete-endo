import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { FormDraftService } from '../services/form-draft.service'
import { FormDraftEntity } from '../entities/form-draft.entity'
import type { FormDraftDto } from '../dto/form-draft.dto'

export function registerFormDraftHandlers(): void {
  createHandler('form-draft:get', async (params: { formType: string; patientId?: number }) => {
    const service = container.resolve(FormDraftService)
    const entity = await service.getByType(params.formType, params.patientId)
    return entity ? FormDraftEntity.toDto(entity) : null
  })

  createHandler('form-draft:upsert', async (dto: FormDraftDto) => {
    const service = container.resolve(FormDraftService)
    const entity = FormDraftEntity.fromDto(dto)
    await service.upsert(entity)
    return { success: true }
  })

  createHandler('form-draft:delete', async (params: { formType: string; patientId?: number }) => {
    const service = container.resolve(FormDraftService)
    await service.deleteByType(params.formType, params.patientId)
    return { success: true }
  })
}
