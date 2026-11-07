import { container } from 'tsyringe'
import { AuthService } from '../services/auth.service'
import { SessionService } from '../services/auth/session.service'
import { CurrentSessionService } from '../services/auth/current-session.service'
import { EmailService } from '../services/email/email.service'
import { UserEntity } from '../entities/user.entity'
import type { UserDto, ValidatePasswordDto, SyncUserRelationsDto, TerminateContractDto } from '../dto/auth.dto'
import { createHandler } from '../utils/create-handler'
import type { AppRole } from '../utils/authorization'

export function registerAuthHandlers() {
  const authService = container.resolve(AuthService)
  const sessionService = container.resolve(SessionService)

  createHandler('session:validate', async ({ token }: { token: string }) => {
    const user = await sessionService.validate(token)
    if (!user || user.id == null) return null
    // Restauration de session : le processus principal adopte l'identité.
    container.resolve(CurrentSessionService).set({
      token,
      userId: user.id,
      role: (user.role ?? 'MEDECIN') as AppRole,
      email: user.email,
      nom: user.nom,
    })
    return UserEntity.toDto(user)
  })

  createHandler('auth:login', async ({ email, password, rememberMe }: { email: string; password: string; rememberMe?: boolean }) => {
    const result = await authService.login(email, password, rememberMe)
    // Le jeton est créé par le processus principal : c'est ici que la session
    // courante est ouverte. Le renderer ne fait que le conserver.
    if (result.token && result.user?.id != null) {
      container.resolve(CurrentSessionService).set({
        token: result.token,
        userId: result.user.id,
        role: (result.user.role ?? 'MEDECIN') as AppRole,
        email: result.user.email,
        nom: result.user.nom,
      })
    }
    return result
  })

  createHandler('auth:logout', async ({ token }: { token?: string } = {}) => {
    const currentSession = container.resolve(CurrentSessionService)
    const current = currentSession.get()
    const tokenToRevoke = token ?? current?.token
    if (tokenToRevoke) {
      await sessionService.invalidate(tokenToRevoke)
    }
    currentSession.clear()
    return { success: true }
  })

  createHandler('auth:validate-password', async (dto: ValidatePasswordDto) => {
    return await authService.validatePassword(dto.userId!, dto.oldPassword!, dto.newPassword!)
  })

  createHandler('users:list', () => authService.listUsers())
  createHandler('users:create', async (dto: UserDto & { sendEmail?: boolean }) => {
    const user = await authService.createUser(dto)
    if (dto.sendEmail && user.email) {
      const emailService = container.resolve(EmailService)
      const tempPassword = dto.password || 'changeme'
      emailService.sendWelcomeEmail(user, tempPassword).catch(err =>
        console.error('[CDE] Échec envoi email bienvenue (fire-and-forget):', err)
      )
    }
    return user
  })
  createHandler('users:update', (dto: UserDto) => authService.updateUser(dto))
  createHandler('users:delete', async ({ id }: { id: number }) => {
    await authService.deleteUser(id)
    return { success: true }
  })
  createHandler('users:get', ({ id }: { id: number }) => authService.getUserById(id))

  createHandler('users:get-relations', async ({ id }: { id: number }) => {
    return await authService.enrichUserWithRelations(id)
  })

  createHandler('users:sync-relations', async (dto: SyncUserRelationsDto) => {
    const { id, ...relations } = dto
    await authService.syncUserRelations(id!, relations)
    return { success: true }
  })

  createHandler('users:terminate-contract', async (dto: TerminateContractDto) => {
    const user = await authService.getUserById(dto.id!)
    if (!user) throw new Error('Utilisateur introuvable')
    await authService.terminateContract(dto.id!, dto.motif!, dto.resilie_par ?? 1)
    return { success: true }
  })

  createHandler('users:reactivate-contract', async ({ id }: { id: number }) => {
    await authService.reactivateContract(id)
    return { success: true }
  })

  createHandler('auth:send-reset-password', async ({ email }: { email: string }) => {
    await authService.sendResetPassword(email)
    return { success: true }
  })
}
