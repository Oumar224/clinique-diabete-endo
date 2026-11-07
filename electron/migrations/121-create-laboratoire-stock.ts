import { type Kysely, sql } from 'kysely'

/**
 * 121 — Stock, commandes et fournisseurs du laboratoire.
 *
 * Tables dédiées au laboratoire (réactifs, consommables, milieux, kits) :
 * elles sont physiquement séparées du stock pharmacie pour éviter tout
 * mélange de référentiels et d'invariants (FIFO, seuils, valorisation).
 *
 * Les fournisseurs sont partagés avec la pharmacie (table `fournisseurs`) :
 * un fournisseur est une entité commerciale générique, seule la relation
 * article ↔ fournisseur change de domaine.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // ─── Catalogue des articles de laboratoire ──────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS labo_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT,
      nom TEXT NOT NULL,
      categorie TEXT NOT NULL DEFAULT 'reactif',
      unite_stock TEXT NOT NULL DEFAULT 'unité',
      seuil_alerte INTEGER NOT NULL DEFAULT 5,
      prix_achat REAL,
      prix_vente REAL,
      fournisseur_principal_id INTEGER REFERENCES fournisseurs(id) ON DELETE SET NULL,
      actif INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_labo_articles_nom ON labo_articles(nom)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_labo_articles_actif ON labo_articles(actif)`.execute(db)

  // ─── Lots de stock ─────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS labo_stock_lots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES labo_articles(id) ON DELETE CASCADE,
      numero_lot TEXT,
      quantite INTEGER NOT NULL DEFAULT 0,
      quantite_restante INTEGER NOT NULL DEFAULT 0,
      date_peremption TEXT,
      fournisseur_id INTEGER REFERENCES fournisseurs(id) ON DELETE SET NULL,
      prix_achat REAL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_labo_lots_article ON labo_stock_lots(article_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_labo_lots_peremption ON labo_stock_lots(date_peremption)`.execute(db)

  // ─── Mouvements de stock ───────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS labo_mouvements_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL REFERENCES labo_articles(id) ON DELETE CASCADE,
      lot_id INTEGER REFERENCES labo_stock_lots(id) ON DELETE SET NULL,
      type TEXT NOT NULL CHECK(type IN ('entree','sortie','ajustement')),
      quantite INTEGER NOT NULL,
      motif TEXT,
      reference TEXT,
      created_by INTEGER REFERENCES user(id),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_labo_mvt_article ON labo_mouvements_stock(article_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_labo_mvt_type ON labo_mouvements_stock(type)`.execute(db)

  // ─── Commandes fournisseurs ────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS labo_commandes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT NOT NULL UNIQUE,
      fournisseur_id INTEGER REFERENCES fournisseurs(id) ON DELETE SET NULL,
      statut TEXT NOT NULL DEFAULT 'brouillon'
        CHECK(statut IN ('brouillon','envoyee','partielle','livree','cloturee','annulee')),
      date_commande TEXT NOT NULL,
      date_livraison_prevue TEXT,
      montant_total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_by INTEGER REFERENCES user(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_labo_cmd_statut ON labo_commandes(statut)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_labo_cmd_date ON labo_commandes(date_commande)`.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS labo_commande_lignes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commande_id INTEGER NOT NULL REFERENCES labo_commandes(id) ON DELETE CASCADE,
      article_id INTEGER NOT NULL REFERENCES labo_articles(id) ON DELETE CASCADE,
      quantite INTEGER NOT NULL,
      quantite_recue INTEGER NOT NULL DEFAULT 0,
      prix_unitaire REAL NOT NULL DEFAULT 0
    )
  `.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_labo_cmd_lignes_cmd ON labo_commande_lignes(commande_id)`.execute(db)

  // ─── Réceptions ────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS labo_commande_receptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commande_id INTEGER NOT NULL REFERENCES labo_commandes(id) ON DELETE CASCADE,
      date_reception TEXT NOT NULL,
      numero_bon TEXT,
      notes TEXT,
      created_by INTEGER REFERENCES user(id),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_labo_recep_cmd ON labo_commande_receptions(commande_id)`.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS labo_commande_reception_lignes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reception_id INTEGER NOT NULL REFERENCES labo_commande_receptions(id) ON DELETE CASCADE,
      ligne_id INTEGER NOT NULL REFERENCES labo_commande_lignes(id) ON DELETE CASCADE,
      quantite INTEGER NOT NULL,
      numero_lot TEXT,
      date_peremption TEXT
    )
  `.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_labo_recep_lignes_recep ON labo_commande_reception_lignes(reception_id)`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS labo_commande_reception_lignes`.execute(db)
  await sql`DROP TABLE IF EXISTS labo_commande_receptions`.execute(db)
  await sql`DROP TABLE IF EXISTS labo_commande_lignes`.execute(db)
  await sql`DROP TABLE IF EXISTS labo_commandes`.execute(db)
  await sql`DROP TABLE IF EXISTS labo_mouvements_stock`.execute(db)
  await sql`DROP TABLE IF EXISTS labo_stock_lots`.execute(db)
  await sql`DROP TABLE IF EXISTS labo_articles`.execute(db)
}
