import { type Kysely } from 'kysely'

export async function up(_db: Kysely<unknown>): Promise<void> {
  console.log('[Migration 062] Stub — column already exists in DB')
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  console.log('[Migration 062] Stub — nothing to undo')
}
