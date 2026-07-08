import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  // ── Plan de soins for 7 consecutive days starting today ──────────
  // IDs 10-16 reserved for this seed (existing plan_soins: 1,2,3)
  await sql`
    INSERT OR IGNORE INTO plan_soins (id, patient_id, date, created_by) VALUES
      (10, 1, date('now', '+0 days'), 1),
      (11, 1, date('now', '+1 day'),  1),
      (12, 1, date('now', '+2 days'), 1),
      (13, 1, date('now', '+3 days'), 1),
      (14, 1, date('now', '+4 days'), 1),
      (15, 1, date('now', '+5 days'), 1),
      (16, 1, date('now', '+6 days'), 1)
  `.execute(db)

  // ── Day +0 — plan_soins_id=10 ────────────────────────────────────
  // 08h00: NOVORAPID + Furosémide, 12h00: Metformine, 18h00: NOVORAPID, 22h00: LANTUS
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES
      (100, 10, '08h00', 'Insuline NOVORAPID', '10 UI', 'SC', 'en_attente'),
      (101, 10, '08h00', 'Furosémide', '40 mg', 'PO', 'en_attente'),
      (102, 10, '12h00', 'Metformine', '500 mg', 'PO', 'en_attente'),
      (103, 10, '18h00', 'Insuline NOVORAPID', '10 UI', 'SC', 'en_attente'),
      (104, 10, '22h00', 'Insuline LANTUS', '24 UI', 'SC', 'en_attente')
  `.execute(db)

  // ── Day +1 — plan_soins_id=11 ────────────────────────────────────
  // 06h00: LANTUS (validé), 08h00: Metformine + Amlodipine, 12h00: NOVORAPID + Paracétamol, 18h00: Atorvastatin
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut, valide_par, valide_a)
    VALUES
      (105, 11, '06h00', 'Insuline LANTUS', '24 UI', 'SC', 'valide', 'IDE Camara', '06h05')
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES
      (106, 11, '08h00', 'Metformine', '500 mg', 'PO', 'en_attente'),
      (107, 11, '08h00', 'Amlodipine', '5 mg', 'PO', 'en_attente'),
      (108, 11, '12h00', 'Insuline NOVORAPID', '8 UI', 'SC', 'en_attente'),
      (109, 11, '12h00', 'Paracétamol', '500 mg', 'PO', 'en_attente'),
      (110, 11, '18h00', 'Atorvastatin', '20 mg', 'PO', 'en_attente')
  `.execute(db)

  // ── Day +2 — plan_soins_id=12 ────────────────────────────────────
  // 08h00: NOVORAPID, 12h00: Metformine + Furosémide (validé), 20h00: Amlodipine
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES
      (111, 12, '08h00', 'Insuline NOVORAPID', '12 UI', 'SC', 'en_attente')
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES
      (112, 12, '12h00', 'Metformine', '500 mg', 'PO', 'en_attente')
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut, valide_par, valide_a)
    VALUES
      (113, 12, '12h00', 'Furosémide', '40 mg', 'PO', 'valide', 'IDE Diallo', '12h10')
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES
      (114, 12, '20h00', 'Amlodipine', '5 mg', 'PO', 'en_attente')
  `.execute(db)

  // ── Day +3 — plan_soins_id=13 ────────────────────────────────────
  // 08h00: NOVORAPID + Metformine, 14h00: Paracétamol, 18h00: Furosémide + Atorvastatin, 22h00: LANTUS
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES
      (115, 13, '08h00', 'Insuline NOVORAPID', '10 UI', 'SC', 'en_attente'),
      (116, 13, '08h00', 'Metformine', '500 mg', 'PO', 'en_attente'),
      (117, 13, '14h00', 'Paracétamol', '500 mg', 'PO', 'en_attente'),
      (118, 13, '18h00', 'Furosémide', '40 mg', 'PO', 'en_attente'),
      (119, 13, '18h00', 'Atorvastatin', '20 mg', 'PO', 'en_attente'),
      (120, 13, '22h00', 'Insuline LANTUS', '24 UI', 'SC', 'en_attente')
  `.execute(db)

  // ── Day +4 — plan_soins_id=14 ────────────────────────────────────
  // 08h00: Amlodipine, 12h00: NOVORAPID + Metformine, 18h00: NOVORAPID + Furosémide
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES
      (121, 14, '08h00', 'Amlodipine', '5 mg', 'PO', 'en_attente'),
      (122, 14, '12h00', 'Insuline NOVORAPID', '10 UI', 'SC', 'en_attente'),
      (123, 14, '12h00', 'Metformine', '500 mg', 'PO', 'en_attente'),
      (124, 14, '18h00', 'Insuline NOVORAPID', '8 UI', 'SC', 'en_attente'),
      (125, 14, '18h00', 'Furosémide', '40 mg', 'PO', 'en_attente')
  `.execute(db)

  // ── Day +5 — plan_soins_id=15 ────────────────────────────────────
  // 06h00: LANTUS (validé), 08h00: NOVORAPID, 12h00: Metformine + Amlodipine, 18h00: Paracétamol (suspendu), 20h00: Atorvastatin
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut, valide_par, valide_a)
    VALUES
      (126, 15, '06h00', 'Insuline LANTUS', '24 UI', 'SC', 'valide', 'IDE Camara', '06h05')
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES
      (127, 15, '08h00', 'Insuline NOVORAPID', '10 UI', 'SC', 'en_attente'),
      (128, 15, '12h00', 'Metformine', '500 mg', 'PO', 'en_attente'),
      (129, 15, '12h00', 'Amlodipine', '5 mg', 'PO', 'en_attente')
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut, motif_suspension)
    VALUES
      (130, 15, '18h00', 'Paracétamol', '500 mg', 'PO', 'suspendu', 'Patient allergique signalé')
  `.execute(db)
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES
      (131, 15, '20h00', 'Atorvastatin', '20 mg', 'PO', 'en_attente')
  `.execute(db)

  // ── Day +6 — plan_soins_id=16 ────────────────────────────────────
  // 08h00: NOVORAPID + Furosémide, 12h00: Metformine, 18h00: NOVORAPID + Amlodipine
  await sql`
    INSERT OR IGNORE INTO plan_soins_items
      (id, plan_soins_id, bloc_heure, medicament, dosage, voie, statut)
    VALUES
      (132, 16, '08h00', 'Insuline NOVORAPID', '8 UI', 'SC', 'en_attente'),
      (133, 16, '08h00', 'Furosémide', '40 mg', 'PO', 'en_attente'),
      (134, 16, '12h00', 'Metformine', '500 mg', 'PO', 'en_attente'),
      (135, 16, '18h00', 'Insuline NOVORAPID', '10 UI', 'SC', 'en_attente'),
      (136, 16, '18h00', 'Amlodipine', '5 mg', 'PO', 'en_attente')
  `.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // No-op: seed data removal is not needed for rollback;
  // a full migration down from 031 already drops all tables.
}
