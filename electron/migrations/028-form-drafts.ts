import type { Kysely } from 'kysely'
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('form_drafts')
    .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
    .addColumn('form_type', 'text', col => col.notNull())
    .addColumn('form_data', 'text', col => col.notNull())
    .addColumn('patient_id', 'integer')
    .addColumn('active_step', 'integer', col => col.notNull().defaultTo(0))
    .addColumn('created_at', 'text', col => col.notNull().defaultTo(`datetime('now')`))
    .addColumn('updated_at', 'text', col => col.notNull().defaultTo(`datetime('now')`))
    .execute()
}
export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('form_drafts').execute()
}
