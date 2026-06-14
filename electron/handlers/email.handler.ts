import { container } from 'tsyringe'
import { EmailConfigService } from '../services/email/email-config.service'
import { EmailService } from '../services/email/email.service'
import { createHandler } from '../utils/create-handler'

export function registerEmailHandlers() {
  // ══════════════════════════════════════════════════════════════
  // email:get-config — Retourne la configuration (sans mot de passe)
  // ══════════════════════════════════════════════════════════════
  createHandler('email:get-config', async () => {
    const configService = container.resolve(EmailConfigService)
    return await configService.getConfig()
  })

  // ══════════════════════════════════════════════════════════════
  // email:save-config — Sauvegarde la configuration (reçoit le mot de passe en clair)
  // ══════════════════════════════════════════════════════════════
  createHandler('email:save-config', async (dto: {
    smtp_host: string
    smtp_port: number
    smtp_user: string
    smtp_pass: string
    sender_email: string
    sender_name: string
  }) => {
    const configService = container.resolve(EmailConfigService)
    await configService.saveConfig(dto)
    return { success: true }
  })

  // ══════════════════════════════════════════════════════════════
  // email:send-test — Envoie un email de test
  // ══════════════════════════════════════════════════════════════
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
