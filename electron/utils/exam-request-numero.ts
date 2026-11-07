import { sql, type Kysely } from 'kysely'

/**
 * Numéro de demande de laboratoire : `LB-AAAAMMJJ-NNNN`.
 *
 * La séquence est journalière et commune à TOUS les points d'entrée
 * (module Laboratoire, dossier patient, imports) afin que deux demandes
 * créées le même jour ne puissent pas partager le même numéro.
 */
export async function nextExamRequestNumero(
  db: Kysely<any>,
  date = new Date(),
): Promise<string> {
  const compact = date.toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `LB-${compact}`
  const row = await sql<{ maxSeq: number | null }>`
    SELECT MAX(CAST(substr(numero, 13) AS INTEGER)) AS maxSeq
    FROM exam_requests
    WHERE numero LIKE ${`${prefix}-%`}
  `.execute(db)
  const next = Number(row.rows[0]?.maxSeq ?? 0) + 1
  return `${prefix}-${String(next).padStart(4, '0')}`
}
