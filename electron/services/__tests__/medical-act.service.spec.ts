import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { MedicalActService } from '../medical-act.service'

describe('MedicalActService', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-medical-act-test-'))
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

  it('should list seeded medical acts with service name', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    expect(list.length).toBeGreaterThanOrEqual(3)
    expect((list[0] as any).service_name).toBeTruthy()
    expect(list[0].code).toBeTruthy()
  })

  it('should list only active acts when requested', async () => {
    const service = container.resolve(MedicalActService)
    const acts = await service.list(true)
    expect(acts.every(a => a.is_active === 1)).toBe(true)
  })

  it('should get an act by id with service name', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const first = list[0]
    const found = await service.getById(first.id!)
    expect(found).toBeDefined()
    expect(found!.code).toBe(first.code)
    expect((found! as any).service_name).toBeTruthy()
  })

  it('should return null for non-existent act', async () => {
    const service = container.resolve(MedicalActService)
    const found = await service.getById(-1)
    expect(found).toBeNull()
  })

  it('should get acts by service id', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    if (list.length > 0) {
      const serviceId = list[0].service_id
      const byService = await service.getByService(serviceId!)
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

  it('should create a new medical act', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const firstServiceId = list[0].service_id

    const created = await service.create({
      code: 'TEST-001',
      label: 'Test Medical Act',
      service_id: firstServiceId,
    })
    expect(created.id).toBeDefined()
    expect(created.code).toBe('TEST-001')
    expect(created.is_active).toBe(1)
    expect((created as any).service_name).toBeTruthy()
  })

  it('should uppercase the act code on creation', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const firstServiceId = list[0].service_id

    const created = await service.create({
      code: 'test-code-002',
      label: 'Lowercase code',
      service_id: firstServiceId,
    })
    expect(created.code).toBe('TEST-CODE-002')
  })

  it('should reject duplicate act code with friendly message', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const firstServiceId = list[0].service_id

    await service.create({ code: 'DUP-001', label: 'First', service_id: firstServiceId })
    await expect(
      service.create({ code: 'DUP-001', label: 'Second', service_id: firstServiceId })
    ).rejects.toThrow('Le code \"DUP-001\" est déjà utilisé')
  })

  it('should reject invalid act code format', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const firstServiceId = list[0].service_id

    await expect(
      service.create({ code: 'INVALID CODE!', label: 'Bad', service_id: firstServiceId })
    ).rejects.toThrow('Le code de l\'acte ne doit contenir que des lettres')
  })

  it('should reject non-existent service', async () => {
    const service = container.resolve(MedicalActService)
    await expect(
      service.create({ code: 'BAD-SVC', label: 'Bad Service', service_id: 9999 })
    ).rejects.toThrow('Service associé introuvable')
  })

  it('should reject empty act code', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const firstServiceId = list[0].service_id

    await expect(
      service.create({ code: '', label: 'Empty Code', service_id: firstServiceId })
    ).rejects.toThrow('Le code de l\'acte est requis')
  })

  it('should reject empty act label', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const firstServiceId = list[0].service_id

    await expect(
      service.create({ code: 'NO-LABEL', label: '', service_id: firstServiceId })
    ).rejects.toThrow('Le libellé de l\'acte est requis')
  })

  it('should update act fields', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const first = list[0]

    const updated = await service.update({
      id: first.id!,
      label: 'Updated Label',
    })
    expect(updated.label).toBe('Updated Label')
  })

  it('should soft-delete a medical act by setting is_active to false', async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const first = list[0]

    const deactivated = await service.update({ id: first.id!, is_active: 0 })
    expect(deactivated.is_active).toBe(0)

    const activeList = await service.list(true)
    expect(activeList.find(a => a.id === first.id)).toBeUndefined()

    const fullList = await service.list(false)
    expect(fullList.find(a => a.id === first.id)).toBeDefined()
  })

  it("should delete a medical act", async () => {
    const service = container.resolve(MedicalActService)
    const list = await service.list()
    const firstServiceId = list[0].service_id

    const created = await service.create({
      code: "DEL-TEST-001",
      label: "To Delete",
      service_id: firstServiceId,
    })

    const actId = created.id!
    await service.delete(actId)

    const found = await service.getById(actId)
    expect(found).toBeNull()
  })

  it("should throw when deleting non-existent act", async () => {
    const service = container.resolve(MedicalActService)
    await expect(service.delete(9999)).rejects.toThrow("Acte médical introuvable")
  })
})
