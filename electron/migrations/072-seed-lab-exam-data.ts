import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // Ensure lab_exam_categories table exists
  await sql`
    CREATE TABLE IF NOT EXISTS lab_exam_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  // Ensure lab_exams table exists with parent_id for hierarchy
  await sql`
    CREATE TABLE IF NOT EXISTS lab_exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES lab_exam_categories(id),
      parent_id INTEGER REFERENCES lab_exams(id),
      code TEXT,
      name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `.execute(db)

  // ─── Categories ──────────────────────────────────────────────
  // Only imagerie and laboratoire (remove avis)
  await sql`DELETE FROM lab_exams`.execute(db)
  await sql`DELETE FROM lab_exam_categories`.execute(db)

  await sql`
    INSERT INTO lab_exam_categories (id, code, name, sort_order) VALUES
      (1, 'imagerie', 'Imagerie', 1),
      (2, 'laboratoire', 'Laboratoire', 2)
  `.execute(db)

  // ─── Types for imagerie (parent_id = NULL) ───────────────────
  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name, sort_order)
    SELECT id, NULL, 'RADIO_STANDARD', 'La radiographie standard (Rayons X)', 1
    FROM lab_exam_categories WHERE code = 'imagerie'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name, sort_order)
    SELECT id, NULL, 'ECHO_DOPPLER', 'L''échographie et le Doppler (Ultrasons)', 2
    FROM lab_exam_categories WHERE code = 'imagerie'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name, sort_order)
    SELECT id, NULL, 'SCANNER', 'La tomodensitométrie (Scanner)', 3
    FROM lab_exam_categories WHERE code = 'imagerie'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name, sort_order)
    SELECT id, NULL, 'IRM', 'L''imagerie par résonance magnétique (IRM)', 4
    FROM lab_exam_categories WHERE code = 'imagerie'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name, sort_order)
    SELECT id, NULL, 'MAMMOGRAPHIE', 'La mammographie', 5
    FROM lab_exam_categories WHERE code = 'imagerie'
  `.execute(db)

  // ─── Exams under imagerie types (parent_id = type.id) ────────
  // La radiographie standard (Rayons X)
  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'RADIO_THORACIQUE', 'Radiographie thoracique'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'RADIO_STANDARD'
    WHERE cat.code = 'imagerie'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'RADIO_ABDO', 'Radiographie abdominale sans préparation (ASP)'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'RADIO_STANDARD'
    WHERE cat.code = 'imagerie'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'RADIO_MEMBRE', 'Radiographie des membres'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'RADIO_STANDARD'
    WHERE cat.code = 'imagerie'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'RADIO_CRANE', 'Radiographie du crâne et du rachis'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'RADIO_STANDARD'
    WHERE cat.code = 'imagerie'
  `.execute(db)

  // L'échographie et le Doppler (Ultrasons)
  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'ECHO_ABDO', 'Échographie abdominale'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'ECHO_DOPPLER'
    WHERE cat.code = 'imagerie'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'ECHO_FOETALE', 'Échographie fœtale (grossesse)'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'ECHO_DOPPLER'
    WHERE cat.code = 'imagerie'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'ECHO_PELVIENNE', 'Échographie pelvienne'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'ECHO_DOPPLER'
    WHERE cat.code = 'imagerie'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'DOPPLER_VASC', 'Doppler vasculaire'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'ECHO_DOPPLER'
    WHERE cat.code = 'imagerie'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'ECHO_CARDIAQUE', 'Échocardiographie'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'ECHO_DOPPLER'
    WHERE cat.code = 'imagerie'
  `.execute(db)

  // Tomodensitométrie (Scanner)
  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'SCANNER_CEREBRAL', 'Scanner cérébral'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'SCANNER'
    WHERE cat.code = 'imagerie'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'SCANNER_TAP', 'Scanner TAP (thoraco-abdomino-pelvien)'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'SCANNER'
    WHERE cat.code = 'imagerie'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'ANGIO_SCANNER', 'Angio-scanner'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'SCANNER'
    WHERE cat.code = 'imagerie'
  `.execute(db)

  // IRM
  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'IRM_CEREBRALE', 'IRM cérébrale'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'IRM'
    WHERE cat.code = 'imagerie'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'IRM_CARDIAQUE', 'IRM cardiaque'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'IRM'
    WHERE cat.code = 'imagerie'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'IRM_OSTEO', 'IRM ostéo-articulaire'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'IRM'
    WHERE cat.code = 'imagerie'
  `.execute(db)

  // Mammographie
  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'MAMMO_DEPISTAGE', 'Mammographie de dépistage'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'MAMMOGRAPHIE'
    WHERE cat.code = 'imagerie'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'MAMMO_DIAG', 'Mammographie diagnostique'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'MAMMOGRAPHIE'
    WHERE cat.code = 'imagerie'
  `.execute(db)

  // ─── Types for laboratoire (parent_id = NULL) ────────────────
  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name, sort_order)
    SELECT id, NULL, 'HEMATO_COAG', 'L''hématologie et la coagulation', 1
    FROM lab_exam_categories WHERE code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name, sort_order)
    SELECT id, NULL, 'BIOCHIMIE', 'La biochimie', 2
    FROM lab_exam_categories WHERE code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name, sort_order)
    SELECT id, NULL, 'HORMONO_ENDOCRI', 'L''hormonologie et l''endocrinologie', 3
    FROM lab_exam_categories WHERE code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name, sort_order)
    SELECT id, NULL, 'MICROBIO_VIRO', 'La microbiologie et la virologie', 4
    FROM lab_exam_categories WHERE code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name, sort_order)
    SELECT id, NULL, 'IMMUNO_ALLERGO', 'L''immunologie et l''allergologie', 5
    FROM lab_exam_categories WHERE code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name, sort_order)
    SELECT id, NULL, 'GENETIQUE_MOLEC', 'La génétique et la biologie moléculaire', 6
    FROM lab_exam_categories WHERE code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name, sort_order)
    SELECT id, NULL, 'PARASITO_MYCO', 'La parasitologie et la mycologie', 7
    FROM lab_exam_categories WHERE code = 'laboratoire'
  `.execute(db)

  // ─── Exams under laboratoire types ───────────────────────────
  // L'hématologie et la coagulation
  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'NFS', 'Numération formule sanguine (NFS)'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'HEMATO_COAG'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'TP_TCA', 'Taux de prothrombine (TP) / TCA'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'HEMATO_COAG'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'FIBRINOGENE', 'Fibrinogène'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'HEMATO_COAG'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'VITESSE_SED', 'Vitesse de sédimentation (VS)'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'HEMATO_COAG'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  // La biochimie
  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'IONO_SANGUIN', 'Ionogramme sanguin'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'BIOCHIMIE'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'BILAN_HEPATIC', 'Bilan hépatique'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'BIOCHIMIE'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'BILAN_RENAL', 'Bilan rénal'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'BIOCHIMIE'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'GLYCEMIE', 'Glycémie à jeun'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'BIOCHIMIE'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'HBA1C', 'Hémoglobine glyquée (HbA1c)'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'BIOCHIMIE'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'BILAN_LIPIDIQUE', 'Bilan lipidique'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'BIOCHIMIE'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  // L'hormonologie et l'endocrinologie
  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'TSH', 'TSH (Thyréostimuline)'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'HORMONO_ENDOCRI'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'T3_T4', 'T3 - T4 libres'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'HORMONO_ENDOCRI'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'CORTISOL', 'Cortisol sanguin'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'HORMONO_ENDOCRI'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'INSULINEMIE', 'Insulinémie'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'HORMONO_ENDOCRI'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  // La microbiologie et la virologie
  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'ECBU', 'Examen CytoBactériologique des Urines (ECBU)'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'MICROBIO_VIRO'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'HEMOCULTURE', 'Hémoculture'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'MICROBIO_VIRO'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'EXAMEN_SELLES', 'Examen parasitologique des selles (EPS)'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'MICROBIO_VIRO'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'PCR_VIRO', 'PCR virale (SARS-CoV-2, VIH, Hépatites)'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'MICROBIO_VIRO'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'ANTIBIOGRAMME', 'Antibiogramme'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'MICROBIO_VIRO'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  // L'immunologie et l'allergologie
  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'SEROLOGIE_VIH', 'Sérologie VIH'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'IMMUNO_ALLERGO'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'SEROLOGIE_HEPATITE', 'Sérologie hépatite B / C'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'IMMUNO_ALLERGO'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'IGE', 'IgE totales et spécifiques'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'IMMUNO_ALLERGO'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  // La génétique et la biologie moléculaire
  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'CARYOTYPE', 'Caryotype standard'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'GENETIQUE_MOLEC'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'PCR_GENETIQUE', 'Analyse génétique par PCR'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'GENETIQUE_MOLEC'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  // La parasitologie et la mycologie
  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'PALU_GOUTTE_EP', 'Goutte épaisse (Paludisme)'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'PARASITO_MYCO'
    WHERE cat.code = 'laboratoire'
  `.execute(db)

  await sql`
    INSERT INTO lab_exams (category_id, parent_id, code, name)
    SELECT cat.id, t.id, 'RECHERCHE_LEISHMANIE', 'Recherche de Leishmanie'
    FROM lab_exam_categories cat
    JOIN lab_exams t ON t.category_id = cat.id AND t.code = 'PARASITO_MYCO'
    WHERE cat.code = 'laboratoire'
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DELETE FROM lab_exams`.execute(db)
  await sql`DELETE FROM lab_exam_categories`.execute(db)
  await sql`DELETE FROM sqlite_sequence WHERE name IN ('lab_exams', 'lab_exam_categories')`.execute(db)
}
