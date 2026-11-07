import { container, inject, singleton } from 'tsyringe'
import { CurrentSessionService } from './current-session.service'
import { SessionService } from './session.service'
import type { UserEntity } from '../../entities/user.entity'
import type { AppRole, AuthenticatedActor } from '../../utils/authorization'
import { AuthorizationError, logAuthorizationRejection } from '../../utils/authorization'

/**
 * Point de contrôle d'accès du processus principal.
 *
 * L'identité de l'acteur est TOUJOURS dérivée de la session détenue par le
 * processus principal, puis revalidée en base (`session` + `user`). Aucune
 * donnée fournie par le renderer ne participe à la décision : un rôle forgé
 * dans la charge utile ne peut donc jamais élargir les droits.
 */
@singleton()
export class AuthorizationService {
  constructor(
    @inject(CurrentSessionService) private readonly currentSession: CurrentSessionService,
    @inject(SessionService) private readonly sessionService: SessionService,
  ) {}

  /**
   * Résout l'utilisateur authentifié depuis la session du processus principal,
   * revalidée en base.
   *
   * @returns l'utilisateur, ou `null` si aucune session n'est ouverte ou si la
   *          session a expiré / a été révoquée / si l'utilisateur est désactivé.
   */
  private async resolveUser(): Promise<UserEntity | null> {
    const current = this.currentSession.get()
    if (!current?.token) return null

    // Revalidation systématique : la base reste la source de vérité (rôle
    // modifié, compte désactivé, contrat résilié, session expirée…).
    const user = await this.sessionService.validate(current.token)
    if (!user || user.id == null) {
      this.currentSession.clear()
      return null
    }
    return user
  }

  /**
   * Résout l'acteur authentifié.
   *
   * @returns l'acteur, ou `null` si aucune session valide n'est ouverte.
   */
  async resolveActor(): Promise<AuthenticatedActor | null> {
    const user = await this.resolveUser()
    if (!user) return null

    return {
      userId: user.id!,
      role: (user.role ?? 'MEDECIN') as AppRole,
      email: user.email,
      nom: user.nom,
    }
  }

  /**
   * Choke point : refuse l'appel si l'acteur n'est pas authentifié ou si son
   * rôle ne figure pas dans la liste blanche.
   *
   * @throws {AuthorizationError} toujours convertible en `{ success: false }`.
   */
  async authorize(channel: string, roles: readonly AppRole[]): Promise<AuthenticatedActor> {
    const user = await this.resolveUser()

    if (!user) {
      logAuthorizationRejection(channel, 'aucune session valide', null)
      throw new AuthorizationError(
        'Accès refusé : aucune session valide. Veuillez vous reconnecter.',
      )
    }

    const actor: AuthenticatedActor = {
      userId: user.id!,
      role: (user.role ?? 'MEDECIN') as AppRole,
      email: user.email,
      nom: user.nom,
    }

    // Compte non validé (mot de passe initial jamais changé) : pas d'opération
    // comptable tant que le mot de passe n'a pas été modifié.
    if (user.is_validated === 0) {
      logAuthorizationRejection(channel, 'mot de passe initial non modifié', actor)
      throw new AuthorizationError(
        'Accès refusé : le mot de passe doit être modifié avant toute opération comptable.',
      )
    }

    if (!roles.includes(actor.role)) {
      logAuthorizationRejection(channel, `rôle ${actor.role} non autorisé`, actor)
      throw new AuthorizationError(
        `Accès refusé : le rôle ${actor.role} n'est pas autorisé sur cette opération.`,
      )
    }

    return actor
  }
}

/**
 * Raccourci résolvant le service à la demande (lazy) afin de ne pas
 * contraindre l'initialisation du conteneur au moment de l'enregistrement des
 * handlers.
 */
export function authorize(channel: string, roles: readonly AppRole[]): Promise<AuthenticatedActor> {
  return container.resolve(AuthorizationService).authorize(channel, roles)
}
