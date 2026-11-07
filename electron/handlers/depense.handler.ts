import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { DepenseService } from '../services/depense.service'
import type {
  DepenseCategorieCreateDto,
  DepenseCategorieUpdateDto,
  DepenseCreateDto,
  DepenseListFiltres,
  DepenseMarquerPayeeDto,
  DepenseUpdateDto,
} from '../dto/depense.dto'
import { ACCOUNTING_ROLES, withTrustedActor } from '../utils/authorization'

/**
 * Dépenses : canaux réservés à l'administration et à la comptabilité.
 * L'auditeur (`createdBy`) provient de la session authentifiée du processus
 * principal, jamais du payload.
 */
export function registerDepenseHandlers() {
  createHandler('depense:categories', async (params?: { includeInactive?: boolean }) => {
    const service = container.resolve(DepenseService)
    return service.listCategories(params?.includeInactive ?? false)
  }, { roles: ACCOUNTING_ROLES })

  createHandler('depense:categorie:create', async (params: DepenseCategorieCreateDto) => {
    const service = container.resolve(DepenseService)
    return service.createCategorie(params)
  }, { roles: ACCOUNTING_ROLES })

  createHandler(
    'depense:categorie:update',
    async (params: { id: number } & DepenseCategorieUpdateDto) => {
      const { id, ...dto } = params ?? ({} as { id: number } & DepenseCategorieUpdateDto)
      if (!id) throw new Error('id requis')
      const service = container.resolve(DepenseService)
      return service.updateCategorie(id, dto)
    },
    { roles: ACCOUNTING_ROLES },
  )

  createHandler('depense:categorie:delete', async (params: { id: number }) => {
    const service = container.resolve(DepenseService)
    return service.deleteCategorie(params?.id)
  }, { roles: ACCOUNTING_ROLES })

  createHandler('depense:list', async (params?: DepenseListFiltres) => {
    const service = container.resolve(DepenseService)
    return service.list(params ?? {})
  }, { roles: ACCOUNTING_ROLES })

  createHandler('depense:create', async (params: DepenseCreateDto, actor) => {
    const service = container.resolve(DepenseService)
    return service.create(withTrustedActor(params, actor))
  }, { roles: ACCOUNTING_ROLES })

  createHandler('depense:update', async (params: { id: number } & DepenseUpdateDto) => {
    const { id, ...dto } = params ?? ({} as { id: number } & DepenseUpdateDto)
    if (!id) throw new Error('id requis')
    const service = container.resolve(DepenseService)
    return service.update(id, dto)
  }, { roles: ACCOUNTING_ROLES })

  createHandler('depense:delete', async (params: { id: number }) => {
    const service = container.resolve(DepenseService)
    return service.delete(params?.id)
  }, { roles: ACCOUNTING_ROLES })

  createHandler(
    'depense:marquer-payee',
    async (params: { id: number } & DepenseMarquerPayeeDto) => {
      const { id, ...dto } = params ?? ({} as { id: number } & DepenseMarquerPayeeDto)
      if (!id) throw new Error('id requis')
      const service = container.resolve(DepenseService)
      return service.marquerPayee(id, dto)
    },
    { roles: ACCOUNTING_ROLES },
  )

  createHandler('depense:synthese', async (params?: DepenseListFiltres) => {
    const service = container.resolve(DepenseService)
    return service.getSynthese(params ?? {})
  }, { roles: ACCOUNTING_ROLES })
}
