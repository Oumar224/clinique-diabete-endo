import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { ConfigTarifService } from '../config-tarif.service'

describe('ConfigTarifService', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-tarif-test-'))
    dbPath = path.join(tempDir, 'test.db')
    container.register('DB_PATH', { useValue: dbPath })
    const datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()
  })

  afterEach(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch { /* cleanup best-effort */ }
  })

  // ─── Helpers ───────────────────────────────────────────────────
  async function createTarif(service: ConfigTarifService, acteId: number, prix: number, codeTarif = 'TARIF.STANDARD') {
    return await service.create({ acte_id: acteId, prix_unitaire: prix, code_tarif: codeTarif })
  }

  // ─── list ──────────────────────────────────────────────────────
  it('should list tariffs with act and service info', async () => {
    const service = container.resolve(ConfigTarifService)
    const list = await service.list()
    expect(list.length).toBeGreaterThanOrEqual(1)
    expect((list[0] as any).acte_code).toBeTruthy()
    expect((list[0] as any).acte_label).toBeTruthy()
    expect((list[0] as any).service_name).toBeTruthy()
    expect(list[0].prix_unitaire).toBeGreaterThanOrEqual(0)
  })

  it('should filter tariffs by acte_id', async () => {
    const service = container.resolve(ConfigTarifService)
    const all = await service.list()
    const firstActeId = (all[0] as any).acte_id
    const filtered = await service.list(firstActeId)
    expect(filtered.length).toBeGreaterThanOrEqual(1)
    expect(filtered.every(t => (t as any).acte_id === firstActeId)).toBe(true)
  })

  it('should filter tariffs by code_tarif', async () => {
    const service = container.resolve(ConfigTarifService)
    const filtered = await service.list(undefined, 'TARIF.STANDARD')
    expect(filtered.length).toBeGreaterThanOrEqual(1)
    expect(filtered.every(t => t.code_tarif === 'TARIF.STANDARD')).toBe(true)
  })

  // ─── getActiveTarif ────────────────────────────────────────────
  it('should return the latest tariff for an act', async () => {
    const service = container.resolve(ConfigTarifService)
    const all = await service.list()
    const acteId = (all[0] as any).acte_id

    await createTarif(service, acteId, 1000)
    await createTarif(service, acteId, 2000)

    const active = await service.getActiveTarif(acteId)
    expect(active).toBeDefined()
    expect(active!.prix_unitaire).toBe(2000)
  })

  it('should return null when no tariff exists for an act', async () => {
    const service = container.resolve(ConfigTarifService)
    const active = await service.getActiveTarif(99999)
    expect(active).toBeNull()
  })

  it('should find active tariff by specific code_tarif', async () => {
    const service = container.resolve(ConfigTarifService)
    const all = await service.list()
    const acteId = (all[0] as any).acte_id

    await createTarif(service, acteId, 5000, 'TARIF.VIP')

    const vip = await service.getActiveTarif(acteId, 'TARIF.VIP')
    expect(vip).toBeDefined()
    expect(vip!.prix_unitaire).toBe(5000)
    expect(vip!.code_tarif).toBe('TARIF.VIP')
  })

  // ─── create ────────────────────────────────────────────────────
  it('should create a new tariff entry', async () => {
    const service = container.resolve(ConfigTarifService)
    const all = await service.list()
    const acteId = (all[0] as any).acte_id

    const created = await createTarif(service, acteId, 9999)
    expect(created.id).toBeDefined()
    expect(created.prix_unitaire).toBe(9999)
    expect(created.code_tarif).toBe('TARIF.STANDARD')
    expect((created as any).acte_code).toBeTruthy()
  })

  it('should create with custom code_tarif and date_application', async () => {
    const service = container.resolve(ConfigTarifService)
    const all = await service.list()
    const acteId = (all[0] as any).acte_id

    const created = await service.create({
      acte_id: acteId,
      prix_unitaire: 7777,
      code_tarif: 'TARIF.ASSURANCE',
      date_application: '2025-01-01',
    })
    expect(created.prix_unitaire).toBe(7777)
    expect(created.code_tarif).toBe('TARIF.ASSURANCE')
    expect(created.date_application).toBe('2025-01-01')
  })

  // ─── update ────────────────────────────────────────────────────
  it('should update an existing tariff', async () => {
    const service = container.resolve(ConfigTarifService)
    const all = await service.list()
    const acteId = (all[0] as any).acte_id
    const created = await createTarif(service, acteId, 5000)

    const updated = await service.update(created.id!, { prix_unitaire: 6000 })
    expect(updated.prix_unitaire).toBe(6000)
  })

  it('should throw when updating non-existent tariff', async () => {
    const service = container.resolve(ConfigTarifService)
    await expect(service.update(99999, { prix_unitaire: 100 })).rejects.toThrow('Tarif introuvable')
  })

  // ─── bulkUpdate ────────────────────────────────────────────────
  it('should bulk create tariff rows for multiple acts', async () => {
    const service = container.resolve(ConfigTarifService)
    const all = await service.list()
    const acts = all.map(t => (t as any).acte_id).filter((v, i, a) => a.indexOf(v) === i)
    const actIds = acts.slice(0, Math.min(2, acts.length))

    const results = await service.bulkUpdate({
      items: actIds.map(acte_id => ({
        acte_id,
        code_tarif: 'TARIF.STANDARD',
        prix_unitaire: 12345,
      })),
    })
    expect(results.length).toBe(actIds.length)
    for (const r of results) {
      expect(r.prix_unitaire).toBe(12345)
    }
  })

  it('should throw bulkUpdate with empty items', async () => {
    const service = container.resolve(ConfigTarifService)
    await expect(service.bulkUpdate({ items: [] })).rejects.toThrow('Aucun élément à mettre à jour')
  })

  // ─── getPriceHistory ───────────────────────────────────────────
  it('should return price history ordered by date desc', async () => {
    const service = container.resolve(ConfigTarifService)
    const all = await service.list()
    const acteId = (all[0] as any).acte_id

    await createTarif(service, acteId, 100)
    await createTarif(service, acteId, 200)

    const history = await service.getPriceHistory(acteId)
    expect(history.length).toBeGreaterThanOrEqual(2)
    // Most recent first
    expect(history[0].prix_unitaire).toBe(200)
  })

  it('should throw getPriceHistory for non-existent act', async () => {
    const service = container.resolve(ConfigTarifService)
    await expect(service.getPriceHistory(99999)).rejects.toThrow('Acte médical introuvable')
  })

  // ─── delete ────────────────────────────────────────────────────
  it('should delete a tariff', async () => {
    const service = container.resolve(ConfigTarifService)
    const all = await service.list()
    const acteId = (all[0] as any).acte_id
    const created = await createTarif(service, acteId, 3000)

    await service.delete(created.id!)
    const restored = await service.getActiveTarif(acteId)
    // Should return the seeded tariff, not the deleted one
    expect(restored).toBeDefined()
    expect(restored!.id).not.toBe(created.id)
  })

  it('should throw when deleting non-existent tariff', async () => {
    const service = container.resolve(ConfigTarifService)
    await expect(service.delete(99999)).rejects.toThrow('Tarif introuvable')
  })

  // ─── Validation ────────────────────────────────────────────────
  it('should reject negative prix_unitaire', async () => {
    const service = container.resolve(ConfigTarifService)
    const all = await service.list()
    const acteId = (all[0] as any).acte_id

    await expect(
      service.create({ acte_id: acteId, prix_unitaire: -100 })
    ).rejects.toThrow('Le prix unitaire ne peut pas être négatif')
  })

  it('should reject NaN prix_unitaire', async () => {
    const service = container.resolve(ConfigTarifService)
    const all = await service.list()
    const acteId = (all[0] as any).acte_id

    await expect(
      service.create({ acte_id: acteId, prix_unitaire: NaN })
    ).rejects.toThrow('Le prix unitaire doit être un nombre valide')
  })

  it('should reject non-existent acte_id', async () => {
    const service = container.resolve(ConfigTarifService)
    await expect(
      service.create({ acte_id: 99999, prix_unitaire: 100 })
    ).rejects.toThrow('Acte médical introuvable')
  })
})
