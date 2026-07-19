import type { Kysely } from 'kysely'

export interface FKCheck {
  table: string
  column: string
  value: string | number | null | undefined
  label?: string
}

/**
 * Map of table names to French user-friendly labels for error messages.
 * Keys are DB table names; values are what users see in error messages.
 */
const TABLE_LABELS: Record<string, string> = {
  patient: 'patient',
  user: 'utilisateur',
  encounters: 'contact',
  services: 'service',
  specialties: 'spécialité',
  care_units: 'unité de soins',
  sites: 'site',
  contact_categories: 'catégorie de contact',
  insurances: 'assurance',
  currencies: 'devise',
  medical_acts: 'acte médical',
  exam_categories: 'catégorie d\'examen',
  exam_types: 'type d\'examen',
  lab_exams: 'examen de laboratoire',
  lab_exam_categories: 'catégorie d\'examen de laboratoire',
}

/**
 * Validate that foreign key values point to existing rows before insert/update.
 * Skips null/undefined values (optional FKs).
 * Supports both numeric IDs and TEXT UUIDs.
 */
export async function validateForeignKeys(
  db: Kysely<unknown>,
  checks: FKCheck[]
): Promise<void> {
  for (const check of checks) {
    if (check.value == null) continue

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = await (db as any)
      .selectFrom(check.table)
      .select('id')
      .where('id', '=', check.value)
      .executeTakeFirst()
    if (!row) {
      const label = check.label || `${check.table}.${check.column}`
      const entityLabel = TABLE_LABELS[check.table] || check.table

      // Diagnostic log for debugging
      console.warn(
        `[FK Validation] Échec : ${label}=${check.value} introuvable dans la table "${check.table}"`
      )

      // Throw a user-friendly error message
      throw new Error(
        `Impossible de créer la demande : ${entityLabel} (ID ${check.value}) n'existe pas dans la base de données`
      )
    }
  }
}
