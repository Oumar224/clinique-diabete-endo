import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { SiteService } from '../site.service'

describe('SiteService', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-site-test-'))
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

  it('should return the seeded default site', async () => {
    const service = container.resolve(SiteService)
    const list = await service.list()
    expect(list.length).toBeGreaterThanOrEqual(1)

    const defaultSite = list.find(s => s.is_default === true)
    expect(defaultSite).toBeDefined()
    expect(defaultSite!.name).toBe('Site principal')
  })

  it('should list only active sites when requested', async () => {
    const service = container.resolve(SiteService)
    // Create a second site then disable it
    await service.create({ name: 'Site secondaire' })
    const all = await service.list()
    const second = all.find(s => s.name === 'Site secondaire')!
    await service.toggle(second.id!, false)

    const active = await service.list(true)
    expect(active.every(s => s.is_active === true)).toBe(true)
    expect(active.find(s => s.name === 'Site secondaire')).toBeUndefined()
  })

  it('should order default site first', async () => {
    const service = container.resolve(SiteService)
    await service.create({ name: 'Autre site' })
    const list = await service.list()
    expect(list[0].is_default).toBe(true)
  })

  // ─── GetById ──────────────────────────────────────────────────

  it('should get a site by id', async () => {
    const service = container.resolve(SiteService)
    const list = await service.list()
    const first = list[0]
    const found = await service.getById(first.id!)
    expect(found).toBeDefined()
    expect(found!.name).toBe(first.name)
  })

  it('should return null for non-existent id', async () => {
    const service = container.resolve(SiteService)
    const found = await service.getById(-1)
    expect(found).toBeNull()
  })

  // ─── GetDefault ───────────────────────────────────────────────

  it('should return the default site', async () => {
    const service = container.resolve(SiteService)
    const def = await service.getDefault()
    expect(def).toBeDefined()
    expect(def!.name).toBe('Site principal')
    expect(def!.is_default).toBe(true)
  })

  // ─── Create ───────────────────────────────────────────────────

  it('should create a new site with all fields', async () => {
    const service = container.resolve(SiteService)
    const created = await service.create({
      name: 'Clinique Nord',
      address: '123 Rue de la Santé, Conakry',
      phone: '+224 620 00 00 00',
      email: 'nord@clinique.gn',
    })
    expect(created.id).toBeDefined()
    expect(created.name).toBe('Clinique Nord')
    expect(created.address).toBe('123 Rue de la Santé, Conakry')
    expect(created.phone).toBe('+224 620 00 00 00')
    expect(created.email).toBe('nord@clinique.gn')
    expect(created.is_active).toBe(true)
    expect(created.is_default).toBe(false) // already a default site seeded
  })

  it('should reject duplicate name', async () => {
    const service = container.resolve(SiteService)
    await expect(
      service.create({ name: 'Site principal' })
    ).rejects.toThrow('existe déjà')
  })

  it('should reject empty name', async () => {
    const service = container.resolve(SiteService)
    await expect(
      service.create({ name: '' })
    ).rejects.toThrow('Le nom du site est requis')
  })

  it('should reject name exceeding 100 characters', async () => {
    const service = container.resolve(SiteService)
    await expect(
      service.create({ name: 'A'.repeat(101) })
    ).rejects.toThrow('Le nom du site ne peut pas dépasser 100 caractères')
  })

  // ─── Update ───────────────────────────────────────────────────

  it('should update partial fields', async () => {
    const service = container.resolve(SiteService)
    const created = await service.create({ name: 'Original Site' })
    const updated = await service.update({
      id: created.id!,
      name: 'Updated Site',
      address: '456 Avenue du Commerce',
    })
    expect(updated.name).toBe('Updated Site')
    expect(updated.address).toBe('456 Avenue du Commerce')
  })

  it('should throw when updating non-existent site', async () => {
    const service = container.resolve(SiteService)
    await expect(
      service.update({ id: 9999, name: 'Ghost' })
    ).rejects.toThrow('Site introuvable')
  })

  it('should reject name conflict when updating name to an existing one', async () => {
    const service = container.resolve(SiteService)
    const a = await service.create({ name: 'Site Alpha' })
    await service.create({ name: 'Site Beta' })
    await expect(
      service.update({ id: a.id!, name: 'Site Beta' })
    ).rejects.toThrow('est déjà utilisé')
  })

  // ─── Toggle ───────────────────────────────────────────────────

  it('should toggle a site active/inactive', async () => {
    const service = container.resolve(SiteService)
    const created = await service.create({ name: 'Toggle Site' })
    expect(created.is_active).toBe(true)

    const disabled = await service.toggle(created.id!, false)
    expect(disabled.is_active).toBe(false)

    const enabled = await service.toggle(created.id!, true)
    expect(enabled.is_active).toBe(true)
  })

  it('should throw when toggling non-existent site', async () => {
    const service = container.resolve(SiteService)
    await expect(service.toggle(9999, false)).rejects.toThrow('Site introuvable')
  })

  // ─── SetDefault ───────────────────────────────────────────────

  it('should set a new default site and unset the previous one', async () => {
    const service = container.resolve(SiteService)
    const newSite = await service.create({ name: 'New Default Site' })

    // Verify old default
    const oldDefault = await service.getDefault()
    expect(oldDefault!.name).toBe('Site principal')

    // Set new default
    const result = await service.setDefault(newSite.id!)
    expect(result.is_default).toBe(true)

    // Old default should no longer be default
    const oldSite = await service.getById(oldDefault!.id!)
    expect(oldSite!.is_default).toBe(false)

    // getDefault should return the new one
    const currentDefault = await service.getDefault()
    expect(currentDefault!.name).toBe('New Default Site')
  })

  it('should throw when setting default on non-existent site', async () => {
    const service = container.resolve(SiteService)
    await expect(service.setDefault(9999)).rejects.toThrow('Site introuvable')
  })

  // ─── Delete ───────────────────────────────────────────────────

  it('should block deletion of the default site', async () => {
    const service = container.resolve(SiteService)
    const def = await service.getDefault()
    await expect(service.delete(def!.id!)).rejects.toThrow(
      'Impossible de supprimer le site par défaut'
    )
  })

  it('should block deletion if users are assigned to the site', async () => {
    const service = container.resolve(SiteService)
    const site = await service.create({ name: 'Assigned Site' })

    // Insert a row into user_sites directly via the service's db
    await service.db
      .insertInto('user_sites')
      .values({ user_id: 1, site_id: site.id! })
      .execute()

    await expect(service.delete(site.id!)).rejects.toThrow(
      'Impossible de supprimer ce site'
    )
    await expect(service.delete(site.id!)).rejects.toThrow(
      /1 utilisateur\(s\)/
    )
  })

  it('should delete an unused non-default site', async () => {
    const service = container.resolve(SiteService)
    const site = await service.create({ name: 'Disposable Site' })
    await expect(service.delete(site.id!)).resolves.not.toThrow()
    const found = await service.getById(site.id!)
    expect(found).toBeNull()
  })

  it('should throw when deleting non-existent site', async () => {
    const service = container.resolve(SiteService)
    await expect(service.delete(9999)).rejects.toThrow('Site introuvable')
  })
})
