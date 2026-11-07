import { container } from 'tsyringe'
import { DashboardService } from '../services/dashboard.service'
import type { DashboardStatsParams } from '../dto/dashboard.dto'
import { createHandler } from '../utils/create-handler'
import { APP_ROLES } from '../utils/authorization'

export function registerDashboardHandlers() {
  createHandler('dashboard:stats', async (params?: DashboardStatsParams) => {
    return await container.resolve(DashboardService).getStats(params ?? {})
  }, { roles: APP_ROLES })
}
