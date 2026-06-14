import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import crypto from 'node:crypto'
import nodemailer from 'nodemailer'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import type { DB } from '../../entities/database'

const ALGORITHM = 'aes-256-gcm'
const ENCRYPTION_KEY = crypto.createHash('sha256').update('cde-email-encryption-key-2024').digest()

function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, encryptedHex] = ciphertext.split(':')
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(encryptedHex, 'hex'), undefined, 'utf8') + decipher.final('utf8')
}

export interface EmailConfigDto {
  smtp_host: string
  smtp_port: number
  smtp_user: string
  sender_email: string
  sender_name: string
  is_configured: boolean
}

export interface EmailConfigSaveDto {
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_pass: string
  sender_email: string
  sender_name: string
}

@singleton()
export class EmailConfigService {
  private db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  /**
   * Retourne la configuration email sans le mot de passe.
   */
  async getConfig(): Promise<EmailConfigDto | null> {
    try {
      const row = await this.db
        .selectFrom('email_config' as never)
        .selectAll()
        .where('id' as never, '=', 1 as never)
        .executeTakeFirst()

      if (!row) return null

      const r = row as Record<string, unknown>
      return {
        smtp_host: r.smtp_host as string,
        smtp_port: r.smtp_port as number,
        smtp_user: r.smtp_user as string,
        sender_email: r.sender_email as string,
        sender_name: r.sender_name as string,
        is_configured: (r.is_configured as number) === 1,
      }
    } catch (error) {
      console.error('[CDE] Erreur lors de la lecture de la configuration email:', error)
      return null
    }
  }

  /**
   * Sauvegarde (upsert) la configuration email.
   * Le mot de passe est chiffré avec AES-256-GCM avant stockage.
   */
  async saveConfig(dto: EmailConfigSaveDto): Promise<void> {
    const encryptedPass = encrypt(dto.smtp_pass)

    try {
      const existing = await this.db
        .selectFrom('email_config' as never)
        .selectAll()
        .where('id' as never, '=', 1 as never)
        .executeTakeFirst()

      if (existing) {
        await this.db
          .updateTable('email_config' as never)
          .set({
            smtp_host: dto.smtp_host,
            smtp_port: dto.smtp_port,
            smtp_user: dto.smtp_user,
            smtp_pass_encrypted: encryptedPass,
            sender_email: dto.sender_email,
            sender_name: dto.sender_name,
            is_configured: 1,
            updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          } as never)
          .where('id' as never, '=', 1 as never)
          .execute()
      } else {
        await this.db
          .insertInto('email_config' as never)
          .values({
            id: 1,
            smtp_host: dto.smtp_host,
            smtp_port: dto.smtp_port,
            smtp_user: dto.smtp_user,
            smtp_pass_encrypted: encryptedPass,
            sender_email: dto.sender_email,
            sender_name: dto.sender_name,
            is_configured: 1,
          } as never)
          .execute()
      }
    } catch (error) {
      console.error('[CDE] Erreur lors de la sauvegarde de la configuration email:', error)
      throw new Error('Erreur lors de la sauvegarde de la configuration email')
    }
  }

  /**
   * Teste la connexion SMTP en envoyant un email de test.
   */
  async testConnection(to: string): Promise<void> {
    const transporter = await this.getTransporter()
    if (!transporter) {
      throw new Error('La configuration email est incomplète')
    }

    await transporter.sendMail({
      from: `"${(await this.getConfig())?.sender_name ?? ''}" <${(await this.getConfig())?.sender_email ?? ''}>`,
      to,
      subject: 'Test de configuration email — CDE',
      text: 'Ceci est un email de test envoyé depuis CDE. Votre configuration SMTP fonctionne correctement.',
    })
  }

  /**
   * Retourne un transporteur nodemailer configuré, ou null si la config est absente.
   */
  async getTransporter(): Promise<nodemailer.Transporter | null> {
    const config = await this.getFullConfig()
    if (!config || !config.smtp_host || !config.smtp_pass_encrypted) {
      return null
    }

    const pass = decrypt(config.smtp_pass_encrypted as string)

    return nodemailer.createTransport({
      host: config.smtp_host as string,
      port: config.smtp_port as number,
      secure: (config.smtp_port as number) === 465,
      auth: {
        user: config.smtp_user as string,
        pass,
      },
    } as nodemailer.TransportOptions)
  }

  /**
   * Retourne la config complète (y compris le mot de passe chiffré — usage interne uniquement).
   */
  private async getFullConfig(): Promise<Record<string, unknown> | null> {
    try {
      const row = await this.db
        .selectFrom('email_config' as never)
        .selectAll()
        .where('id' as never, '=', 1 as never)
        .executeTakeFirst()

      return row ? (row as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
}
