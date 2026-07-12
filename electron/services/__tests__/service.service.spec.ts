import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { ServiceService } from '../service.service'
import { MedicalActService } from '../medical-act.service'

// Helper to check if the database has the full v2 hierarchy or the legacy v1
// We use duck-typing: if SOIN root exists, it's v2
async function isV2Hierarchy(service: ServiceService): Promise<boolean> {
  const list = await service.list()
  return list.some(s => s.code === 'SOIN')
}

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

  it('should list seeded services sorted by sort_order', async () => {
    const service = container.resolve(ServiceService)
    const list = await service.list()
    // At minimum: 5 legacy + 4 v1 hierarchy + new v2 services
    // Full v2 = 46 services. v1 (046 only) = 9
    expect(list.length).toBeGreaterThanOrEqual(9)
    // Verify sorted by sort_order asc (primary sort)
    // Note: sort_order is global across all levels, so services from different
    // branches with the same sort_order may not be name-ordered across branches.
    // Name ordering within siblings is verified in the tree tests.
    for (let i = 1; i < list.length; i++) {
      expect(list[i].sort_order!).toBeGreaterThanOrEqual(list[i - 1]!.sort_order!)
    }
  })

  it('should list only active services when requested', async () => {
    const service = container.resolve(ServiceService)
    const active = await service.list(true)
    expect(active.every(s => s.is_active === 1)).toBe(true)
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
    expect(created.is_active).toBe(1)
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
    expect(created.is_active).toBe(1)

    const disabled = await service.toggle(created.id!, false)
    expect(disabled.is_active).toBe(0)

    const enabled = await service.toggle(created.id!, true)
    expect(enabled.is_active).toBe(1)
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

  // ─── Hierarchy: getTree ───────────────────────────────────────

  it('should return a tree with SOINS PATIENTS as root (or CLI for v1)', async () => {
    const service = container.resolve(ServiceService)
    const tree = await service.getTree()

    const isV2 = await isV2Hierarchy(service)

    if (isV2) {
      // v2 hierarchy: root is SOINS PATIENTS (code=SOIN)
      const root = tree.find(n => n.code === 'SOIN')
      expect(root).toBeDefined()
      expect(root!.name).toBe('SOINS PATIENTS')
      expect(root!.parent_id).toBeNull()

      // Should contain SOIN.INT as child
      const int = root!.children.find(n => n.code === 'SOIN.INT')
      expect(int).toBeDefined()
      expect(int!.name).toBe('MEDECINE INTERNE')
      expect(int!.parent_id).toBe(root!.id)

      // Should contain HOF and HOH as grandchildren
      const hof = int!.children.find(n => n.code === 'SOIN.INT.HOF')
      expect(hof).toBeDefined()
      expect(hof!.name).toBe('HOSPITALISATION FEMMES')

      const hoh = int!.children.find(n => n.code === 'SOIN.INT.HOH')
      expect(hoh).toBeDefined()
      expect(hoh!.name).toBe('HOSPITALISATION HOMMES')
    } else {
      // v1 hierarchy: root is SERVICES CLINIQUES (code=CLI)
      const root = tree.find(n => n.code === 'CLI')
      expect(root).toBeDefined()
      expect(root!.name).toBe('SERVICES CLINIQUES')
      expect(root!.parent_id).toBeNull()

      const int = root!.children.find(n => n.code === 'CLI.INT')
      expect(int).toBeDefined()
      expect(int!.name).toBe('MEDECINE INTERNE')
    }
  })

  it('should include new v2 hierarchy branches (TEC, GEST) when migrated', async () => {
    const service = container.resolve(ServiceService)
    const tree = await service.getTree()
    const isV2 = await isV2Hierarchy(service)

    if (isV2) {
      // Should have 3 roots
      expect(tree.length).toBeGreaterThanOrEqual(3)

      const tec = tree.find(n => n.code === 'TEC')
      expect(tec).toBeDefined()
      expect(tec!.name).toBe('PLATEAU TECHNIQUE')

      const gest = tree.find(n => n.code === 'GEST')
      expect(gest).toBeDefined()
      expect(gest!.name).toBe('GESTION LOGISTIQUE')

      // TEC should have children (LAB, IMG, SNG, PHA)
      expect(tec!.children.length).toBeGreaterThanOrEqual(4)
      const lab = tec!.children.find(n => n.code === 'TEC.LAB')
      expect(lab).toBeDefined()
      expect(lab!.children.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('should attach legacy services to appropriate branches in v2', async () => {
    const service = container.resolve(ServiceService)
    const isV2 = await isV2Hierarchy(service)

    if (isV2) {
      const tree = await service.getTree()

      // Accueil should be under GEST → GEST.RH → GEST.RH.ACC
      const gest = tree.find(n => n.code === 'GEST')!
      const gestRh = gest.children.find(n => n.code === 'GEST.RH')!
      const gestRhAcc = gestRh.children.find(n => n.code === 'GEST.RH.ACC')!
      const accueil = gestRhAcc.children.find(n => n.name === 'Accueil')
      expect(accueil).toBeDefined()
      expect(accueil!.parent_id).toBe(gestRhAcc.id)

      // Consultation Générale, Endocrinologie, Diabétologie should be under SOIN.CSP
      const soin = tree.find(n => n.code === 'SOIN')!
      const soinCsp = soin.children.find(n => n.code === 'SOIN.CSP')!
      expect(soinCsp.children.find(n => n.name === 'Consultation Générale')).toBeDefined()
      expect(soinCsp.children.find(n => n.name === 'Endocrinologie')).toBeDefined()
      expect(soinCsp.children.find(n => n.name === 'Diabétologie')).toBeDefined()

      // Pharmacie should be under TEC.PHA
      const tec = tree.find(n => n.code === 'TEC')!
      const tecPha = tec.children.find(n => n.code === 'TEC.PHA')!
      expect(tecPha.children.find(n => n.name === 'Pharmacie')).toBeDefined()
    }
  })

  it('should include legacy services as children of SOIN root in v1', async () => {
    const service = container.resolve(ServiceService)
    const isV2 = await isV2Hierarchy(service)

    if (!isV2) {
      const tree = await service.getTree()
      const root = tree.find(n => n.code === 'CLI')
      expect(root).toBeDefined()

      // Legacy services should be children of CLI
      const accueil = root!.children.find(n => n.name === 'Accueil')
      expect(accueil).toBeDefined()
      expect(accueil!.parent_id).toBe(root!.id)
    }
  })

  it('should sort children by sort_order then name', async () => {
    const service = container.resolve(ServiceService)
    const tree = await service.getTree()

    for (const node of tree) {
      for (let i = 1; i < node.children.length; i++) {
        if (node.children[i].sort_order === node.children[i - 1].sort_order) {
          expect(
            node.children[i].name.localeCompare(node.children[i - 1].name)
          ).toBeGreaterThanOrEqual(0)
        } else {
          expect(node.children[i].sort_order).toBeGreaterThanOrEqual(
            node.children[i - 1].sort_order
          )
        }
      }
    }
  })

  // ─── Hierarchy: getChildren ───────────────────────────────────

  it('should return direct children of a parent service', async () => {
    const service = container.resolve(ServiceService)
    const isV2 = await isV2Hierarchy(service)
    const tree = await service.getTree()

    const rootCode = isV2 ? 'SOIN' : 'CLI'
    const intCode = isV2 ? 'SOIN.INT' : 'CLI.INT'
    const hofCode = isV2 ? 'SOIN.INT.HOF' : 'CLI.INT.HOF'
    const hohCode = isV2 ? 'SOIN.INT.HOH' : 'CLI.INT.HOH'

    const root = tree.find(n => n.code === rootCode)!
    const int = root.children.find(n => n.code === intCode)!

    const children = await service.getChildren(int.id!)
    expect(children.length).toBeGreaterThanOrEqual(2)

    const hof = children.find(n => n.code === hofCode)
    expect(hof).toBeDefined()
    const hoh = children.find(n => n.code === hohCode)
    expect(hoh).toBeDefined()
  })

  it('should return empty array for leaf service children', async () => {
    const service = container.resolve(ServiceService)
    const isV2 = await isV2Hierarchy(service)
    const tree = await service.getTree()

    const rootCode = isV2 ? 'SOIN' : 'CLI'
    const intCode = isV2 ? 'SOIN.INT' : 'CLI.INT'
    const hofCode = isV2 ? 'SOIN.INT.HOF' : 'CLI.INT.HOF'

    const root = tree.find(n => n.code === rootCode)!
    const int = root.children.find(n => n.code === intCode)!
    const hof = int.children.find(n => n.code === hofCode)!

    const children = await service.getChildren(hof.id!)
    expect(children).toEqual([])
  })

  // ─── Hierarchy: create with parent_id and code ────────────────

  it('should create a service with parent_id and code', async () => {
    const service = container.resolve(ServiceService)
    const isV2 = await isV2Hierarchy(service)
    const tree = await service.getTree()

    const rootCode = isV2 ? 'SOIN' : 'CLI'
    const prefix = isV2 ? 'SOIN' : 'CLI'
    const root = tree.find(n => n.code === rootCode)!

    const created = await service.create({
      name: 'NOUVEAU SERVICE',
      code: `${prefix}.NOUV`,
      parent_id: root.id,
      duration: 30,
      color: '#000000',
    })

    expect(created.id).toBeDefined()
    expect(created.name).toBe('NOUVEAU SERVICE')
    expect(created.code).toBe(`${prefix}.NOUV`)
    expect(created.parent_id).toBe(root.id)
    expect(created.is_active).toBe(1)

    // Verify it appears in children
    const children = await service.getChildren(root.id!)
    const found = children.find(n => n.code === `${prefix}.NOUV`)
    expect(found).toBeDefined()
  })

  it('should reject duplicate code on create', async () => {
    const service = container.resolve(ServiceService)
    const isV2 = await isV2Hierarchy(service)
    const existingCode = isV2 ? 'SOIN' : 'CLI'

    await expect(
      service.create({
        name: 'Duplicate Code',
        code: existingCode,
      })
    ).rejects.toThrow('déjà utilisé')
  })

  it('should scope sort_order within siblings', async () => {
    const service = container.resolve(ServiceService)
    const tree = await service.getTree()
    const root = tree[0]

    // Get the current max sort_order among root children
    const existingChildren = await service.getChildren(root.id!)
    const maxSort = Math.max(...existingChildren.map(c => c.sort_order!))

    const created = await service.create({
      name: 'Sibling Sort Test',
      parent_id: root.id,
    })

    expect(created.sort_order).toBeGreaterThanOrEqual(maxSort)
  })

  // ─── Hierarchy: update parent_id and code ─────────────────────

  it('should update parent_id and code on a service', async () => {
    const service = container.resolve(ServiceService)
    const isV2 = await isV2Hierarchy(service)
    const tree = await service.getTree()

    const rootCode = isV2 ? 'SOIN' : 'CLI'
    const intCode = isV2 ? 'SOIN.INT' : 'CLI.INT'
    const prefix = isV2 ? 'SOIN' : 'CLI'

    const root = tree.find(n => n.code === rootCode)!
    const int = root.children.find(n => n.code === intCode)!

    const created = await service.create({
      name: 'Movable Service',
      code: `${prefix}.MOVE`,
      parent_id: root.id,
    })

    // Move under MEDECINE INTERNE and change code
    const updated = await service.update({
      id: created.id!,
      parent_id: int.id,
      code: `${intCode}.MOVE`,
    })

    expect(updated.parent_id).toBe(int.id)
    expect(updated.code).toBe(`${intCode}.MOVE`)
  })

  it('should reject duplicate code on update', async () => {
    const service = container.resolve(ServiceService)
    const isV2 = await isV2Hierarchy(service)
    const existingCode = isV2 ? 'SOIN' : 'CLI'

    await expect(
      service.update({
        id: 1,
        code: existingCode,
      })
    ).rejects.toThrow('déjà utilisé')
  })

  // ════════════════════════════════════════════════════════════════
  // FAVORITES
  // ════════════════════════════════════════════════════════════════

  describe('getFavorites', () => {
    it('should return empty array when user has no favorites', async () => {
      const service = container.resolve(ServiceService)
      const favorites = await service.getFavorites(1)
      expect(favorites).toEqual([])
    })

    it('should return favorited services for a user', async () => {
      const service = container.resolve(ServiceService)
      const list = await service.list()
      const firstService = list[0]
      const secondService = list[1]

      await service.addFavorite(1, firstService.id!)
      await service.addFavorite(1, secondService.id!)

      const favorites = await service.getFavorites(1)
      expect(favorites.length).toBe(2)
      expect(favorites.map(f => f.id)).toContain(firstService.id)
      expect(favorites.map(f => f.id)).toContain(secondService.id)
    })

    it('should not return other users favorites', async () => {
      const service = container.resolve(ServiceService)
      const list = await service.list()
      const firstService = list[0]

      await service.addFavorite(1, firstService.id!)
      const favoritesUser2 = await service.getFavorites(2)
      expect(favoritesUser2).toEqual([])
    })
  })

  describe('addFavorite', () => {
    it('should add a service to favorites', async () => {
      const service = container.resolve(ServiceService)
      const list = await service.list()
      const svc = list[0]

      await service.addFavorite(1, svc.id!)
      const favorites = await service.getFavorites(1)
      expect(favorites.length).toBe(1)
      expect(favorites[0].id).toBe(svc.id)
    })

    it('should be idempotent when adding duplicate favorite', async () => {
      const service = container.resolve(ServiceService)
      const list = await service.list()
      const svc = list[0]

      await service.addFavorite(1, svc.id!)
      // Should not throw on duplicate
      await expect(service.addFavorite(1, svc.id!)).resolves.not.toThrow()

      const favorites = await service.getFavorites(1)
      expect(favorites.length).toBe(1)
    })

    it('should throw when adding favorite for non-existent service', async () => {
      const service = container.resolve(ServiceService)
      // We can't easily test FK constraints without a real DB, but the method should handle it
      // If the service doesn't exist, we might get an error from SQLite
      // This test just ensures it doesn't crash
      await expect(service.addFavorite(1, -1)).rejects.toThrow()
    })
  })

  describe('removeFavorite', () => {
    it('should remove a service from favorites', async () => {
      const service = container.resolve(ServiceService)
      const list = await service.list()
      const svc = list[0]

      await service.addFavorite(1, svc.id!)
      expect((await service.getFavorites(1)).length).toBe(1)

      await service.removeFavorite(1, svc.id!)
      const favorites = await service.getFavorites(1)
      expect(favorites).toEqual([])
    })

    it('should not throw when removing non-existent favorite', async () => {
      const service = container.resolve(ServiceService)
      await expect(service.removeFavorite(1, 9999)).resolves.not.toThrow()
    })
  })

})
