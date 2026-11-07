import { type Kysely, sql } from 'kysely'

/**
 * 122 — Encaissements du laboratoire.
 *
 * Les demandes externes n'ont pas de dossier patient : elles ne peuvent donc
 * pas être facturées via la table `invoice` (qui exige un `patient_id`).
 * On tient un registre d'encaissements dédié, rattaché à la demande, afin de
 * connaître le montant réellement réglé et de calculer le statut de paiement.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS labo_paiements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_request_id INTEGER NOT NULL REFERENCES exam_requests(id) ON DELETE CASCADE,
      montant REAL NOT NULL,
      mode_paiement TEXT NOT NULL DEFAULT 'espece'
        CHECK(mode_paiement IN ('espece','mobile_money','carte','virement','cheque','exonere')),
      date_paiement TEXT NOT NULL DEFAULT (date('now')),
      reference TEXT,
      created_by INTEGER REFERENCES user(id),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_labo_paiements_request ON labo_paiements(exam_request_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_labo_paiements_date ON labo_paiements(date_paiement)`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS labo_paiements`.execute(db)
}
