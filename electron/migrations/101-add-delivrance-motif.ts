import { type Kysely } from 'kysely'
import { addColumnIfMissing } from './lib/alter-column'

/**
 * Ajoute la colonne `motif` à `delivrances`.
 *
 * IDEMPOTENCE (défaut B3) : la colonne n'est ajoutée que si elle n'existe
 * pas encore (sonde `pragma_table_info`). Une VRAIE erreur SQLite n'est plus
 * avalée : elle fait échouer la migration, qui n'est alors PAS enregistrée
 * dans `kysely_migration` et sera rejouée au prochain démarrage (où la sonde
 * d'idempotence évite toute tentative de doublon).
 *
 * `PRAGMA foreign_keys = OFF/ON` a été retiré : cette pragma est un NO-OP
 * à l'intérieur d'une transaction et n'était pas nécessaire ici.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await addColumnIfMissing(db, 'delivrances', 'motif', 'TEXT')
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // SQLite ne supprime pas les colonnes ajoutées : `motif` reste en place
  // (même approche que les autres migrations `ADD COLUMN`).
}
