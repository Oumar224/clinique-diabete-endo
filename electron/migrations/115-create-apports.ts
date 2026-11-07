import { type Kysely, sql } from 'kysely'

/**
 * Apports de trésorerie et remboursements.
 *
 * Deux natures :
 *  - `fonds_propres` : apport personnel / subvention, non remboursable ;
 *  - `dette` : avance remboursable, suivie jusqu'au solde.
 *
 * Le statut est dérivé du cumul des remboursements par le service : il n'est
 * jamais saisi librement par l'utilisateur.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS apports (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      reference      TEXT    NOT NULL UNIQUE,
      type           TEXT    NOT NULL CHECK (type IN ('fonds_propres','dette')),
      libelle        TEXT    NOT NULL,
      montant        INTEGER NOT NULL CHECK (montant > 0),
      date_apport    TEXT    NOT NULL,
      mode_paiement  TEXT    NOT NULL DEFAULT 'espèces'
                     CHECK (mode_paiement IN ('espèces','carte_bancaire','chèque','virement','mobile_money','assurance','autre')),
      statut         TEXT    NOT NULL DEFAULT 'ouvert'
                     CHECK (statut IN ('ouvert','rembourse','annule')),
      notes          TEXT,
      created_by     INTEGER REFERENCES user(id),
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_apports_date_apport ON apports (date_apport)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_apports_statut ON apports (statut)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_apports_type ON apports (type)`.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS apport_remboursements (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      apport_id           INTEGER NOT NULL REFERENCES apports(id) ON DELETE CASCADE,
      montant             INTEGER NOT NULL CHECK (montant > 0),
      date_remboursement  TEXT    NOT NULL,
      mode_paiement       TEXT    NOT NULL DEFAULT 'espèces'
                          CHECK (mode_paiement IN ('espèces','carte_bancaire','chèque','virement','mobile_money','assurance','autre')),
      reference           TEXT,
      notes               TEXT,
      created_by          INTEGER REFERENCES user(id),
      created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_apport_remboursements_apport_id ON apport_remboursements (apport_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_apport_remboursements_date ON apport_remboursements (date_remboursement)`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_apport_remboursements_date`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_apport_remboursements_apport_id`.execute(db)
  await sql`DROP TABLE IF EXISTS apport_remboursements`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_apports_type`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_apports_statut`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_apports_date_apport`.execute(db)
  await sql`DROP TABLE IF EXISTS apports`.execute(db)
}
