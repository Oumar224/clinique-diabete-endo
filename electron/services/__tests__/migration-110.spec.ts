import 'reflect-metadata'
import { describe, it, expect, afterEach } from 'vitest'
import { Kysely, sql } from 'kysely'
import * as AnnualIndicators from '../../migrations/110-annual-indicators'
import { createTestDb } from './test-helper'

/**
 * Migration 110 — couche de données « Indicateurs annuels ».
 *
 * `createTestDb()` exécute toutes les migrations enregistrées (110 incluse).
 * Ces tests verrouillent le schéma produit et l'idempotence du rejeu.
 */

async function columnsOf(db: Kysely<any>, table: string): Promise<string[]> {
  const rows = await sql<{ name: string }>`
    SELECT name FROM pragma_table_info(${table})
  `.execute(db)
  return rows.rows.map((row) => row.name)
}

async function tableExists(db: Kysely<any>, table: string): Promise<boolean> {
  const rows = await sql<{ name: string }>`
    SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${table}
  `.execute(db)
  return rows.rows.length > 0
}

describe('migration 110 — indicateurs annuels', { timeout: 60_000 }, () => {
  let db: Kysely<any> | undefined

  afterEach(async () => {
    await db?.destroy().catch(() => {})
    db = undefined
  })

  it('ajoute les colonnes encounters/stays/invoice_item', async () => {
    db = await createTestDb()

    expect(await columnsOf(db, 'encounters')).toEqual(
      expect.arrayContaining(['case_type', 'is_new_case']),
    )
    expect(await columnsOf(db, 'stays')).toEqual(expect.arrayContaining(['type']))
    expect(await columnsOf(db, 'invoice_item')).toEqual(expect.arrayContaining(['acte_id']))

    const indexes = await sql<{ name: string }>`
      SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_invoice_item_acte_id'
    `.execute(db)
    expect(indexes.rows).toHaveLength(1)

    expect(await tableExists(db, 'annual_indicator')).toBe(true)
    expect(await columnsOf(db, 'annual_indicator')).toEqual(
      expect.arrayContaining([
        'id',
        'annee',
        'ca_diabete_endocrino',
        'nouveaux_cas_diabete',
        'nouveaux_cas_thyroide_endocrino',
        'nouveaux_venus_diabete',
        'bilan_labo',
        'hospitalisation_jour',
        'hospitalisation_complete',
        'autres_nouveaux_cas',
        'ecg',
        'hopital_de_jour',
        'total_activites',
        'moyenne_activites',
        'updated_by',
        'updated_at',
      ]),
    )
  })

  it('seed ECG sous imagerie, une seule fois même après rejeu', async () => {
    db = await createTestDb()

    const first = await sql<{ id: number; category_code: string; name: string }>`
      SELECT e.id, c.code AS category_code, e.name
      FROM lab_exams e
      JOIN lab_exam_categories c ON c.id = e.category_id
      WHERE e.code = 'ECG'
    `.execute(db)

    expect(first.rows).toHaveLength(1)
    expect(first.rows[0].category_code).toBe('imagerie')
    expect(first.rows[0].name).toBe('ECG de repos')

    // Rejeu complet : aucune colonne dupliquée, aucun ECG dupliqué.
    await expect(AnnualIndicators.up(db)).resolves.toBeUndefined()

    const second = await sql<{ n: number }>`
      SELECT COUNT(*) AS n FROM lab_exams WHERE code = 'ECG'
    `.execute(db)
    expect(Number(second.rows[0].n)).toBe(1)
  })

  it('applique les contraintes de domaine case_type / type / annee unique', async () => {
    db = await createTestDb()

    await expect(
      sql`INSERT INTO encounters (patient_id, contact_type, start_date, end_date, service_id, case_type)
          VALUES (1, 'consultation', '2026-01-01', '2026-01-02', 1, 'invalide')`.execute(db),
    ).rejects.toThrow()

    await expect(
      sql`INSERT INTO annual_indicator (id, annee) VALUES ('a', 2026)`.execute(db),
    ).resolves.toBeDefined()

    await expect(
      sql`INSERT INTO annual_indicator (id, annee) VALUES ('b', 2026)`.execute(db),
    ).rejects.toThrow()

    // Les colonnes numériques sont nullables : une année partielle est valide.
    const row = await sql<{ ca: number | null; total: number | null }>`
      SELECT ca_diabete_endocrino AS ca, total_activites AS total
      FROM annual_indicator WHERE annee = 2026
    `.execute(db)
    expect(row.rows[0]).toEqual({ ca: null, total: null })
  })

  it('déclare invoice_item.acte_id en ON DELETE SET NULL', async () => {
    db = await createTestDb()

    const fks = await sql<{ table: string; from: string; on_delete: string }>`
      PRAGMA foreign_key_list(invoice_item)
    `.execute(db)
    const acteFk = fks.rows.find((fk) => fk.from === 'acte_id')

    expect(acteFk).toBeDefined()
    expect(acteFk!.table).toBe('medical_acts')
    expect(acteFk!.on_delete).toBe('SET NULL')
  })

  it('rollback : down() conserve un ECG préexistant à la migration', async () => {
    db = await createTestDb()

    // On simule un ECG déjà présent AVANT la migration : le seed de `up()` ne
    // l'insère pas, et `down()` ne doit jamais le supprimer.
    await sql`DELETE FROM lab_exams WHERE code = 'ECG'`.execute(db)
    await sql`
      INSERT INTO lab_exams (category_id, parent_id, code, name, sort_order)
      SELECT id, NULL, 'ECG', 'ECG préexistant', 1
      FROM lab_exam_categories WHERE code = 'imagerie'
    `.execute(db)

    await expect(AnnualIndicators.up(db)).resolves.toBeUndefined()
    await expect(AnnualIndicators.down(db)).resolves.toBeUndefined()

    const rows = await sql<{ name: string }>`
      SELECT name FROM lab_exams WHERE code = 'ECG'
    `.execute(db)
    expect(rows.rows).toHaveLength(1)
    expect(rows.rows[0].name).toBe('ECG préexistant')
  })
})
