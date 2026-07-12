import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  // ─── Clinical Document Types (catalog) ──────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS clinical_document_types (
      id          TEXT PRIMARY KEY,
      code        TEXT NOT NULL UNIQUE,
      label       TEXT NOT NULL,
      description TEXT,
      form_schema TEXT NOT NULL,
      category    TEXT NOT NULL CHECK(category IN ('consultation','lab','delivery','other')),
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  // ─── Patient Clinical Documents ────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS patient_clinical_documents (
      id                TEXT PRIMARY KEY,
      contact_id        TEXT NOT NULL REFERENCES encounters(id),
      service_id        TEXT REFERENCES services(id),
      document_type_id  TEXT NOT NULL REFERENCES clinical_document_types(id),
      title             TEXT,
      status            TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','signed')),
      form_data         TEXT,
      signed_at         TEXT,
      signed_by         TEXT REFERENCES user(id),
      created_by        TEXT NOT NULL REFERENCES user(id),
      created_at        TEXT DEFAULT (datetime('now')),
      updated_at        TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  await sql`CREATE INDEX IF NOT EXISTS idx_pcd_contact_id ON patient_clinical_documents(contact_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_pcd_document_type_id ON patient_clinical_documents(document_type_id)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_pcd_status ON patient_clinical_documents(status)`.execute(db)
  await sql`CREATE INDEX IF NOT EXISTS idx_pcd_created_at ON patient_clinical_documents(created_at)`.execute(db)

  // ─── Clinical Document Signatures (audit trail) ────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS clinical_document_signatures (
      id             TEXT PRIMARY KEY,
      document_id    TEXT NOT NULL REFERENCES patient_clinical_documents(id),
      user_id        TEXT NOT NULL REFERENCES user(id),
      signature_hash TEXT NOT NULL,
      signed_at      TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  // ─── Seed initial document types ────────────────────────────────
  const consultationSchema = JSON.stringify([
    {
      name: 'reason',
      label: 'Motif de la consultation',
      type: 'textarea',
      required: true,
      placeholder: 'Raison principale de la consultation…',
    },
    {
      name: 'history',
      label: 'Antécédents',
      type: 'textarea',
      placeholder: 'Antécédents médicaux et chirurgicaux…',
    },
    {
      name: 'current_treatment',
      label: 'Traitement en cours',
      type: 'textarea',
      placeholder: 'Médicaments actuels…',
    },
    {
      name: 'clinical_examination',
      label: 'Examen clinique',
      type: 'textarea',
      required: true,
      placeholder: "Résultats de l'examen clinique…",
    },
    {
      name: 'diagnosis',
      label: 'Diagnostic',
      type: 'textarea',
      required: true,
      placeholder: 'Diagnostic retenu…',
    },
    {
      name: 'paraclinical_exams',
      label: 'Examens paracliniques',
      type: 'textarea',
      placeholder: 'Examens complémentaires demandés…',
    },
    {
      name: 'treatment_plan',
      label: 'Plan thérapeutique',
      type: 'textarea',
      required: true,
      placeholder: 'Traitement prescrit et recommandations…',
    },
    {
      name: 'follow_up',
      label: 'Suivi',
      type: 'textarea',
      placeholder: 'Prochain rendez-vous et surveillance…',
    },
  ])

  const labSchema = JSON.stringify([
    {
      name: 'exam_type',
      label: "Type d'examen",
      type: 'select',
      required: true,
      options: [
        { label: 'Bilan glycémique', value: 'glycemic' },
        { label: 'Bilan lipidique', value: 'lipid' },
        { label: 'Bilan rénal', value: 'renal' },
        { label: 'Bilan hépatique', value: 'hepatic' },
        { label: 'Hémogramme', value: 'hemogram' },
        { label: 'Hémoglobine glyquée (HbA1c)', value: 'hba1c' },
        { label: 'Microalbuminurie', value: 'microalbuminuria' },
        { label: 'Autre', value: 'other' },
      ],
    },
    {
      name: 'priority',
      label: 'Priorité',
      type: 'select',
      required: true,
      options: [
        { label: 'Normale', value: 'normal' },
        { label: 'Urgente', value: 'urgent' },
        { label: 'Très urgente', value: 'very_urgent' },
      ],
    },
    {
      name: 'clinical_info',
      label: 'Informations cliniques',
      type: 'textarea',
      required: true,
      placeholder: 'Renseignements cliniques pour le laboratoire…',
    },
    {
      name: 'samples',
      label: 'Type de prélèvement',
      type: 'select',
      options: [
        { label: 'Sang veineux', value: 'venous_blood' },
        { label: 'Sang capillaire', value: 'capillary_blood' },
        { label: 'Urines', value: 'urine' },
        { label: 'Autre', value: 'other' },
      ],
    },
    {
      name: 'fasting_required',
      label: 'Patient à jeun requis',
      type: 'checkbox',
    },
    {
      name: 'notes',
      label: 'Notes complémentaires',
      type: 'textarea',
      placeholder: 'Instructions supplémentaires…',
    },
  ])

  const deliverySchema = JSON.stringify([
    {
      name: 'delivery_date',
      label: 'Date de remise',
      type: 'date',
      required: true,
    },
    {
      name: 'delivered_to',
      label: 'Remis à',
      type: 'text',
      required: true,
      placeholder: 'Nom du destinataire',
    },
    {
      name: 'relationship',
      label: 'Lien avec le patient',
      type: 'select',
      options: [
        { label: 'Patient lui-même', value: 'self' },
        { label: 'Conjoint(e)', value: 'spouse' },
        { label: 'Parent', value: 'parent' },
        { label: 'Enfant', value: 'child' },
        { label: 'Tuteur', value: 'guardian' },
        { label: 'Autre', value: 'other' },
      ],
    },
    {
      name: 'documents_delivered',
      label: 'Documents remis',
      type: 'textarea',
      required: true,
      placeholder: 'Liste des documents remis…',
    },
    {
      name: 'notes',
      label: 'Notes',
      type: 'textarea',
      placeholder: 'Observations supplémentaires…',
    },
  ])

  // Fixed UUIDs for determinism across re-runs
  await sql`
    INSERT OR IGNORE INTO clinical_document_types (id, code, label, description, form_schema, category, is_active)
    VALUES ('11111111-1111-4111-1111-111111111111', 'CONSULTATION_NOTE', 'Compte rendu de consultation', 'Compte rendu détaillé d''une consultation médicale', ${consultationSchema}, 'consultation', 1)
  `.execute(db)

  await sql`
    INSERT OR IGNORE INTO clinical_document_types (id, code, label, description, form_schema, category, is_active)
    VALUES ('22222222-2222-4222-2222-222222222222', 'LAB_REQUEST', 'Demande d''examen de laboratoire', 'Bon de demande d''analyses biologiques', ${labSchema}, 'lab', 1)
  `.execute(db)

  await sql`
    INSERT OR IGNORE INTO clinical_document_types (id, code, label, description, form_schema, category, is_active)
    VALUES ('33333333-3333-4333-3333-333333333333', 'DELIVERY_REPORT', 'Bordereau de remise de documents', 'Bordereau de remise de documents au patient ou à un tiers', ${deliverySchema}, 'delivery', 1)
  `.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TABLE IF EXISTS clinical_document_signatures`.execute(db)
  await sql`DROP TABLE IF EXISTS patient_clinical_documents`.execute(db)
  await sql`DROP TABLE IF EXISTS clinical_document_types`.execute(db)
}
