import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS medicaments (
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
    CREATE INDEX IF NOT EXISTS idx_medicaments_dci ON medicaments (dci)
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_medicaments_actif ON medicaments (actif)
  `.execute(db)

  // Seed catalogue minimal
  await sql`
    INSERT OR IGNORE INTO medicaments (dci, nom_commercial, dosage, forme, unite_stock, seuil_alerte) VALUES
      ('Metformine', 'Glucophage', '500 mg', 'Comprimé', 'cp', 20),
      ('Metformine', 'Glucophage', '850 mg', 'Comprimé', 'cp', 20),
      ('Paracétamol', 'Doliprane', '500 mg', 'Comprimé', 'cp', 30),
      ('Amoxicilline', 'Clamoxyl', '500 mg', 'Gélule', 'gel', 20),
      ('Furosémide', 'Lasilix', '40 mg', 'Comprimé', 'cp', 20),
      ('Insuline glargine', 'Lantus', '100 UI/mL', 'Stylo', 'stylo', 5),
      ('Insuline asparte', 'Novorapid', '100 UI/mL', 'Stylo', 'stylo', 5),
      ('Pantoprazole', 'Eupantol', '40 mg', 'Comprimé gastro-résistant', 'cp', 15)
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS medicaments`.execute(db)
}
