import { container } from 'tsyringe'
import { AuthService } from '../services/auth.service'
import { SessionService } from '../services/auth/session.service'
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
  createHandler('users:create', (dto: UserDto) => authService.createUser(dto))
  createHandler('users:update', (dto: UserDto) => authService.updateUser(dto))
  createHandler('users:delete', async ({ id }: { id: number }) => {
    await authService.deleteUser(id)
    return { success: true }
  })
  createHandler('users:get', ({ id }: { id: number }) => authService.getUserById(id))
}
