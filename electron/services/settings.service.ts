import { type Kysely, sql } from 'kysely'

export class SettingsService {
  constructor(private db: Kysely<unknown>) {}

  async getSetting(key: string): Promise<string | null> {
    const result = await sql<{ value: string }>`
      SELECT value FROM app_settings WHERE key = ${key}
    `.execute(this.db)
    return result.rows.length > 0 ? result.rows[0].value : null
  }

  async setSetting(key: string, value: string): Promise<void> {
    if (key == null) throw new Error('La clé de paramètre est requise')
    if (value == null) throw new Error('La valeur du paramètre est requise')
    await sql`
      INSERT INTO app_settings (key, value) VALUES (${key}, ${value})
      ON CONFLICT(key) DO UPDATE SET value = ${value}
    `.execute(this.db)
  }
}
