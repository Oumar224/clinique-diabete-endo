import { container } from 'tsyringe'
import { EmailConfigService } from '../services/email/email-config.service'
import { EmailService } from '../services/email/email.service'
import type { EmailConfigSaveDto } from '../dto/email-config.dto'
import { createHandler } from '../utils/create-handler'

export function registerEmailHandlers() {
  createHandler('email:get-config', async () => {
    return await container.resolve(EmailConfigService).getConfig()
  })

  createHandler('email:save-config', async (dto: EmailConfigSaveDto) => {
    await container.resolve(EmailConfigService).saveConfig(dto)
    return { success: true }
  })

  createHandler('email:send-test', async ({ to }: { to?: string }) => {
    const configService = container.resolve(EmailConfigService)
    const config = await configService.getConfig()

    if (!config?.is_configured) {
      throw new Error('Configuration email incomplète — renseignez d\'abord les paramètres SMTP')
    }

    const recipient = to || config.sender_email
    if (!recipient) {
      throw new Error('Aucun destinataire — renseignez l\'adresse expéditeur ou passez un email')
    }

    const emailService = container.resolve(EmailService)
    await emailService.sendTestEmail(recipient)
    return { success: true, message: `Email de test envoyé à ${recipient}` }
  })
}
