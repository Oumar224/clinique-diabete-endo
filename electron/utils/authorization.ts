/**
 * Primitives d'autorisation côté processus principal (main process).
 *
 * Règle absolue : le rôle NE DOIT JAMAIS provenir de la charge utile (payload)
 * envoyée par le renderer. Il est toujours résolu depuis la session tenue par
 * le processus principal et revalidée en base (table `session` + table `user`).
 */

/** Tous les rôles applicatifs connus (miroir de `UserEntity['role']`). */
export const APP_ROLES = [
  'MEDECIN',
  'SECRETAIRE',
  'PHARMACIEN',
  'COMPTABLE',
  'ADMIN',
  'INFIRMIER',
] as const

export type AppRole = (typeof APP_ROLES)[number]

/** Opérations de comptabilité : paie, dépenses, caisse, comptabilité pharmacie. */
export const ACCOUNTING_ROLES: readonly AppRole[] = ['ADMIN', 'COMPTABLE']

/** Commandes pharmacie : consultation, création, réception et export des BC. */
export const PHARMACY_ORDER_ROLES: readonly AppRole[] = ['ADMIN', 'PHARMACIEN', 'COMPTABLE']

/** Apports de trésorerie et remboursements : comptabilité uniquement. */
export const APPORT_ROLES: readonly AppRole[] = ['ADMIN', 'COMPTABLE']

/** Opérations de délivrance en pharmacie (servir / file de la pharmacie). */
export const PHARMACY_SERVICE_ROLES: readonly AppRole[] = ['ADMIN', 'PHARMACIEN', 'COMPTABLE', 'INFIRMIER']

/** Encaissement d'une vente de pharmacie : le pharmacien encaisse au comptoir. */
export const PHARMACY_CASHIER_ROLES: readonly AppRole[] = ['ADMIN', 'COMPTABLE', 'PHARMACIEN']

/** Circuit laboratoire : création et suivi des demandes d'examen. */
export const LABO_REQUEST_ROLES: readonly AppRole[] = ['ADMIN', 'MEDECIN', 'INFIRMIER', 'SECRETAIRE']

/** Réalisation / validation des résultats de laboratoire. */
export const LABO_VALIDATE_ROLES: readonly AppRole[] = ['ADMIN', 'MEDECIN', 'INFIRMIER']

/** Encaissement d'une demande de laboratoire externe. */
export const LABO_CASHIER_ROLES: readonly AppRole[] = ['ADMIN', 'COMPTABLE', 'SECRETAIRE', 'MEDECIN']

/** Acteur authentifié, résolu par le processus principal. */
export interface AuthenticatedActor {
  userId: number
  role: AppRole
  email?: string
  nom?: string
}

/** Erreur d'autorisation : remontée au renderer comme `{ success: false }`. */
export class AuthorizationError extends Error {
  readonly code = 'ACCESS_DENIED'

  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/**
 * Trace d'audit : journalise toute tentative refusée (canal + motif + acteur).
 * Convention de logging du projet : préfixe `[CDE]`.
 */
export function logAuthorizationRejection(channel: string, reason: string, actor?: AuthenticatedActor | null): void {
  const who = actor ? `userId=${actor.userId} role=${actor.role}` : 'session inconnue'
  console.warn(`[CDE][AUTH] Accès refusé sur « ${channel} » : ${reason} (${who})`)
}

/**
 * Remplace les champs d'audit (`createdBy`) par l'identité de l'acteur
 * authentifié. Le champ fourni par le renderer n'est conservé que lorsqu'aucune
 * session n'est disponible (fallback explicite, jamais un rôle).
 */
export function withTrustedActor<T extends object>(
  params: T | undefined,
  actor?: AuthenticatedActor,
): T {
  const safe = (params ?? {}) as T
  if (!actor) return safe
  return { ...safe, createdBy: actor.userId } as T
}

/**
 * Exige qu'un acteur authentifié possède l'un des rôles donnés.
 *
 * Utilisé pour les contrôles PLUS FINS que la liste blanche du canal
 * (`HandlerOptions.roles`) : par exemple, un canal ouvert aux soignants mais
 * dont une opération précise (encaissement) est réservée à la caisse.
 *
 * Toute tentative refusée est journalisée sous `[CDE][AUTH]` puis levée en
 * `AuthorizationError` (le renderer reçoit `{ success: false }`).
 */
export function assertActorHasRole(
  channel: string,
  actor: AuthenticatedActor | undefined,
  roles: readonly AppRole[],
  reason: string,
): void {
  if (actor && roles.includes(actor.role)) return
  logAuthorizationRejection(channel, reason, actor)
  throw new AuthorizationError(reason)
}
