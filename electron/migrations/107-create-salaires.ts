import { type Kysely, sql } from 'kysely'

/**
 * Salaires — configuration mensuelle par utilisateur, rubriques de paie et
 * paiements effectués.
 *
 * Indépendant du module pharmacie : cette migration doit s'appliquer sur un
 * base réduite (tests d'upgrade) où 096 → 106 / 109 ne sont pas exécutées.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS salaire_config (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      periode          TEXT    NOT NULL,
      base             INTEGER NOT NULL DEFAULT 0 CHECK (base >= 0),
      jours_travailles INTEGER NOT NULL DEFAULT 0 CHECK (jours_travailles >= 0),
      created_by       INTEGER REFERENCES user(id),
      created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, periode)
    )
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_salaire_config_periode ON salaire_config (periode)
  `.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS salaire_config_rubrique (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      config_id    INTEGER NOT NULL REFERENCES salaire_config(id) ON DELETE CASCADE,
      libelle      TEXT    NOT NULL,
      type         TEXT    NOT NULL CHECK (type IN ('fixe','journalier')),
      montant      INTEGER NOT NULL DEFAULT 0 CHECK (montant >= 0),
      montant_jour INTEGER CHECK (montant_jour IS NULL OR montant_jour >= 0),
      impact_net   INTEGER NOT NULL DEFAULT 1 CHECK (impact_net IN (0, 1)),
      ordre        INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_salaire_config_rubrique_config_id
      ON salaire_config_rubrique (config_id)
  `.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS salaire_paiement (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      periode       TEXT    NOT NULL,
      montant_net   INTEGER NOT NULL CHECK (montant_net >= 0),
      mode_paiement TEXT    NOT NULL CHECK (mode_paiement IN ('espèces','carte_bancaire','chèque','virement','mobile_money','assurance','autre')),
      date_paiement TEXT    NOT NULL,
      reference     TEXT,
      details       TEXT,
      created_by    INTEGER REFERENCES user(id),
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, periode)
    )
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_salaire_paiement_periode ON salaire_paiement (periode)
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_salaire_paiement_date ON salaire_paiement (date_paiement)
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS salaire_paiement`.execute(db)
  await sql`DROP TABLE IF EXISTS salaire_config_rubrique`.execute(db)
  await sql`DROP TABLE IF EXISTS salaire_config`.execute(db)
}
