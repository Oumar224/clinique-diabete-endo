import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { SalaireService } from '../services/salaire.service'
import type {
  SalaireConfigCreateDto,
  SalaireHistoriqueFiltres,
  SalairePayerBulkDto,
  SalairePayerDto,
} from '../dto/salaire.dto'
import { ACCOUNTING_ROLES, withTrustedActor } from '../utils/authorization'

/**
 * Paie : canaux réservés à l'administration et à la comptabilité.
 * L'auditeur (`createdBy`) est l'utilisateur authentifié du processus
 * principal, jamais une valeur fournie par le renderer.
 */
export function registerSalaireHandlers() {
  createHandler('salaire:configs', async (params: { periode: string }) => {
    const service = container.resolve(SalaireService)
    return service.listConfigs(params?.periode)
  }, { roles: ACCOUNTING_ROLES })

  createHandler('salaire:config:save', async (params: SalaireConfigCreateDto, actor) => {
    const service = container.resolve(SalaireService)
    return service.saveConfig(withTrustedActor(params, actor))
  }, { roles: ACCOUNTING_ROLES })

  createHandler('salaire:config:copy-previous', async (params: { periode: string }) => {
    const service = container.resolve(SalaireService)
    return service.copyPreviousMonth(params?.periode)
  }, { roles: ACCOUNTING_ROLES })

  createHandler('salaire:paie', async (params: { periode: string }) => {
    const service = container.resolve(SalaireService)
    return service.getPaie(params?.periode)
  }, { roles: ACCOUNTING_ROLES })

  createHandler('salaire:payslip', async (params: { userId: number; periode: string }) => {
    const service = container.resolve(SalaireService)
    return service.getPayslip(params?.userId, params?.periode)
  }, { roles: ACCOUNTING_ROLES })

  createHandler('salaire:payer', async (params: SalairePayerDto, actor) => {
    const service = container.resolve(SalaireService)
    return service.payer(withTrustedActor(params, actor))
  }, { roles: ACCOUNTING_ROLES })

  createHandler('salaire:payer-bulk', async (params: SalairePayerBulkDto, actor) => {
    const service = container.resolve(SalaireService)
    return service.payerBulk(withTrustedActor(params, actor))
  }, { roles: ACCOUNTING_ROLES })

  createHandler('salaire:historique', async (params?: SalaireHistoriqueFiltres) => {
    const service = container.resolve(SalaireService)
    return service.historique(params ?? {})
  }, { roles: ACCOUNTING_ROLES })
}
