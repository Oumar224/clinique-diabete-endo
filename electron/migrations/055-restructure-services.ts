import { type Kysely } from 'kysely'
import { CompiledQuery } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.executeQuery(CompiledQuery.raw('PRAGMA foreign_keys = OFF'))

  // Create service_sites junction table (many-to-many service ↔ site)
  await db.executeQuery(CompiledQuery.raw(`
    CREATE TABLE IF NOT EXISTS service_sites (
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      site_id    INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      PRIMARY KEY (service_id, site_id)
    )
  `))

  // Delete seeded hierarchy data from migrations 046/047
  await db.executeQuery(CompiledQuery.raw(`
    DELETE FROM services WHERE code IN (
      'SOIN', 'SOIN.INT', 'SOIN.INT.HOF', 'SOIN.INT.HOH',
      'SOIN.MAT', 'SOIN.MAT.ACC', 'SOIN.MAT.PF',
      'SOIN.PED', 'SOIN.PED.CON', 'SOIN.PED.VAC',
      'SOIN.CHI',
      'SOIN.PROG', 'SOIN.PROG.VIH', 'SOIN.PROG.TB',
      'SOIN.CSP', 'SOIN.CSP.DEN', 'SOIN.CSP.OPH', 'SOIN.CSP.SMT',
      'TEC', 'TEC.LAB', 'TEC.LAB.AN1', 'TEC.LAB.AN2',
      'TEC.IMG', 'TEC.IMG.RAD', 'TEC.IMG.ECH',
      'TEC.SNG', 'TEC.PHA', 'TEC.PHA.DEP', 'TEC.PHA.PRE',
      'GEST', 'GEST.CPT', 'GEST.RH', 'GEST.RH.ACC', 'GEST.RH.PAI',
      'GEST.WASH', 'GEST.WASH.DEC', 'GEST.WASH.STE',
      'GEST.LOG', 'GEST.LOG.INF', 'GEST.LOG.ENE',
      'GEST.MOR'
    )
  `))

  // Drop old indexes before dropping columns
  await db.executeQuery(CompiledQuery.raw('DROP INDEX IF EXISTS idx_services_code'))
  await db.executeQuery(CompiledQuery.raw('DROP INDEX IF EXISTS idx_services_parent_id'))

  // Add category column
  await db.executeQuery(CompiledQuery.raw(`
    ALTER TABLE services ADD COLUMN category TEXT NOT NULL DEFAULT 'Consultation'
  `))

  // Drop hierarchical columns
  await db.executeQuery(CompiledQuery.raw('ALTER TABLE services DROP COLUMN parent_id'))
  await db.executeQuery(CompiledQuery.raw('ALTER TABLE services DROP COLUMN code'))

  await db.executeQuery(CompiledQuery.raw('PRAGMA foreign_keys = ON'))
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS service_sites'))
  await db.executeQuery(CompiledQuery.raw('ALTER TABLE services DROP COLUMN category'))
  await db.executeQuery(CompiledQuery.raw(`
    ALTER TABLE services ADD COLUMN parent_id INTEGER REFERENCES services(id) ON DELETE SET NULL
  `))
  await db.executeQuery(CompiledQuery.raw(`
    ALTER TABLE services ADD COLUMN code TEXT
  `))
  await db.executeQuery(CompiledQuery.raw(
    'CREATE INDEX IF NOT EXISTS idx_services_parent_id ON services(parent_id)'
  ))
  await db.executeQuery(CompiledQuery.raw(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_services_code ON services(code)'
  ))
}
