import 'reflect-metadata'
import { describe, it, expect, afterEach } from 'vitest'
import { Kysely, sql } from 'kysely'
import * as IndicateursCasEtSoins from '../../migrations/111-indicateurs-cas-et-soins'
import { createTestDb } from './test-helper'

/**
 * Migration 111 — comptages « suivi » et « soins ambulatoires ».
 *
 * `createTestDb()` exécute toutes les migrations enregistrées (111 incluse).
 * Ces tests verrouillent le schéma produit, les index de requête mensuelle et
 * l'idempotence d'un rejeu.
 */

async function columnsOf(db: Kysely<any>, table: string): Promise<string[]> {
  const rows = await sql<{ name: string }>`
    SELECT name FROM pragma_table_info(${table})
  `.execute(db)
  return rows.rows.map((row) => row.name)
}

async function indexNames(db: Kysely<any>): Promise<string[]> {
  const rows = await sql<{ name: string }>`
    SELECT name FROM sqlite_master WHERE type = 'index'
  `.execute(db)
  return rows.rows.map((row) => row.name)
}

describe('migration 111 — indicateurs cas et soins', { timeout: 60_000 }, () => {
  let db: Kysely<any> | undefined

  afterEach(async () => {
    await db?.destroy().catch(() => {})
    db = undefined
  })

  it('ajoute les colonnes de surcharge suivi/soins sans supprimer le CA', async () => {
    db = await createTestDb()

    const columns = await columnsOf(db, 'annual_indicator')
    expect(columns).toEqual(
      expect.arrayContaining(['suivi_diabete_endocrino', 'soins_ambulatoires']),
    )
    // La colonne historique reste en place : aucune donnée n'est détruite.
    expect(columns).toContain('ca_diabete_endocrino')
  })

  it('crée les index de filtrage des agrégats mensuels', async () => {
    db = await createTestDb()

    const names = await indexNames(db)
    expect(names).toContain('idx_encounters_contact_type_start_date')
    expect(names).toContain('idx_encounters_service_start_date')
  })

  it('reste idempotente après un rejeu complet', async () => {
    db = await createTestDb()

    const before = await columnsOf(db, 'annual_indicator')
    await expect(IndicateursCasEtSoins.up(db)).resolves.toBeUndefined()
    const after = await columnsOf(db, 'annual_indicator')

    expect(after).toEqual(before)
    expect(after.filter((column) => column === 'soins_ambulatoires')).toHaveLength(1)
    expect(after.filter((column) => column === 'suivi_diabete_endocrino')).toHaveLength(1)
  })

  it('accepte une année partielle avec les deux nouvelles colonnes NULL', async () => {
    db = await createTestDb()

    await sql`INSERT INTO annual_indicator (id, annee) VALUES ('m111', 2026)`.execute(db)
    const row = await sql<{
      suivi: number | null
      soins: number | null
      ca: number | null
    }>`
      SELECT suivi_diabete_endocrino AS suivi,
             soins_ambulatoires AS soins,
             ca_diabete_endocrino AS ca
      FROM annual_indicator WHERE annee = 2026
    `.execute(db)

    expect(row.rows[0]).toEqual({ suivi: null, soins: null, ca: null })
  })

  it('down() supprime les index sans toucher aux colonnes', async () => {
    db = await createTestDb()

    await expect(IndicateursCasEtSoins.down(db)).resolves.toBeUndefined()

    const names = await indexNames(db)
    expect(names).not.toContain('idx_encounters_contact_type_start_date')
    expect(names).not.toContain('idx_encounters_service_start_date')

    const columns = await columnsOf(db, 'annual_indicator')
    expect(columns).toEqual(
      expect.arrayContaining(['suivi_diabete_endocrino', 'soins_ambulatoires']),
    )
  })
})
