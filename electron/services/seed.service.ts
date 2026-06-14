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

    await sql`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('currency', 'GNF')`.execute(this.db)
  }
}
