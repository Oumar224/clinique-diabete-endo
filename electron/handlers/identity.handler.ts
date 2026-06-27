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
    const logoService = container.resolve(LogoService)
    return await logoService.getLogoBase64()
  })

  createHandler('identity:save-logo', async (base64Data: string) => {
    if (typeof base64Data !== 'string') throw new Error('Données invalides')
    const logoService = container.resolve(LogoService)
    await logoService.saveLogo(base64Data)
    return { success: true }
  })
}
