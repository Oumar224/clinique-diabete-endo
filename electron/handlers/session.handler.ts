import { container } from 'tsyringe'
import { SessionService } from '../services/auth/session.service'
import { createHandler } from '../utils/create-handler'

export function registerSessionHandlers() {
  const sessionService = container.resolve(SessionService)

  createHandler('session:update-activity', async ({ token }: { token: string }) => {
    await sessionService.updateActivity(token)
    return { success: true }
  })
}
