import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { OrdonnanceLibreService, validateCreateFromGroup, type OrdonnanceLibreCategorie } from '../services/ordonnance-libre.service'
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

  createHandler('ordonnance-libre:create-from-group', async (params: {
    patientId: number
    contactId: string
    serviceId?: string | null
    siteId?: number | null
    createdBy: string
    title: string
    sourceDocumentId: string
    categorie: OrdonnanceLibreCategorie
    items: any[]
  }) => {
    const { contactId, createdBy, title } = params
    if (!contactId) throw new Error('contactId requis')
    if (!createdBy) throw new Error('createdBy requis')
    if (!title) throw new Error('title requis')
    // validation partagée handler/service (items non vide + categorie allowlist)
    validateCreateFromGroup(params)
    const service = container.resolve(OrdonnanceLibreService)
    return service.createOrReplaceFromGroup(params)
  })

  createHandler('ordonnance-libre:delete', async (params: { id: string }) => {
    const { id } = params
    if (!id) throw new Error('id requis')
    const service = container.resolve(ClinicalDocumentService)
    await service.deleteDocument(id)
    return { success: true }
  })
}
