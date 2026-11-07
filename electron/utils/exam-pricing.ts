import type { Kysely } from 'kysely'
import type { DB } from '../entities/database'

/**
 * Tarification des demandes d'examen.
 *
 * Les prix sont configurés une seule fois dans « Configuration Clinique >
 * Examens » (colonne `lab_exams.prix`) : ni le dossier patient ni le module
 * Laboratoire ne saisissent de montant. Le backend additionne les tarifs des
 * analyses sélectionnées pour fixer le montant de la demande.
 */

/** Décode la colonne JSON `exam_requests.exam_ids` en identifiants valides. */
export function parseExamIds(raw?: string | null): number[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((value) => Number(value))
      .filter((id) => Number.isInteger(id) && id > 0)
  } catch {
    return []
  }
}

/**
 * Somme des prix configurés pour les analyses demandées.
 *
 * Les identifiants inconnus sont ignorés (analyse supprimée du catalogue) et
 * les doublons ne sont comptés qu'une fois.
 */
export async function computeExamMontant(
  db: Kysely<DB>,
  examIds: readonly (number | null | undefined)[],
): Promise<number> {
  const ids = [
    ...new Set(
      examIds
        .map((value) => Number(value))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ]
  if (ids.length === 0) return 0

  const rows = await db
    .selectFrom('lab_exams')
    .select(['id', 'prix'])
    .where('id', 'in', ids)
    .execute()

  return rows.reduce((total, row) => total + (Number(row.prix) || 0), 0)
}

/**
 * Montant d'une demande : montant déjà fixé (rétro-compatibilité) ou calculé
 * depuis le catalogue. `null`/`undefined` déclenchent le calcul ; un `0`
 * explicite (exonération, acte gratuit) est conservé.
 */
export async function resolveExamMontant(
  db: Kysely<DB>,
  examIds: readonly (number | null | undefined)[],
  montant?: number | null,
): Promise<number> {
  if (montant != null) return Number(montant)
  return computeExamMontant(db, examIds)
}
