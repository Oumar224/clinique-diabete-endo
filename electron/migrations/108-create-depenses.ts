import { type Kysely, sql } from 'kysely'

/**
 * Dépenses — catégories paramétrables et écritures de dépense.
 *
 * `fournisseur_id` n'a volontairement AUCUNE clé étrangère : la table
 * `fournisseurs` n'existe que si la migration 103 est appliquée. Les jeux de
 * tests réduits (upgrade pré-pharmacie) doivent pouvoir exécuter 108 seul.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS depense_categorie (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      code       TEXT    NOT NULL UNIQUE,
      nom        TEXT    NOT NULL,
      couleur    TEXT,
      actif      INTEGER NOT NULL DEFAULT 1 CHECK (actif IN (0, 1)),
      ordre      INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`
    INSERT OR IGNORE INTO depense_categorie (code, nom) VALUES
      ('transport',  'Transport'),
      ('repas',      'Repas'),
      ('equipement', 'Équipement'),
      ('pharmacie',  'Pharmacie'),
      ('autre',      'Autre')
  `.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS depense (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      date            TEXT    NOT NULL,
      categorie_id    INTEGER NOT NULL REFERENCES depense_categorie(id),
      libelle         TEXT    NOT NULL,
      montant         INTEGER NOT NULL CHECK (montant >= 0),
      mode_paiement   TEXT    CHECK (mode_paiement IS NULL OR mode_paiement IN ('espèces','carte_bancaire','chèque','virement','mobile_money','assurance','autre')),
      fournisseur_id  INTEGER,
      fournisseur_nom TEXT,
      reference       TEXT,
      notes           TEXT,
      source          TEXT    NOT NULL DEFAULT 'manuel' CHECK (source IN ('manuel','stock_entree')),
      source_id       INTEGER,
      statut_paiement TEXT    NOT NULL DEFAULT 'payee' CHECK (statut_paiement IN ('payee','credit')),
      date_paiement   TEXT,
      created_by      INTEGER REFERENCES user(id),
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_depense_date ON depense (date)
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_depense_categorie_id ON depense (categorie_id)
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_depense_statut_paiement ON depense (statut_paiement)
  `.execute(db)
  // Une entrée de stock ne peut générer qu'une seule dépense.
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_depense_source_source_id
      ON depense (source, source_id)
      WHERE source_id IS NOT NULL
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_depense_source_source_id`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_depense_statut_paiement`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_depense_categorie_id`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_depense_date`.execute(db)
  await sql`DROP TABLE IF EXISTS depense`.execute(db)
  await sql`DROP TABLE IF EXISTS depense_categorie`.execute(db)
}
