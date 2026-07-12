import { type Kysely } from 'kysely'
import { CompiledQuery } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // ════════════════════════════════════════════════════════════════
  // PART A: Update existing seed data — rename CLI → SOIN
  // ════════════════════════════════════════════════════════════════

  // Detach legacy services from CLI/SOIN root first (they'll be reattached later)
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET parent_id = NULL
    WHERE parent_id = (SELECT id FROM services WHERE code = 'CLI')
    AND code IS NULL
  `))

  // Update root: CLI → SOIN
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET code = 'SOIN', name = 'SOINS PATIENTS', color = '#1A5276', sort_order = 1, is_active = 1
    WHERE code = 'CLI'
  `))

  // Update CLI.INT → SOIN.INT
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET code = 'SOIN.INT', color = '#3498DB'
    WHERE code = 'CLI.INT'
  `))

  // Update CLI.INT.HOF → SOIN.INT.HOF
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET code = 'SOIN.INT.HOF', color = '#3498DB'
    WHERE code = 'CLI.INT.HOF'
  `))

  // Update CLI.INT.HOH → SOIN.INT.HOH
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET code = 'SOIN.INT.HOH', color = '#3498DB'
    WHERE code = 'CLI.INT.HOH'
  `))

  // ════════════════════════════════════════════════════════════════
  // PART B: Seed the complete hierarchy
  // ════════════════════════════════════════════════════════════════

  // ── Create TEC and GEST roots ──────────────────────────────────
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code)
    VALUES ('PLATEAU TECHNIQUE', 'Services techniques et diagnostiques', 0, '#1E8449', 2, 'TEC')
  `))

  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code)
    VALUES ('GESTION LOGISTIQUE', 'Services administratifs et logistiques', 0, '#6C3483', 3, 'GEST')
  `))

  // ════════════════════════════════════════════════════════════════
  // SOIN branch (blue #3498DB)
  // ════════════════════════════════════════════════════════════════

  // SOIN.MAT — MATERNITE / SMI
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'MATERNITE / SMI', 'Soins maternels et infantiles', 0, '#3498DB', 2, 'SOIN.MAT', id
    FROM services WHERE code = 'SOIN'
  `))
  // SOIN.MAT.ACC — ACCOUCHEMENTS
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'ACCOUCHEMENTS', 'Accouchements et soins néonatals', 30, '#3498DB', 1, 'SOIN.MAT.ACC', id
    FROM services WHERE code = 'SOIN.MAT'
  `))
  // SOIN.MAT.PF — PLANIFICATION FAMILIALE
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'PLANIFICATION FAMILIALE', 'Consultations PF', 30, '#3498DB', 2, 'SOIN.MAT.PF', id
    FROM services WHERE code = 'SOIN.MAT'
  `))

  // SOIN.PED — PEDIATRIE & PEV
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'PEDIATRIE & PEV', 'Pédiatrie et programme élargi de vaccination', 0, '#3498DB', 3, 'SOIN.PED', id
    FROM services WHERE code = 'SOIN'
  `))
  // SOIN.PED.CON — CONSULTATIONS INFANTILES
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'CONSULTATIONS INFANTILES', 'Consultations pédiatriques', 30, '#3498DB', 1, 'SOIN.PED.CON', id
    FROM services WHERE code = 'SOIN.PED'
  `))
  // SOIN.PED.VAC — VACCINATION (PEV)
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'VACCINATION (PEV)', 'Vaccination programme élargi', 15, '#3498DB', 2, 'SOIN.PED.VAC', id
    FROM services WHERE code = 'SOIN.PED'
  `))

  // SOIN.CHI — CHIRURGIE & URGENCES
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'CHIRURGIE & URGENCES', 'Chirurgie et service des urgences', 0, '#3498DB', 4, 'SOIN.CHI', id
    FROM services WHERE code = 'SOIN'
  `))

  // SOIN.PROG — PROGRAMMES SPECIAUX (CTA)
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'PROGRAMMES SPECIAUX (CTA)', 'Programmes thérapeutiques et CTA', 0, '#3498DB', 5, 'SOIN.PROG', id
    FROM services WHERE code = 'SOIN'
  `))
  // SOIN.PROG.VIH — SUIVI VIH / ARV
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'SUIVI VIH / ARV', 'Suivi des patients sous ARV', 30, '#3498DB', 1, 'SOIN.PROG.VIH', id
    FROM services WHERE code = 'SOIN.PROG'
  `))
  // SOIN.PROG.TB — TUBERCULOSE
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'TUBERCULOSE', 'Prise en charge tuberculose', 30, '#3498DB', 2, 'SOIN.PROG.TB', id
    FROM services WHERE code = 'SOIN.PROG'
  `))

  // SOIN.CSP — CONSULTATIONS SPECIALISEES
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'CONSULTATIONS SPECIALISEES', 'Consultations médicales spécialisées', 0, '#3498DB', 6, 'SOIN.CSP', id
    FROM services WHERE code = 'SOIN'
  `))
  // SOIN.CSP.DEN — DENTAIRE
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'DENTAIRE', 'Soins dentaires', 30, '#3498DB', 1, 'SOIN.CSP.DEN', id
    FROM services WHERE code = 'SOIN.CSP'
  `))
  // SOIN.CSP.OPH — OPHTALMOLOGIE
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'OPHTALMOLOGIE', 'Soins ophtalmologiques', 30, '#3498DB', 2, 'SOIN.CSP.OPH', id
    FROM services WHERE code = 'SOIN.CSP'
  `))
  // SOIN.CSP.SMT — SANTE MENTALE
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'SANTE MENTALE', 'Consultations santé mentale', 30, '#3498DB', 3, 'SOIN.CSP.SMT', id
    FROM services WHERE code = 'SOIN.CSP'
  `))

  // ════════════════════════════════════════════════════════════════
  // TEC branch (green #2ECC71)
  // ════════════════════════════════════════════════════════════════

  // TEC.LAB — LABORATOIRE
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'LABORATOIRE', 'Analyses de laboratoire', 0, '#2ECC71', 1, 'TEC.LAB', id
    FROM services WHERE code = 'TEC'
  `))
  // TEC.LAB.AN1 — ANALYSES BIOLOGIQUES
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'ANALYSES BIOLOGIQUES', 'Analyses de biologie médicale', 0, '#2ECC71', 1, 'TEC.LAB.AN1', id
    FROM services WHERE code = 'TEC.LAB'
  `))
  // TEC.LAB.AN2 — ANALYSES PARASITOLOGIQUES
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'ANALYSES PARASITOLOGIQUES', 'Analyses parasitologiques', 0, '#2ECC71', 2, 'TEC.LAB.AN2', id
    FROM services WHERE code = 'TEC.LAB'
  `))

  // TEC.IMG — IMAGERIE MEDICALE
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'IMAGERIE MEDICALE', 'Services d''imagerie', 0, '#2ECC71', 2, 'TEC.IMG', id
    FROM services WHERE code = 'TEC'
  `))
  // TEC.IMG.RAD — RADIOLOGIE
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'RADIOLOGIE', 'Examens radiologiques', 30, '#2ECC71', 1, 'TEC.IMG.RAD', id
    FROM services WHERE code = 'TEC.IMG'
  `))
  // TEC.IMG.ECH — ECHOGRAPHIE
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'ECHOGRAPHIE', 'Examens échographiques', 30, '#2ECC71', 2, 'TEC.IMG.ECH', id
    FROM services WHERE code = 'TEC.IMG'
  `))

  // TEC.SNG — BANQUE DE SANG
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'BANQUE DE SANG', 'Banque de sang et transfusion', 0, '#2ECC71', 3, 'TEC.SNG', id
    FROM services WHERE code = 'TEC'
  `))

  // TEC.PHA — PHARMACIE
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'PHARMACIE', 'Pharmacie et dispensation', 0, '#2ECC71', 4, 'TEC.PHA', id
    FROM services WHERE code = 'TEC'
  `))
  // TEC.PHA.DEP — DEPOT DE MEDICAMENTS
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'DEPOT DE MEDICAMENTS', 'Gestion des dépôts de médicaments', 0, '#2ECC71', 1, 'TEC.PHA.DEP', id
    FROM services WHERE code = 'TEC.PHA'
  `))
  // TEC.PHA.PRE — PREPARATION / GALENIQUE
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'PREPARATION / GALENIQUE', 'Préparation galénique', 0, '#2ECC71', 2, 'TEC.PHA.PRE', id
    FROM services WHERE code = 'TEC.PHA'
  `))

  // ════════════════════════════════════════════════════════════════
  // GEST branch (purple #9B59B6)
  // ════════════════════════════════════════════════════════════════

  // GEST.CPT — COMPTABILITE & FACTURATION
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'COMPTABILITE & FACTURATION', 'Comptabilité et facturation', 0, '#9B59B6', 1, 'GEST.CPT', id
    FROM services WHERE code = 'GEST'
  `))

  // GEST.RH — RESSOURCES HUMAINES & ACCUEIL
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'RESSOURCES HUMAINES & ACCUEIL', 'Gestion des RH et accueil', 0, '#9B59B6', 2, 'GEST.RH', id
    FROM services WHERE code = 'GEST'
  `))
  // GEST.RH.ACC — ACCUEIL / ARCHIVES
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'ACCUEIL / ARCHIVES', 'Accueil des patients et archives', 0, '#9B59B6', 1, 'GEST.RH.ACC', id
    FROM services WHERE code = 'GEST.RH'
  `))
  // GEST.RH.PAI — PERSONNEL / PAIE
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'PERSONNEL / PAIE', 'Gestion du personnel et paie', 0, '#9B59B6', 2, 'GEST.RH.PAI', id
    FROM services WHERE code = 'GEST.RH'
  `))

  // GEST.WASH — HYGIENE & SECURITE (WASH)
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'HYGIENE & SECURITE (WASH)', 'Hygiène, sécurité et WASH', 0, '#9B59B6', 3, 'GEST.WASH', id
    FROM services WHERE code = 'GEST'
  `))
  // GEST.WASH.DEC — GESTION DES DECHETS
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'GESTION DES DECHETS', 'Gestion des déchets médicaux', 0, '#9B59B6', 1, 'GEST.WASH.DEC', id
    FROM services WHERE code = 'GEST.WASH'
  `))
  // GEST.WASH.STE — STERILISATION
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'STERILISATION', 'Stérilisation du matériel', 0, '#9B59B6', 2, 'GEST.WASH.STE', id
    FROM services WHERE code = 'GEST.WASH'
  `))

  // GEST.LOG — LOGISTIQUE & MAINTENANCE
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'LOGISTIQUE & MAINTENANCE', 'Logistique et maintenance', 0, '#9B59B6', 4, 'GEST.LOG', id
    FROM services WHERE code = 'GEST'
  `))
  // GEST.LOG.INF — PARC INFORMATIQUE
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'PARC INFORMATIQUE', 'Gestion du parc informatique', 0, '#9B59B6', 1, 'GEST.LOG.INF', id
    FROM services WHERE code = 'GEST.LOG'
  `))
  // GEST.LOG.ENE — ENERGIE / GENERATEUR
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'ENERGIE / GENERATEUR', 'Gestion de l''énergie et groupe électrogène', 0, '#9B59B6', 2, 'GEST.LOG.ENE', id
    FROM services WHERE code = 'GEST.LOG'
  `))

  // GEST.MOR — SERVICE MORTUAIRE
  await db.executeQuery(CompiledQuery.raw(`
    INSERT OR IGNORE INTO services (name, description, duration, color, sort_order, code, parent_id)
    SELECT 'SERVICE MORTUAIRE', 'Service mortuaire et morgue', 0, '#9B59B6', 5, 'GEST.MOR', id
    FROM services WHERE code = 'GEST'
  `))

  // ════════════════════════════════════════════════════════════════
  // PART C: Attach legacy services to their new parents
  // ════════════════════════════════════════════════════════════════

  // Accueil → GEST.RH.ACC
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET parent_id = (SELECT id FROM services WHERE code = 'GEST.RH.ACC')
    WHERE name = 'Accueil' AND code IS NULL
  `))

  // Consultation Générale → SOIN.CSP
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET parent_id = (SELECT id FROM services WHERE code = 'SOIN.CSP')
    WHERE name = 'Consultation Générale' AND code IS NULL
  `))

  // Endocrinologie → SOIN.CSP
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET parent_id = (SELECT id FROM services WHERE code = 'SOIN.CSP')
    WHERE name = 'Endocrinologie' AND code IS NULL
  `))

  // Diabétologie → SOIN.CSP
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET parent_id = (SELECT id FROM services WHERE code = 'SOIN.CSP')
    WHERE name = 'Diabétologie' AND code IS NULL
  `))

  // Pharmacie → TEC.PHA
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET parent_id = (SELECT id FROM services WHERE code = 'TEC.PHA')
    WHERE name = 'Pharmacie' AND code IS NULL
  `))

  // ════════════════════════════════════════════════════════════════
  // PART D: Update sort_order for SOIN.INT children to fix ordering
  // ════════════════════════════════════════════════════════════════
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET sort_order = 1 WHERE code = 'SOIN.INT.HOF'
  `))
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET sort_order = 2 WHERE code = 'SOIN.INT.HOH'
  `))

  // ════════════════════════════════════════════════════════════════
  // TASK 2: user_favorite_services table
  // ════════════════════════════════════════════════════════════════
  await db.executeQuery(CompiledQuery.raw(`
    CREATE TABLE IF NOT EXISTS user_favorite_services (
      user_id    INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, service_id)
    )
  `))


}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Remove user_favorite_services table
  await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS user_favorite_services'))

  // Detach legacy services from new parents
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET parent_id = NULL
    WHERE name IN ('Accueil', 'Consultation Générale', 'Endocrinologie', 'Diabétologie', 'Pharmacie')
    AND code IS NULL
  `))

  // Remove all new services created by this migration (codes starting with SOIN.* (non-original), TEC.*, GEST.*)
  await db.executeQuery(CompiledQuery.raw(`
    DELETE FROM services WHERE code IN (
      'SOIN.MAT', 'SOIN.MAT.ACC', 'SOIN.MAT.PF',
      'SOIN.PED', 'SOIN.PED.CON', 'SOIN.PED.VAC',
      'SOIN.CHI',
      'SOIN.PROG', 'SOIN.PROG.VIH', 'SOIN.PROG.TB',
      'SOIN.CSP', 'SOIN.CSP.DEN', 'SOIN.CSP.OPH', 'SOIN.CSP.SMT',
      'TEC', 'TEC.LAB', 'TEC.LAB.AN1', 'TEC.LAB.AN2',
      'TEC.IMG', 'TEC.IMG.RAD', 'TEC.IMG.ECH',
      'TEC.SNG', 'TEC.PHA', 'TEC.PHA.DEP', 'TEC.PHA.PRE',
      'GEST', 'GEST.CPT', 'GEST.RH', 'GEST.RH.ACC', 'GEST.RH.PAI',
      'GEST.WASH', 'GEST.WASH.DEC', 'GEST.WASH.STE',
      'GEST.LOG', 'GEST.LOG.INF', 'GEST.LOG.ENE',
      'GEST.MOR'
    )
  `))

  // Revert SOIN → CLI
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET code = 'CLI', name = 'SERVICES CLINIQUES', color = '#409EFF', sort_order = 1
    WHERE code = 'SOIN'
  `))
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET code = 'CLI.INT', color = '#67C23A'
    WHERE code = 'SOIN.INT'
  `))
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET code = 'CLI.INT.HOF', color = '#E6A23C'
    WHERE code = 'SOIN.INT.HOF'
  `))
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET code = 'CLI.INT.HOH', color = '#F56C6C'
    WHERE code = 'SOIN.INT.HOH'
  `))

  // Re-attach legacy services to CLI
  await db.executeQuery(CompiledQuery.raw(`
    UPDATE services SET parent_id = (SELECT id FROM services WHERE code = 'CLI')
    WHERE name IN ('Accueil', 'Consultation Générale', 'Endocrinologie', 'Diabétologie', 'Pharmacie')
    AND code IS NULL
  `))
}
