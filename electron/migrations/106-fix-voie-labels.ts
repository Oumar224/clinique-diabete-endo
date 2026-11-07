import { type Kysely, sql } from 'kysely'

/**
 * Option B — Fix propre du bug "CHECK constraint failed: voie IN ('PO','SC','IV','IM','SL')".
 *
 * Cause : le seed 073-seed-dispositif-voie-data a inséré des labels longs
 * ('PO (Per Os)', 'IV (Intraveineuse)', …) dans voie_types, repris tels quels
 * par le frontend puis insérés dans prescriptions.voie / plan_soins_items.voie
 * dont le CHECK n'accepte que les codes courts.
 *
 * Cette migration aligne les données existantes sur les codes CHECK-compatibles :
 * - les 5 labels valides sont normalisés vers leur code court ;
 * - les 7 voies hors nomenclature sont désactivées (is_active = 0) au lieu
 *   d'être supprimées (traçabilité + pas de FK cassée).
 *
 * Le garde-fou applicatif est dans electron/constants/voies.ts
 * (normalizeVoieOrThrow utilisé par entity / service / handler / voie-type.service).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  // ── 1. Garantir les 5 codes courts AVANT toute suppression ─────────
  // Idempotent : INSERT OR IGNORE ne lève jamais UNIQUE.
  // Ceci rend la suppression des labels longs sûre même si un code court
  // avait été supprimé manuellement (le canonique existe toujours après).
  console.log('[Migration 106] Ensuring CHECK-compatible voie codes...')
  await sql`
    INSERT OR IGNORE INTO voie_types (label, is_active) VALUES
      ('PO', 1), ('SC', 1), ('IV', 1), ('IM', 1), ('SL', 1)
  `.execute(db)

  // ── 2. Supprimer les labels longs redondants (ex-seed 073) ─────────
  // Pourquoi DELETE et pas UPDATE ? Le seed 063 a déjà inséré les codes
  // courts ('IV','PO','SC','IM','SL') avec label UNIQUE. Un
  // `UPDATE ... SET label='PO' WHERE label='PO (Per Os)'` lève donc
  // `UNIQUE constraint failed: voie_types.label` AVANT que le DELETE de
  // dédup ne s'exécute — c'est ce qui cassait le boot DB de test
  // (prescription.service.spec.ts 38/38 en timeout). DELETE ne peut pas
  // violer l'UNIQUE et est idempotent (2e passage = 0 ligne affectée).
  // Les clauses LIKE 'XX (%' couvrent les variantes non listées.
  // Les codes courts eux-mêmes ne matchent PAS ces motifs ('PO' ≠ 'PO (%').
  console.log('[Migration 106] Removing redundant long voie labels...')
  await sql`
    DELETE FROM voie_types
    WHERE label IN ('PO (Per Os)', 'PO (PER OS)', 'Per Os') OR label LIKE 'PO (%'
  `.execute(db)
  await sql`
    DELETE FROM voie_types
    WHERE label IN ('SC (Sous-cutanée)', 'SC (Sous-cutanee)', 'Sous-cutanée', 'Sous-cutanee') OR label LIKE 'SC (%'
  `.execute(db)
  await sql`
    DELETE FROM voie_types
    WHERE label IN ('IV (Intraveineuse)', 'Intraveineuse') OR label LIKE 'IV (%'
  `.execute(db)
  await sql`
    DELETE FROM voie_types
    WHERE label IN ('IM (Intramusculaire)', 'Intramusculaire') OR label LIKE 'IM (%'
  `.execute(db)
  await sql`
    DELETE FROM voie_types
    WHERE label IN ('SL (Sublinguale)', 'Sublinguale') OR label LIKE 'SL (%'
  `.execute(db)

  // Filet de sécurité : dédupliquer d'éventuels doublons exacts pré-existants
  // (impossible via UNIQUE sauf corruption manuelle — no-op sinon).
  await sql`
    DELETE FROM voie_types WHERE id NOT IN (
      SELECT MIN(id) FROM voie_types GROUP BY label
    ) AND label IN ('PO', 'SC', 'IV', 'IM', 'SL')
  `.execute(db)

  // ── 3. Désactiver les 7 voies hors CHECK (incompatibles prescriptions) ──
  console.log('[Migration 106] Deactivating non-CHECK voie_types...')
  await sql`
    UPDATE voie_types SET is_active = 0, updated_at = datetime('now')
    WHERE label IN (
      'ID (Intradermique)', 'ID', 'Intradermique',
      'IR (Intrarectale)', 'IR', 'Intrarectale',
      'Inhalation',
      'Transdermique',
      'Intrathécale', 'Intrathecale',
      'Intra-articulaire', 'Intra-articulaire',
      'Topic (locale)', 'Topic', 'Topique'
    )
    OR label LIKE 'ID (%' OR label LIKE 'IR (%' OR label LIKE 'Topic (%'
  `.execute(db)

  // ── 4. Ré-ensemencer les 5 codes s'ils manquent (idempotent) ──────
  await sql`
    INSERT OR IGNORE INTO voie_types (label, is_active) VALUES
      ('PO', 1), ('SC', 1), ('IV', 1), ('IM', 1), ('SL', 1)
  `.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  // Best-effort : réactive les voies désactivées. Les labels normalisés
  // ne sont PAS restaurés vers leur forme longue (perte volontaire —
  // la forme courte est la forme canonique CHECK-compatible).
  await sql`
    UPDATE voie_types SET is_active = 1, updated_at = datetime('now')
    WHERE label IN (
      'ID (Intradermique)', 'ID',
      'IR (Intrarectale)', 'IR',
      'Inhalation', 'Transdermique', 'Intrathécale',
      'Intra-articulaire', 'Topic (locale)', 'Topic'
    )
  `.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}
