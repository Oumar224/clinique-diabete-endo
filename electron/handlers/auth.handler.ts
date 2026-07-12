import { container } from 'tsyringe'
import { AuthService } from '../services/auth.service'
import { SessionService } from '../services/auth/session.service'
import { EmailService } from '../services/email/email.service'
import { UserEntity } from '../entities/user.entity'
import type { UserDto, ValidatePasswordDto, SyncUserRelationsDto, TerminateContractDto } from '../dto/auth.dto'
import { createHandler } from '../utils/create-handler'

export function registerAuthHandlers() {
  const authService = container.resolve(AuthService)
  const sessionService = container.resolve(SessionService)

  createHandler('session:validate', async ({ token }: { token: string }) => {
    const user = await sessionService.validate(token)
    return user ? UserEntity.toDto(user) : null
  })

  createHandler('auth:login', ({ email, password, rememberMe }: { email: string; password: string; rememberMe?: boolean }) =>
    authService.login(email, password, rememberMe)
  )

  createHandler('auth:validate-password', async (dto: ValidatePasswordDto) => {
    return await authService.validatePassword(dto.userId, dto.oldPassword, dto.newPassword)
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
    await authService.syncUserRelations(id, relations)
    return { success: true }
  })

  createHandler('users:terminate-contract', async (dto: TerminateContractDto) => {
    const user = await authService.getUserById(dto.id)
    if (!user) throw new Error('Utilisateur introuvable')
    await authService.terminateContract(dto.id, dto.motif, dto.resilie_par ?? 1)
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
