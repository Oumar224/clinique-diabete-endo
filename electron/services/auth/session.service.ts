import { singleton, inject } from 'tsyringe'
import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import type { DB } from '../../entities/database'
import { UserEntity } from '../../entities/user.entity'
import { randomUUID } from 'crypto'

const SESSION_INACTIVE_MINUTES = 30
const SESSION_REMEMBER_DAYS = 7

@singleton()
export class SessionService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async create(userId: number, rememberMe = false): Promise<string> {
    const token = randomUUID()
    const now = new Date()
    const expiry = new Date(now)

    if (rememberMe) {
      expiry.setDate(expiry.getDate() + SESSION_REMEMBER_DAYS)
    } else {
      expiry.setMinutes(expiry.getMinutes() + SESSION_INACTIVE_MINUTES)
    }

    await sql`
      INSERT INTO session (id, user_id, created_at, expires_at, last_activity, remember_me)
      VALUES (${token}, ${userId}, ${now.toISOString()}, ${expiry.toISOString()}, ${now.toISOString()}, ${rememberMe ? 1 : 0})
    `.execute(this.db)

    return token
  }

  async validate(token: string): Promise<UserEntity | null> {
    const now = new Date().toISOString()

    const session = await sql<{ user_id: number }>`
      SELECT user_id FROM session WHERE id = ${token} AND expires_at > ${now}
    `.execute(this.db)

    if (session.rows.length === 0) return null

    const userId = session.rows[0].user_id

    const user = await this.db
      .selectFrom('user')
      .selectAll()
      .where('id', '=', userId)
      .where('is_active', '=', 1 as never)
      .executeTakeFirst()

    if (!user) return null

    const entity = new UserEntity()
    entity.id = user.id as number
    entity.nom = user.nom as string
    entity.prenom = user.prenom as string
    entity.email = user.email as string
    entity.role = user.role as UserEntity['role']
    entity.service = user.service as string
    entity.is_active = 1
    entity.is_validated = user.is_validated as number
    return entity
  }

  async invalidate(token: string): Promise<void> {
    await sql`DELETE FROM session WHERE id = ${token}`.execute(this.db)
  }

  async updateActivity(token: string): Promise<void> {
    const session = await sql<{ remember_me: number; expires_at: string }>`
      SELECT remember_me, expires_at FROM session WHERE id = ${token}
    `.execute(this.db)

    if (session.rows.length === 0) return

    const { remember_me, expires_at } = session.rows[0]
    const now = new Date()

    if (new Date(expires_at) <= now) return

    const expiry = new Date(now)
    if (remember_me) {
      expiry.setDate(expiry.getDate() + SESSION_REMEMBER_DAYS)
    } else {
      expiry.setMinutes(expiry.getMinutes() + SESSION_INACTIVE_MINUTES)
    }

    await sql`
      UPDATE session SET last_activity = ${now.toISOString()}, expires_at = ${expiry.toISOString()}
      WHERE id = ${token}
    `.execute(this.db)
  }
}
