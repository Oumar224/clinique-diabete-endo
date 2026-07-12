import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  // Dispositif types — expanded defaults
  await sql`
    INSERT OR IGNORE INTO dispositif_types (label) VALUES
      ('KT central'),
      ('PICC line'),
      ('Chambre implantable'),
      ('Voie veineuse périphérique (VVP)'),
      ('Voie veineuse centrale (VVC)'),
      ('Artérielle'),
      ('Sonde urinaire'),
      ('Sonde nasogastrique (SNG)'),
      ('Drain thoracique'),
      ('Drain de Redon'),
      ('Cathéter de dialyse péritonéale'),
      ('Cathéter veineux ombilical'),
      ('Canule de Guedel')
  `.execute(db)

  // Voie types — expanded defaults
  await sql`
    INSERT OR IGNORE INTO voie_types (label) VALUES
      ('IV (Intraveineuse)'),
      ('PO (Per Os)'),
      ('SC (Sous-cutanée)'),
      ('IM (Intramusculaire)'),
      ('SL (Sublinguale)'),
      ('ID (Intradermique)'),
      ('IR (Intrarectale)'),
      ('Inhalation'),
      ('Transdermique'),
      ('Intrathécale'),
      ('Intra-articulaire'),
      ('Topic (locale)')
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`
    DELETE FROM dispositif_types WHERE label IN (
      'KT central', 'PICC line', 'Chambre implantable',
      'Voie veineuse périphérique (VVP)', 'Voie veineuse centrale (VVC)',
      'Artérielle', 'Sonde urinaire', 'Sonde nasogastrique (SNG)',
      'Drain thoracique', 'Drain de Redon',
      'Cathéter de dialyse péritonéale', 'Cathéter veineux ombilical',
      'Canule de Guedel'
    )
  `.execute(db)
  await sql`
    DELETE FROM voie_types WHERE label IN (
      'IV (Intraveineuse)', 'PO (Per Os)', 'SC (Sous-cutanée)',
      'IM (Intramusculaire)', 'SL (Sublinguale)', 'ID (Intradermique)',
      'IR (Intrarectale)', 'Inhalation', 'Transdermique',
      'Intrathécale', 'Intra-articulaire', 'Topic (locale)'
    )
  `.execute(db)
}
