import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // Clôture des contacts restés 'active' alors que leur end_date est déjà passée.
  // L'application les affiche déjà comme 'closed' (CASE effective_status), mais
  // la règle A.1 (un seul contact actif par patient) lisait la colonne brute
  // `status` et bloquait indéfiniment la création d'un nouveau contact.
  // NB: comparaison normalisée `datetime(end_date) <= datetime('now')`, identique
  // à la logique d'affichage de l'app (les deux normalisent le format des dates).
  await sql`
    UPDATE encounters
    SET status = 'closed', updated_at = datetime('now')
    WHERE status = 'active'
      AND end_date IS NOT NULL
      AND datetime(end_date) <= datetime('now')
  `.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // No-op intentionnel : impossible de reconstituer l'ancien statut 'active'
  // (les end_date d'origine ne sont pas récupérables) — remettre status='active'
  // recréerait des contacts expirés bloquant la règle A.1.
}