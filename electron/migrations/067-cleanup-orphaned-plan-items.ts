import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  console.log('[Migration 067] Cleaning up orphaned plan_soins_items (en_attente with no prescription)...')

  const result = await sql`
    DELETE FROM plan_soins_items
    WHERE prescription_id IS NULL
      AND statut = 'en_attente'
  `.execute(db)

  const count = result.numAffectedRows ?? 0
  console.log(`[Migration 067] Deleted ${count} orphaned en_attente items`)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  console.log('[Migration 067] Nothing to undo')
}
