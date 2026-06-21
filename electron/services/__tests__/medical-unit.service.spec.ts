import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { MedicalUnitService } from '../medical-unit.service'

describe('MedicalUnitService', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-medunit-test-'))
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

  it('should return all seeded medical units (25)', async () => {
    const service = container.resolve(MedicalUnitService)
    const list = await service.list()
    expect(list.length).toBe(25)
  })

  it('should return only active units when activeOnly=true', async () => {
    const service = container.resolve(MedicalUnitService)
    const all = await service.list()
    await service.toggle(all[0].id!, false)

    const active = await service.list(true)
    expect(active.length).toBe(24)
    expect(active.every(u => u.is_active === true)).toBe(true)
  })

  // ─── Seed verification ────────────────────────────────────────

  it('should have seeded specific mesure units (mg, g, ml, UI, etc.)', async () => {
    const service = container.resolve(MedicalUnitService)
    const list = await service.list()

    const mg = list.find(u => u.code === 'MG')
    expect(mg).toBeDefined()
    expect(mg!.name).toBe('Milligramme')

    const g = list.find(u => u.code === 'G')
    expect(g).toBeDefined()
    expect(g!.name).toBe('Gramme')

    const ml = list.find(u => u.code === 'ML')
    expect(ml).toBeDefined()
    expect(ml!.name).toBe('Millilitre')

    const ui = list.find(u => u.code === 'UI')
    expect(ui).toBeDefined()
    expect(ui!.name).toBe('Unité Internationale')
  })

  it('should have seeded specific prescription units (comprimé, gélule, ampoule, etc.)', async () => {
    const service = container.resolve(MedicalUnitService)
    const list = await service.list()

    const cpr = list.find(u => u.code === 'CPR')
    expect(cpr).toBeDefined()
    expect(cpr!.name).toBe('Comprimé')

    const gel = list.find(u => u.code === 'GEL')
    expect(gel).toBeDefined()
    expect(gel!.name).toBe('Gélule')

    const amp = list.find(u => u.code === 'AMP')
    expect(amp).toBeDefined()
    expect(amp!.name).toBe('Ampoule')
  })

  // ─── GetById ──────────────────────────────────────────────────

  it('should get a medical unit by id', async () => {
    const service = container.resolve(MedicalUnitService)
    const list = await service.list()
    const first = list[0]
    const found = await service.getById(first.id!)
    expect(found).toBeDefined()
    expect(found!.code).toBe(first.code)
    expect(found!.name).toBe(first.name)
  })

  it('should return null for non-existent id', async () => {
    const service = container.resolve(MedicalUnitService)
    const found = await service.getById(-1)
    expect(found).toBeNull()
  })

  // ─── Create ───────────────────────────────────────────────────

  it('should create a new medical unit with all fields', async () => {
    const service = container.resolve(MedicalUnitService)
    const created = await service.create({
      code: 'TEST',
      name: 'Unité de test',
    })
    expect(created.id).toBeDefined()
    expect(created.code).toBe('TEST')
    expect(created.name).toBe('Unité de test')
    expect(created.is_active).toBe(true)
  })

  it('should uppercase the code on create', async () => {
    const service = container.resolve(MedicalUnitService)
    const created = await service.create({
      code: 'lower',
      name: 'Lowercase Code',
    })
    expect(created.code).toBe('LOWER')
  })

  it('should reject duplicate code', async () => {
    const service = container.resolve(MedicalUnitService)
    await service.create({
      code: 'DUP',
      name: 'First',
    })
    await expect(
      service.create({
        code: 'DUP',
        name: 'Second',
      })
    ).rejects.toThrow('existe déjà')
  })

  it('should reject duplicate code case-insensitively', async () => {
    const service = container.resolve(MedicalUnitService)
    await service.create({
      code: 'CASE',
      name: 'First',
    })
    await expect(
      service.create({
        code: 'case',
        name: 'Second',
      })
    ).rejects.toThrow('existe déjà')
  })

  it('should reject empty code', async () => {
    const service = container.resolve(MedicalUnitService)
    await expect(
      service.create({
        code: '',
        name: 'No Code',
      })
    ).rejects.toThrow("Le code de l'unité médicale est requis")
  })

  it('should reject empty name', async () => {
    const service = container.resolve(MedicalUnitService)
    await expect(
      service.create({
        code: 'NONAME',
        name: '',
      })
    ).rejects.toThrow("Le nom de l'unité médicale est requis")
  })

  it('should reject code shorter than 2 characters', async () => {
    const service = container.resolve(MedicalUnitService)
    await expect(
      service.create({
        code: 'X',
        name: 'Short Code',
      })
    ).rejects.toThrow("Le code de l'unité médicale doit contenir entre 2 et 20 caractères")
  })

  // ─── Update ───────────────────────────────────────────────────

  it('should update partial fields', async () => {
    const service = container.resolve(MedicalUnitService)
    const created = await service.create({
      code: 'ORIG',
      name: 'Original',
    })
    const updated = await service.update({
      id: created.id!,
      name: 'Updated Name',
    })
    expect(updated.name).toBe('Updated Name')
    // Unchanged fields
    expect(updated.code).toBe('ORIG')
  })

  it('should throw when updating non-existent unit', async () => {
    const service = container.resolve(MedicalUnitService)
    await expect(
      service.update({ id: 9999, name: 'Ghost' })
    ).rejects.toThrow('Unité médicale introuvable')
  })

  it('should reject code conflict when updating code to an existing one', async () => {
    const service = container.resolve(MedicalUnitService)
    const a = await service.create({
      code: 'AAA',
      name: 'Unit A',
    })
    await service.create({
      code: 'BBB',
      name: 'Unit B',
    })
    await expect(
      service.update({ id: a.id!, code: 'BBB' })
    ).rejects.toThrow('est déjà utilisé')
  })

  // ─── Toggle ───────────────────────────────────────────────────

  it('should toggle a unit active/inactive', async () => {
    const service = container.resolve(MedicalUnitService)
    const created = await service.create({
      code: 'TOG',
      name: 'Toggle Unit',
    })
    expect(created.is_active).toBe(true)

    const disabled = await service.toggle(created.id!, false)
    expect(disabled.is_active).toBe(false)

    const enabled = await service.toggle(created.id!, true)
    expect(enabled.is_active).toBe(true)
  })

  it('should throw when toggling non-existent unit', async () => {
    const service = container.resolve(MedicalUnitService)
    await expect(service.toggle(9999, false)).rejects.toThrow('Unité médicale introuvable')
  })

  // ─── Delete ───────────────────────────────────────────────────

  it('should delete a unit with no references', async () => {
    const service = container.resolve(MedicalUnitService)
    const created = await service.create({
      code: 'DEL',
      name: 'Delete Me',
    })
    await expect(service.delete(created.id!)).resolves.not.toThrow()
    const found = await service.getById(created.id!)
    expect(found).toBeNull()
  })

  it('should throw when deleting non-existent unit', async () => {
    const service = container.resolve(MedicalUnitService)
    await expect(service.delete(9999)).rejects.toThrow('Unité médicale introuvable')
  })
})
