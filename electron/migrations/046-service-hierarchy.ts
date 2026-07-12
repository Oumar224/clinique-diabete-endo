import { type Kysely } from 'kysely'
import { CompiledQuery } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // ─── Add parent_id (FK to self, SET NULL on delete) ──────────
  await db.executeQuery(CompiledQuery.raw(`
    ALTER TABLE services ADD COLUMN parent_id INTEGER REFERENCES services(id) ON DELETE SET NULL
  `))

  // ─── Add code (unique unit code like CLI.INT.HOF) ───────────
  await db.executeQuery(CompiledQuery.raw(`
    ALTER TABLE services ADD COLUMN code TEXT
  `))

  // ─── Indexes ─────────────────────────────────────────────────
  await db.executeQuery(CompiledQuery.raw(
    'CREATE INDEX IF NOT EXISTS idx_services_parent_id ON services(parent_id)'
  ))
  await db.executeQuery(CompiledQuery.raw(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_services_code ON services(code)'
  ))

  // ─── Seed 3-level hierarchy ──────────────────────────────────

  // N1 – Root: SERVICES CLINIQUES
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code)
    VALUES ('SERVICES CLINIQUES', 'Services cliniques de la CDE', 0, '#409EFF', 1, 'CLI')
  `))

  // N2 – MEDECINE INTERNE (child of CLI)
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'MEDECINE INTERNE', 'Service de médecine interne', 30, '#67C23A', 1, 'CLI.INT', id
    FROM services WHERE code = 'CLI'
  `))

  // N3 – HOSPITALISATION FEMMES (child of CLI.INT)
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'HOSPITALISATION FEMMES', 'Hospitalisation - secteur femmes', 30, '#E6A23C', 1, 'CLI.INT.HOF', id
    FROM services WHERE code = 'CLI.INT'
  `))

  // N3 – HOSPITALISATION HOMMES (child of CLI.INT)
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'HOSPITALISATION HOMMES', 'Hospitalisation - secteur hommes', 30, '#F56C6C', 2, 'CLI.INT.HOH', id
    FROM services WHERE code = 'CLI.INT'
  `))

  // ─── Attach existing 5 default services under CLI root ──────
  // Any service with NULL code and NULL parent_id is a legacy leaf service
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET parent_id = (SELECT id FROM services WHERE code = 'CLI')
    WHERE code IS NULL AND parent_id IS NULL
  `))
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Reset parent_id for legacy services that were attached to CLI root
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET parent_id = NULL
    WHERE parent_id = (SELECT id FROM services WHERE code = 'CLI')
    AND code IS NULL
  `))

  // Remove seeded hierarchy services (identified by their codes)
  await db.executeQuery(CompiledQuery.raw(`
    DELETE FROM services WHERE code IN ('CLI', 'CLI.INT', 'CLI.INT.HOF', 'CLI.INT.HOH')
  `))

  // Drop indexes
  await db.executeQuery(CompiledQuery.raw('DROP INDEX IF EXISTS idx_services_code'))
  await db.executeQuery(CompiledQuery.raw('DROP INDEX IF EXISTS idx_services_parent_id'))

  // Drop columns (SQLite 3.35+ supports DROP COLUMN)
  await db.executeQuery(CompiledQuery.raw('ALTER TABLE services DROP COLUMN code'))
  await db.executeQuery(CompiledQuery.raw('ALTER TABLE services DROP COLUMN parent_id'))
}
