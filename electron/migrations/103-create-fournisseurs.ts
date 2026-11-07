import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS fournisseurs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nom        TEXT    NOT NULL UNIQUE,
      contact    TEXT,
      telephone  TEXT,
      email      TEXT,
      adresse    TEXT,
      actif      INTEGER NOT NULL DEFAULT 1 CHECK (actif IN (0, 1)),
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_fournisseurs_nom ON fournisseurs (nom)
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_fournisseurs_actif ON fournisseurs (actif)
  `.execute(db)

  // Seed fournisseur divers id 1 (fallback entrées sans fournisseur renseigné)
  await sql`
    INSERT OR IGNORE INTO fournisseurs (id, nom) VALUES (1, 'Fournisseur divers')
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS fournisseurs`.execute(db)
}
