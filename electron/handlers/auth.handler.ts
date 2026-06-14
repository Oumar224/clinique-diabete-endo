import { container } from 'tsyringe'
import { AuthService } from '../services/auth.service'
import { SessionService } from '../services/auth/session.service'
import { EmailService } from '../services/email/email.service'
import { UserEntity } from '../entities/user.entity'
import type { UserDto } from '../dto/auth.dto'
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

  createHandler('auth:validate-password', ({ userId, oldPassword, newPassword }: { userId: number; oldPassword: string; newPassword: string }) =>
    authService.validatePassword(userId, oldPassword, newPassword)
  )

  createHandler('users:list', () => authService.listUsers())
  createHandler('users:create', async (dto: UserDto & { sendEmail?: boolean }) => {
    const user = await authService.createUser(dto)
    // Fire-and-forget : envoi de l'email de bienvenue si demandé
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

  createHandler('users:sync-relations', async ({ id, specialty_ids, service_ids, site_ids, medical_unit_ids }: {
    id: number
    specialty_ids?: number[]
    service_ids?: number[]
    site_ids?: number[]
    medical_unit_ids?: number[]
  }) => {
    await authService.syncUserRelations(id, { specialty_ids, service_ids, site_ids, medical_unit_ids })
    return { success: true }
  })

  createHandler('users:terminate-contract', async ({ id, motif, resilie_par }: { id: number; motif: string; resilie_par?: number }) => {
    // Verify user exists — terminateContract does this too, but early validation
    const user = await authService.getUserById(id)
    if (!user) throw new Error('Utilisateur introuvable')
    // TODO: The frontend should send the current user's ID as resilie_par.
    // For now, fall back to admin ID 1 if not provided.
    await authService.terminateContract(id, motif, resilie_par ?? 1)
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
