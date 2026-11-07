import { type Kysely, sql } from 'kysely'

/**
 * Utilitaires d'`ALTER TABLE ... ADD COLUMN` IDEMPOTENTS.
 *
 * CONTEXTE (défaut B3) : l'ancien code de la migration 109 avalait TOUTE
 * erreur d'`ALTER` (`try { ... } catch { console.log('Colonne déjà
 * existante') }`). Conséquence : une VRAIE erreur (table verrouillée, page
 * corrompue, disque plein, table absente) était avalée, la migration se
 * terminait « avec succès » et était ENREGISTRÉE dans `kysely_migration`
 * alors que le schéma était incomplet. L'application démarrait ensuite avec
 * des colonnes manquantes et chaque `dispensation:servir` échouait, sans
 * chemin de réparation.
 *
 * À noter : l'adaptateur SQLite de Kysely déclare `supportsTransactionalDdl
 * = false` — le migrateur n'enveloppe donc PAS les migrations dans une
 * transaction (les `ALTER` déjà réussis restent appliqués en autocommit).
 * La stratégie correcte est donc :
 *
 *  1. SONDE D'IDEMPOTENCE EXPLICITE : on ne lance l'`ALTER` que si la
 *     colonne n'existe pas encore (donc un rejeu n'échoue jamais) ;
 *  2. toute AUTRE erreur est RELANCÉE : la migration échoue et n'est PAS
 *     enregistrée dans `kysely_migration` — elle sera rejouée au prochain
 *     démarrage, et la sonde d'idempotence complètera le schéma sans
 *     dupliquer les colonnes déjà ajoutées.
 */

/** Noms de tables/colonnes acceptés : identifiants SQL stricts uniquement. */
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

function assertIdentifier(value: string, kind: 'table' | 'colonne'): string {
  if (!IDENTIFIER_RE.test(value)) {
    throw new Error(`Nom de ${kind} SQL invalide : ${JSON.stringify(value)}`)
  }
  return value
}

/**
 * Vrai si la colonne existe déjà dans la table.
 *
 * Utilise la fonction table-valued `pragma_table_info(?)` : le nom de la
 * table est lié en paramètre (aucune interpolation SQL).
 */
export async function tableHasColumn(
  db: Kysely<unknown>,
  table: string,
  column: string,
): Promise<boolean> {
  assertIdentifier(table, 'table')
  assertIdentifier(column, 'colonne')
  const result = await sql<{ name: string }>`
    SELECT name FROM pragma_table_info(${table}) WHERE name = ${column}
  `.execute(db)
  return result.rows.length > 0
}

/**
 * Ajoute une colonne SI ET SEULEMENT SI elle n'existe pas déjà.
 *
 * @param definition Définition SQL de la colonne (type + contraintes), sans
 *                   le mot-clé `COLUMN` (ex. `TEXT NOT NULL DEFAULT 0`).
 * @returns `true` si la colonne a été ajoutée, `false` si elle existait déjà.
 * @throws L'erreur SQLite d'`ALTER` telle quelle (jamais avalée) : la
 *         migration doit échouer et être annulée.
 */
export async function addColumnIfMissing(
  db: Kysely<unknown>,
  table: string,
  column: string,
  definition: string,
): Promise<boolean> {
  if (await tableHasColumn(db, table, column)) return false
  await sql
    .raw(`ALTER TABLE ${assertIdentifier(table, 'table')} ADD COLUMN ${assertIdentifier(column, 'colonne')} ${definition}`)
    .execute(db)
  return true
}
