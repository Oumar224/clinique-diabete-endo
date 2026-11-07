import { type Kysely, sql } from 'kysely'

/**
 * Référentiel des unités de stock (pharmacie + laboratoire).
 *
 * Les 13 unités historiques restent les valeurs par défaut, complétées par
 * les unités utiles au laboratoire (test, kit, bandelette, µL, mmol/L…).
 * La table permet d'ajouter de nouvelles unités sans redéploiement.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS unites_stock (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nom        TEXT    NOT NULL,
      ordre      INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)

  // Unicité insensible à la casse : « cp » et « CP » sont la même unité.
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unites_stock_nom
      ON unites_stock (lower(nom))
  `.execute(db)

  const defaults = [
    'cp',
    'gél',
    'stylo',
    'plaquette',
    'blister',
    'tube',
    'flacon',
    'ampoule',
    'mL',
    'mg',
    'UI',
    'boîte',
    'autre',
    // Laboratoire
    'µL',
    'mmol/L',
    'test',
    'kit',
    'bandelette',
    'sachet',
  ]

  for (const [index, nom] of defaults.entries()) {
    await sql`
      INSERT OR IGNORE INTO unites_stock (nom, ordre) VALUES (${nom}, ${index})
    `.execute(db)
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS unites_stock`.execute(db)
}
