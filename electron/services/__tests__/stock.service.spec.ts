import 'reflect-metadata'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { MedicamentService } from '../medicament.service'
import { StockService, toUserId } from '../stock.service'
import { PlanSoinsService } from '../plan-soins.service'

function isoDaysFromNow(deltaDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}

describe('StockService', () => {
  let tempDir: string
  let dbPath: string
  let patientId: number

  beforeAll(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-stock-test-'))
    dbPath = path.join(tempDir, 'test.db')
    container.register('DB_PATH', { useValue: dbPath })
    const datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()

    const db = datasource.getInstance()
    const p = await db
      .insertInto('patient')
      .values({
        civilite: 'M',
        nom: 'Pharma',
        prenom: 'Test',
        date_naissance: '1980-01-01',
        nir: 'TEST-PHARMA-001',
        telephone: '0611111111',
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    patientId = p.id!
  }, 120_000)

  afterAll(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch { /* best-effort cleanup */ }
  })

  function service(): StockService {
    return container.resolve(StockService)
  }

  function medicaments(): MedicamentService {
    return container.resolve(MedicamentService)
  }

  function db() {
    return container.resolve(AppDatabaseDatasource).getInstance()
  }

  async function mouvementCount(medicamentId: number, type?: string): Promise<number> {
    let q = db().selectFrom('mouvements_stock').select('id').where('medicament_id', '=', medicamentId)
    if (type) q = q.where('type', '=', type as any)
    return (await q.execute()).length
  }

  // ─── toUserId ────────────────────────────────────────────────────

  it('toUserId coerces numeric ids and rejects the rest', () => {
    expect(toUserId(7)).toBe(7)
    expect(toUserId('42')).toBe(42)
    expect(toUserId('  3 ')).toBe(3)
    expect(toUserId(undefined)).toBeUndefined()
    expect(toUserId('abc')).toBeUndefined()
    expect(toUserId(2.5)).toBeUndefined()
    expect(toUserId('')).toBeUndefined()
  })

  // ─── niveaux ─────────────────────────────────────────────────────

  it('computes niveaux (total, seuil, nb lots, min peremption)', async () => {
    const med = await medicaments().create({ dci: 'TEST-Niveaux', seuilAlerte: 10 })
    await service().entree({ medicamentId: med.id!, quantite: 30, numeroLot: 'NIV-A', datePeremption: isoDaysFromNow(90) })
    await service().entree({ medicamentId: med.id!, quantite: 20, numeroLot: 'NIV-B', datePeremption: isoDaysFromNow(30) })

    const niveau = (await service().niveaux()).find((n) => n.medicamentId === med.id!)!
    expect(niveau.stockTotal).toBe(50)
    expect(niveau.nbLots).toBe(2)
    expect(niveau.seuilAlerte).toBe(10)
    expect(niveau.prochainePeremption).toBe(isoDaysFromNow(30))
  })

  it('reports zero stock and no peremption for a medicament without lots', async () => {
    const med = await medicaments().create({ dci: 'TEST-NiveauxVide' })
    const niveau = (await service().niveaux()).find((n) => n.medicamentId === med.id!)!
    expect(niveau.stockTotal).toBe(0)
    expect(niveau.nbLots).toBe(0)
    expect(niveau.prochainePeremption).toBeUndefined()
  })

  it('excludes empty lots and deactivated medicaments from niveaux', async () => {
    const med = await medicaments().create({ dci: 'TEST-NiveauxVide2' })
    await service().entree({ medicamentId: med.id!, quantite: 5, numeroLot: 'NIV-C' })
    await service().sortieManuelle({ medicamentId: med.id!, quantite: 5, motif: 'vide le lot' })
    const niveau = (await service().niveaux()).find((n) => n.medicamentId === med.id!)!
    expect(niveau.stockTotal).toBe(0)
    expect(niveau.nbLots).toBe(0)

    const gone = await medicaments().create({ dci: 'TEST-NiveauxGone' })
    await medicaments().deactivate(gone.id!)
    expect((await service().niveaux()).find((n) => n.medicamentId === gone.id!)).toBeUndefined()
  })

  // ─── lots (FIFO order) ───────────────────────────────────────────

  it('lists lots ordered by peremption ASC, NULLS LAST, id ASC on ties', async () => {
    const med = await medicaments().create({ dci: 'TEST-LotsOrdre' })
    const late = await service().entree({ medicamentId: med.id!, quantite: 5, numeroLot: 'ORD-LATE', datePeremption: isoDaysFromNow(200) })
    const early = await service().entree({ medicamentId: med.id!, quantite: 5, numeroLot: 'ORD-EARLY', datePeremption: isoDaysFromNow(10) })
    const noDate = await service().entree({ medicamentId: med.id!, quantite: 5, numeroLot: 'ORD-NODATE' })
    const tie = await service().entree({ medicamentId: med.id!, quantite: 5, numeroLot: 'ORD-TIE', datePeremption: isoDaysFromNow(10) })

    const lots = await service().lots(med.id!)
    expect(lots.map((l) => l.id)).toEqual([early.id, tie.id, late.id, noDate.id])
  })

  // ─── entree ──────────────────────────────────────────────────────

  it('creates a lot and records an entree mouvement with before/after stock', async () => {
    const med = await medicaments().create({ dci: 'TEST-Entree' })
    const lot = await service().entree({
      medicamentId: med.id!,
      quantite: 25,
      numeroLot: 'ENT-1',
      datePeremption: isoDaysFromNow(60),
    })
    expect(lot.quantite).toBe(25)
    expect(lot.quantite_initiale).toBe(25)
    expect(lot.numero_lot).toBe('ENT-1')

    const mouvements = await service().mouvements({ medicamentId: med.id!, type: 'entree' })
    expect(mouvements).toHaveLength(1)
    expect(mouvements[0].quantite).toBe(25)
    expect(mouvements[0].stockAvant).toBe(0)
    expect(mouvements[0].stockApres).toBe(25)
    expect(mouvements[0].medicamentLabel).toBe('TEST-Entree')
  })

  it('increments the existing lot and cumulates quantite_initiale', async () => {
    const med = await medicaments().create({ dci: 'TEST-EntreeBis' })
    await service().entree({ medicamentId: med.id!, quantite: 10, numeroLot: 'ENT-BIS' })
    const lot = await service().entree({ medicamentId: med.id!, quantite: 7, numeroLot: 'ENT-BIS' })
    expect(lot.quantite).toBe(17)
    expect(lot.quantite_initiale).toBe(17)
  })

  it('refuses to merge an entree with a different peremption', async () => {
    const med = await medicaments().create({ dci: 'TEST-EntreePeremp' })
    await service().entree({ medicamentId: med.id!, quantite: 10, numeroLot: 'ENT-PER', datePeremption: isoDaysFromNow(60) })
    await expect(
      service().entree({ medicamentId: med.id!, quantite: 5, numeroLot: 'ENT-PER', datePeremption: isoDaysFromNow(90) }),
    ).rejects.toThrow('péremption différente')
    const lots = await service().lots(med.id!)
    expect(lots).toHaveLength(1)
    expect(lots[0].quantite).toBe(10)
  })

  it('rejects entree with bad quantity, bad date or unknown medicament', async () => {
    const med = await medicaments().create({ dci: 'TEST-EntreeKO' })
    await expect(service().entree({ medicamentId: med.id!, quantite: 0 })).rejects.toThrow('Quantité')
    await expect(service().entree({ medicamentId: med.id!, quantite: -4 })).rejects.toThrow('Quantité')
    await expect(service().entree({ medicamentId: med.id!, quantite: 5, datePeremption: '60 jours' })).rejects.toThrow('péremption')
    await expect(service().entree({ medicamentId: 999999, quantite: 5 })).rejects.toThrow('introuvable')
  })

  // ─── Phase 1 : traçabilité lot (fournisseur + prix snapshot) ─────

  it('floors fractional quantities (2.9 -> 2)', async () => {
    const med = await medicaments().create({ dci: 'TEST-Floor' })
    const lot = await service().entree({ medicamentId: med.id!, quantite: 2.9, numeroLot: 'FLOOR-1' })
    expect(lot.quantite).toBe(2)
    expect(lot.quantite_initiale).toBe(2)
  })

  it('entree inherits the principal fournisseur when none is given', async () => {
    const four = await db()
      .insertInto('fournisseurs')
      .values({ nom: 'TEST-Labo-Heritage', actif: 1 })
      .returningAll()
      .executeTakeFirstOrThrow()
    const med = await medicaments().create({ dci: 'TEST-HeritageFour', fournisseurPrincipalId: (four as any).id })
    const lot = await service().entree({ medicamentId: med.id!, quantite: 10, numeroLot: 'HERIT-1' })
    expect((lot as any).fournisseur_id).toBe((four as any).id)
  })

  it('entree explicit fournisseurId overrides the principal', async () => {
    const f1 = await db()
      .insertInto('fournisseurs')
      .values({ nom: 'TEST-Labo-P1', actif: 1 })
      .returningAll()
      .executeTakeFirstOrThrow()
    const f2 = await db()
      .insertInto('fournisseurs')
      .values({ nom: 'TEST-Labo-P2', actif: 1 })
      .returningAll()
      .executeTakeFirstOrThrow()
    const med = await medicaments().create({ dci: 'TEST-OverrideFour', fournisseurPrincipalId: (f1 as any).id })
    const lot = await service().entree({
      medicamentId: med.id!,
      quantite: 5,
      numeroLot: 'OVER-1',
      fournisseurId: (f2 as any).id,
    })
    expect((lot as any).fournisseur_id).toBe((f2 as any).id)
  })

  it('refuse une entrée manuelle depuis un fournisseur inactif', async () => {
    const inactive = await db()
      .insertInto('fournisseurs')
      .values({ nom: 'TEST-Labo-Inactif', actif: 0 })
      .returningAll()
      .executeTakeFirstOrThrow()
    const med = await medicaments().create({ dci: 'TEST-InactifFour' })

    await expect(service().entree({
      medicamentId: med.id!,
      quantite: 5,
      numeroLot: 'INACTIF-1',
      fournisseurId: (inactive as any).id,
    })).rejects.toThrow('Le fournisseur est inactif')
    expect(await service().lots(med.id!)).toHaveLength(0)
  })

  it('ne fusionne pas un même numéro de lot provenant de fournisseurs différents', async () => {
    const f1 = await db()
      .insertInto('fournisseurs')
      .values({ nom: 'TEST-Labo-Merge1', actif: 1 })
      .returningAll()
      .executeTakeFirstOrThrow()
    const f2 = await db()
      .insertInto('fournisseurs')
      .values({ nom: 'TEST-Labo-Merge2', actif: 1 })
      .returningAll()
      .executeTakeFirstOrThrow()
    const med = await medicaments().create({ dci: 'TEST-MergeFour' })

    await service().entree({ medicamentId: med.id!, quantite: 5, numeroLot: 'MERGE-1', fournisseurId: (f1 as any).id })
    await service().entree({ medicamentId: med.id!, quantite: 7, numeroLot: 'MERGE-1', fournisseurId: (f2 as any).id })
    const merged = await service().entree({ medicamentId: med.id!, quantite: 3, numeroLot: 'MERGE-1', fournisseurId: (f1 as any).id })

    const lots = await service().lots(med.id!)
    expect(lots).toHaveLength(2)
    expect(lots.find((l) => (l as any).fournisseur_id === (f1 as any).id)?.quantite).toBe(8)
    expect(lots.find((l) => (l as any).fournisseur_id === (f2 as any).id)?.quantite).toBe(7)
    expect(merged.quantite).toBe(8)
  })

  it('ne fusionne pas un même numéro de lot provenant de réceptions différentes', async () => {
    const four = await db()
      .insertInto('fournisseurs')
      .values({ nom: 'TEST-Labo-Reception', actif: 1 })
      .returningAll()
      .executeTakeFirstOrThrow()
    const med = await medicaments().create({ dci: 'TEST-MergeReception' })
    const commande = await db()
      .insertInto('commandes')
      .values({
        numero: 'BC-TEST-MERGE-REC-1',
        fournisseur_id: (four as any).id,
        date_commande: '2026-10-24',
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    const reception1 = await db()
      .insertInto('commande_receptions')
      .values({ commande_id: (commande as any).id, date_reception: '2026-10-25' })
      .returningAll()
      .executeTakeFirstOrThrow()
    const reception2 = await db()
      .insertInto('commande_receptions')
      .values({ commande_id: (commande as any).id, date_reception: '2026-10-26' })
      .returningAll()
      .executeTakeFirstOrThrow()

    await service().entree({
      medicamentId: med.id!,
      quantite: 5,
      numeroLot: 'MERGE-REC-1',
      fournisseurId: (four as any).id,
      commandeReceptionId: (reception1 as any).id,
    })
    await service().entree({
      medicamentId: med.id!,
      quantite: 7,
      numeroLot: 'MERGE-REC-1',
      fournisseurId: (four as any).id,
      commandeReceptionId: (reception2 as any).id,
    })
    const merged = await service().entree({
      medicamentId: med.id!,
      quantite: 3,
      numeroLot: 'MERGE-REC-1',
      fournisseurId: (four as any).id,
      commandeReceptionId: (reception1 as any).id,
    })

    const lots = await service().lots(med.id!)
    expect(lots).toHaveLength(2)
    expect(lots.find((l) => (l as any).commande_reception_id === (reception1 as any).id)?.quantite).toBe(8)
    expect(lots.find((l) => (l as any).commande_reception_id === (reception2 as any).id)?.quantite).toBe(7)
    expect(merged.quantite).toBe(8)
  })

  it('snapshots catalogue prix_achat on the lot and keeps it immutable', async () => {
    const med = await medicaments().create({ dci: 'TEST-SnapPrix', prixAchat: 100 })
    const lot = await service().entree({ medicamentId: med.id!, quantite: 10, numeroLot: 'SNAP-1' })
    expect((lot as any).prix_achat).toBe(100)
    // le catalogue évolue après : le lot garde son snapshot
    await medicaments().update(med.id!, { prixAchat: 200 })
    const reloaded = (await service().lots(med.id!)).find((l) => l.numero_lot === 'SNAP-1')!
    expect((reloaded as any).prix_achat).toBe(100)
    // ré-entrée sur le même lot (merge) : prix inchangé, quantités cumulées
    const merged = await service().entree({ medicamentId: med.id!, quantite: 5, numeroLot: 'SNAP-1', prixAchat: 250 })
    expect((merged as any).prix_achat).toBe(100)
    expect(merged.quantite).toBe(15)
    expect(merged.quantite_initiale).toBe(15)
  })

  // ─── sortieManuelle ──────────────────────────────────────────────

  it('consumes FIFO across lots and records one mouvement per lot', async () => {
    const med = await medicaments().create({ dci: 'TEST-Sortie' })
    const lot1 = await service().entree({ medicamentId: med.id!, quantite: 10, numeroLot: 'SRT-1', datePeremption: isoDaysFromNow(10) })
    const lot2 = await service().entree({ medicamentId: med.id!, quantite: 20, numeroLot: 'SRT-2', datePeremption: isoDaysFromNow(100) })

    const lignes = await service().sortieManuelle({ medicamentId: med.id!, quantite: 15, motif: 'perte' })
    expect(lignes).toEqual([
      { lotId: lot1.id, quantite: 10 },
      { lotId: lot2.id, quantite: 5 },
    ])

    const lots = await service().lots(med.id!)
    expect(lots.find((l) => l.id === lot1.id)?.quantite).toBe(0)
    expect(lots.find((l) => l.id === lot2.id)?.quantite).toBe(15)

    const mouvements = await service().mouvements({ medicamentId: med.id!, type: 'sortie_manuelle' })
    expect(mouvements).toHaveLength(2)
    expect(mouvements.every((m) => m.motif === 'perte')).toBe(true)
    expect(mouvements.reduce((s, m) => s + (m.quantite ?? 0), 0)).toBe(-15)
  })

  it('refuses sortieManuelle without motif or with insufficient stock (no writes)', async () => {
    const med = await medicaments().create({ dci: 'TEST-SortieKO' })
    await service().entree({ medicamentId: med.id!, quantite: 4, numeroLot: 'SRT-KO' })
    await expect(service().sortieManuelle({ medicamentId: med.id!, quantite: 2, motif: '   ' })).rejects.toThrow('Motif')
    await expect(service().sortieManuelle({ medicamentId: med.id!, quantite: 99, motif: 'x' })).rejects.toThrow('insuffisant')

    const lots = await service().lots(med.id!)
    expect(lots[0].quantite).toBe(4)
    expect(await mouvementCount(med.id!, 'sortie_manuelle')).toBe(0)
  })

  // ─── ajustement ──────────────────────────────────────────────────

  it('adjusts a lot up and down with signed mouvements', async () => {
    const med = await medicaments().create({ dci: 'TEST-Ajust' })
    const lot = await service().entree({ medicamentId: med.id!, quantite: 10, numeroLot: 'ADJ-1' })

    const up = await service().ajustement({ medicamentId: med.id!, lotId: lot.id!, quantiteNouvelle: 15, motif: 'inventaire +' })
    expect(up.quantite).toBe(15)
    const down = await service().ajustement({ medicamentId: med.id!, lotId: lot.id!, quantiteNouvelle: 7, motif: 'casse' })
    expect(down.quantite).toBe(7)

    const mouvements = await service().mouvements({ medicamentId: med.id!, type: 'ajustement' })
    expect(mouvements.map((m) => m.quantite).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([-8, 5])
    expect(mouvements.every((m) => typeof m.motif === 'string' && m.motif.length > 0)).toBe(true)
  })

  it('rejects ajustement without motif, on unknown lot, or across medicaments', async () => {
    const med = await medicaments().create({ dci: 'TEST-AjustKO' })
    const lot = await service().entree({ medicamentId: med.id!, quantite: 10, numeroLot: 'ADJ-KO' })
    await expect(service().ajustement({ medicamentId: med.id!, lotId: lot.id!, quantiteNouvelle: 5, motif: '' })).rejects.toThrow('Motif')

    const other = await medicaments().create({ dci: 'TEST-AjustAutre' })
    await expect(service().ajustement({ medicamentId: other.id!, lotId: lot.id!, quantiteNouvelle: 5, motif: 'x' })).rejects.toThrow('Lot invalide')
  })

  it('rejects ajustement with no lot at all, or several lots without lotId', async () => {
    const empty = await medicaments().create({ dci: 'TEST-AjustVide' })
    await expect(service().ajustement({ medicamentId: empty.id!, quantiteNouvelle: 5, motif: 'x' })).rejects.toThrow('Aucun lot')

    const multi = await medicaments().create({ dci: 'TEST-AjustMulti' })
    await service().entree({ medicamentId: multi.id!, quantite: 5, numeroLot: 'ADJ-M1' })
    await service().entree({ medicamentId: multi.id!, quantite: 5, numeroLot: 'ADJ-M2' })
    await expect(service().ajustement({ medicamentId: multi.id!, quantiteNouvelle: 9, motif: 'x' })).rejects.toThrow('Plusieurs lots')
  })

  // ─── alertes ─────────────────────────────────────────────────────

  it('classifies ruptures, sous-seuil, perimes and peremption-proche (disjoint)', async () => {
    const rupture = await medicaments().create({ dci: 'TEST-AlRupture', seuilAlerte: 5 })
    const sousSeuil = await medicaments().create({ dci: 'TEST-AlSeuil', seuilAlerte: 10 })
    await service().entree({ medicamentId: sousSeuil.id!, quantite: 4, numeroLot: 'AL-S' })
    const perime = await medicaments().create({ dci: 'TEST-AlPerime' })
    await service().entree({ medicamentId: perime.id!, quantite: 6, numeroLot: 'AL-P', datePeremption: isoDaysFromNow(-2) })
    const proche = await medicaments().create({ dci: 'TEST-AlProche' })
    await service().entree({ medicamentId: proche.id!, quantite: 8, numeroLot: 'AL-N', datePeremption: isoDaysFromNow(30) })
    const loin = await medicaments().create({ dci: 'TEST-AlLoin' })
    await service().entree({ medicamentId: loin.id!, quantite: 50, numeroLot: 'AL-L', datePeremption: isoDaysFromNow(400) })
    const sansDate = await medicaments().create({ dci: 'TEST-AlSansDate' })
    await service().entree({ medicamentId: sansDate.id!, quantite: 50, numeroLot: 'AL-SD' })

    const alertes = await service().alertes()
    const dcis = (list: Array<{ dci: string }>) => list.map((n) => n.dci)
    expect(dcis(alertes.ruptures)).toContain('TEST-AlRupture')
    expect(dcis(alertes.sousSeuil)).not.toContain('TEST-AlRupture')
    expect(dcis(alertes.sousSeuil)).toContain('TEST-AlSeuil')
    expect(dcis(alertes.sousSeuil)).not.toContain('TEST-AlLoin')
    // ruptures ⟂ sousSeuil : non-chevauchement explicite (pas de double-compte badge)
    const ruptureSet = new Set(dcis(alertes.ruptures))
    const overlap = dcis(alertes.sousSeuil).filter((dci) => ruptureSet.has(dci))
    expect(overlap).toEqual([])

    expect(alertes.perimes.map((l) => l.numeroLot)).toContain('AL-P')
    expect(alertes.peremptionProche.map((l) => l.numeroLot)).toContain('AL-N')
    // périmé ≠ proche : disjonction stricte
    expect(alertes.peremptionProche.find((l) => l.numeroLot === 'AL-P')).toBeUndefined()
  })

  it('honours a custom peremptionMois window', async () => {
    const med = await medicaments().create({ dci: 'TEST-AlFenetre' })
    await service().entree({ medicamentId: med.id!, quantite: 3, numeroLot: 'AL-F', datePeremption: isoDaysFromNow(150) })

    expect((await service().alertes()).peremptionProche.find((l) => l.numeroLot === 'AL-F')).toBeUndefined()
    const wide = await service().alertes({ peremptionMois: 6 })
    expect(wide.peremptionProche.map((l) => l.numeroLot)).toContain('AL-F')
  })

  // ─── administration ──────────────────────────────────────────────

  it('administration decrements stock and logs a plan_soins_item mouvement', async () => {
    const match = await medicaments().findByName('Paracétamol')
    expect(match).not.toBeNull()
    await service().entree({ medicamentId: match!.id!, quantite: 10, numeroLot: 'ADM-1' })
    const before = await mouvementCount(match!.id!, 'administration')

    const result = await service().administration({ libelle: 'Doliprane', planSoinsItemId: 4242, quantite: 3 })
    expect(result).not.toBeNull()
    expect(result!.medicamentId).toBe(match!.id)
    expect(result!.lignes.reduce((s, l) => s + l.quantite, 0)).toBe(3)

    expect(await mouvementCount(match!.id!, 'administration')).toBe(before + 1)
    const mouvements = await service().mouvements({ medicamentId: match!.id!, type: 'administration' })
    const last = mouvements[0]
    expect(last.quantite).toBe(-3)
    expect((last as any).referenceType).toBe('plan_soins_item')
    expect((last as any).referenceId).toBe('4242')
  })

  it('administration returns null without match (nothing written), throws when stock is short', async () => {
    const unknownBefore = await db().selectFrom('mouvements_stock').select('id').execute()
    expect(await service().administration({ libelle: 'TEST-ZZ-NoSuchDrug', planSoinsItemId: 1 })).toBeNull()
    expect((await db().selectFrom('mouvements_stock').select('id').execute()).length).toBe(unknownBefore.length)

    const low = await medicaments().create({ dci: 'TEST-AdmFaible' })
    await service().entree({ medicamentId: low.id!, quantite: 1, numeroLot: 'ADM-LOW' })
    await expect(service().administration({ libelle: 'TEST-AdmFaible', planSoinsItemId: 2, quantite: 5 }))
      .rejects.toThrow('Stock insuffisant')
    // rollback : le lot est intact, aucun mouvement administration
    expect((await service().lots(low.id!))[0].quantite).toBe(1)
    expect(await mouvementCount(low.id!, 'administration')).toBe(0)
  })

  it('consumeFifo skips expired lots, takes NULLS LAST and logs progressive avant/après', async () => {
    const med = await medicaments().create({ dci: 'TEST-FifoPerime' })
    await service().entree({ medicamentId: med.id!, quantite: 100, numeroLot: 'FIFO-OLD', datePeremption: isoDaysFromNow(-5) })
    const early = await service().entree({ medicamentId: med.id!, quantite: 10, numeroLot: 'FIFO-EARLY', datePeremption: isoDaysFromNow(10) })
    const late = await service().entree({ medicamentId: med.id!, quantite: 10, numeroLot: 'FIFO-LATE', datePeremption: isoDaysFromNow(100) })
    const nodate = await service().entree({ medicamentId: med.id!, quantite: 10, numeroLot: 'FIFO-NODATE' })

    // 25 consommés : EARLY (10) + LATE (10) + NODATE (5), le périmé est exclu
    const lignes = await service().sortieManuelle({ medicamentId: med.id!, quantite: 25, motif: 'fifo-test' })
    expect(lignes).toEqual([
      { lotId: early.id, quantite: 10 },
      { lotId: late.id, quantite: 10 },
      { lotId: nodate.id, quantite: 5 },
    ])
    const lots = await service().lots(med.id!)
    expect(lots.find((l) => l.numero_lot === 'FIFO-OLD')?.quantite).toBe(100)

    const mouvements = await service().mouvements({ medicamentId: med.id!, type: 'sortie_manuelle' })
    expect(mouvements).toHaveLength(3)
    // avant/après progressifs : 130→120, 120→110, 110→105
    const byLot = new Map(mouvements.map((m) => [(m as any).lotId, m]))
    expect([byLot.get(early.id!)?.stockAvant, byLot.get(early.id!)?.stockApres]).toEqual([130, 120])
    expect([byLot.get(late.id!)?.stockAvant, byLot.get(late.id!)?.stockApres]).toEqual([120, 110])
    expect([byLot.get(nodate.id!)?.stockAvant, byLot.get(nodate.id!)?.stockApres]).toEqual([110, 105])
  })

  it('decrementLot refuses an expired lot', async () => {
    const med = await medicaments().create({ dci: 'TEST-DecrPerime' })
    const lot = await service().entree({ medicamentId: med.id!, quantite: 5, numeroLot: 'DEC-OLD', datePeremption: isoDaysFromNow(-1) })
    await expect(
      service().decrementLot(service().db as any, { lotId: lot.id!, medicamentId: med.id!, quantite: 1, type: 'sortie_manuelle' }),
    ).rejects.toThrow('périmé')
    expect((await service().lots(med.id!))[0].quantite).toBe(5)
  })

  // ─── mouvements (filters, label, paging) ─────────────────────────

  it('filters mouvements by type and medicament, labels them, pages them', async () => {
    const medA = await medicaments().create({ dci: 'TEST-MvtA', dosage: '250 mg' })
    const medB = await medicaments().create({ dci: 'TEST-MvtB' })
    await service().entree({ medicamentId: medA.id!, quantite: 10, numeroLot: 'MVT-A' })
    await service().entree({ medicamentId: medB.id!, quantite: 10, numeroLot: 'MVT-B' })
    await service().sortieManuelle({ medicamentId: medA.id!, quantite: 2, motif: 'mvt-test' })

    const allA = await service().mouvements({ medicamentId: medA.id! })
    expect(allA).toHaveLength(2)
    // plus récent d'abord
    expect(allA[0].type).toBe('sortie_manuelle')
    expect(allA[1].type).toBe('entree')
    expect(allA[0].medicamentLabel).toBe('TEST-MvtA 250 mg')

    const entrees = await service().mouvements({ type: 'entree', limit: 50 })
    expect(entrees.length).toBeGreaterThanOrEqual(2)
    expect(entrees.every((m) => m.type === 'entree')).toBe(true)

    const page1 = await service().mouvements({ medicamentId: medA.id!, limit: 1 })
    const page2 = await service().mouvements({ medicamentId: medA.id!, limit: 1, offset: 1 })
    expect(page1).toHaveLength(1)
    expect(page2).toHaveLength(1)
    expect(page1[0].id).not.toBe(page2[0].id)
  })

  it('clamps limit to [1, 500]', async () => {
    const med = await medicaments().create({ dci: 'TEST-MvtClamp' })
    await service().entree({ medicamentId: med.id!, quantite: 5, numeroLot: 'MVT-C1' })
    await service().entree({ medicamentId: med.id!, quantite: 5, numeroLot: 'MVT-C2' })
    await service().entree({ medicamentId: med.id!, quantite: 5, numeroLot: 'MVT-C3' })
    expect((await service().mouvements({ medicamentId: med.id!, limit: 0 })).length).toBe(1)
    expect((await service().mouvements({ medicamentId: med.id!, limit: 2 })).length).toBe(2)
  })

  // ─── Hook : plan-soins validerSoin → administration ──────────────

  async function insertSoinItem(medicament: string) {
    const datasource = container.resolve(AppDatabaseDatasource)
    const gdb = datasource.getInstance()
    const ps = await gdb
      .insertInto('plan_soins')
      .values({ patient_id: patientId, date: '2025-06-15', created_by: 1 } as any)
      .returningAll()
      .executeTakeFirstOrThrow()
    return gdb
      .insertInto('plan_soins_items')
      .values({
        plan_soins_id: ps.id!,
        bloc_heure: '08:00',
        medicament,
        dosage: '500mg',
        voie: 'PO',
        statut: 'en_attente',
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  it('validerSoin decrements matched stock and logs an administration mouvement', async () => {
    const match = await medicaments().findByName('Furosémide')
    expect(match).not.toBeNull()
    await service().entree({ medicamentId: match!.id!, quantite: 10, numeroLot: 'VAL-1' })
    const item = await insertSoinItem('Furosémide')

    const plans = container.resolve(PlanSoinsService)
    const result = await plans.validerSoin(item.id!, 'Dr. Test')
    expect(result.statut).toBe('valide')

    const lots = await service().lots(match!.id!)
    expect(lots.reduce((s, l) => s + (l.quantite ?? 0), 0)).toBe(9)
    const mouvements = await service().mouvements({ medicamentId: match!.id!, type: 'administration' })
    const logged = mouvements.find((m) => (m as any).referenceId === String(item.id!))
    expect(logged).toBeDefined()
    expect(logged!.quantite).toBe(-1)
  })

  it('validerSoin skips stock silently for an unknown libelle', async () => {
    const before = (await db().selectFrom('mouvements_stock').select('id').execute()).length
    const item = await insertSoinItem('TEST-ZZ-NoSuchDrug-XYZ')

    const plans = container.resolve(PlanSoinsService)
    const result = await plans.validerSoin(item.id!, 'Dr. Test')
    expect(result.statut).toBe('valide')
    expect((await db().selectFrom('mouvements_stock').select('id').execute()).length).toBe(before)
  })

  it('validerSoin is idempotent (second call decrements nothing)', async () => {
    const match = await medicaments().findByName('Paracétamol')
    expect(match).not.toBeNull()
    await service().entree({ medicamentId: match!.id!, quantite: 10, numeroLot: 'VAL-IDEM' })
    const item = await insertSoinItem('Paracétamol')

    const plans = container.resolve(PlanSoinsService)
    const mvtBefore = await mouvementCount(match!.id!, 'administration')
    await plans.validerSoin(item.id!, 'Dr. Test')
    const afterFirst = (await service().lots(match!.id!)).reduce((s, l) => s + (l.quantite ?? 0), 0)

    const again = await plans.validerSoin(item.id!, 'Dr. Test')
    expect(again.statut).toBe('valide')
    const afterSecond = (await service().lots(match!.id!)).reduce((s, l) => s + (l.quantite ?? 0), 0)
    expect(afterSecond).toBe(afterFirst)
    expect(await mouvementCount(match!.id!, 'administration')).toBe(mvtBefore + 1)
  })
})
