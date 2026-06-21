import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { LocaliteService } from '../localite.service'

describe('LocaliteService', () => {
  let tempDir: string
  let dbPath: string
  let service: LocaliteService

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-localite-test-'))
    dbPath = path.join(tempDir, 'test.db')
    container.register('DB_PATH', { useValue: dbPath })
    const datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()
    service = container.resolve(LocaliteService)
  })

  afterEach(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch { /* cleanup best-effort */ }
  })

  // ─── Create ─────────────────────────────────────────────────────

  it('should create a prefecture and return it', async () => {
    const created = await service.create({
      code: 'KND',
      name: 'Kindia',
      type: 'prefecture',
    })
    expect(created.id).toBeDefined()
    expect(created.name).toBe('Kindia')
    expect(created.code).toBe('KND')
    expect(created.type).toBe('prefecture')
    expect(created.is_active).toBe(true)
    expect(created.parent_id).toBeNull()
    expect(created.country).toBe('GN')
  })

  it('should create a commune with a parent prefecture', async () => {
    const prefecture = await service.create({ code: 'BOK', name: 'Boké', type: 'prefecture' })
    const commune = await service.create({
      code: 'BOK-C',
      name: 'Boké Centre',
      type: 'commune',
      parent_id: prefecture.id!,
    })
    expect(commune.parent_id).toBe(prefecture.id!)
    expect(commune.type).toBe('commune')
  })

  it('should uppercase the code on create', async () => {
    const created = await service.create({
      code: 'cnk',
      name: 'Conakry',
      type: 'prefecture',
    })
    expect(created.code).toBe('CNK')
  })

  it('should reject empty name', async () => {
    await expect(
      service.create({ code: 'TST', name: '', type: 'prefecture' })
    ).rejects.toThrow('Le nom de la localité est requis')
  })

  it('should reject empty code', async () => {
    await expect(
      service.create({ code: '', name: 'Test', type: 'prefecture' })
    ).rejects.toThrow('Le code de la localité est requis')
  })

  it('should reject duplicate code', async () => {
    await service.create({ code: 'KND', name: 'Kindia', type: 'prefecture' })
    await expect(
      service.create({ code: 'KND', name: 'Kindia Centre', type: 'commune' })
    ).rejects.toThrow('est déjà utilisé')
  })

  // ─── List ───────────────────────────────────────────────────────

  it('should list all localites sorted by name asc', async () => {
    await service.create({ code: 'ZER', name: 'Zérékoré', type: 'prefecture' })
    await service.create({ code: 'BOK', name: 'Boké', type: 'prefecture' })
    await service.create({ code: 'KND', name: 'Kindia', type: 'prefecture' })

    const list = await service.list()
    expect(list.length).toBe(3)
    expect(list[0].name).toBe('Boké')
    expect(list[1].name).toBe('Kindia')
    expect(list[2].name).toBe('Zérékoré')
  })

  it('should return only active localites when activeOnly=true', async () => {
    const a = await service.create({ code: 'KND', name: 'Kindia', type: 'prefecture' })
    const b = await service.create({ code: 'BOK', name: 'Boké', type: 'prefecture' })
    await service.toggle(b.id!, false)

    const active = await service.list(true)
    expect(active.every(l => l.is_active === true)).toBe(true)
    expect(active.find(l => l.id === a.id)).toBeDefined()
    expect(active.find(l => l.id === b.id)).toBeUndefined()
  })

  // ─── GetById ────────────────────────────────────────────────────

  it('should get a localite by id', async () => {
    const created = await service.create({ code: 'LAB', name: 'Labé', type: 'prefecture' })
    const found = await service.getById(created.id!)
    expect(found).toBeDefined()
    expect(found!.name).toBe('Labé')
    expect(found!.code).toBe('LAB')
    expect(found!.type).toBe('prefecture')
  })

  it('should return null for non-existent id', async () => {
    const found = await service.getById(-1)
    expect(found).toBeNull()
  })

  // ─── Search ─────────────────────────────────────────────────────

  it('should search localites by name', async () => {
    await service.create({ code: 'KND', name: 'Kindia', type: 'prefecture' })
    await service.create({ code: 'KNK', name: 'Kankan', type: 'prefecture' })
    await service.create({ code: 'KOB', name: 'Koubia', type: 'prefecture' })
    await service.create({ code: 'DLB', name: 'Dalaba', type: 'prefecture' })

    const results = await service.search('Kin')
    expect(results.length).toBe(1)
    expect(results[0].name).toBe('Kindia')

    const results2 = await service.search('K')
    // Kindia, Kankan, Koubia — 3 matches by name; codes KND, KNK, KOB are also
    // matched by the code search in the service
    expect(results2.length).toBeGreaterThanOrEqual(3)
  })

  it('should search localites by code', async () => {
    await service.create({ code: 'KND', name: 'Kindia', type: 'prefecture' })
    await service.create({ code: 'BOK', name: 'Boké', type: 'prefecture' })

    const results = await service.search('KND')
    expect(results.length).toBe(1)
    expect(results[0].code).toBe('KND')
  })

  it('should return empty array when no matches found', async () => {
    await service.create({ code: 'KND', name: 'Kindia', type: 'prefecture' })
    const results = await service.search('XYZ')
    expect(results).toEqual([])
  })

  it('should return empty array for empty query', async () => {
    await service.create({ code: 'KND', name: 'Kindia', type: 'prefecture' })
    const results = await service.search('')
    expect(results).toEqual([])
  })

  // ─── Toggle ─────────────────────────────────────────────────────

  it('should toggle is_active from true to false and back', async () => {
    const created = await service.create({ code: 'FRI', name: 'Fria', type: 'prefecture' })
    expect(created.is_active).toBe(true)

    const toggledOff = await service.toggle(created.id!, false)
    expect(toggledOff.is_active).toBe(false)

    const toggledOn = await service.toggle(created.id!, true)
    expect(toggledOn.is_active).toBe(true)

    // Verify persistence via getById
    const found = await service.getById(created.id!)
    expect(found!.is_active).toBe(true)
  })

  it('should throw when toggling non-existent localite', async () => {
    await expect(service.toggle(9999, false)).rejects.toThrow('Localité introuvable')
  })

  // ─── Children / Parent hierarchy ────────────────────────────────

  it('should return children of a parent sorted by name', async () => {
    const prefecture = await service.create({ code: 'KND', name: 'Kindia', type: 'prefecture' })

    await service.create({ code: 'KND-C', name: 'Kindia Centre', type: 'commune', parent_id: prefecture.id! })
    await service.create({ code: 'KND-D', name: 'Damakania', type: 'commune', parent_id: prefecture.id! })

    const children = await service.getChildren(prefecture.id!)
    expect(children.length).toBe(2)
    expect(children[0].name).toBe('Damakania') // sorted by name asc
    expect(children[1].name).toBe('Kindia Centre')
    expect(children.every(c => c.parent_id === prefecture.id!)).toBe(true)
  })

  it('should return empty array for parent with no children', async () => {
    const prefecture = await service.create({ code: 'BOK', name: 'Boké', type: 'prefecture' })
    const children = await service.getChildren(prefecture.id!)
    expect(children).toEqual([])
  })

  // ─── Hierarchical Tree ──────────────────────────────────────────

  it('should return hierarchical tree with prefectures and communes', async () => {
    const kindia = await service.create({ code: 'KND', name: 'Kindia', type: 'prefecture' })
    const boke = await service.create({ code: 'BOK', name: 'Boké', type: 'prefecture' })

    await service.create({ code: 'KND-C', name: 'Kindia Centre', type: 'commune', parent_id: kindia.id! })
    await service.create({ code: 'KND-D', name: 'Damakania', type: 'commune', parent_id: kindia.id! })
    await service.create({ code: 'BOK-C', name: 'Boké Centre', type: 'commune', parent_id: boke.id! })

    const tree = await service.getTree()

    // Top level: 2 prefectures sorted by name
    expect(tree.length).toBe(2)
    expect(tree[0].name).toBe('Boké')
    expect(tree[1].name).toBe('Kindia')

    // Kindia should have 2 children
    const kindiaNode = tree.find(n => n.name === 'Kindia')
    expect(kindiaNode).toBeDefined()
    expect(kindiaNode!.children!.length).toBe(2)
    expect(kindiaNode!.children![0].name).toBe('Damakania')
    expect(kindiaNode!.children![1].name).toBe('Kindia Centre')

    // Children should have no further children
    expect(kindiaNode!.children![0].children!.length).toBe(0)
    expect(kindiaNode!.children![1].children!.length).toBe(0)

    // Boké should have 1 child
    const bokeNode = tree.find(n => n.name === 'Boké')
    expect(bokeNode).toBeDefined()
    expect(bokeNode!.children!.length).toBe(1)
    expect(bokeNode!.children![0].name).toBe('Boké Centre')
  })

  it('should return root-level localites only when they have no children', async () => {
    await service.create({ code: 'KND', name: 'Kindia', type: 'prefecture' })
    await service.create({ code: 'BOK', name: 'Boké', type: 'prefecture' })

    const tree = await service.getTree()
    expect(tree.length).toBe(2)
    expect(tree.every(n => n.parent_id === null)).toBe(true)
    expect(tree.every(n => n.children!.length === 0)).toBe(true)
  })

  it('should return empty tree when no localites exist', async () => {
    const tree = await service.getTree()
    expect(tree).toEqual([])
  })

  // ─── Import from JSON (idempotent) ──────────────────────────────

  it('should import localites from gn-localites.json', async () => {
    // The data file exists at electron/data/gn-localites.json
    // importFromJson() reads from join(__dirname, '../data/gn-localites.json')
    // which resolves to electron/data/gn-localites.json
    const count = await service.importFromJson()
    expect(count).toBeGreaterThan(0)

    const list = await service.list()
    expect(list.length).toBeGreaterThan(0)

    // Verify prefectures were imported
    const boke = list.find(l => l.code === 'GN-BOKE')
    expect(boke).toBeDefined()
    expect(boke!.type).toBe('prefecture')
    expect(boke!.name).toBe('Boké')
    expect(boke!.country).toBe('GN')

    // Verify children were imported
    const children = await service.getChildren(boke!.id!)
    expect(children.length).toBeGreaterThan(0)
  })

  it('should be idempotent when importing twice', async () => {
    const firstCount = await service.importFromJson()

    // Import again — onConflict doNothing should skip duplicates
    const secondCount = await service.importFromJson()
    expect(secondCount).toBe(0)

    const list = await service.list()
    expect(list.length).toBe(firstCount)
  })

  // ─── importFromData ────────────────────────────────────────────

  it('should import from JSON data string with custom country code', async () => {
    const data = JSON.stringify([
      {
        code: 'SN-DKR',
        name: 'Dakar',
        type: 'prefecture',
        children: [
          { code: 'SN-DKR-PL', name: 'Plateau', type: 'commune' },
          { code: 'SN-DKR-GR', name: 'Gorée', type: 'commune' },
        ],
      },
    ])

    const count = await service.importFromData(data, 'SN')
    expect(count).toBe(3) // 1 prefecture + 2 children

    const list = await service.list()
    expect(list.length).toBe(3)

    const dakar = list.find(l => l.code === 'SN-DKR')
    expect(dakar).toBeDefined()
    expect(dakar!.country).toBe('SN')
  })

  it('should be idempotent when importing same data twice', async () => {
    const data = JSON.stringify([
      {
        code: 'ML-BKO',
        name: 'Bamako',
        type: 'prefecture',
        children: [
          { code: 'ML-BKO-C1', name: 'Commune I', type: 'commune' },
        ],
      },
    ])

    const firstCount = await service.importFromData(data, 'ML')
    expect(firstCount).toBe(2)

    const secondCount = await service.importFromData(data, 'ML')
    expect(secondCount).toBe(0) // All duplicates
  })

  it('should reject empty country code', async () => {
    const data = JSON.stringify([{ code: 'X', name: 'Test', type: 'prefecture' }])
    await expect(service.importFromData(data, '')).rejects.toThrow('Le code pays est requis')
    await expect(service.importFromData(data, '  ')).rejects.toThrow('Le code pays est requis')
  })

  it('should reject invalid JSON', async () => {
    await expect(service.importFromData('not valid json', 'XX')).rejects.toThrow('Le fichier JSON est invalide')
  })

  it('should reject empty data', async () => {
    await expect(service.importFromData('', 'XX')).rejects.toThrow('Les données JSON sont vides')
  })

  it('should store different countries separately', async () => {
    const snData = JSON.stringify([{ code: 'SN-X', name: 'Senegal Test', type: 'prefecture' }])
    const ciData = JSON.stringify([{ code: 'CI-Y', name: 'Cote Test', type: 'prefecture' }])

    await service.importFromData(snData, 'SN')
    await service.importFromData(ciData, 'CI')

    const list = await service.list()
    expect(list.length).toBe(2)

    const sn = list.find(l => l.code === 'SN-X')
    expect(sn!.country).toBe('SN')

    const ci = list.find(l => l.code === 'CI-Y')
    expect(ci!.country).toBe('CI')
  })

  it('should handle empty children array', async () => {
    const data = JSON.stringify([
      { code: 'XX-A', name: 'Only Prefecture', type: 'prefecture', children: [] },
    ])
    const count = await service.importFromData(data, 'XX')
    expect(count).toBe(1)
  })

  it('should skip entries with missing code or name', async () => {
    const data = JSON.stringify([
      { code: 'XX-V1', name: 'Valid', type: 'prefecture', children: [
        { code: 'XX-V1-C1', name: 'Valid Child', type: 'commune' },
        { name: 'Missing Code', type: 'commune' },               // skipped: no code
        { code: 'XX-V1-C3' }                                      // skipped: no name
      ] },
    ])
    const count = await service.importFromData(data, 'XX')
    expect(count).toBe(2) // 1 prefecture + 1 valid child
  })

  // ─── Edge cases ─────────────────────────────────────────────────

  it('should handle deep nesting in getTree', async () => {
    // prefecture → commune → sous_prefecture
    const prefecture = await service.create({ code: 'KND', name: 'Kindia', type: 'prefecture' })
    const commune = await service.create({
      code: 'KND-C',
      name: 'Kindia Centre',
      type: 'commune',
      parent_id: prefecture.id!,
    })
    await service.create({
      code: 'KND-QA',
      name: 'Quartier Administratif',
      type: 'sous_prefecture',
      parent_id: commune.id!,
    })

    const tree = await service.getTree()
    expect(tree.length).toBe(1)
    expect(tree[0].children!.length).toBe(1)
    expect(tree[0].children![0].children!.length).toBe(1)
    expect(tree[0].children![0].children![0].name).toBe('Quartier Administratif')
  })

  it('should return only matching results from getChildren for the correct parent', async () => {
    const a = await service.create({ code: 'PA', name: 'Préfecture A', type: 'prefecture' })
    const b = await service.create({ code: 'PB', name: 'Préfecture B', type: 'prefecture' })

    await service.create({ code: 'PA-C1', name: 'Commune A1', type: 'commune', parent_id: a.id! })
    await service.create({ code: 'PB-C1', name: 'Commune B1', type: 'commune', parent_id: b.id! })

    const childrenOfA = await service.getChildren(a.id!)
    expect(childrenOfA.length).toBe(1)
    expect(childrenOfA[0].name).toBe('Commune A1')

    const childrenOfB = await service.getChildren(b.id!)
    expect(childrenOfB.length).toBe(1)
    expect(childrenOfB[0].name).toBe('Commune B1')
  })

  it('should reject code exceeding 20 characters', async () => {
    await expect(
      service.create({ code: 'A'.repeat(21), name: 'Test', type: 'prefecture' })
    ).rejects.toThrow('Le code de la localité ne peut pas dépasser 20 caractères')
  })

  it('should reject name exceeding 200 characters', async () => {
    await expect(
      service.create({ code: 'TST', name: 'A'.repeat(201), type: 'prefecture' })
    ).rejects.toThrow('Le nom de la localité ne peut pas dépasser 200 caractères')
  })
})
