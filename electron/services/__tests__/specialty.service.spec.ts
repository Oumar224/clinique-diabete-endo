import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { SpecialtyService } from '../specialty.service'

describe('SpecialtyService', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-spec-test-'))
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

  it('should return all 10 seeded specialties', async () => {
    const service = container.resolve(SpecialtyService)
    const list = await service.list()
    expect(list.length).toBe(10)
  })

  it('should return only active specialties when activeOnly=true', async () => {
    const service = container.resolve(SpecialtyService)
    // Disable one specialty
    const all = await service.list()
    await service.toggle(all[0].id!, false)

    const active = await service.list(true)
    expect(active.length).toBe(9)
    expect(active.every(s => s.is_active === true)).toBe(true)
  })

  it('should return specialties sorted by name asc', async () => {
    const service = container.resolve(SpecialtyService)
    const list = await service.list()
    for (let i = 1; i < list.length; i++) {
      expect(list[i].name >= list[i - 1].name).toBe(true)
    }
  })

  // ─── Seed verification ────────────────────────────────────────

  it('should have seeded specific specialties (ENDO, CARDIO, etc.)', async () => {
    const service = container.resolve(SpecialtyService)
    const list = await service.list()

    const endo = list.find(s => s.code === 'ENDO')
    expect(endo).toBeDefined()
    expect(endo!.name).toBe('Endocrinologie')
    expect(endo!.title_prefix).toBe('Dr')

    const cardio = list.find(s => s.code === 'CARDIO')
    expect(cardio).toBeDefined()
    expect(cardio!.name).toBe('Cardiologie')

    const pharm = list.find(s => s.code === 'PHARM')
    expect(pharm).toBeDefined()
    expect(pharm!.name).toBe('Pharmacie')
    expect(pharm!.title_prefix).toBe('Ph')

    const medgen = list.find(s => s.code === 'MED-GEN')
    expect(medgen).toBeDefined()
    expect(medgen!.name).toBe('Médecine Générale')
  })

  // ─── GetById ──────────────────────────────────────────────────

  it('should get a specialty by id', async () => {
    const service = container.resolve(SpecialtyService)
    const list = await service.list()
    const first = list[0]
    const found = await service.getById(first.id!)
    expect(found).toBeDefined()
    expect(found!.code).toBe(first.code)
  })

  it('should return null for non-existent id', async () => {
    const service = container.resolve(SpecialtyService)
    const found = await service.getById(-1)
    expect(found).toBeNull()
  })

  // ─── Create ───────────────────────────────────────────────────

  it('should create a new specialty with title_prefix', async () => {
    const service = container.resolve(SpecialtyService)
    const created = await service.create({
      name: 'Dermatologie',
      code: 'DERM',
      title_prefix: 'Pr',
    })
    expect(created.id).toBeDefined()
    expect(created.name).toBe('Dermatologie')
    expect(created.code).toBe('DERM')
    expect(created.title_prefix).toBe('Pr')
    expect(created.is_active).toBe(true)
  })

  it('should default title_prefix to "Dr" if not provided', async () => {
    const service = container.resolve(SpecialtyService)
    const created = await service.create({
      name: 'Neurologie',
      code: 'NEURO',
    })
    expect(created.title_prefix).toBe('Dr')
  })

  it('should uppercase the code on create', async () => {
    const service = container.resolve(SpecialtyService)
    const created = await service.create({
      name: 'Ophtalmologie',
      code: 'opht',
    })
    expect(created.code).toBe('OPHT')
  })

  it('should reject duplicate code', async () => {
    const service = container.resolve(SpecialtyService)
    await expect(
      service.create({ name: 'Nouvelle Endo', code: 'ENDO' })
    ).rejects.toThrow('est déjà utilisé')
  })

  it('should reject duplicate name', async () => {
    const service = container.resolve(SpecialtyService)
    await expect(
      service.create({ name: 'Endocrinologie', code: 'NEWCODE' })
    ).rejects.toThrow('existe déjà')
  })

  it('should reject empty code', async () => {
    const service = container.resolve(SpecialtyService)
    await expect(
      service.create({ name: 'Test', code: '' })
    ).rejects.toThrow('Le code de la spécialité est requis')
  })

  it('should reject empty name', async () => {
    const service = container.resolve(SpecialtyService)
    await expect(
      service.create({ name: '', code: 'EMPTY' })
    ).rejects.toThrow('Le nom de la spécialité est requis')
  })

  it('should reject name exceeding 100 characters', async () => {
    const service = container.resolve(SpecialtyService)
    await expect(
      service.create({ name: 'A'.repeat(101), code: 'LONG' })
    ).rejects.toThrow('Le nom de la spécialité ne peut pas dépasser 100 caractères')
  })

  it('should reject code exceeding 20 characters', async () => {
    const service = container.resolve(SpecialtyService)
    await expect(
      service.create({ name: 'Long Code', code: 'A'.repeat(21) })
    ).rejects.toThrow('Le code de la spécialité ne peut pas dépasser 20 caractères')
  })

  // ─── Update ───────────────────────────────────────────────────

  it('should update fields including title_prefix', async () => {
    const service = container.resolve(SpecialtyService)
    const created = await service.create({
      name: 'Test Specialty',
      code: 'TSPEC',
      title_prefix: 'Dr',
    })
    const updated = await service.update({
      id: created.id!,
      name: 'Updated Specialty',
      title_prefix: 'Prof',
    })
    expect(updated.name).toBe('Updated Specialty')
    expect(updated.title_prefix).toBe('Prof')
    expect(updated.code).toBe('TSPEC') // unchanged
  })

  it('should throw when updating non-existent specialty', async () => {
    const service = container.resolve(SpecialtyService)
    await expect(
      service.update({ id: 9999, name: 'Ghost' })
    ).rejects.toThrow('Spécialité introuvable')
  })

  it('should reject code conflict when updating code to an existing one', async () => {
    const service = container.resolve(SpecialtyService)
    const a = await service.create({ name: 'Spec A', code: 'SPCA' })
    await service.create({ name: 'Spec B', code: 'SPCB' })
    await expect(
      service.update({ id: a.id!, code: 'SPCB' })
    ).rejects.toThrow('est déjà utilisé')
  })

  it('should reject name conflict when updating name to an existing one', async () => {
    const service = container.resolve(SpecialtyService)
    const a = await service.create({ name: 'Alpha Spec', code: 'ALSP' })
    await service.create({ name: 'Beta Spec', code: 'BTSP' })
    await expect(
      service.update({ id: a.id!, name: 'Beta Spec' })
    ).rejects.toThrow('est déjà utilisé')
  })

  // ─── Toggle ───────────────────────────────────────────────────

  it('should toggle a specialty active/inactive', async () => {
    const service = container.resolve(SpecialtyService)
    const created = await service.create({
      name: 'Toggle Spec',
      code: 'TOGS',
    })
    expect(created.is_active).toBe(true)

    const disabled = await service.toggle(created.id!, false)
    expect(disabled.is_active).toBe(false)

    const enabled = await service.toggle(created.id!, true)
    expect(enabled.is_active).toBe(true)
  })

  it('should throw when toggling non-existent specialty', async () => {
    const service = container.resolve(SpecialtyService)
    await expect(service.toggle(9999, false)).rejects.toThrow('Spécialité introuvable')
  })

  // ─── Delete ───────────────────────────────────────────────────

  it('should block deletion if users are assigned to the specialty', async () => {
    const service = container.resolve(SpecialtyService)
    const spec = await service.create({ name: 'Assigned Spec', code: 'ASGN' })

    // Insert a row into user_specialties directly
    await service.db
      .insertInto('user_specialties')
      .values({ user_id: 1, specialty_id: spec.id! })
      .execute()

    await expect(service.delete(spec.id!)).rejects.toThrow(
      'Impossible de supprimer cette spécialité'
    )
    await expect(service.delete(spec.id!)).rejects.toThrow(
      /1 utilisateur\(s\)/
    )
  })

  it('should delete an unused specialty', async () => {
    const service = container.resolve(SpecialtyService)
    const spec = await service.create({ name: 'Disposable Spec', code: 'DISP' })
    await expect(service.delete(spec.id!)).resolves.not.toThrow()
    const found = await service.getById(spec.id!)
    expect(found).toBeNull()
  })

  it('should throw when deleting non-existent specialty', async () => {
    const service = container.resolve(SpecialtyService)
    await expect(service.delete(9999)).rejects.toThrow('Spécialité introuvable')
  })
})
