import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { OrdonnanceLibreService } from '../services/ordonnance-libre.service'
import { ClinicalDocumentService } from '../services/clinical-document.service'

export function registerOrdonnanceLibreHandlers() {
  createHandler('ordonnance-libre:list', async (params: { patientId: number }) => {
    const { patientId } = params
    if (!patientId) throw new Error('patientId requis')
    const service = container.resolve(OrdonnanceLibreService)
    return service.listByPatient(patientId)
  })

  createHandler('ordonnance-libre:get', async (params: { id: string }) => {
    const { id } = params
    if (!id) throw new Error('id requis')
    const service = container.resolve(OrdonnanceLibreService)
    return service.getById(id)
  })

  createHandler('ordonnance-libre:delete', async (params: { id: string }) => {
    const { id } = params
    if (!id) throw new Error('id requis')
    const service = container.resolve(ClinicalDocumentService)
    await service.deleteDocument(id)
    return { success: true }
  })
}
