import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { DispensationService } from '../services/dispensation.service'
import type { EncaisserVenteDto, ServirPaiementDto } from '../dto/delivrance.dto'
import {
  ACCOUNTING_ROLES,
  APP_ROLES,
  AuthorizationError,
  PHARMACY_CASHIER_ROLES,
  PHARMACY_SERVICE_ROLES,
  assertActorHasRole,
  withTrustedActor,
} from '../utils/authorization'

/**
 * Dispensation / pharmacie.
 *
 * - délivrance (`servir`, `file`) : pharmacien (et roles de pharmacie) ;
 * - encaissement d'une vente : pharmacien, comptable, admin ;
 * - comptabilité pharmacie (ventes, créances, synthèse) : comptable, admin.
 *
 * L'identité de l'acteur (vendeur / encaisseur) est celle de la session du
 * processus principal, pas celle du payload.
 */
export function registerDispensationHandlers() {
  createHandler('dispensation:file', async (params: { statut?: 'a_servir' | 'partielle' | 'servie' | 'annulee' }) => {
    const service = container.resolve(DispensationService)
    return service.file(params ?? {})
  }, { roles: PHARMACY_SERVICE_ROLES })

  createHandler('dispensation:get', async (params: { id: number }) => {
    const { id } = params
    if (!id) throw new Error('id requis')
    const service = container.resolve(DispensationService)
    return service.getById(id)
  }, { roles: APP_ROLES })

  createHandler('dispensation:create-from-document', async (params: { documentId: string }) => {
    const { documentId } = params
    if (!documentId) throw new Error('documentId requis')
    const service = container.resolve(DispensationService)
    return service.createFromDocument(documentId)
  }, { roles: PHARMACY_SERVICE_ROLES })

  createHandler('dispensation:servir', async (params: {
    delivranceId: number
    lignes: Array<{ ligneId: number; quantite: number; lotId?: number; prixUnitaire?: number }>
    userId?: number | string
    typeVente?: 'facturee' | 'gratuite'
    motifGratuite?: string
    paiement?: ServirPaiementDto
  }, actor) => {
    const { delivranceId, lignes } = params
    if (!delivranceId) throw new Error('delivranceId requis')
    if (!Array.isArray(lignes) || lignes.length === 0) throw new Error('lignes requises')
    if (!actor) throw new AuthorizationError('Session requise')
    // Encaisser au comptoir est réservé à la caisse : un rôle soignant peut
    // délivrer, mais jamais manipuler un paiement ni fixer un prix.
    if (params.paiement) {
      assertActorHasRole(
        'dispensation:servir',
        actor,
        PHARMACY_CASHIER_ROLES,
        'encaissement d’une vente réservé à la caisse',
      )
    }
    if (lignes.some((ligne) => ligne.prixUnitaire !== undefined)) {
      assertActorHasRole(
        'dispensation:servir',
        actor,
        PHARMACY_CASHIER_ROLES,
        'saisie d’un prix unitaire réservée à la caisse',
      )
    }
    const service = container.resolve(DispensationService)
    // Le vendeur est l'utilisateur authentifié du processus principal.
    // Le `userId` du payload n'est JAMAIS utilisé.
    return service.servir({ ...params, userId: actor.userId })
  }, { roles: PHARMACY_SERVICE_ROLES })

  createHandler('dispensation:encaisser', async (params: EncaisserVenteDto, actor) => {
    if (!params?.delivranceId) throw new Error('delivranceId requis')
    const service = container.resolve(DispensationService)
    return service.encaisser(withTrustedActor(params, actor))
  }, { roles: PHARMACY_CASHIER_ROLES })

  createHandler('dispensation:vente', async (params: { id: number }) => {
    if (!params?.id) throw new Error('id requis')
    const service = container.resolve(DispensationService)
    return service.getVente(params.id)
  }, { roles: ACCOUNTING_ROLES })

  createHandler('dispensation:ventes', async (params?: {
    dateDebut?: string
    dateFin?: string
    patientId?: number
    statut?: 'gratuite' | 'sans_montant' | 'credit' | 'partielle' | 'payee'
  }) => {
    const service = container.resolve(DispensationService)
    return service.listVentes(params ?? {})
  }, { roles: ACCOUNTING_ROLES })

  createHandler('dispensation:ventes-credit', async (params?: {
    dateDebut?: string
    dateFin?: string
    patientId?: number
  }) => {
    const service = container.resolve(DispensationService)
    return service.getVentesCredit(params ?? {})
  }, { roles: ACCOUNTING_ROLES })

  createHandler('dispensation:synthese-comptable', async (params?: {
    dateDebut?: string
    dateFin?: string
  }) => {
    const service = container.resolve(DispensationService)
    return service.getSynthesePharmacie(params ?? {})
  }, { roles: ACCOUNTING_ROLES })

  createHandler('dispensation:annuler', async (params: { delivranceId: number; motif: string }) => {
    const { delivranceId, motif } = params
    if (!delivranceId) throw new Error('delivranceId requis')
    if (!motif?.trim()) throw new Error('motif requis')
    const service = container.resolve(DispensationService)
    return service.annuler(params)
  }, { roles: PHARMACY_SERVICE_ROLES })

  createHandler('dispensation:unmapped', async (params: { statut?: 'a_servir' | 'partielle' | 'servie' | 'annulee' }) => {
    const service = container.resolve(DispensationService)
    return service.lignesNonMappees(params ?? {})
  }, { roles: APP_ROLES })

  createHandler('dispensation:map-ligne', async (params: { ligneId: number; medicamentId: number }) => {
    const { ligneId, medicamentId } = params
    if (!ligneId) throw new Error('ligneId requis')
    if (!medicamentId) throw new Error('medicamentId requis')
    const service = container.resolve(DispensationService)
    return service.mapLigne(params)
  }, { roles: PHARMACY_SERVICE_ROLES })

  createHandler('dispensation:reouvrir', async (params: { delivranceId: number; motif: string }) => {
    const { delivranceId, motif } = params
    if (!delivranceId) throw new Error('delivranceId requis')
    if (!motif?.trim()) throw new Error('motif requis')
    const service = container.resolve(DispensationService)
    return service.reouvrir(params)
  }, { roles: PHARMACY_SERVICE_ROLES })

  createHandler('dispensation:orphelines', async () => {
    const service = container.resolve(DispensationService)
    return service.orphelines()
  }, { roles: APP_ROLES })
}
