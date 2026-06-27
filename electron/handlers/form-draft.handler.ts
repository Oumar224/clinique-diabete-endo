import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { FormDraftService } from '../services/form-draft.service'

export function registerFormDraftHandlers(): void {
  createHandler('form-draft:get', async (params: { formType: string; patientId?: number }) => {
    const service = container.resolve(FormDraftService)
    return await service.getByType(params.formType, params.patientId)
  })

  createHandler('form-draft:upsert', async (params: { formType: string; formData: string; patientId?: number; activeStep: number }) => {
    const service = container.resolve(FormDraftService)
    await service.upsert({
      formType: params.formType as 'patient_create' | 'patient_edit',
      formData: params.formData,
      patientId: params.patientId,
      activeStep: params.activeStep,
    })
    return { success: true }
  })

  createHandler('form-draft:delete', async (params: { formType: string; patientId?: number }) => {
    const service = container.resolve(FormDraftService)
    await service.deleteByType(params.formType, params.patientId)
    return { success: true }
  })
}
