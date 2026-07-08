import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // Disable FK checks since referenced patients/users may not exist yet in test env
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  // ── Plan de soins for patient #1 (id=2 — id=1 already seeded by 031) ──────────
  await sql`
    INSERT OR IGNORE INTO plan_soins (id, patient_id, date, created_by)
    VALUES (2, 1, date('now'), 1)
  `.execute(db)

  // 06h00 – Lantus (already validated)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut, valide_par, valide_a)
    VALUES (7, 2, '06h00', 'Insuline LANTUS', '24 UI', 'SC', 'valide', 'IDE Diallo', '06h05')
  `.execute(db)

  // 08h00 – NOVORAPID (attente), Metformine (attente), Furosémide (validé)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES (8, 2, '08h00', 'Insuline NOVORAPID', '8 UI', 'SC', 'en_attente')
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES (9, 2, '08h00', 'Metformine', '500 mg', 'PO', 'en_attente')
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut, valide_par, valide_a)
    VALUES (10, 2, '08h00', 'Furosémide', '40 mg', 'PO', 'valide', 'IDE Diallo', '08h10')
  `.execute(db)

  // 10h00 – Paracétamol (attente)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES (11, 2, '10h00', 'Paracétamol', '500 mg', 'PO', 'en_attente')
  `.execute(db)

  // 12h00 – NOVORAPID (attente), Metformine (attente), Amlodipine (attente)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES (12, 2, '12h00', 'Insuline NOVORAPID', '10 UI', 'SC', 'en_attente')
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES (13, 2, '12h00', 'Metformine', '500 mg', 'PO', 'en_attente')
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES (14, 2, '12h00', 'Amlodipine', '5 mg', 'PO', 'en_attente')
  `.execute(db)

  // 14h00 – Furosémide (validé)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut, valide_par, valide_a)
    VALUES (15, 2, '14h00', 'Furosémide', '40 mg', 'PO', 'valide', 'IDE Diallo', '14h05')
  `.execute(db)

  // 16h00 – Paracétamol (suspendu – patient allergique)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut, motif_suspension)
    VALUES (16, 2, '16h00', 'Paracétamol', '500 mg', 'PO', 'suspendu', 'Patient allergique signalé')
  `.execute(db)

  // 18h00 – NOVORAPID (attente), Metformine (attente)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES (17, 2, '18h00', 'Insuline NOVORAPID', '10 UI', 'SC', 'en_attente')
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES (18, 2, '18h00', 'Metformine', '500 mg', 'PO', 'en_attente')
  `.execute(db)

  // 20h00 – Atorvastatin (attente), Amlodipine (attente)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES (19, 2, '20h00', 'Atorvastatin', '20 mg', 'PO', 'en_attente')
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES (20, 2, '20h00', 'Amlodipine', '5 mg', 'PO', 'en_attente')
  `.execute(db)

  // 22h00 – LANTUS (attente), Paracétamol (suspendu)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES (21, 2, '22h00', 'Insuline LANTUS', '24 UI', 'SC', 'en_attente')
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut, motif_suspension)
    VALUES (22, 2, '22h00', 'Paracétamol', '500 mg', 'PO', 'suspendu', 'Patient allergique signalé')
  `.execute(db)

  // ── Plan de soins for patient #2 (id=3) ─────────────────────────────────────
  await sql`
    INSERT OR IGNORE INTO plan_soins (id, patient_id, date, created_by)
    VALUES (3, 2, date('now'), 1)
  `.execute(db)

  // 3-4 time blocks, 1 medication each, all en_attente
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES (23, 3, '08h00', 'Metformine', '500 mg', 'PO', 'en_attente')
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES (24, 3, '12h00', 'Insuline NOVORAPID', '8 UI', 'SC', 'en_attente')
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES (25, 3, '18h00', 'Atorvastatin', '10 mg', 'PO', 'en_attente')
  `.execute(db)

  // ── Vital signs for patient #1 ─────────────────────────────────────────────
  // Today: TA 130/85, pulse 78, temp 37.2°C, glycemia 1.2 g/L
  await sql`
    INSERT OR IGNORE INTO vital_signs
      (id, patient_id, date, ta_systolique, ta_diastolique, frequence_cardiaque, temperature, glycemie, created_by)
    VALUES (1, 1, date('now'), 130, 85, 78, 37.2, 1.2, 1)
  `.execute(db)

  // Yesterday: TA 120/80, pulse 72, temp 37.0°C, glycemia NULL
  await sql`
    INSERT OR IGNORE INTO vital_signs
      (id, patient_id, date, ta_systolique, ta_diastolique, frequence_cardiaque, temperature, glycemie, created_by)
    VALUES (2, 1, date('now', '-1 day'), 120, 80, 72, 37.0, NULL, 1)
  `.execute(db)

  // ── Dispositifs for patient #1 ─────────────────────────────────────────────
  // id=1 (Cathéter périphérique) and id=2 (Sonde urinaire 350ml) already seeded by 031
  // Add voie centrale "Rouge"
  await sql`
    INSERT OR IGNORE INTO dispositifs
      (id, patient_id, type, date_pose, aspect, volume_ml, created_by)
    VALUES (3, 1, 'Voie centrale', date('now'), 'Rouge', NULL, 1)
  `.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // No-op: seed data removal is not needed for rollback;
  // a full migration down from 031 already drops all tables.
}
