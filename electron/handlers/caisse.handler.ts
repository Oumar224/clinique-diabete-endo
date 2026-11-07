import { container } from 'tsyringe'
import { CaisseService } from '../services/caisse.service'
import { createHandler } from '../utils/create-handler'
import { ACCOUNTING_ROLES } from '../utils/authorization'

/**
 * Caisse : lecture de la trésorerie réservée à l'administration et à la
 * comptabilité (le solde et le journal sont des données financières).
 */
export function registerCaisseHandlers(): void {
  createHandler('caisse:synthese', async (params?: { dateDebut?: string; dateFin?: string }) => {
    return await container.resolve(CaisseService).getSynthese(params ?? {})
  }, { roles: ACCOUNTING_ROLES })
}
