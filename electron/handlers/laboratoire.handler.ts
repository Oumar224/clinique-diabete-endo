import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { LaboratoireService, type LaboWorklistFilters } from '../services/laboratoire.service'
import { ExamRequestEntity } from '../entities/exam-request.entity'
import type { ExamRequestDto, ExamRequestStatut } from '../dto/exam-request.dto'
import { ACCOUNTING_ROLES, LABO_CASHIER_ROLES, LABO_REQUEST_ROLES, LABO_VALIDATE_ROLES } from '../utils/authorization'
import { LaboPaiementEntity } from '../entities/laboratoire.entity'
import type { LaboModePaiement } from '../dto/laboratoire.dto'

export function registerLaboratoireHandlers(): void {
  createHandler('labo:worklist', async (filters: LaboWorklistFilters) => {
    const entities = await container.resolve(LaboratoireService).listWorklist(filters ?? {})
    return ExamRequestEntity.toDtos(entities)
  }, { roles: LABO_REQUEST_ROLES })

  createHandler('labo:get', async ({ id }: { id: number }) => {
    if (!id) throw new Error('id requis')
    const entity = await container.resolve(LaboratoireService).getDetail(id)
    return entity ? ExamRequestEntity.toDto(entity) : null
  }, { roles: LABO_REQUEST_ROLES })

  createHandler('labo:create', async (dto: ExamRequestDto) => {
    const created = await container.resolve(LaboratoireService).createDemande(dto ?? {})
    return ExamRequestEntity.toDto(created)
  }, { roles: LABO_REQUEST_ROLES })

  createHandler('labo:statut', async (params: { id: number; statut: ExamRequestStatut }) => {
    if (!params?.id) throw new Error('id requis')
    const updated = await container.resolve(LaboratoireService).updateStatut(params.id, params.statut)
    return ExamRequestEntity.toDto(updated)
  }, { roles: LABO_VALIDATE_ROLES })

  createHandler('labo:prelevement', async (params: {
    id: number
    prelevementType?: string
    prelevementAt?: string
    prelevementPar?: number
  }) => {
    if (!params?.id) throw new Error('id requis')
    const updated = await container.resolve(LaboratoireService).enregistrerPrelevement(params.id, params)
    return ExamRequestEntity.toDto(updated)
  }, { roles: LABO_REQUEST_ROLES })

  createHandler('labo:stats', async () => {
    return container.resolve(LaboratoireService).stats()
  }, { roles: LABO_REQUEST_ROLES })

  createHandler('labo:examens', async () => {
    return container.resolve(LaboratoireService).listExamens()
  }, { roles: LABO_REQUEST_ROLES })

  createHandler('labo:paiements', async ({ examRequestId }: { examRequestId: number }) => {
    if (!examRequestId) throw new Error('examRequestId requis')
    const rows = await container.resolve(LaboratoireService).listPaiements(examRequestId)
    return LaboPaiementEntity.toDtos(rows)
  }, { roles: LABO_REQUEST_ROLES })

  createHandler('labo:paiement', async (params: {
    id: number
    montant?: number
    modePaiement?: LaboModePaiement
    datePaiement?: string
    reference?: string
    exonere?: boolean
    createdBy?: number
  }) => {
    if (!params?.id) throw new Error('id requis')
    const updated = await container.resolve(LaboratoireService).enregistrerPaiement(params.id, params)
    return ExamRequestEntity.toDto(updated)
  }, { roles: LABO_CASHIER_ROLES })

  createHandler('labo:comptabilite', async (params: {
    dateDebut?: string | null
    dateFin?: string | null
  }) => {
    return container.resolve(LaboratoireService).syntheseComptable(
      params?.dateDebut ?? null,
      params?.dateFin ?? null,
    )
  }, { roles: ACCOUNTING_ROLES })
}
