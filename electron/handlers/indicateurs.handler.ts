import { container } from 'tsyringe'
import { IndicateursService } from '../services/indicateurs.service'
import { ExportService } from '../services/export.service'
import { createHandler } from '../utils/create-handler'
import { ACCOUNTING_ROLES, type AppRole } from '../utils/authorization'
import type {
  ClearIndicateurManuelParams,
  IndicateursMensuelsParams,
  IndicateursParams,
  SetIndicateurManuelParams,
} from '../dto/indicateurs.dto'

const ADMIN_ROLES: readonly AppRole[] = ['ADMIN']

export function registerIndicateursHandlers(): void {
  createHandler<IndicateursParams>(
    'indicateurs:annuels',
    async (params) => container.resolve(IndicateursService).getAnnualStats(params ?? {}),
    { roles: ACCOUNTING_ROLES },
  )

  createHandler<IndicateursMensuelsParams>(
    'indicateurs:mensuels',
    async (params) => container.resolve(IndicateursService).getMonthlyStats(params),
    { roles: ACCOUNTING_ROLES },
  )

  // L'identité de l'acteur vient exclusivement de la session validée par le
  // processus principal — jamais de `params`.
  createHandler<SetIndicateurManuelParams>(
    'indicateurs:set-manuel',
    async (params, actor) => {
      const actorId = actor?.userId
      if (!actorId) throw new Error('Acteur authentifié requis')
      return container
        .resolve(IndicateursService)
        .setManuel(params.annee, params.metric, params.value, actorId)
    },
    { roles: ADMIN_ROLES },
  )

  createHandler<ClearIndicateurManuelParams>(
    'indicateurs:clear-manuel',
    async (params) => container.resolve(IndicateursService).clearManuel(params.annee, params.metric),
    { roles: ADMIN_ROLES },
  )

  createHandler<IndicateursParams>(
    'export:indicateurs-excel',
    async (params) => container.resolve(ExportService).exportIndicateursExcel(params ?? {}),
    { roles: ACCOUNTING_ROLES },
  )
}
