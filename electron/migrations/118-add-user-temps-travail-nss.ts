import { type Kysely } from 'kysely'
import { addColumnIfMissing } from './lib/alter-column'

/**
 * Ajoute le temps de travail et le numéro de sécurité sociale à `user`.
 *
 * - `temps_travail` distingue un contrat à temps plein d'un contrat à temps
 *   partiel ; la valeur par défaut `'PLEIN'` préserve les employés existants.
 * - `numero_securite_sociale` est un identifiant libre (texte, pas d'unicité),
 *   `NULL` quand il n'est pas renseigné.
 *
 * IDEMPOTENCE : chaque colonne n'est ajoutée que si elle n'existe pas déjà.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await addColumnIfMissing(
    db,
    'user',
    'temps_travail',
    "TEXT NOT NULL DEFAULT 'PLEIN' CHECK (temps_travail IN ('PLEIN','PARTIEL'))",
  )
  await addColumnIfMissing(db, 'user', 'numero_securite_sociale', 'TEXT')
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // SQLite ne supprime pas les colonnes ajoutées : `temps_travail` et
  // `numero_securite_sociale` restent en place.
}
