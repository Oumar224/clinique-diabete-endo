import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  await sql`
    CREATE TABLE medicaments_new (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      dci            TEXT    NOT NULL,
      nom_commercial TEXT,
      dosage         TEXT,
      forme          TEXT,
      unite_stock    TEXT    NOT NULL DEFAULT 'cp',
      seuil_alerte   INTEGER NOT NULL DEFAULT 0,
      actif          INTEGER NOT NULL DEFAULT 1 CHECK (actif IN (0, 1)),
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`
    INSERT INTO medicaments_new (id, dci, nom_commercial, dosage, forme, unite_stock, seuil_alerte, actif, created_at, updated_at)
    SELECT id, dci, nom_commercial, dosage, forme, unite_stock, seuil_alerte, actif, created_at, updated_at FROM medicaments
  `.execute(db)
  await sql`DROP TABLE medicaments`.execute(db)
  await sql`ALTER TABLE medicaments_new RENAME TO medicaments`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_medicaments_dci ON medicaments (dci)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_medicaments_actif ON medicaments (actif)`.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  await sql`
    CREATE TABLE medicaments_old (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      dci            TEXT    NOT NULL,
      nom_commercial TEXT,
      dosage         TEXT,
      forme          TEXT,
      unite_stock    TEXT    NOT NULL DEFAULT 'cp',
      seuil_alerte   INTEGER NOT NULL DEFAULT 0,
      actif          INTEGER NOT NULL DEFAULT 1,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`
    INSERT INTO medicaments_old (id, dci, nom_commercial, dosage, forme, unite_stock, seuil_alerte, actif, created_at, updated_at)
    SELECT id, dci, nom_commercial, dosage, forme, unite_stock, seuil_alerte, actif, created_at, updated_at FROM medicaments
  `.execute(db)
  await sql`DROP TABLE medicaments`.execute(db)
  await sql`ALTER TABLE medicaments_old RENAME TO medicaments`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_medicaments_dci ON medicaments (dci)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_medicaments_actif ON medicaments (actif)`.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}
