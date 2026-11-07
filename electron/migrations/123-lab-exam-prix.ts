import { type Kysely } from 'kysely'
import { addColumnIfMissing } from './lib/alter-column'

/**
 * 123 — Prix des actes de laboratoire.
 *
 * Le tarif d'une analyse se configure une seule fois dans
 * « Configuration Clinique > Examens ». Les formulaires de demande ne
 * saisissent plus de montant : le backend additionne les prix des analyses
 * sélectionnées pour fixer le montant de la demande.
 *
 * IDEMPOTENCE : la colonne n'est ajoutée que si elle n'existe pas déjà.
 * Les examens existants partent de 0 GNF jusqu'à la saisie du tarif.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await addColumnIfMissing(db, 'lab_exams', 'prix', 'REAL NOT NULL DEFAULT 0')
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // SQLite ne supprime pas les colonnes ajoutées : `prix` reste en place.
}
