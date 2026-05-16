import { type Kysely, sql, CompiledQuery } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS automerge_documents (
    document_id TEXT PRIMARY KEY,
    data BLOB NOT NULL,
    last_modified INTEGER NOT NULL
  )`.execute(db)

  await sql`CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('MEDECIN','SECRETAIRE','PHARMACIEN','COMPTABLE','ADMIN')),
    service TEXT,
    is_active INTEGER DEFAULT 1,
    is_validated INTEGER DEFAULT 0,
    automerge_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`.execute(db)

  try { await db.executeQuery(CompiledQuery.raw('ALTER TABLE user ADD COLUMN is_active INTEGER DEFAULT 1')) } catch {}
  try { await db.executeQuery(CompiledQuery.raw('ALTER TABLE user ADD COLUMN is_validated INTEGER DEFAULT 0')) } catch {}
  try { await db.executeQuery(CompiledQuery.raw('ALTER TABLE user ADD COLUMN automerge_id TEXT')) } catch {}

  await sql`CREATE INDEX IF NOT EXISTS idx_user_email ON user(email)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_user_role ON user(role)`.execute(db)

  await sql`CREATE TABLE IF NOT EXISTS patient (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    civilite TEXT NOT NULL CHECK(civilite IN ('M','Mme','Mlle')),
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    date_naissance TEXT NOT NULL,
    nir TEXT UNIQUE NOT NULL,
    telephone TEXT NOT NULL,
    email TEXT,
    adresse TEXT,
    mutuelle TEXT,
    medecin_traitant TEXT,
    allergies TEXT DEFAULT '[]',
    automerge_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`.execute(db)
  try { await db.executeQuery(CompiledQuery.raw('ALTER TABLE patient ADD COLUMN automerge_id TEXT')) } catch {}

  await sql`CREATE INDEX IF NOT EXISTS idx_patient_nom ON patient(nom)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_patient_nir ON patient(nir)`.execute(db)

  await sql`CREATE TABLE IF NOT EXISTS appointment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    motif TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('confirmed','pending','cancelled','done')),
    medecin_id INTEGER REFERENCES user(id),
    notes TEXT,
    automerge_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`.execute(db)
  try { await db.executeQuery(CompiledQuery.raw('ALTER TABLE appointment ADD COLUMN automerge_id TEXT')) } catch {}

  await sql`CREATE INDEX IF NOT EXISTS idx_appointment_date ON appointment(date)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_appointment_patient ON appointment(patient_id)`.execute(db)

  await sql`CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
    remember_me INTEGER DEFAULT 0
  )`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_session_user ON session(user_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_session_expires ON session(expires_at)`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS session`.execute(db)
  await sql`DROP TABLE IF EXISTS appointment`.execute(db)
  await sql`DROP TABLE IF EXISTS patient`.execute(db)
  await sql`DROP TABLE IF EXISTS user`.execute(db)
  await sql`DROP TABLE IF EXISTS automerge_documents`.execute(db)
}
