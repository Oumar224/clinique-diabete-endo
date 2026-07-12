import type { Kysely } from 'kysely'
import { CompiledQuery } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // ─── Table: conservateurs_stockage ──────────────────────────
  await db.executeQuery(CompiledQuery.raw(`
    CREATE TABLE IF NOT EXISTS conservateurs_stockage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `))

  // ─── Table: conservateurs_champs_localisation ───────────────
  await db.executeQuery(CompiledQuery.raw(`
    CREATE TABLE IF NOT EXISTS conservateurs_champs_localisation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stockage_id INTEGER NOT NULL REFERENCES conservateurs_stockage(id) ON DELETE CASCADE,
      cle TEXT NOT NULL,
      label TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'texte',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `))

  // ─── Indexes ───────────────────────────────────────────────
  await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_cons_stockage_active ON conservateurs_stockage(is_active)'))
  await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_cons_champs_stockage ON conservateurs_champs_localisation(stockage_id)'))

  // ─── Seed stockages ─────────────────────────────────────────
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO conservateurs_stockage (code, name, description, sort_order) VALUES
      ('stk_01', 'Réfrigérateur (2°C - 8°C)', 'Stockage standard pour la biochimie et la plupart des tubes de sang à court terme', 1),
      ('stk_02', 'Congélateur Standard (-20°C)', 'Pour la conservation des sérums, plasmas et certains échantillons d''urine', 2),
      ('stk_03', 'Congélateur Ultra-Basse Température (-80°C)', 'Pour les banques de tissus, l''ADN/ARN et le stockage à long terme', 3),
      ('stk_04', 'Cuve à Azote Liquide (-196°C)', 'Cryopréservation à très long terme', 4),
      ('stk_05', 'Étuve / Incubateur (37°C)', 'Pour la microbiologie et la mise en culture immédiate', 5),
      ('stk_06', 'Température Ambiante Contrôlée (15°C - 25°C)', 'Pour les prélèvements ne nécessitant pas de chaîne du froid immédiate (ex: frottis)', 6)
  `))

  // ─── Seed champs: stk_01 - Réfrigérateur ─────────────────────
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO conservateurs_champs_localisation (stockage_id, cle, label, type, sort_order) VALUES
      ((SELECT id FROM conservateurs_stockage WHERE code = 'stk_01'), 'etagere', 'Étagère', 'texte', 1),
      ((SELECT id FROM conservateurs_stockage WHERE code = 'stk_01'), 'bac', 'Bac Casier', 'texte', 2)
  `))

  // ─── Seed champs: stk_02 - Congélateur Standard -20°C ──────
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO conservateurs_champs_localisation (stockage_id, cle, label, type, sort_order) VALUES
      ((SELECT id FROM conservateurs_stockage WHERE code = 'stk_02'), 'tiroir', 'Tiroir', 'texte', 1),
      ((SELECT id FROM conservateurs_stockage WHERE code = 'stk_02'), 'boite', 'Boîte', 'texte', 2),
      ((SELECT id FROM conservateurs_stockage WHERE code = 'stk_02'), 'position', 'Position (Puits)', 'texte', 3)
  `))

  // ─── Seed champs: stk_03 - Congélateur Ultra-Basse -80°C ─│
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO conservateurs_champs_localisation (stockage_id, cle, label, type, sort_order) VALUES
      ((SELECT id FROM conservateurs_stockage WHERE code = 'stk_03'), 'rack', 'Rack Tour', 'texte', 1),
      ((SELECT id FROM conservateurs_stockage WHERE code = 'stk_03'), 'boite', 'Boîte', 'texte', 2),
      ((SELECT id FROM conservateurs_stockage WHERE code = 'stk_03'), 'position', 'Position', 'texte', 3)
  `))

  // ─── Seed champs: stk_04 - Cuve à Azote Liquide -196°C ─│
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO conservateurs_champs_localisation (stockage_id, cle, label, type, sort_order) VALUES
      ((SELECT id FROM conservateurs_stockage WHERE code = 'stk_04'), 'canister', 'Canister', 'texte', 1),
      ((SELECT id FROM conservateurs_stockage WHERE code = 'stk_04'), 'canne', 'Canne', 'texte', 2),
      ((SELECT id FROM conservateurs_stockage WHERE code = 'stk_04'), 'visotube', 'Visotube Emplacement', 'texte', 3)
  `))

  // ─── Seed champs: stk_05 - Étuve / Incubateur 37°C ──────
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO conservateurs_champs_localisation (stockage_id, cle, label, type, sort_order) VALUES
      ((SELECT id FROM conservateurs_stockage WHERE code = 'stk_05'), 'etage', 'Étage', 'texte', 1),
      ((SELECT id FROM conservateurs_stockage WHERE code = 'stk_05'), 'secteur', 'Secteur', 'texte', 2)
  `))

  // ─── Seed champs: stk_06 - Température Ambiante Contrôlée ─│
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO conservateurs_champs_localisation (stockage_id, cle, label, type, sort_order) VALUES
      ((SELECT id FROM conservateurs_stockage WHERE code = 'stk_06'), 'armoire', 'Armoire', 'texte', 1),
      ((SELECT id FROM conservateurs_stockage WHERE code = 'stk_06'), 'etagere', 'Étagère', 'texte', 2)
  `))
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS conservateurs_champs_localisation'))
  await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS conservateurs_stockage'))
}
