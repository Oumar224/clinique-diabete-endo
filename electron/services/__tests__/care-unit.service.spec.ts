import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { CareUnitService } from '../care-unit.service'

describe('CareUnitService', () => {
  let tempDir: string
  let dbPath: string
  let serviceId: number

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-cutest-'))
    dbPath = path.join(tempDir, 'test.db')
    container.register('DB_PATH', { useValue: dbPath })
    const datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()

    const db = container.resolve(AppDatabaseDatasource).getInstance()

    // Ensure the care_units table exists (migration 054 may not have run
    // if an earlier migration failed on a fresh database)
    await db.schema
      .createTable('care_units')
      .ifNotExists()
      .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
      .addColumn('service_id', 'integer', col => col.notNull())
      .addColumn('name', 'text', col => col.notNull())
      .addColumn('code', 'text')
      .addColumn('description', 'text')
      .addColumn('is_active', 'integer', col => col.defaultTo(1))
      .addColumn('sort_order', 'integer', col => col.defaultTo(0))
      .addColumn('created_at', 'text')
      .addColumn('updated_at', 'text')
      .execute()

    // Ensure at least one service exists for FK references
    const existingSvc = await db
      .selectFrom('services')
      .select('id')
      .limit(1)
      .executeTakeFirst()

    if (existingSvc) {
      serviceId = (existingSvc as any).id
    } else {
      // Create a dedicated test service
      const svcResult = await db
        .insertInto('services')
        .values({
          name: 'Test Service for Care Units',
          code: 'TEST-CU',
          duration: 30,
          sort_order: 1,
          is_active: 1,
        })
        .returning('id')
        .executeTakeFirst()
      serviceId = (svcResult as any).id
    }
  })

  afterEach(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch { /* cleanup best-effort */ }
  })

  // ─── List & filter ─────────────────────────────────────────────

  it('should list all care units with service_name', async () => {
    const service = container.resolve(CareUnitService)

    // Create a couple of units first
    await service.create({ service_id: serviceId, name: 'Alpha', code: 'A' })
    await service.create({ service_id: serviceId, name: 'Bravo', code: 'B' })

    const list = await service.list()
    expect(list.length).toBeGreaterThanOrEqual(2)
    // Each entry should have a service_name from the left join
    for (const unit of list) {
      expect(unit.service_name).toBeDefined()
      expect(typeof unit.service_name).toBe('string')
    }
  })

  it('should list only units matching the given service_id', async () => {
    const service = container.resolve(CareUnitService)

    // Create two units in the same service
    await service.create({ service_id: serviceId, name: 'Unit A', code: 'UA' })
    await service.create({ service_id: serviceId, name: 'Unit B', code: 'UB' })

    const filtered = await service.list(serviceId)
    expect(filtered.length).toBeGreaterThanOrEqual(2)
    expect(filtered.every(u => u.service_id === serviceId)).toBe(true)
  })

  it('should return only active units when activeOnly=true', async () => {
    const service = container.resolve(CareUnitService)

    // Create two units: one active, one inactive
    await service.create({ service_id: serviceId, name: 'Active Unit', code: 'AU' })
    const inactive = await service.create({ service_id: serviceId, name: 'Inactive Unit', code: 'IU' })
    await service.toggle(inactive.id!, false)

    const all = await service.list()
    expect(all.length).toBeGreaterThanOrEqual(2)

    const active = await service.list(undefined, true)
    expect(active.length).toBeGreaterThanOrEqual(1)
    expect(active.every(u => u.is_active === 1)).toBe(true)
  })

  // ─── GetById ──────────────────────────────────────────────────

  it('should get a care unit by id', async () => {
    const service = container.resolve(CareUnitService)
    const created = await service.create({ service_id: serviceId, name: 'Get By ID Test', code: 'GBID' })
    expect(created.id).toBeDefined()

    const found = await service.getById(created.id!)
    expect(found).toBeDefined()
    expect(found!.name).toBe('Get By ID Test')
    expect(found!.code).toBe('GBID')
  })

  it('should return null for non-existent id', async () => {
    const service = container.resolve(CareUnitService)
    const found = await service.getById(-1)
    expect(found).toBeNull()
  })

  // ─── Create ───────────────────────────────────────────────────

  it('should create a care unit with all fields', async () => {
    const service = container.resolve(CareUnitService)
    const created = await service.create({
      service_id: serviceId,
      name: 'Hospitalisation',
      code: 'HOSP',
      description: 'Soins hospitaliers',
    })
    expect(created.id).toBeDefined()
    expect(created.service_id).toBe(serviceId)
    expect(created.name).toBe('Hospitalisation')
    expect(created.code).toBe('HOSP')
    expect(created.description).toBe('Soins hospitaliers')
    expect(created.is_active).toBe(1)
    expect(created.sort_order).toBeGreaterThanOrEqual(1)
  })

  it('should uppercase the code on create', async () => {
    const service = container.resolve(CareUnitService)
    const created = await service.create({
      service_id: serviceId,
      name: 'Lowercase Code Unit',
      code: 'lower-code',
    })
    expect(created.code).toBe('LOWER-CODE')
  })

  it('should auto-compute sort_order on create', async () => {
    const service = container.resolve(CareUnitService)
    const first = await service.create({ service_id: serviceId, name: 'First Order' })
    const second = await service.create({ service_id: serviceId, name: 'Second Order' })
    expect(second.sort_order).toBeGreaterThan(first.sort_order!)
  })

  it('should reject empty name', async () => {
    const service = container.resolve(CareUnitService)
    await expect(
      service.create({ service_id: serviceId, name: '' })
    ).rejects.toThrow("Le nom de l'unité de soins est requis")
  })

  it('should reject name exceeding 100 characters', async () => {
    const service = container.resolve(CareUnitService)
    await expect(
      service.create({ service_id: serviceId, name: 'x'.repeat(101) })
    ).rejects.toThrow("Le nom de l'unité de soins ne peut pas dépasser 100 caractères")
  })

  it('should reject non-existent service_id', async () => {
    const service = container.resolve(CareUnitService)
    await expect(
      service.create({ service_id: 99999, name: 'Ghost Service Unit' })
    ).rejects.toThrow('Service introuvable')
  })

  it('should throw when creating without service_id', async () => {
    const service = container.resolve(CareUnitService)
    await expect(
      service.create({ name: 'No Service' } as any)
    ).rejects.toThrow()
  })

  // ─── Update ───────────────────────────────────────────────────

  it('should update a care unit name', async () => {
    const service = container.resolve(CareUnitService)
    const created = await service.create({ service_id: serviceId, name: 'Original Name' })

    const updated = await service.update({ id: created.id!, name: 'Updated Name' })
    expect(updated.name).toBe('Updated Name')
    // Unchanged fields
    expect(updated.service_id).toBe(serviceId)
  })

  it('should update partial fields', async () => {
    const service = container.resolve(CareUnitService)
    const created = await service.create({
      service_id: serviceId,
      name: 'Partial Update',
      code: 'PARTIAL',
      description: 'Original desc',
    })

    const updated = await service.update({
      id: created.id!,
      description: 'Updated desc',
    })
    expect(updated.description).toBe('Updated desc')
    // Unchanged
    expect(updated.code).toBe('PARTIAL')
    expect(updated.name).toBe('Partial Update')
  })

  it('should throw when updating non-existent unit', async () => {
    const service = container.resolve(CareUnitService)
    await expect(
      service.update({ id: 9999, name: 'Ghost' })
    ).rejects.toThrow('Unité de soins introuvable')
  })

  it('should throw when updating without id', async () => {
    const service = container.resolve(CareUnitService)
    await expect(
      service.update({ name: 'No ID' } as any)
    ).rejects.toThrow("L'identifiant de l'unité de soins est requis")
  })

  // ─── Toggle ───────────────────────────────────────────────────

  it('should toggle a unit active/inactive', async () => {
    const service = container.resolve(CareUnitService)
    const created = await service.create({ service_id: serviceId, name: 'Toggle Unit' })
    expect(created.is_active).toBe(1)

    const disabled = await service.toggle(created.id!, false)
    expect(disabled.is_active).toBe(0)

    const enabled = await service.toggle(created.id!, true)
    expect(enabled.is_active).toBe(1)
  })

  it('should throw when toggling non-existent unit', async () => {
    const service = container.resolve(CareUnitService)
    await expect(service.toggle(9999, false)).rejects.toThrow('Unité de soins introuvable')
  })

  // ─── Delete ───────────────────────────────────────────────────

  it('should delete a care unit', async () => {
    const service = container.resolve(CareUnitService)
    const created = await service.create({ service_id: serviceId, name: 'Delete Me' })
    expect(created.id).toBeDefined()

    await service.delete(created.id!)
    const found = await service.getById(created.id!)
    expect(found).toBeNull()
  })

  it('should throw when deleting non-existent unit', async () => {
    const service = container.resolve(CareUnitService)
    await expect(service.delete(9999)).rejects.toThrow('Unité de soins introuvable')
  })
})
