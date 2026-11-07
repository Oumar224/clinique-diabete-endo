import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  await sql`
    CREATE TABLE delivrances_new (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      source             TEXT    NOT NULL DEFAULT 'ordonnance_libre',
      source_document_id TEXT    NOT NULL,
      patient_id         INTEGER NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
      statut             TEXT    NOT NULL DEFAULT 'a_servir' CHECK (statut IN ('a_servir','partielle','servie','annulee')),
      served_by          INTEGER REFERENCES user(id),
      served_at          TEXT,
      created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (source, source_document_id)
    )
  `.execute(db)
  await sql`
    INSERT INTO delivrances_new (id, source, source_document_id, patient_id, statut, served_by, served_at, created_at)
    SELECT id, source, CAST(source_document_id AS TEXT), patient_id, statut, served_by, served_at, created_at FROM delivrances
  `.execute(db)
  await sql`DROP TABLE delivrances`.execute(db)
  await sql`ALTER TABLE delivrances_new RENAME TO delivrances`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_delivrances_statut ON delivrances (statut)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_delivrances_patient_id ON delivrances (patient_id)`.execute(db)

  await sql`
    CREATE TABLE mouvements_stock_new (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      medicament_id  INTEGER NOT NULL REFERENCES medicaments(id) ON DELETE CASCADE,
      lot_id         INTEGER REFERENCES stock_lots(id) ON DELETE SET NULL,
      type           TEXT    NOT NULL CHECK (type IN ('entree','sortie_manuelle','delivrance','administration','ajustement')),
      quantite       INTEGER NOT NULL,
      stock_avant    INTEGER,
      stock_apres    INTEGER,
      reference_type TEXT CHECK (reference_type IN ('ordonnance_libre','prescription','plan_soins_item')),
      reference_id   TEXT,
      motif          TEXT,
      user_id        INTEGER REFERENCES user(id),
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`
    INSERT INTO mouvements_stock_new (id, medicament_id, lot_id, type, quantite, stock_avant, stock_apres, reference_type, reference_id, motif, user_id, created_at)
    SELECT id, medicament_id, lot_id, type, quantite, stock_avant, stock_apres, reference_type, CAST(reference_id AS TEXT), motif, user_id, created_at FROM mouvements_stock
  `.execute(db)
  await sql`DROP TABLE mouvements_stock`.execute(db)
  await sql`ALTER TABLE mouvements_stock_new RENAME TO mouvements_stock`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_mouvements_stock_medicament_id ON mouvements_stock (medicament_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_mouvements_stock_reference ON mouvements_stock (reference_type, reference_id)`.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  await sql`
    CREATE TABLE mouvements_stock_old (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      medicament_id  INTEGER NOT NULL REFERENCES medicaments(id) ON DELETE CASCADE,
      lot_id         INTEGER REFERENCES stock_lots(id) ON DELETE SET NULL,
      type           TEXT    NOT NULL CHECK (type IN ('entree','sortie_manuelle','delivrance','administration','ajustement')),
      quantite       INTEGER NOT NULL,
      stock_avant    INTEGER,
      stock_apres    INTEGER,
      reference_type TEXT CHECK (reference_type IN ('ordonnance_libre','prescription','plan_soins_item')),
      reference_id   INTEGER,
      motif          TEXT,
      user_id        INTEGER REFERENCES user(id),
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`
    INSERT INTO mouvements_stock_old (id, medicament_id, lot_id, type, quantite, stock_avant, stock_apres, reference_type, reference_id, motif, user_id, created_at)
    SELECT id, medicament_id, lot_id, type, quantite, stock_avant, stock_apres, reference_type, CAST(reference_id AS INTEGER), motif, user_id, created_at FROM mouvements_stock
  `.execute(db)
  await sql`DROP TABLE mouvements_stock`.execute(db)
  await sql`ALTER TABLE mouvements_stock_old RENAME TO mouvements_stock`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_mouvements_stock_medicament_id ON mouvements_stock (medicament_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_mouvements_stock_reference ON mouvements_stock (reference_type, reference_id)`.execute(db)

  await sql`
    CREATE TABLE delivrances_old (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      source             TEXT    NOT NULL DEFAULT 'ordonnance_libre',
      source_document_id INTEGER NOT NULL,
      patient_id         INTEGER NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
      statut             TEXT    NOT NULL DEFAULT 'a_servir' CHECK (statut IN ('a_servir','partielle','servie','annulee')),
      served_by          INTEGER REFERENCES user(id),
      served_at          TEXT,
      created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (source, source_document_id)
    )
  `.execute(db)
  await sql`
    INSERT INTO delivrances_old (id, source, source_document_id, patient_id, statut, served_by, served_at, created_at)
    SELECT id, source, CAST(source_document_id AS INTEGER), patient_id, statut, served_by, served_at, created_at FROM delivrances
  `.execute(db)
  await sql`DROP TABLE delivrances`.execute(db)
  await sql`ALTER TABLE delivrances_old RENAME TO delivrances`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_delivrances_statut ON delivrances (statut)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_delivrances_patient_id ON delivrances (patient_id)`.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}
