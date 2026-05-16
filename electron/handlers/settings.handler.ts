import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import { SettingsService } from '../services/settings.service'
import { createHandler } from '../utils/create-handler'

export function registerSettingsHandlers() {
  createHandler('settings:get', async ({ key }: { key: string }) => {
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const service = new SettingsService(db as never)
    return { value: await service.getSetting(key) }
  })

  createHandler('settings:set', async ({ key, value }: { key: string; value: string }) => {
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const service = new SettingsService(db as never)
    await service.setSetting(key, value)
    return { success: true }
  })
}
