import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { FonctionService } from '../fonction.service'

describe('FonctionService', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-fonction-test-'))
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

  // ─── Create ─────────────────────────────────────────────────────

  it('should create a fonction and return it with id and name', async () => {
    const service = container.resolve(FonctionService)
    const created = await service.create({ name: 'Médecin Chef' })
    expect(created.id).toBeDefined()
    expect(created.name).toBe('Médecin Chef')
    expect(created.is_active).toBe(true)
  })

  it('should reject empty name', async () => {
    const service = container.resolve(FonctionService)
    await expect(
      service.create({ name: '' })
    ).rejects.toThrow('Le nom de la fonction est requis')
  })

  it('should reject name exceeding 100 characters', async () => {
    const service = container.resolve(FonctionService)
    await expect(
      service.create({ name: 'A'.repeat(101) })
    ).rejects.toThrow('Le nom de la fonction ne peut pas dépasser 100 caractères')
  })

  // ─── Duplicate name ─────────────────────────────────────────────

  it('should reject duplicate name', async () => {
    const service = container.resolve(FonctionService)
    await service.create({ name: 'Chef de Service' })
    await expect(
      service.create({ name: 'Chef de Service' })
    ).rejects.toThrow('existe déjà')
  })

  // ─── List ───────────────────────────────────────────────────────

  it('should list all fonctions sorted by name asc', async () => {
    const service = container.resolve(FonctionService)
    // Create two fonctions out of order
    await service.create({ name: 'Z' })
    await service.create({ name: 'A' })

    const list = await service.list()
    expect(list.length).toBe(2)
    expect(list[0].name).toBe('A')
    expect(list[1].name).toBe('Z')
  })

  it('should return only active fonctions when activeOnly=true', async () => {
    const service = container.resolve(FonctionService)
    const a = await service.create({ name: 'Actif' })
    const b = await service.create({ name: 'Inactif' })
    await service.toggle(b.id!)

    const active = await service.list(true)
    expect(active.every(f => f.is_active === true)).toBe(true)
    expect(active.find(f => f.id === a.id)).toBeDefined()
    expect(active.find(f => f.id === b.id)).toBeUndefined()
  })

  // ─── GetById ────────────────────────────────────────────────────

  it('should get a fonction by id', async () => {
    const service = container.resolve(FonctionService)
    const created = await service.create({ name: 'Test Fonction' })
    const found = await service.getById(created.id!)
    expect(found).toBeDefined()
    expect(found!.name).toBe('Test Fonction')
  })

  it('should return null for non-existent id', async () => {
    const service = container.resolve(FonctionService)
    const found = await service.getById(-1)
    expect(found).toBeNull()
  })

  // ─── Update ─────────────────────────────────────────────────────

  it('should update fonction name', async () => {
    const service = container.resolve(FonctionService)
    const created = await service.create({ name: 'Ancien Nom' })
    const updated = await service.update(created.id!, { name: 'Nouveau Nom' })
    expect(updated.name).toBe('Nouveau Nom')

    // Verify via getById
    const found = await service.getById(created.id!)
    expect(found!.name).toBe('Nouveau Nom')
  })

  it('should throw when updating non-existent fonction', async () => {
    const service = container.resolve(FonctionService)
    await expect(
      service.update(9999, { name: 'Ghost' })
    ).rejects.toThrow('Fonction introuvable')
  })

  it('should reject name conflict when updating to an existing name', async () => {
    const service = container.resolve(FonctionService)
    const a = await service.create({ name: 'Fonction A' })
    await service.create({ name: 'Fonction B' })
    await expect(
      service.update(a.id!, { name: 'Fonction B' })
    ).rejects.toThrow('est déjà utilisé')
  })

  // ─── Toggle ─────────────────────────────────────────────────────

  it('should toggle is_active from true to false and back', async () => {
    const service = container.resolve(FonctionService)
    const created = await service.create({ name: 'Toggle Test' })
    expect(created.is_active).toBe(true)

    const toggledOff = await service.toggle(created.id!)
    expect(toggledOff.is_active).toBe(false)

    const toggledOn = await service.toggle(created.id!)
    expect(toggledOn.is_active).toBe(true)
  })

  it('should throw when toggling non-existent fonction', async () => {
    const service = container.resolve(FonctionService)
    await expect(service.toggle(9999)).rejects.toThrow('Fonction introuvable')
  })

  // ─── Delete ─────────────────────────────────────────────────────

  it('should delete an unused fonction', async () => {
    const service = container.resolve(FonctionService)
    const created = await service.create({ name: 'À supprimer' })
    await expect(service.delete(created.id!)).resolves.not.toThrow()
    const found = await service.getById(created.id!)
    expect(found).toBeNull()
  })

  it('should throw when deleting non-existent fonction', async () => {
    const service = container.resolve(FonctionService)
    await expect(service.delete(9999)).rejects.toThrow('Fonction introuvable')
  })

  it('should block deletion when a user is assigned to the fonction', async () => {
    const service = container.resolve(FonctionService)
    const created = await service.create({ name: 'Assignée' })

    // Directly insert a user row referencing this fonction_id
    await service.db
      .insertInto('user')
      .values({
        nom: 'Test',
        prenom: 'User',
        email: 'test-fonction@cde.com',
        password_hash: 'x',
        role: 'MEDECIN',
        fonction_id: created.id!,
      } as never)
      .execute()

    await expect(service.delete(created.id!)).rejects.toThrow(
      'Impossible de supprimer cette fonction'
    )
    await expect(service.delete(created.id!)).rejects.toThrow(
      /utilisateur\(s\)/
    )
  })
})
