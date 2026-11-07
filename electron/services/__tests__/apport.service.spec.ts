import 'reflect-metadata'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Kysely } from 'kysely'
import { ApportService } from '../apport.service'
import { createMockDataSource, createTestDb } from './test-helper'

describe('ApportService', () => {
  let db: Kysely<any>
  let service: ApportService

  beforeEach(async () => {
    db = await createTestDb()
    service = new ApportService(createMockDataSource(db) as any)
  })

  afterEach(async () => {
    await db.destroy()
  })

  it('crée un apport de fonds propres avec référence automatique', async () => {
    const apport = await service.create({
      type: 'fonds_propres',
      libelle: 'Apport initial',
      montant: 500_000,
      dateApport: '2026-10-24',
      modePaiement: 'virement',
      createdBy: 1,
    })

    expect(apport.reference).toMatch(/^AP-20261024-\d{4}$/)
    expect(apport.statut).toBe('ouvert')
    expect(apport.montant).toBe(500_000)
    expect(apport.montantRembourse).toBe(0)
    expect(apport.resteARembourser).toBe(500_000)
  })

  it('suit les remboursements partiels puis solde la dette', async () => {
    const apport = await service.create({
      type: 'dette',
      libelle: 'Avance fournisseur',
      montant: 100_000,
      dateApport: '2026-10-01',
      createdBy: 1,
    })

    let updated = await service.addRemboursement(apport.id, {
      montant: 40_000,
      dateRemboursement: '2026-10-10',
      createdBy: 1,
    })
    expect(updated.statut).toBe('ouvert')
    expect(updated.montantRembourse).toBe(40_000)
    expect(updated.resteARembourser).toBe(60_000)

    updated = await service.addRemboursement(apport.id, {
      montant: 60_000,
      dateRemboursement: '2026-10-20',
      createdBy: 1,
    })
    expect(updated.statut).toBe('rembourse')
    expect(updated.montantRembourse).toBe(100_000)
    expect(updated.remboursements).toHaveLength(2)

    await expect(service.addRemboursement(apport.id, { montant: 1 }))
      .rejects.toThrow(/déjà entièrement remboursé/)
  })

  it('refuse un remboursement supérieur au reste dû et réouvre après suppression', async () => {
    const apport = await service.create({
      type: 'dette', libelle: 'Dette', montant: 10_000, dateApport: '2026-10-01', createdBy: 1,
    })
    await expect(service.addRemboursement(apport.id, { montant: 11_000 }))
      .rejects.toThrow(/reste dû/)

    const paid = await service.addRemboursement(apport.id, { montant: 10_000 })
    expect(paid.statut).toBe('rembourse')
    const reopened = await service.deleteRemboursement(paid.remboursements![0].id)
    expect(reopened.statut).toBe('ouvert')
    expect(reopened.montantRembourse).toBe(0)
  })

  it('refuse de supprimer un apport non annulé ou déjà remboursé', async () => {
    const apport = await service.create({
      type: 'dette', libelle: 'À supprimer', montant: 5_000, dateApport: '2026-10-01', createdBy: 1,
    })
    await expect(service.delete(apport.id)).rejects.toThrow(/annulé/)

    const paid = await service.create({
      type: 'dette', libelle: 'Remboursé', montant: 5_000, dateApport: '2026-10-01', createdBy: 1,
    })
    await service.addRemboursement(paid.id, { montant: 1_000 })
    await expect(service.delete(paid.id)).rejects.toThrow(/remboursé/)

    await service.annuler(apport.id)
    await service.delete(apport.id)
    await expect(service.getById(apport.id)).rejects.toThrow(/introuvable/)
  })

  it('refuse de supprimer un apport annulé qui porte encore des remboursements', async () => {
    // État non atteignable via l'API (annuler refuse dès qu'un remboursement
    // existe), mais la garde « remboursements existants » de delete() doit
    // rester prioritaire sur la garde de statut.
    const apport = await service.create({
      type: 'dette', libelle: 'Annulé avec remboursement', montant: 5_000, dateApport: '2026-10-01', createdBy: 1,
    })
    await service.annuler(apport.id)
    await db.insertInto('apport_remboursements').values({
      apport_id: apport.id,
      montant: 1_000,
      date_remboursement: '2026-10-02',
      mode_paiement: 'espèces',
      created_at: '2026-10-02T00:00:00.000Z',
    }).execute()

    await expect(service.delete(apport.id)).rejects.toThrow(/remboursé/)
  })

  it('annule uniquement un apport non remboursé', async () => {
    const apport = await service.create({
      type: 'dette', libelle: 'À annuler', montant: 5_000, dateApport: '2026-10-01', createdBy: 1,
    })
    const cancelled = await service.annuler(apport.id)
    expect(cancelled.statut).toBe('annule')
    await expect(service.addRemboursement(apport.id, { montant: 1 }))
      .rejects.toThrow(/annulé/)
  })
})
