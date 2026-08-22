import { type Kysely, sql } from 'kysely'

// Exact plan_soins_items ids created by the legacy seed migrations that shipped
// demo data for phantom patients (ids 1/2). Derived from the seed files as they
// existed in git HEAD:
//   031-patient-care          → items 1-6    (plan_soins id=1)
//   032-seed-plan-soins       → items 7-25   (plan_soins ids 2-3)
//   034-seed-week-plan-soins  → items 100-136 (plan_soins ids 10-16)
//
// Targeting the exact item ids is deterministic on both legacy and fresh DBs:
//   - Legacy DBs: the seeds inserted these ids explicitly, which advanced
//     sqlite_sequence past 136 — real item ids start after them. The DELETE
//     removes exactly the demo items (only those still en_attente with no
//     prescription_id survive the guards).
//   - Fresh installs: 031/032/034 are no-ops, so plan_soins_items is empty
//     when 067 runs and nothing matches.
// A plan_soins_id-range guard would be unsafe: after a partial migration a real
// plan_soins row can occupy any id in the old seed range.
const SEEDED_DEMO_ITEM_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25,
  100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
  115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129,
  130, 131, 132, 133, 134, 135, 136,
]

export async function up(db: Kysely<unknown>): Promise<void> {
  console.log('[Migration 067] Cleaning up seeded demo plan_soins_items (en_attente with no prescription)...')

  const result = await sql`
    DELETE FROM plan_soins_items
    WHERE id IN (${sql.join(SEEDED_DEMO_ITEM_IDS)})
      AND prescription_id IS NULL
      AND statut = 'en_attente'
  `.execute(db)

  const count = result.numAffectedRows ?? 0
  console.log(`[Migration 067] Deleted ${count} orphaned en_attente items`)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  console.log('[Migration 067] Nothing to undo')
}
