import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  // ─── medicaments : 8 colonnes Phase 1 ──────────────────────────
  const medicamentAlters = [
    `ALTER TABLE medicaments ADD COLUMN type_produit TEXT NOT NULL DEFAULT 'medicament'`,
    `ALTER TABLE medicaments ADD COLUMN conditionnement TEXT`,
    `ALTER TABLE medicaments ADD COLUMN contenance_qte REAL`,
    `ALTER TABLE medicaments ADD COLUMN unite_contenance TEXT`,
    `ALTER TABLE medicaments ADD COLUMN prix_achat REAL`,
    `ALTER TABLE medicaments ADD COLUMN prix_vente REAL`,
    `ALTER TABLE medicaments ADD COLUMN fournisseur_principal_id INTEGER REFERENCES fournisseurs(id) ON DELETE SET NULL`,
    `ALTER TABLE medicaments ADD COLUMN autre_unite_precision TEXT`,
  ]
  for (const stmt of medicamentAlters) {
    try {
      await sql.raw(stmt).execute(db)
    } catch {
      console.log(`[Migration 104] Colonne déjà existante, ALTER ignoré: ${stmt}`)
    }
  }

  await sql`
    CREATE INDEX IF NOT EXISTS idx_medicaments_type_produit ON medicaments (type_produit)
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_medicaments_fournisseur ON medicaments (fournisseur_principal_id)
  `.execute(db)

  // Backfill : tout le catalogue historique est de type 'medicament'
  await sql`
    UPDATE medicaments SET type_produit = 'medicament' WHERE type_produit IS NULL OR type_produit = ''
  `.execute(db)

  // ─── stock_lots : 4 colonnes traçabilité ───────────────────────
  const lotAlters = [
    `ALTER TABLE stock_lots ADD COLUMN fournisseur_id INTEGER REFERENCES fournisseurs(id) ON DELETE SET NULL`,
    `ALTER TABLE stock_lots ADD COLUMN prix_achat REAL`,
    `ALTER TABLE stock_lots ADD COLUMN ref_bl TEXT`,
    `ALTER TABLE stock_lots ADD COLUMN ref_facture TEXT`,
  ]
  for (const stmt of lotAlters) {
    try {
      await sql.raw(stmt).execute(db)
    } catch {
      console.log(`[Migration 104] Colonne déjà existante, ALTER ignoré: ${stmt}`)
    }
  }

  await sql`
    CREATE INDEX IF NOT EXISTS idx_stock_lots_fournisseur_id ON stock_lots (fournisseur_id)
  `.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  // Rebuild medicaments sans les 8 colonnes Phase 1 (schéma 102)
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
  await sql`DROP INDEX IF EXISTS idx_medicaments_type_produit`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_medicaments_fournisseur`.execute(db)

  // Rebuild stock_lots sans les 4 colonnes Phase 1 (schéma 097)
  await sql`
    CREATE TABLE stock_lots_new (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      medicament_id     INTEGER NOT NULL REFERENCES medicaments(id) ON DELETE CASCADE,
      numero_lot        TEXT,
      quantite          INTEGER NOT NULL DEFAULT 0 CHECK (quantite >= 0),
      quantite_initiale INTEGER NOT NULL DEFAULT 0,
      date_peremption   TEXT,
      date_entree       TEXT,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`
    INSERT INTO stock_lots_new (id, medicament_id, numero_lot, quantite, quantite_initiale, date_peremption, date_entree, created_at)
    SELECT id, medicament_id, numero_lot, quantite, quantite_initiale, date_peremption, date_entree, created_at FROM stock_lots
  `.execute(db)
  await sql`DROP TABLE stock_lots`.execute(db)
  await sql`ALTER TABLE stock_lots_new RENAME TO stock_lots`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_stock_lots_medicament_id ON stock_lots (medicament_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_stock_lots_date_peremption ON stock_lots (date_peremption)`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_stock_lots_fournisseur_id`.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}
