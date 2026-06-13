import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { ServiceService } from '../service.service'
import { MedicalActService } from '../medical-act.service'

describe('ServiceService', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-service-test-'))
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

  // ─── List ─────────────────────────────────────────────────────

  it('should list seeded default services sorted by sort_order', async () => {
    const service = container.resolve(ServiceService)
    const list = await service.list()
    // 5 services are seeded in migration 005
    expect(list.length).toBeGreaterThanOrEqual(5)
    // Verify sorted by sort_order asc, then name asc
    for (let i = 1; i < list.length; i++) {
      if (list[i].sort_order === list[i - 1].sort_order) {
        expect(list[i].name.localeCompare(list[i - 1].name)).toBeGreaterThanOrEqual(0)
      } else {
        expect(list[i].sort_order).toBeGreaterThanOrEqual(list[i - 1].sort_order)
      }
    }
  })

  it('should list only active services when requested', async () => {
    const service = container.resolve(ServiceService)
    const active = await service.list(true)
    expect(active.every(s => s.is_active === true)).toBe(true)
  })

  // ─── GetById ──────────────────────────────────────────────────

  it('should get a service by id', async () => {
    const service = container.resolve(ServiceService)
    const list = await service.list()
    const first = list[0]
    const found = await service.getById(first.id!)
    expect(found).toBeDefined()
    expect(found!.name).toBe(first.name)
  })

  it('should return null for non-existent service id', async () => {
    const service = container.resolve(ServiceService)
    const found = await service.getById(-1)
    expect(found).toBeNull()
  })

  // ─── Create ───────────────────────────────────────────────────

  it('should create a service with all provided fields', async () => {
    const service = container.resolve(ServiceService)
    const created = await service.create({
      name: 'Test Service',
      description: 'A test service description',
      duration: 45,
      color: '#FF0000',
    })
    expect(created.id).toBeDefined()
    expect(created.name).toBe('Test Service')
    expect(created.description).toBe('A test service description')
    expect(created.duration).toBe(45)
    expect(created.color).toBe('#FF0000')
    expect(created.is_active).toBe(true)
    expect(created.sort_order).toBeGreaterThanOrEqual(0)
  })

  it('should default duration to 30 when not provided', async () => {
    const service = container.resolve(ServiceService)
    const created = await service.create({ name: 'DefaultDuration' })
    expect(created.duration).toBe(30)
  })

  it("should default color to #0E5C5B when not provided", async () => {
    const service = container.resolve(ServiceService)
    const created = await service.create({ name: "DefaultColor" })
    expect(created.color).toBe("#0E5C5B")
  })

  it('should reject duplicate service name', async () => {
    const service = container.resolve(ServiceService)
    await service.create({ name: 'UniqueName' })
    await expect(
      service.create({ name: 'UniqueName' })
    ).rejects.toThrow()
  })

  it('should reject empty service name', async () => {
    const service = container.resolve(ServiceService)
    await expect(
      service.create({ name: '' })
    ).rejects.toThrow('Le nom du service est requis')
  })

  it('should reject name exceeding 100 characters', async () => {
    const service = container.resolve(ServiceService)
    await expect(
      service.create({ name: 'A'.repeat(101) })
    ).rejects.toThrow('Le nom du service ne peut pas dépasser 100 caractères')
  })

  // ─── Update ───────────────────────────────────────────────────

  it('should update partial fields on a service', async () => {
    const service = container.resolve(ServiceService)
    const created = await service.create({ name: 'Original', duration: 30 })
    const updated = await service.update({
      id: created.id!,
      name: 'Updated',
      duration: 60,
      description: 'Updated description',
    })
    expect(updated.name).toBe('Updated')
    expect(updated.duration).toBe(60)
    expect(updated.description).toBe('Updated description')
  })

  it('should throw when updating non-existent service', async () => {
    const service = container.resolve(ServiceService)
    await expect(
      service.update({ id: 9999, name: 'Ghost' })
    ).rejects.toThrow('Service introuvable')
  })

  it("should not overwrite existing fields when partial update omits them", async () => {
    const service = container.resolve(ServiceService)
    const created = await service.create({
      name: "OriginalName",
      description: "Original description",
      duration: 45,
      color: "#FF0000",
    })
    // Update only duration — name, description, color should remain unchanged
    const updated = await service.update({
      id: created.id!,
      duration: 60,
    })
    expect(updated.name).toBe("OriginalName")
    expect(updated.description).toBe("Original description")
    expect(updated.color).toBe("#FF0000")
    expect(updated.duration).toBe(60)
  })

  // ─── Toggle ───────────────────────────────────────────────────

  it('should toggle a service active/inactive', async () => {
    const service = container.resolve(ServiceService)
    const created = await service.create({ name: 'ToggleMe' })
    expect(created.is_active).toBe(true)

    const disabled = await service.toggle(created.id!, false)
    expect(disabled.is_active).toBe(false)

    const enabled = await service.toggle(created.id!, true)
    expect(enabled.is_active).toBe(true)
  })

  it('should throw when toggling non-existent service', async () => {
    const service = container.resolve(ServiceService)
    await expect(service.toggle(9999, false)).rejects.toThrow('Service introuvable')
  })

  // ─── Delete ───────────────────────────────────────────────────

  it('should delete a service with no medical act references', async () => {
    const service = container.resolve(ServiceService)
    const created = await service.create({ name: 'DeleteMe' })
    await expect(service.delete(created.id!)).resolves.not.toThrow()
    const found = await service.getById(created.id!)
    expect(found).toBeNull()
  })

  it('should block deletion of a service referenced by medical acts and include count in error', async () => {
    const service = container.resolve(ServiceService)
    const list = await service.list()
    const firstService = list[0]

    const actService = container.resolve(MedicalActService)
    await actService.create({
      code: 'TEST-BLOCK-SVC-001',
      label: 'Test Blocking Act',
      price: 10000,
      service_id: firstService.id!,
    })

    await expect(service.delete(firstService.id!)).rejects.toThrow(
      'Impossible de supprimer ce service'
    )
    await expect(service.delete(firstService.id!)).rejects.toThrow(
      /1 acte\(s\) médical\(eaux\)/
    )
  })

  it('should throw when deleting non-existent service', async () => {
    const service = container.resolve(ServiceService)
    await expect(service.delete(9999)).rejects.toThrow('Service introuvable')
  })

  // ─── Reorder ──────────────────────────────────────────────────

  it('should reorder services and return them in the new order', async () => {
    const service = container.resolve(ServiceService)
    const list = await service.list()
    const ids = list.map(s => s.id!).reverse()
    const reordered = await service.reorder(ids)
    expect(reordered.map(s => s.id)).toEqual(ids)
  })

  it('should throw for empty reorder list', async () => {
    const service = container.resolve(ServiceService)
    await expect(service.reorder([])).rejects.toThrow('La liste des IDs est vide')
  })

  it('should throw for reorder with non-existent ids', async () => {
    const service = container.resolve(ServiceService)
    await expect(service.reorder([9999, 9998])).rejects.toThrow('Services introuvables')
  })
})
