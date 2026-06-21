import { inject, singleton } from 'tsyringe'
import { type Kysely, sql } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { HospitalInfoDto } from '../dto/settings.dto'

@singleton()
export class SettingsService {
  public db: Kysely<unknown>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance() as Kysely<unknown>
  }

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

  async getHospitalInfo(): Promise<HospitalInfoDto> {
    const keys = ['hospital_name', 'hospital_address', 'hospital_phone', 'hospital_email', 'hospital_city', 'hospital_reg_number']
    const rows = await sql<{ key: string; value: string }>`
      SELECT key, value FROM app_settings WHERE key IN (${sql.join(keys)})
    `.execute(this.db)
    const map = Object.fromEntries(rows.rows.map(r => [r.key, r.value]))
    return {
      name: map.hospital_name || '',
      address: map.hospital_address || '',
      phone: map.hospital_phone || '',
      email: map.hospital_email || '',
      city: map.hospital_city || '',
      regNumber: map.hospital_reg_number || '',
    }
  }

  async saveHospitalInfo(dto: HospitalInfoDto): Promise<void> {
    const entries: Array<{ key: string; value: string }> = [
      { key: 'hospital_name', value: dto.name },
      { key: 'hospital_address', value: dto.address },
      { key: 'hospital_phone', value: dto.phone },
      { key: 'hospital_email', value: dto.email },
      { key: 'hospital_city', value: dto.city },
      { key: 'hospital_reg_number', value: dto.regNumber },
    ]
    for (const entry of entries) {
      await sql`
        INSERT INTO app_settings (key, value) VALUES (${entry.key}, ${entry.value})
        ON CONFLICT(key) DO UPDATE SET value = ${entry.value}
      `.execute(this.db)
    }
  }
}
