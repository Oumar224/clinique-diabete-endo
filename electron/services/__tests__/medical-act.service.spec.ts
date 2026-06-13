import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { MedicalActService } from '../medical-act.service'
import type { DB } from '../../entities/database'

describe('MedicalActService', () => {
  let tempDir: string
  let dbPath: string
  let rawDb: import('kysely').Kysely<DB>

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-medical-act-test-'))
    dbPath = path.join(tempDir, 'test.db')
    container.register('DB_PATH', { useValue: dbPath })
    const datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()
    rawDb = datasource.getInstance()
  })

  afterEach(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch { /* cleanup best-effort */ }
  })

  // ─── List ─────────────────────────────────────────────────────

  it('should list seeded medical acts with service name', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    expect(list.length).toBeGreaterThanOrEqual(3)
    expect(list[0].service_name).toBeTruthy()
    expect(list[0].code).toBeTruthy()
  })

  it('should list only active acts when requested', async () => {
    const service = container.resolve(MedicalActService)
    const acts = await service.list(true)
    expect(acts.every(a => a.is_active === true)).toBe(true)
  })

  // ─── GetById ──────────────────────────────────────────────────

  it('should get an act by id with service name', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const first = list[0]
    const found = await service.getById(first.id!)
    expect(found).toBeDefined()
    expect(found!.code).toBe(first.code)
    expect(found!.service_name).toBeTruthy()
  })

  it('should return null for non-existent act', async () => {
    const service = container.resolve(MedicalActService)
    const found = await service.getById(-1)
    expect(found).toBeNull()
  })

  // ─── GetByService ─────────────────────────────────────────────

  it('should get acts by service id', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    if (list.length > 0) {
      const serviceId = list[0].service_id
      const byService = await service.getByService(serviceId)
      expect(byService.length).toBeGreaterThanOrEqual(1)
      expect(byService.every(a => a.service_id === serviceId)).toBe(true)
    }
  })

  it('should return empty array for service with no acts', async () => {
    const service = container.resolve(MedicalActService)
    const { ServiceService } = await import('../service.service')
    const svcService = container.resolve(ServiceService)
    const newSvc = await svcService.create({ name: 'NoActsService' })

    const byService = await service.getByService(newSvc.id!)
    expect(byService).toEqual([])
  })

  // ─── Create ───────────────────────────────────────────────────

  it('should create a new medical act with initial price history', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const firstServiceId = list[0].service_id

    const created = await service.create({
      code: 'TEST-001',
      label: 'Test Medical Act',
      price: 25000,
      service_id: firstServiceId,
    })
    expect(created.id).toBeDefined()
    expect(created.code).toBe('TEST-001')
    expect(created.price).toBe(25000)
    expect(created.is_active).toBe(true)
    expect(created.service_name).toBeTruthy()

    // A price history entry should have been created automatically
    const history = await service.getPriceHistory(created.id!)
    expect(history.length).toBe(1)
    expect(history[0].old_price).toBeNull()
    expect(history[0].new_price).toBe(25000)
    expect(history[0].change_reason).toBe('Prix initial')
  })

  it('should uppercase the act code on creation', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const firstServiceId = list[0].service_id

    const created = await service.create({
      code: 'test-code-002',
      label: 'Lowercase code',
      price: 5000,
      service_id: firstServiceId,
    })
    expect(created.code).toBe('TEST-CODE-002')
  })

  it('should reject duplicate act code with friendly message', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const firstServiceId = list[0].service_id

    await service.create({ code: 'DUP-001', label: 'First', price: 1000, service_id: firstServiceId })
    await expect(
      service.create({ code: 'DUP-001', label: 'Second', price: 2000, service_id: firstServiceId })
    ).rejects.toThrow('Le code \"DUP-001\" est déjà utilisé')
  })

  it('should reject invalid act code format', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const firstServiceId = list[0].service_id

    await expect(
      service.create({ code: 'INVALID CODE!', label: 'Bad', price: 1000, service_id: firstServiceId })
    ).rejects.toThrow('Le code de l\'acte ne doit contenir que des lettres')
  })

  it('should reject negative price', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const firstServiceId = list[0].service_id

    await expect(
      service.create({ code: 'NEG-001', label: 'Negative', price: -100, service_id: firstServiceId })
    ).rejects.toThrow('Le prix ne peut pas être négatif')
  })

  it('should reject non-existent service', async () => {
    const service = container.resolve(MedicalActService)
    await expect(
      service.create({ code: 'BAD-SVC', label: 'Bad Service', price: 1000, service_id: 9999 })
    ).rejects.toThrow('Service associé introuvable')
  })

  it('should reject empty act code', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const firstServiceId = list[0].service_id

    await expect(
      service.create({ code: '', label: 'Empty Code', price: 1000, service_id: firstServiceId })
    ).rejects.toThrow('Le code de l\'acte est requis')
  })

  it('should reject empty act label', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const firstServiceId = list[0].service_id

    await expect(
      service.create({ code: 'NO-LABEL', label: '', price: 1000, service_id: firstServiceId })
    ).rejects.toThrow('Le libellé de l\'acte est requis')
  })

  // ─── Update ───────────────────────────────────────────────────

  it('should update act fields', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const first = list[0]

    const updated = await service.update({
      id: first.id!,
      label: 'Updated Label',
      price: first.price + 5000,
    })
    expect(updated.label).toBe('Updated Label')
    expect(updated.price).toBe(first.price + 5000)
  })

  it('should track price change history on update', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const first = list[0]
    const originalPrice = first.price

    await service.update({ id: first.id!, price: originalPrice + 10000 })
    const history = await service.getPriceHistory(first.id!)
    expect(history.length).toBeGreaterThanOrEqual(2)

    // Most recent entry first (descending order)
    const change = history[0]
    expect(change.old_price).toBe(originalPrice)
    expect(change.new_price).toBe(originalPrice + 10000)
    expect(change.change_reason).toBe('Mise à jour du tarif')
  })

  it('should not create price history entry if price is unchanged', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const first = list[0]

    const historyBefore = await service.getPriceHistory(first.id!)
    await service.update({ id: first.id!, label: 'Just label change' })
    const historyAfter = await service.getPriceHistory(first.id!)

    // No new history entry for label-only change
    expect(historyAfter.length).toBe(historyBefore.length)
  })

  // ─── Soft delete (toggle active) ──────────────────────────────

  it('should soft-delete a medical act by setting is_active to false', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const first = list[0]

    const deactivated = await service.update({ id: first.id!, is_active: false })
    expect(deactivated.is_active).toBe(false)

    // Verify it does NOT appear in active-only listing
    const activeList = await service.list(true)
    expect(activeList.find(a => a.id === first.id)).toBeUndefined()

    // Verify it still appears in full listing
    const fullList = await service.list(false)
    expect(fullList.find(a => a.id === first.id)).toBeDefined()
  })

  // ─── Price History ────────────────────────────────────────────

  it('should return ordered price history (newest first)', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const first = list[0]

    const history = await service.getPriceHistory(first.id!)
    expect(history.length).toBeGreaterThanOrEqual(1)

    // Verify descending order by changed_at
    for (let i = 1; i < history.length; i++) {
      expect(history[i - 1].changed_at.localeCompare(history[i].changed_at)).toBeGreaterThanOrEqual(0)
    }
  })

  it('should return empty history array for an act with no price changes', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const first = list[0]

    // Remove all price history entries for this act directly via raw db
    await rawDb.deleteFrom('act_price_history')
      .where('act_id', '=', first.id!)
      .execute()

    const history = await service.getPriceHistory(first.id!)
    expect(history).toEqual([])
  })

  it('should throw when fetching price history for non-existent act', async () => {
    const service = container.resolve(MedicalActService)
    await expect(
      service.getPriceHistory(9999)
    ).rejects.toThrow('Acte médical introuvable')
  })

  // ─── Delete ───────────────────────────────────────────────────

  it("should delete a medical act and cascade price history", async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const firstServiceId = list[0].service_id

    const created = await service.create({
      code: "DEL-TEST-001",
      label: "To Delete",
      price: 5000,
      service_id: firstServiceId,
    })

    const actId = created.id!

    // Should have a price history entry
    const historyBefore = await service.getPriceHistory(actId)
    expect(historyBefore.length).toBe(1)

    // Delete the act
    await service.delete(actId)

    // Act should be gone
    const found = await service.getById(actId)
    expect(found).toBeNull()

    // Price history should also be gone (cascade via transaction)
    // Use raw DB to verify since getPriceHistory checks act existence first
    const historyRows = await rawDb
      .selectFrom("act_price_history")
      .selectAll()
      .where("act_id", "=", actId)
      .execute()
    expect(historyRows.length).toBe(0)
  })

  it("should throw when deleting non-existent act", async () => {
    const service = container.resolve(MedicalActService)
    await expect(service.delete(9999)).rejects.toThrow("Acte médical introuvable")
  })
})
