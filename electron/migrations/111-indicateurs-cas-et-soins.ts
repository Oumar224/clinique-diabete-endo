import { type Kysely, sql } from 'kysely'
import { addColumnIfMissing } from './lib/alter-column'

/**
 * Indicateurs annuels — remplacement du chiffre d'affaires par des comptages.
 *
 * La feuille du gestionnaire ne contient pas de colonne CA : « Cs Suivi
 * diabète/endocrino » est un NOMBRE de dossiers suivis, et « Soins
 * ambulatoires » un nombre de dossiers non hospitaliers.
 *
 * - `annual_indicator.suivi_diabete_endocrino` : surcharge manuelle éventuelle.
 * - `annual_indicator.soins_ambulatoires` : surcharge manuelle éventuelle.
 *
 * La colonne historique `ca_diabete_endocrino` reste en place (aucune donnée
 * n'est détruite) mais n'est plus exposée ni lue par l'application.
 *
 * IDEMPOTENCE : chaque `ALTER` passe par `addColumnIfMissing` (sonde
 * `pragma_table_info`) ; les `CREATE INDEX IF NOT EXISTS` sont rejouables.
 * Aucune erreur n'est avalée : un vrai échec fait échouer la migration.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await addColumnIfMissing(db, 'annual_indicator', 'suivi_diabete_endocrino', 'INTEGER')
  await addColumnIfMissing(db, 'annual_indicator', 'soins_ambulatoires', 'INTEGER')

  // Les agrégats mensuels filtrent sur la date d'entrée et la modalité.
  await sql`
    CREATE INDEX IF NOT EXISTS idx_encounters_contact_type_start_date
      ON encounters (contact_type, start_date)
  `.execute(db)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_encounters_service_start_date
      ON encounters (service_id, start_date)
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_encounters_service_start_date`.execute(db)
  await sql`DROP INDEX IF EXISTS idx_encounters_contact_type_start_date`.execute(db)
  // SQLite ne supprime pas les colonnes ajoutées de façon portable : celles de
  // 111 restent en place (même approche que 101/109/110). Elles sont
  // nullables et sans effet de bord.
}
