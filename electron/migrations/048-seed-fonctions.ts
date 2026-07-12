import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  await sql`
    INSERT OR IGNORE INTO fonctions (id, name, is_active) VALUES
      (1, 'Médecin généraliste', 1),
      (2, 'Endocrinologue', 1),
      (3, 'Diabétologue', 1),
      (4, 'Infirmier(ère)', 1),
      (5, 'Infirmier(ère) chef(e)', 1),
      (6, 'Secrétaire médical(e)', 1),
      (7, 'Comptable', 1),
      (8, 'Pharmacien(ne)', 1),
      (9, 'Aide-soignant(e)', 1),
      (10, 'Technicien(ne) de laboratoire', 1),
      (11, 'Radiologue', 1),
      (12, 'Assistant(e) social(e)', 1),
      (13, 'Psychologue', 1),
      (14, 'Nutritionniste', 1),
      (15, 'Podologue', 1)
  `.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // No-op
}
