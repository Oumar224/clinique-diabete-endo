import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { SettingsService } from '../services/settings.service'
import { LogoService } from '../services/logo.service'
import type { HospitalInfoDto } from '../dto/settings.dto'

export function registerIdentityHandlers(): void {
  createHandler('identity:get-info', async () => {
    const settings = container.resolve(SettingsService)
    return await settings.getHospitalInfo()
  })

  createHandler('identity:save-info', async (dto: HospitalInfoDto) => {
    const settings = container.resolve(SettingsService)
    await settings.saveHospitalInfo(dto)
    return { success: true }
  })

  createHandler('identity:get-logo', async () => {
    try {
      const logoService = container.resolve(LogoService)
      const data = await logoService.getLogoBase64()
      return { success: true, data }
    } catch (error) {
      return { success: false, data: null, message: (error as Error).message }
    }
  })

  createHandler('identity:save-logo', async (base64Data: string) => {
    if (typeof base64Data !== 'string') throw new Error('Données invalides')
    const logoService = container.resolve(LogoService)
    await logoService.saveLogo(base64Data)
    return { success: true }
  })
}
