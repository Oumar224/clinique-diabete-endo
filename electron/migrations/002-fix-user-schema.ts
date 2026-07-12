import { type Kysely, CompiledQuery } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  try { await db.executeQuery(CompiledQuery.raw('ALTER TABLE user ADD COLUMN is_validated INTEGER DEFAULT 0')) } catch { /* empty */ }
  try { await db.executeQuery(CompiledQuery.raw('ALTER TABLE user ADD COLUMN is_active INTEGER DEFAULT 1')) } catch { /* empty */ }
  try { await db.executeQuery(CompiledQuery.raw('ALTER TABLE user ADD COLUMN automerge_id TEXT')) } catch { /* empty */ }
  try { await db.executeQuery(CompiledQuery.raw('ALTER TABLE patient ADD COLUMN automerge_id TEXT')) } catch { /* empty */ }
  try { await db.executeQuery(CompiledQuery.raw('ALTER TABLE appointment ADD COLUMN automerge_id TEXT')) } catch { /* empty */ }
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // No down migration - these are additive only
}
