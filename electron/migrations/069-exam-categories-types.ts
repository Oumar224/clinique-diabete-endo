import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS exam_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`
    CREATE TABLE IF NOT EXISTS exam_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES exam_categories(id),
      label TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  // Seed default categories
  await sql`
    INSERT OR IGNORE INTO exam_categories (code, label, sort_order) VALUES
      ('imagerie', 'Imagerie', 1),
      ('laboratoire', 'Laboratoire', 2),
      ('avis', 'Avis spécialisé', 3)
  `.execute(db)

  // Seed types for imagerie
  await sql`
    INSERT OR IGNORE INTO exam_types (category_id, label)
    SELECT id, 'Radiographie thoracique' FROM exam_categories WHERE code = 'imagerie'
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO exam_types (category_id, label)
    SELECT id, 'Scanner cérébral' FROM exam_categories WHERE code = 'imagerie'
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO exam_types (category_id, label)
    SELECT id, 'IRM cardiaque' FROM exam_categories WHERE code = 'imagerie'
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO exam_types (category_id, label)
    SELECT id, 'Échographie abdominale' FROM exam_categories WHERE code = 'imagerie'
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO exam_types (category_id, label)
    SELECT id, 'Scanner TAP' FROM exam_categories WHERE code = 'imagerie'
  `.execute(db)

  // Seed types for laboratoire
  await sql`
    INSERT OR IGNORE INTO exam_types (category_id, label)
    SELECT id, 'NFS (Numération formule sanguine)' FROM exam_categories WHERE code = 'laboratoire'
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO exam_types (category_id, label)
    SELECT id, 'Ionogramme sanguin' FROM exam_categories WHERE code = 'laboratoire'
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO exam_types (category_id, label)
    SELECT id, 'Bilan hépatique' FROM exam_categories WHERE code = 'laboratoire'
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO exam_types (category_id, label)
    SELECT id, 'Bilan rénal' FROM exam_categories WHERE code = 'laboratoire'
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO exam_types (category_id, label)
    SELECT id, 'Hémoglobine glyquée (HbA1c)' FROM exam_categories WHERE code = 'laboratoire'
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS exam_types`.execute(db)
  await sql`DROP TABLE IF EXISTS exam_categories`.execute(db)
}
