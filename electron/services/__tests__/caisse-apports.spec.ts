import 'reflect-metadata'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import { CaisseService } from '../caisse.service'
import { createMockDataSource, createTestDb } from './test-helper'

describe('CaisseService — apports', () => {
  let db: Kysely<any>
  let service: CaisseService

  beforeEach(async () => {
    db = await createTestDb()
    service = new CaisseService(createMockDataSource(db) as any)

    const apport = await sql<{ id: number }>`
      INSERT INTO apports (reference, type, libelle, montant, date_apport, mode_paiement, statut)
      VALUES ('AP-20260201-0001', 'dette', 'Avance', 100000, '2026-02-01', 'virement', 'ouvert')
      RETURNING id
    `.execute(db)
    await sql`
      INSERT INTO apport_remboursements (apport_id, montant, date_remboursement, mode_paiement, reference)
      VALUES (${Number(apport.rows[0].id)}, 30000, '2026-02-10', 'espèces', 'RB-001')
    `.execute(db)
    await sql`
      INSERT INTO apports (reference, type, libelle, montant, date_apport, mode_paiement, statut)
      VALUES ('AP-20260202-0001', 'fonds_propres', 'Annulé', 90000, '2026-02-02', 'espèces', 'annule')
    `.execute(db)
  })

  afterEach(async () => {
    await db.destroy()
  })

  it('intègre les apports en entrée et les remboursements en sortie', async () => {
    const synthese = await service.getSynthese({
      dateDebut: '2026-02-01',
      dateFin: '2026-02-28',
    })
    expect(synthese.entrees).toBe(100_000)
    expect(synthese.sorties).toBe(30_000)
    expect(synthese.solde).toBe(70_000)
    const bySource = Object.fromEntries(synthese.parSource.map((row) => [row.source, row]))
    expect(bySource.apport).toMatchObject({ entrees: 100_000, sorties: 0, count: 1 })
    expect(bySource.apport_remboursement).toMatchObject({ entrees: 0, sorties: 30_000, count: 1 })
  })

  it('exclut les apports annulés', async () => {
    const synthese = await service.getSynthese({
      dateDebut: '2026-02-02',
      dateFin: '2026-02-02',
    })
    expect(synthese.count).toBe(0)
    expect(synthese.entrees).toBe(0)
  })
})
