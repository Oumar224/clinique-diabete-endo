import type { Kysely } from 'kysely'

/**
 * Migration 044-lab-exam-tables
 *
 * This migration previously created lab exam tables (e.g., lab_exam, lab_exam_category,
 * lab_exam_result). Those tables already exist in production databases because this
 * migration was executed against them. The migration file was removed from the codebase
 * at some point and is now being restored as a no-op stub so that Kysely's migration
 * runner does not fail with "previously executed migration ... is missing".
 *
 * The up/down methods are intentionally empty: the schema changes were already applied.
 */
export async function up(_db: Kysely<unknown>): Promise<void> {
  // No-op: this migration was already executed against the database.
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // No-op: rollback is not needed since up was a no-op.
}
