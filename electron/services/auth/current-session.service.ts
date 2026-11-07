import { singleton } from 'tsyringe'
import type { AppRole } from '../../utils/authorization'

/**
 * Session courante tenue par le processus principal.
 *
 * Elle est alimentée par le handler d'authentification (`auth:login`,
 * `session:validate`) et révoquée par `auth:logout`. Le renderer n'a jamais la
 * main dessus : il ne fournit qu'un jeton, qui est revalidé en base à chaque
 * appel protégé.
 */
export interface CurrentSession {
  /** Jeton de session (uuid) stocké en base dans la table `session`. */
  token: string
  userId: number
  role: AppRole
  email?: string
  nom?: string
}

@singleton()
export class CurrentSessionService {
  private current: CurrentSession | null = null

  /** Ouvre (ou remplace) la session courante. */
  set(session: CurrentSession): void {
    this.current = { ...session }
  }

  /** Session courante, ou `null` si aucun utilisateur n'est connecté. */
  get(): CurrentSession | null {
    return this.current
  }

  /** Révoque la session courante (déconnexion, ou session invalide en base). */
  clear(): void {
    this.current = null
  }
}
