import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import bcrypt from 'bcryptjs'

export class SeedService {
  constructor(private db: Kysely<unknown>) {}

  async seed(): Promise<void> {
    const rows = await sql`SELECT id, is_validated FROM user WHERE email = 'admin@cde.com'`.execute(this.db)

    if (rows.rows.length === 0) {
      const hash = await bcrypt.hash('admin', 10)
      await sql`
        INSERT INTO user (nom, prenom, email, password_hash, role, service, is_active, is_validated)
        VALUES ('admin', 'admin', 'admin@cde.com', ${hash}, 'ADMIN', 'Direction', 1, 1)
      `.execute(this.db)
      console.log('[CDE] Admin user seeded: admin@cde.com / admin')
    } else {
      const hash = await bcrypt.hash('admin', 10)
      await sql`UPDATE user SET is_validated = 1, is_active = 1, password_hash = ${hash} WHERE email = 'admin@cde.com'`.execute(this.db)
      console.log('[CDE] Admin user updated: is_validated = 1, is_active = 1')
    }

    const infirmierRows = await sql`SELECT id FROM user WHERE email = 'infirmier@cde.com'`.execute(this.db)
    if (infirmierRows.rows.length === 0) {
      const hash = await bcrypt.hash('infirmier', 10)
      await sql`
        INSERT INTO user (nom, prenom, email, password_hash, role, service, is_active, is_validated)
        VALUES ('Infirmier', 'Test', 'infirmier@cde.com', ${hash}, 'INFIRMIER', 'Soins', 1, 1)
      `.execute(this.db)
      console.log('[CDE] Infirmier user seeded: infirmier@cde.com / infirmier')
    }

    await sql`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('currency', 'GNF')`.execute(this.db)

    // Identité clinique par défaut — remplit uniquement les clés absentes ou vides,
    // sans jamais écraser une configuration existante.
    const hospitalDefaults: Array<[string, string]> = [
      ['hospital_name', 'Clinique Diabète & Endocrinologie'],
      ['hospital_address', 'Conakry, République de Guinée'],
      ['hospital_phone', '+224'],
      ['hospital_city', 'Conakry'],
    ]
    for (const [key, value] of hospitalDefaults) {
      await sql`INSERT INTO app_settings (key, value) VALUES (${key}, ${value}) ON CONFLICT(key) DO NOTHING`.execute(this.db)
      await sql`UPDATE app_settings SET value = ${value} WHERE key = ${key} AND (value IS NULL OR TRIM(value) = '')`.execute(this.db)
    }
  }
}
