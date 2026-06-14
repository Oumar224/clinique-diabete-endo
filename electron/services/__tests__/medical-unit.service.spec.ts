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

  it('should return all seeded medical units (13 mesure + 12 prescription = 25)', async () => {
    const service = container.resolve(MedicalUnitService)
    const list = await service.list()
    expect(list.length).toBe(25)
  })

  it('should return only active units when activeOnly=true', async () => {
    const service = container.resolve(MedicalUnitService)
    // Toggle one unit off
    const all = await service.list()
    await service.toggle(all[0].id!, false)

    const active = await service.list(true)
    expect(active.length).toBe(24)
    expect(active.every(u => u.is_active === true)).toBe(true)
  })

  it('should filter by category "mesure"', async () => {
    const service = container.resolve(MedicalUnitService)
    const mesure = await service.list(false, 'mesure')
    expect(mesure.length).toBe(13)
    expect(mesure.every(u => u.category === 'mesure')).toBe(true)
  })

  it('should filter by category "prescription"', async () => {
    const service = container.resolve(MedicalUnitService)
    const prescription = await service.list(false, 'prescription')
    expect(prescription.length).toBe(12)
    expect(prescription.every(u => u.category === 'prescription')).toBe(true)
  })

  it('should combine activeOnly and category filters', async () => {
    const service = container.resolve(MedicalUnitService)
    const mesure = await service.list(false, 'mesure')
    // Disable one mesure unit
    await service.toggle(mesure[0].id!, false)

    const activeMesure = await service.list(true, 'mesure')
    expect(activeMesure.length).toBe(12)
    expect(activeMesure.every(u => u.category === 'mesure' && u.is_active === true)).toBe(true)
  })

  it('should return units sorted by category asc then name asc', async () => {
    const service = container.resolve(MedicalUnitService)
    const list = await service.list()
    // All 'mesure' should come before 'prescription'
    let switchedToPrescription = false
    for (const u of list) {
      if (u.category === 'prescription') switchedToPrescription = true
      if (u.category === 'mesure' && switchedToPrescription) {
        throw new Error('mesure unit found after prescription unit — sort order broken')
      }
    }
  })

  // ─── Seed verification ────────────────────────────────────────

  it('should have seeded specific mesure units (mg, g, ml, UI, etc.)', async () => {
    const service = container.resolve(MedicalUnitService)
    const list = await service.list()

    const mg = list.find(u => u.code === 'MG')
    expect(mg).toBeDefined()
    expect(mg!.name).toBe('Milligramme')
    expect(mg!.symbol).toBe('mg')
    expect(mg!.category).toBe('mesure')

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
    expect(cpr!.category).toBe('prescription')

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
      category: 'mesure',
      symbol: 'tst',
    })
    expect(created.id).toBeDefined()
    expect(created.code).toBe('TEST')
    expect(created.name).toBe('Unité de test')
    expect(created.category).toBe('mesure')
    expect(created.symbol).toBe('tst')
    expect(created.is_active).toBe(true)
  })

  it('should uppercase the code on create', async () => {
    const service = container.resolve(MedicalUnitService)
    const created = await service.create({
      code: 'lower',
      name: 'Lowercase Code',
      category: 'mesure',
      symbol: 'lc',
    })
    expect(created.code).toBe('LOWER')
  })

  it('should reject duplicate code', async () => {
    const service = container.resolve(MedicalUnitService)
    await service.create({
      code: 'DUP',
      name: 'First',
      category: 'mesure',
      symbol: 'd1',
    })
    await expect(
      service.create({
        code: 'DUP',
        name: 'Second',
        category: 'mesure',
        symbol: 'd2',
      })
    ).rejects.toThrow('existe déjà')
  })

  it('should reject duplicate code case-insensitively', async () => {
    const service = container.resolve(MedicalUnitService)
    await service.create({
      code: 'CASE',
      name: 'First',
      category: 'mesure',
      symbol: 'c1',
    })
    await expect(
      service.create({
        code: 'case',
        name: 'Second',
        category: 'mesure',
        symbol: 'c2',
      })
    ).rejects.toThrow('existe déjà')
  })

  it('should reject invalid category', async () => {
    const service = container.resolve(MedicalUnitService)
    await expect(
      service.create({
        code: 'BAD',
        name: 'Bad Category',
        category: 'invalid' as any,
        symbol: 'x',
      })
    ).rejects.toThrow("La catégorie doit être 'mesure' ou 'prescription'")
  })

  it('should reject empty code', async () => {
    const service = container.resolve(MedicalUnitService)
    await expect(
      service.create({
        code: '',
        name: 'No Code',
        category: 'mesure',
        symbol: 'x',
      })
    ).rejects.toThrow("Le code de l'unité médicale est requis")
  })

  it('should reject empty name', async () => {
    const service = container.resolve(MedicalUnitService)
    await expect(
      service.create({
        code: 'NONAME',
        name: '',
        category: 'mesure',
        symbol: 'x',
      })
    ).rejects.toThrow("Le nom de l'unité médicale est requis")
  })

  it('should reject empty symbol', async () => {
    const service = container.resolve(MedicalUnitService)
    await expect(
      service.create({
        code: 'NOSYM',
        name: 'No Symbol',
        category: 'mesure',
        symbol: '',
      })
    ).rejects.toThrow("Le symbole de l'unité médicale est requis")
  })

  it('should reject code shorter than 2 characters', async () => {
    const service = container.resolve(MedicalUnitService)
    await expect(
      service.create({
        code: 'X',
        name: 'Short Code',
        category: 'mesure',
        symbol: 'x',
      })
    ).rejects.toThrow("Le code de l'unité médicale doit contenir entre 2 et 20 caractères")
  })

  // ─── Update ───────────────────────────────────────────────────

  it('should update partial fields', async () => {
    const service = container.resolve(MedicalUnitService)
    const created = await service.create({
      code: 'ORIG',
      name: 'Original',
      category: 'mesure',
      symbol: 'orig',
    })
    const updated = await service.update({
      id: created.id!,
      name: 'Updated Name',
      symbol: 'upd',
    })
    expect(updated.name).toBe('Updated Name')
    expect(updated.symbol).toBe('upd')
    // Unchanged fields
    expect(updated.code).toBe('ORIG')
    expect(updated.category).toBe('mesure')
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
      category: 'mesure',
      symbol: 'a',
    })
    await service.create({
      code: 'BBB',
      name: 'Unit B',
      category: 'mesure',
      symbol: 'b',
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
      category: 'mesure',
      symbol: 'tog',
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
      category: 'mesure',
      symbol: 'del',
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
