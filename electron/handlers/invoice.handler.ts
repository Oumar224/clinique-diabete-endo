import { container } from 'tsyringe'
import { InvoiceService } from '../services/invoice.service'
import { createHandler } from '../utils/create-handler'
import type { InvoiceCreateDto, InvoicePaymentDto, InvoiceListDto, InvoiceUpdateDto } from '../dto/invoice.dto'
import { AuthorizationService } from '../services/auth/authorization.service'
import {
  AuthorizationError,
  logAuthorizationRejection,
  withTrustedActor,
  type AppRole,
  type AuthenticatedActor,
} from '../utils/authorization'

/**
 * Factures et encaissements : mêmes rôles que les écrans de facturation
 * (`FacturesTab`, `PatientFacturesView`) — ADMIN, COMPTABLE, SECRETAIRE.
 * Aucun rôle nouveau n'est introduit ici.
 */
const INVOICE_ROLES: readonly AppRole[] = ['ADMIN', 'COMPTABLE', 'SECRETAIRE']

/**
 * Lectures : session obligatoire (aucune donnée financière sans utilisateur
 * authentifié). Le contrôle est moins strict que `authorize` : un compte dont
 * le mot de passe initial n'est pas encore changé peut consulter.
 */
async function requireSession(channel: string): Promise<AuthenticatedActor> {
  const actor = await container.resolve(AuthorizationService).resolveActor()
  if (!actor) {
    logAuthorizationRejection(channel, 'aucune session valide', null)
    throw new AuthorizationError(
      'Accès refusé : aucune session valide. Veuillez vous reconnecter.',
    )
  }
  return actor
}

export function registerInvoiceHandlers() {
  createHandler('invoices:list', async (params: InvoiceListDto) => {
    await requireSession('invoices:list')
    return await container.resolve(InvoiceService).list(params)
  })

  createHandler('invoices:get', async ({ id }: { id: number }) => {
    await requireSession('invoices:get')
    return await container.resolve(InvoiceService).getById(id)
  })

  createHandler('invoices:get-by-patient', async ({ patient_id }: { patient_id: number }) => {
    await requireSession('invoices:get-by-patient')
    return await container.resolve(InvoiceService).getByPatient(patient_id)
  })

  createHandler('invoices:create', async (dto: InvoiceCreateDto, actor) => {
    const trusted = withTrustedActor(dto, actor) as InvoiceCreateDto & { createdBy?: number }
    return await container.resolve(InvoiceService).create({
      ...dto,
      created_by: trusted.createdBy ?? dto.created_by,
    })
  }, { roles: INVOICE_ROLES })

  createHandler('invoices:update', async (dto: InvoiceUpdateDto) => {
    const { id, ...data } = dto
    if (!id) throw new Error('id requis')
    return await container.resolve(InvoiceService).update(id, data)
  }, { roles: INVOICE_ROLES })

  createHandler('invoices:add-payment', async (payment: InvoicePaymentDto, actor) => {
    // L'auteur de l'encaissement est l'utilisateur de la session, jamais le
    // `created_by` fourni par le renderer.
    const trusted = withTrustedActor(payment, actor) as InvoicePaymentDto & { createdBy?: number }
    return await container.resolve(InvoiceService).addPayment({
      ...payment,
      created_by: trusted.createdBy ?? payment.created_by,
    })
  }, { roles: INVOICE_ROLES })

  createHandler('invoices:stats', async (params?: { date_debut?: string; date_fin?: string }) => {
    await requireSession('invoices:stats')
    return await container.resolve(InvoiceService).getStats(params ?? {})
  })

  createHandler('invoices:recu:get', async (params: { payment_id?: number; numero_recu?: string }) => {
    await requireSession('invoices:recu:get')
    return await container.resolve(InvoiceService).getRecu(params)
  })
}
