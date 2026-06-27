import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    ALTER TABLE user_attachments ADD COLUMN attachment_type_id INTEGER REFERENCES attachment_types(id)
  `.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {}
