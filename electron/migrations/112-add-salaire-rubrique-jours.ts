import { type Kysely } from 'kysely'
import { addColumnIfMissing } from './lib/alter-column'

/**
 * Ajoute la colonne `jours` à `salaire_config_rubrique`.
 *
 * Une rubrique journalière peut porter un nombre de jours fixe (ex. prime de
 * transport sur 24 jours) au lieu de réutiliser les jours travaillés de la
 * configuration. `NULL` conserve l'ancien comportement (jours travaillés).
 *
 * IDEMPOTENCE : la colonne n'est ajoutée que si elle n'existe pas déjà.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await addColumnIfMissing(
    db,
    'salaire_config_rubrique',
    'jours',
    'INTEGER CHECK (jours IS NULL OR (jours BETWEEN 0 AND 31))',
  )
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // SQLite ne supprime pas les colonnes ajoutées : `jours` reste en place.
}
