import { inject, singleton } from 'tsyringe'
import { EmailConfigService } from './email-config.service'
import type { UserDto } from '../../dto/auth.dto'

@singleton()
export class EmailService {
  constructor(
    @inject(EmailConfigService) private emailConfigService: EmailConfigService,
  ) {}

  /**
   * Envoie un email de bienvenue avec les identifiants de connexion.
   * Fire-and-forget : les erreurs sont loggées mais jamais propagées à l'appelant.
   */
  async sendWelcomeEmail(user: UserDto, tempPassword: string): Promise<void> {
    try {
      const transporter = await this.emailConfigService.getTransporter()
      if (!transporter) {
        console.warn('[CDE] Email de bienvenue non envoyé : configuration SMTP manquante')
        return
      }

      const config = await this.emailConfigService.getConfig()
      if (!config) {
        console.warn('[CDE] Email de bienvenue non envoyé : configuration email introuvable')
        return
      }

      const clinicName = config.sender_name || 'Clinique'
      const appName = 'CDE — Clinique Diabète & Endocrinologie'

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0E5C5B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 20px; }
    .body { background: #f9f9f9; padding: 30px 20px; border-left: 1px solid #ddd; border-right: 1px solid #ddd; }
    .footer { background: #eee; padding: 15px 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; border: 1px solid #ddd; }
    .credentials { background: #fff; border: 1px solid #0E5C5B; border-radius: 6px; padding: 15px; margin: 20px 0; }
    .credentials p { margin: 8px 0; }
    .label { font-weight: bold; color: #0E5C5B; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bienvenue sur ${appName}</h1>
    </div>
    <div class="body">
      <p>Bonjour <strong>${user.prenom} ${user.nom}</strong>,</p>
      <p>Votre compte a été créé sur l'application <strong>${appName}</strong> de <strong>${clinicName}</strong>.</p>
      <p>Voici vos identifiants de connexion :</p>
      <div class="credentials">
        <p><span class="label">Email :</span> ${user.email}</p>
        <p><span class="label">Mot de passe temporaire :</span> <strong>${tempPassword}</strong></p>
      </div>
      <p>Lors de votre première connexion, le système vous demandera de changer votre mot de passe.</p>
      <p>Si vous n'êtes pas à l'origine de cette création, veuillez contacter l'administrateur.</p>
    </div>
    <div class="footer">
      <p>${appName} &mdash; ${clinicName}</p>
      <p>Ce message est généré automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>`

      await transporter.sendMail({
        from: `"${config.sender_name}" <${config.sender_email}>`,
        to: user.email,
        subject: `Bienvenue sur ${appName} — Vos identifiants de connexion`,
        html,
      })

      console.log(`[CDE] Email de bienvenue envoyé à ${user.email}`)
    } catch (error) {
      console.error(`[CDE] Échec de l'envoi de l'email de bienvenue à ${user.email}:`, error)
    }
  }

  /**
   * Envoie un email de réinitialisation de mot de passe.
   * Fire-and-forget : les erreurs sont loggées mais jamais propagées à l'appelant.
   */
  async sendResetPasswordEmail(user: UserDto, tempPassword: string): Promise<void> {
    try {
      const transporter = await this.emailConfigService.getTransporter()
      if (!transporter) {
        console.warn('[CDE] Email de réinitialisation non envoyé : configuration SMTP manquante')
        return
      }

      const config = await this.emailConfigService.getConfig()
      if (!config) {
        console.warn('[CDE] Email de réinitialisation non envoyé : configuration email introuvable')
        return
      }

      const clinicName = config.sender_name || 'Clinique'
      const appName = 'CDE — Clinique Diabète & Endocrinologie'

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0E5C5B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 20px; }
    .body { background: #f9f9f9; padding: 30px 20px; border-left: 1px solid #ddd; border-right: 1px solid #ddd; }
    .footer { background: #eee; padding: 15px 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; border: 1px solid #ddd; }
    .credentials { background: #fff; border: 1px solid #0E5C5B; border-radius: 6px; padding: 15px; margin: 20px 0; }
    .credentials p { margin: 8px 0; }
    .label { font-weight: bold; color: #0E5C5B; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Réinitialisation de votre mot de passe</h1>
    </div>
    <div class="body">
      <p>Bonjour <strong>${user.prenom} ${user.nom}</strong>,</p>
      <p>Votre mot de passe a été réinitialisé sur l'application <strong>${appName}</strong> de <strong>${clinicName}</strong>.</p>
      <p>Voici votre mot de passe temporaire :</p>
      <div class="credentials">
        <p><span class="label">Email :</span> ${user.email}</p>
        <p><span class="label">Mot de passe temporaire :</span> <strong>${tempPassword}</strong></p>
      </div>
      <p>Connectez-vous avec ce mot de passe temporaire. Le système vous demandera de définir un nouveau mot de passe.</p>
      <p>Si vous n'êtes pas à l'origine de cette demande, veuillez contacter l'administrateur.</p>
    </div>
    <div class="footer">
      <p>${appName} &mdash; ${clinicName}</p>
      <p>Ce message est généré automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>`

      await transporter.sendMail({
        from: `"${config.sender_name}" <${config.sender_email}>`,
        to: user.email,
        subject: 'Réinitialisation de votre mot de passe — CDE',
        html,
      })

      console.log(`[CDE] Email de réinitialisation envoyé à ${user.email}`)
    } catch (error) {
      console.error(`[CDE] Échec de l'envoi de l'email de réinitialisation à ${user.email}:`, error)
    }
  }

  /**
   * Envoie un email de test pour vérifier la configuration SMTP.
   * Les erreurs sont propagées à l'appelant (contrairement à sendWelcomeEmail
   * qui est fire-and-forget).
   */
  async sendTestEmail(to: string): Promise<void> {
    const transporter = await this.emailConfigService.getTransporter()
    if (!transporter) {
      throw new Error('Configuration SMTP incomplète — renseignez d\'abord les paramètres')
    }

    const config = await this.emailConfigService.getConfig()
    if (!config || !config.sender_email) {
      throw new Error('Adresse expéditeur manquante dans la configuration email')
    }

    await transporter.sendMail({
      from: `"${config.sender_name}" <${config.sender_email}>`,
      to,
      subject: 'Test de configuration email — CDE',
      text: 'Ceci est un email de test envoyé depuis CDE. Votre configuration SMTP fonctionne correctement.',
    })
  }
}
