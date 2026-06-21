import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { ExportService } from '../services/export.service'

export function registerExportHandlers(): void {
  const exportService = container.resolve(ExportService)

  createHandler('export:users-list-pdf', async (filters?: unknown) => {
    return await exportService.exportUsersListPdf(filters)
  })

  createHandler('export:user-profile-pdf', async (params: { userId: number }) => {
    if (typeof params.userId !== 'number') throw new Error('ID utilisateur invalide')
    return await exportService.exportUserProfilePdf(params.userId)
  })

  createHandler('export:users-list-excel', async (filters?: unknown) => {
    return await exportService.exportUsersListExcel(filters)
  })

  createHandler('export:user-profile-excel', async (params: { userId: number }) => {
    if (typeof params.userId !== 'number') throw new Error('ID utilisateur invalide')
    return await exportService.exportUserProfileExcel(params.userId)
  })
}
