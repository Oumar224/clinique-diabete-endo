import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  // ── Vital signs for patient #1 – 7 rows (6 days ago → today) ──────────
  // Provides a realistic chart with slight daily variations
  await sql`
    INSERT OR IGNORE INTO vital_signs
      (id, patient_id, date, ta_systolique, ta_diastolique, frequence_cardiaque, temperature, glycemie, created_by)
    VALUES
      (3, 1, date('now', '-6 days'),  125, 82, 76, 36.8, 1.1, 1),
      (4, 1, date('now', '-5 days'),  128, 84, 74, 37.0, 1.0, 1),
      (5, 1, date('now', '-4 days'),  132, 86, 80, 36.9, 1.3, 1),
      (6, 1, date('now', '-3 days'),  126, 81, 75, 37.1, 1.2, 1),
      (7, 1, date('now', '-2 days'),  130, 83, 77, 36.7, 1.1, 1),
      (8, 1, date('now', '-1 day'),   120, 80, 72, 37.0, NULL, 1),
      (9, 1, date('now', '+0 days'),  130, 85, 78, 37.2, 1.2, 1)
  `.execute(db)

  // ── Vital signs for patient #2 – 3 rows ───────────────────────────────
  await sql`
    INSERT OR IGNORE INTO vital_signs
      (id, patient_id, date, ta_systolique, ta_diastolique, frequence_cardiaque, temperature, glycemie, created_by)
    VALUES
      (10, 2, date('now', '-2 days'), 140, 90, 82, 37.5, 1.5, 1),
      (11, 2, date('now', '-1 day'),  135, 88, 80, 37.3, 1.4, 1),
      (12, 2, date('now', '+0 days'), 138, 89, 81, 37.4, 1.4, 1)
  `.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // No-op: seed data removal not needed for rollback
}
