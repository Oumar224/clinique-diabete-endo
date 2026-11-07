import 'reflect-metadata'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { MedicamentService, normalizeMedicamentName } from '../medicament.service'

describe('MedicamentService', () => {
  let tempDir: string
  let dbPath: string

  beforeAll(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-medicament-test-'))
    dbPath = path.join(tempDir, 'test.db')
    container.register('DB_PATH', { useValue: dbPath })
    const datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()
  }, 120_000)

  afterAll(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch { /* best-effort cleanup */ }
  })

  function service(): MedicamentService {
    return container.resolve(MedicamentService)
  }

  function db() {
    return container.resolve(AppDatabaseDatasource).getInstance()
  }

  // ─── normalizeMedicamentName ─────────────────────────────────────

  it('normalizes names (NFD, case, trim) for catalogue matching', () => {
    expect(normalizeMedicamentName('Paracétamol')).toBe('paracetamol')
    expect(normalizeMedicamentName('  FUROSÉMIDE ')).toBe('furosemide')
    expect(normalizeMedicamentName(null)).toBe('')
    expect(normalizeMedicamentName(undefined)).toBe('')
  })

  // ─── list (seeded catalogue) ─────────────────────────────────────

  it('lists the 8 seeded catalogue entries ordered by DCI', async () => {
    const rows = await service().list()
    expect(rows).toHaveLength(8)
    expect(rows.map((r) => r.dci)).toContain('Metformine')
    expect(rows.map((r) => r.nom_commercial)).toContain('Doliprane')
    const dcis = rows.map((r) => r.dci!)
    expect([...dcis].sort((a, b) => a.localeCompare(b))).toEqual(dcis)
  })

  it('searches by DCI substring, case-insensitively', async () => {
    const rows = await service().list({ search: 'metformine' })
    expect(rows.length).toBeGreaterThanOrEqual(2)
    expect(rows.every((r) => r.dci === 'Metformine')).toBe(true)
  })

  it('searches by nom_commercial', async () => {
    const rows = await service().list({ search: 'Doliprane' })
    expect(rows).toHaveLength(1)
    expect(rows[0].dci).toBe('Paracétamol')
  })

  it('filters out deactivated entries with actif:true', async () => {
    const created = await service().create({ dci: 'TEST-Inactif' })
    await service().deactivate(created.id!)
    const rows = await service().list({ actif: true })
    expect(rows.find((r) => r.id === created.id)).toBeUndefined()
    const all = await service().list()
    expect(all.find((r) => r.id === created.id)).toBeDefined()
  })

  // ─── getById / findByName ────────────────────────────────────────

  it('gets a medicament by id and returns null for unknown id', async () => {
    const created = await service().create({ dci: 'TEST-GetById', dosage: '10 mg' })
    const found = await service().getById(created.id!)
    expect(found?.dci).toBe('TEST-GetById')
    expect(found?.dosage).toBe('10 mg')
    expect(await service().getById(999999)).toBeNull()
  })

  it('findByName matches DCI and nom_commercial, ignoring case and accents', async () => {
    expect((await service().findByName('Paracétamol'))?.dci).toBe('Paracétamol')
    expect((await service().findByName('paracetamol'))?.dci).toBe('Paracétamol')
    expect((await service().findByName('Doliprane'))?.dci).toBe('Paracétamol')
    expect((await service().findByName('DOLIPRANE'))?.dci).toBe('Paracétamol')
    expect((await service().findByName('Furosémide'))?.dci).toBe('Furosémide')
  })

  it('findByName matches DCI + dosage and enriched free-text labels', async () => {
    expect((await service().findByName('Paracétamol 500 mg'))?.dci).toBe('Paracétamol')
    expect((await service().findByName('Doliprane 500 mg'))?.dci).toBe('Paracétamol')
    expect((await service().findByName('Paracétamol 500 mg comprimé'))?.dci).toBe('Paracétamol')
    expect((await service().findByName('AMOXICILLINE 500 MG'))?.dci).toBe('Amoxicilline')
  })

  it('findByName normalise un dosage collé (« 850mg »)', async () => {
    expect((await service().findByName('Metformine 850mg'))?.dosage).toBe('850 mg')
  })

  it('findByName refuses an ambiguous prefix instead of guessing', async () => {
    await service().create({ dci: 'TEST-Ambig' })
    await service().create({ dci: 'TEST-Ambig', dosage: '10 mg' })
    expect(await service().findByName('TEST-Ambig 10 mg comprimé')).toBeNull()
  })

  it('findIdsByLibelles resolves a batch and omits unknown labels', async () => {
    const paracetamol = await service().findByName('Paracétamol')
    const ids = await service().findIdsByLibelles([
      'Paracétamol 500 mg',
      'Doliprane 500 mg',
      'TEST-ZZ-Aucun',
      'Paracétamol 500 mg',
    ])
    expect(ids.get('Paracétamol 500 mg')).toBe(paracetamol!.id)
    expect(ids.get('Doliprane 500 mg')).toBe(paracetamol!.id)
    expect(ids.has('TEST-ZZ-Aucun')).toBe(false)
    expect(ids.size).toBe(2)
  })

  it('findByName returns null for unknown or empty libelle', async () => {
    expect(await service().findByName('TEST-ZZ-Introuvable')).toBeNull()
    expect(await service().findByName('')).toBeNull()
    expect(await service().findByName('   ')).toBeNull()
  })

  it('findByName ignores deactivated entries', async () => {
    const created = await service().create({ dci: 'TEST-Desactive-Match' })
    await service().deactivate(created.id!)
    expect(await service().findByName('TEST-Desactive-Match')).toBeNull()
  })

  // ─── create ──────────────────────────────────────────────────────

  it('creates a medicament with defaults (cp, seuil 0, actif)', async () => {
    const created = await service().create({ dci: 'TEST-Minimal' })
    expect(created.id).toBeDefined()
    expect(created.dci).toBe('TEST-Minimal')
    expect(created.unite_stock).toBe('cp')
    expect(created.seuil_alerte).toBe(0)
    expect(created.actif).toBe(1)
  })

  it('creates a medicament with full data, trimming strings', async () => {
    const created = await service().create({
      dci: '  TEST-Complet  ',
      nomCommercial: ' Commercio ',
      dosage: '250 mg',
      forme: 'Gélule',
      uniteStock: 'gel',
      seuilAlerte: 12,
    })
    expect(created.dci).toBe('TEST-Complet')
    expect(created.nom_commercial).toBe('Commercio')
    // 'gel' normalisé en 'gél' (normalizeUnitePharmacie)
    expect(created.unite_stock).toBe('gél')
    expect(created.seuil_alerte).toBe(12)
  })

  it('rejects creation without DCI', async () => {
    await expect(service().create({ dci: '' })).rejects.toThrow('DCI')
    await expect(service().create({ dci: '   ' })).rejects.toThrow('DCI')
  })

  it('rejects creation with negative or non-integer seuil', async () => {
    await expect(service().create({ dci: 'TEST-X', seuilAlerte: -1 })).rejects.toThrow('seuil')
    await expect(service().create({ dci: 'TEST-X', seuilAlerte: 2.5 })).rejects.toThrow('seuil')
  })

  // ─── Phase 1 : catalogue unique ──────────────────────────────────

  it('defaults type_produit to medicament when omitted', async () => {
    const created = await service().create({ dci: 'TEST-TypeDefaut' })
    expect((created as any).type_produit).toBe('medicament')
    const reloaded = await service().getById(created.id!)
    expect((reloaded as any).type_produit).toBe('medicament')
  })

  it('rejects negative prices but accepts NULL prices', async () => {
    await expect(service().create({ dci: 'TEST-PrixNeg', prixAchat: -5 })).rejects.toThrow('prix')
    await expect(service().create({ dci: 'TEST-PrixNeg2', prixVente: -0.01 })).rejects.toThrow('prix')
    // NaN / Infini rejetés aussi
    await expect(service().create({ dci: 'TEST-PrixNaN', prixAchat: NaN as any })).rejects.toThrow('prix')

    const nul = await service().create({ dci: 'TEST-PrixNull', prixAchat: null, prixVente: null })
    expect((nul as any).prix_achat).toBeNull()
    expect((nul as any).prix_vente).toBeNull()
  })

  it('rounds prices to 2 decimals (Floor non appliqué, round 2.999 -> 3)', async () => {
    const created = await service().create({ dci: 'TEST-PrixRound', prixAchat: 2.999, prixVente: 10.555 })
    expect((created as any).prix_achat).toBe(3)
    expect((created as any).prix_vente).toBe(10.56)
  })

  it('rejects unite autre without precision', async () => {
    await expect(service().create({ dci: 'TEST-AutreKO', uniteStock: 'autre' })).rejects.toThrow('précision')
    await expect(
      service().create({ dci: 'TEST-AutreKO2', uniteStock: 'autre', autreUnitePrecision: 'x' }),
    ).rejects.toThrow('précision')
    const ok = await service().create({
      dci: 'TEST-AutreOK',
      uniteStock: 'autre',
      autreUnitePrecision: 'sachet-dose',
    })
    expect((ok as any).autre_unite_precision).toBe('sachet-dose')
  })

  it('rejects partial contenance couple (tout ou rien)', async () => {
    await expect(service().create({ dci: 'TEST-ContQte', contenanceQte: 500 })).rejects.toThrow('Contenance')
    await expect(service().create({ dci: 'TEST-ContUnite', uniteContenance: 'mL' })).rejects.toThrow('Contenance')
    await expect(service().create({ dci: 'TEST-ContZero', contenanceQte: 0, uniteContenance: 'mL' })).rejects.toThrow(
      'strictement positif',
    )
    const ok = await service().create({ dci: 'TEST-ContOK', contenanceQte: 500, uniteContenance: 'mL' })
    expect((ok as any).contenance_qte).toBe(500)
    expect((ok as any).unite_contenance).toBe('mL')
  })

  // ─── update ──────────────────────────────────────────────────────

  it('updates dosage and seuil', async () => {
    const created = await service().create({ dci: 'TEST-Update', dosage: '100 mg' })
    const updated = await service().update(created.id!, { dosage: '200 mg', seuilAlerte: 5 })
    expect(updated.dosage).toBe('200 mg')
    expect(updated.seuil_alerte).toBe(5)
    expect((await service().getById(created.id!))?.dosage).toBe('200 mg')
  })

  it('rejects update of unknown id, empty DCI and bad seuil', async () => {
    await expect(service().update(999999, { dosage: 'x' })).rejects.toThrow('introuvable')
    const created = await service().create({ dci: 'TEST-UpdateKO' })
    await expect(service().update(created.id!, { dci: '  ' })).rejects.toThrow('DCI')
    await expect(service().update(created.id!, { seuilAlerte: -3 })).rejects.toThrow('seuil')
  })

  it('rejects an empty update', async () => {
    const created = await service().create({ dci: 'TEST-UpdateVide' })
    await expect(service().update(created.id!, {})).rejects.toThrow('Rien à mettre à jour')
  })

  it('ignores the actif filter when actif is null', async () => {
    const created = await service().create({ dci: 'TEST-ActifNull' })
    await service().deactivate(created.id!)
    expect((await service().list({ actif: null as any })).find((r) => r.id === created.id)).toBeDefined()
    expect((await service().list({ actif: true })).find((r) => r.id === created.id)).toBeUndefined()
  })

  // ─── deactivate (blocked only when SUM(lots) > 0) ─────────────────

  it('deactivates a medicament without lots or mouvements', async () => {
    const created = await service().create({ dci: 'TEST-Deactivate' })
    const deactivated = await service().deactivate(created.id!)
    expect(deactivated.actif).toBe(0)
  })

  it('deactivates a medicament whose lots are all empty (SUM = 0)', async () => {
    const created = await service().create({ dci: 'TEST-LotVide' })
    await db()
      .insertInto('stock_lots')
      .values({ medicament_id: created.id!, quantite: 0, quantite_initiale: 10 })
      .execute()
    const deactivated = await service().deactivate(created.id!)
    expect(deactivated.actif).toBe(0)
  })

  it('refuses to deactivate a medicament with remaining stock', async () => {
    const created = await service().create({ dci: 'TEST-StockRestant' })
    await db()
      .insertInto('stock_lots')
      .values({ medicament_id: created.id!, quantite: 3, quantite_initiale: 10 })
      .execute()
    await expect(service().deactivate(created.id!)).rejects.toThrow('inventaire')
    expect((await service().getById(created.id!))?.actif).toBe(1)
  })

  it('deactivates a medicament that only has mouvements (no stock)', async () => {
    const created = await service().create({ dci: 'TEST-MvtSeuls' })
    await db()
      .insertInto('mouvements_stock')
      .values({ medicament_id: created.id!, type: 'ajustement', quantite: 0, motif: 'test' })
      .execute()
    const deactivated = await service().deactivate(created.id!)
    expect(deactivated.actif).toBe(0)
  })

  it('rejects deactivation of unknown id', async () => {
    await expect(service().deactivate(999999)).rejects.toThrow('introuvable')
  })
})
