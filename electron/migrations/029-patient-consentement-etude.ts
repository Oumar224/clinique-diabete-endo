import type { Kysely } from 'kysely'
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('patient').addColumn('consentement_etude', 'text').execute()
}
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('patient').dropColumn('consentement_etude').execute()
}
