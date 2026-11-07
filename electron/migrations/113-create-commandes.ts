import { type Kysely, sql } from 'kysely'
import { addColumnIfMissing } from './lib/alter-column'

/**
 * Bons de commande pharmacie.
 *
 * Un bon est un snapshot : la désignation, la forme, le dosage, le
 * conditionnement, l'unité, la CMM et le stock restant sont figés au moment de
 * la commande. Une modification ultérieure du catalogue ne réécrit donc pas
 * l'historique.
 *
 * Aucun prix n'est stocké : la commande est un document logistique destiné à
 * la Pharmacie Centrale de Guinée, pas une pièce comptable.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // Fournisseur « Pharmacie Centrale de Guinée » : un seul fournisseur peut
  // porter ce drapeau. L'index partiel est la garantie au niveau SQLite.
  await addColumnIfMissing(
    db,
    'fournisseurs',
    'est_pharmacie_centrale',
    'INTEGER NOT NULL DEFAULT 0 CHECK (est_pharmacie_centrale IN (0, 1))',
  )
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_fournisseurs_pharmacie_centrale
      ON fournisseurs (est_pharmacie_centrale)
      WHERE est_pharmacie_centrale = 1
  `.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS commandes (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      numero         TEXT    NOT NULL UNIQUE,
      fournisseur_id INTEGER NOT NULL REFERENCES fournisseurs(id),
      date_commande  TEXT    NOT NULL,
      date_prevue    TEXT,
      periode        TEXT,
      urgence        INTEGER NOT NULL DEFAULT 0 CHECK (urgence IN (0, 1)),
      statut         TEXT    NOT NULL DEFAULT 'brouillon'
                     CHECK (statut IN ('brouillon','envoyee','partielle','livree','cloturee','annulee')),
      notes          TEXT,
      created_by     INTEGER REFERENCES user(id),
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_commandes_fournisseur_id ON commandes (fournisseur_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_commandes_date_commande ON commandes (date_commande)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_commandes_statut ON commandes (statut)`.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS commande_lignes (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      commande_id        INTEGER NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
      medicament_id      INTEGER NOT NULL REFERENCES medicaments(id),
      designation        TEXT    NOT NULL,
      forme              TEXT,
      dosage             TEXT,
      conditionnement    TEXT,
      unite              TEXT,
      cmm                INTEGER NOT NULL DEFAULT 0 CHECK (cmm >= 0),
      stock_restant      INTEGER NOT NULL DEFAULT 0 CHECK (stock_restant >= 0),
      quantite_commandee INTEGER NOT NULL CHECK (quantite_commandee > 0),
      quantite_livree    INTEGER NOT NULL DEFAULT 0 CHECK (quantite_livree >= 0 AND quantite_livree <= quantite_commandee),
      ordre              INTEGER NOT NULL DEFAULT 0,
      created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_commande_lignes_commande_id ON commande_lignes (commande_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_commande_lignes_medicament_id ON commande_lignes (medicament_id)`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_commande_lignes_medicament_id`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_commande_lignes_commande_id`.execute(db)
  await sql`DROP TABLE IF EXISTS commande_lignes`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_commandes_statut`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_commandes_date_commande`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_commandes_fournisseur_id`.execute(db)
  await sql`DROP TABLE IF EXISTS commandes`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_fournisseurs_pharmacie_centrale`.execute(db)
  // SQLite ne supprime pas les colonnes ajoutées de façon portable : la
  // colonne `fournisseurs.est_pharmacie_centrale` reste en place (même
  // approche que 101/109/110/111), avec un défaut sans effet de bord.
}
