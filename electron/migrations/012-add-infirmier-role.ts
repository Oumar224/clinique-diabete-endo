import { type Kysely, CompiledQuery } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.executeQuery(CompiledQuery.raw('PRAGMA foreign_keys = OFF'))

  await db.executeQuery(CompiledQuery.raw(`
    CREATE TABLE IF NOT EXISTS user_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('MEDECIN','SECRETAIRE','PHARMACIEN','COMPTABLE','ADMIN','INFIRMIER')),
      service TEXT,
      is_active INTEGER DEFAULT 1,
      is_validated INTEGER DEFAULT 0,
      automerge_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      photo TEXT,
      telephone TEXT,
      telephone_country_code TEXT DEFAULT '+224',
      fonction TEXT,
      date_debut_contrat TEXT,
      date_fin_contrat TEXT,
      type_contrat TEXT DEFAULT 'CDI',
      statut_resiliation TEXT,
      motif_resiliation TEXT,
      date_resiliation TEXT,
      resilie_par INTEGER REFERENCES user(id),
      fonction_id INTEGER REFERENCES fonctions(id)
    )
  `))

  await db.executeQuery(CompiledQuery.raw(`
    INSERT INTO user_new (
      id, nom, prenom, email, password_hash, role, service,
      is_active, is_validated, automerge_id,
      created_at, updated_at,
      photo, telephone, telephone_country_code, fonction,
      date_debut_contrat, date_fin_contrat, type_contrat,
      statut_resiliation, motif_resiliation, date_resiliation,
      resilie_par, fonction_id
    )
    SELECT
      id, nom, prenom, email, password_hash, role, service,
      is_active, is_validated, automerge_id,
      created_at, updated_at,
      photo, telephone, telephone_country_code, fonction,
      date_debut_contrat, date_fin_contrat, type_contrat,
      statut_resiliation, motif_resiliation, date_resiliation,
      resilie_par, fonction_id
    FROM user
  `))

  await db.executeQuery(CompiledQuery.raw('DROP TABLE user'))

  await db.executeQuery(CompiledQuery.raw('ALTER TABLE user_new RENAME TO user'))

  await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_user_email ON user(email)'))
  await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_user_role ON user(role)'))

  await db.executeQuery(CompiledQuery.raw('PRAGMA foreign_keys = ON'))
}

export async function down(_db: Kysely<unknown>): Promise<void> {
}
