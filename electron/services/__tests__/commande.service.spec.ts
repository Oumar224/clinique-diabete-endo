import 'reflect-metadata'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import { CommandeService } from '../commande.service'
import { StockService } from '../stock.service'
import { MedicamentService } from '../medicament.service'
import { DepenseService } from '../depense.service'
import { createMockDataSource, createTestDb } from './test-helper'

const PDF_DATA_URI = `data:application/pdf;base64,${Buffer.from('%PDF-1.4 test').toString('base64')}`
const PNG_DATA_URI = `data:image/png;base64,${Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('fake-png'),
]).toString('base64')}`
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024

describe('CommandeService', () => {
  let db: Kysely<any>
  let service: CommandeService
  let stockService: StockService
  let fournisseurId: number
  let medicamentId: number

  beforeEach(async () => {
    db = await createTestDb()
    const ds = createMockDataSource(db) as any
    stockService = new StockService(ds, new MedicamentService(ds), new DepenseService(ds))
    service = new CommandeService(ds, stockService)

    const fournisseur = await sql<{ id: number }>`
      INSERT INTO fournisseurs (nom, est_pharmacie_centrale) VALUES ('PCG', 1) RETURNING id
    `.execute(db)
    fournisseurId = Number(fournisseur.rows[0].id)
    const med = await sql<{ id: number }>`SELECT id FROM medicaments ORDER BY id LIMIT 1`.execute(db)
    medicamentId = Number(med.rows[0].id)
  })

  afterEach(async () => {
    await db.destroy()
  })

  async function createCommande(quantite = 10, dateCommande = '2026-10-24') {
    return service.create({
      fournisseurId,
      dateCommande,
      lignes: [{ medicamentId, quantiteCommandee: quantite }],
      createdBy: 1,
    })
  }

  it('numérote les BC par jour et fige les instantanés médicament', async () => {
    const first = await createCommande(10)
    const second = await createCommande(20)

    expect(first.numero).toBe('BC-20261024-0001')
    expect(second.numero).toBe('BC-20261024-0002')
    expect(first.statut).toBe('brouillon')
    expect(first.fournisseurNom).toBe('PCG')
    expect(first.lignes).toHaveLength(1)
    expect(first.lignes![0].designation).toContain('Metformine')
    expect(first.lignes![0].quantiteCommandee).toBe(10)
    expect(first.lignes![0].quantiteLivree).toBe(0)
    expect(first.lignes![0].stockRestant).toBe(0)
  })

  it('préremplit CMM (3 mois) et stock restant', async () => {
    const delivrance = await sql<{ id: number }>`
      INSERT INTO delivrances (source, source_document_id, patient_id, statut, served_at)
      VALUES ('ordonnance_libre', 9001, 1, 'servie', '2026-09-15') RETURNING id
    `.execute(db)
    await sql`
      INSERT INTO delivrance_lignes (delivrance_id, medicament_id, libelle, quantite_demandee, quantite_servie)
      VALUES (${Number(delivrance.rows[0].id)}, ${medicamentId}, 'Metformine', 300, 300)
    `.execute(db)
    await sql`
      INSERT INTO stock_lots (medicament_id, numero_lot, quantite, quantite_initiale)
      VALUES (${medicamentId}, 'STOCK-1', 37, 37)
    `.execute(db)

    const [suggestion] = await service.prefill({ medicamentIds: [medicamentId], dateCommande: '2026-10-24' })
    expect(suggestion.cmm).toBe(100)
    expect(suggestion.stockRestant).toBe(37)
    expect(suggestion.designation).toContain('Metformine')
  })

  it('réceptionne partiellement, crée le lot sans dépense puis solde', async () => {
    const commande = await createCommande(10)
    await service.envoyer(commande.id)

    const ligneId = commande.lignes![0].id!
    const partial = await service.receptionner(commande.id, {
      dateReception: '2026-10-25',
      refBl: 'BL-001',
      lignes: [{ commandeLigneId: ligneId, quantiteRecue: 4, numeroLot: 'LOT-TEST-9', datePeremption: '2028-12-31' }],
      createdBy: 1,
    })
    expect(partial.statut).toBe('partielle')
    expect(partial.lignes![0].quantiteLivree).toBe(4)
    expect(partial.receptions).toHaveLength(1)

    // Le bon de réception doit porter tous les détails de la ligne reçue.
    const receivedLine = partial.receptions![0].lignes![0]
    expect(receivedLine.designation).toContain('Metformine')
    expect(receivedLine.unite).toBe(commande.lignes![0].unite ?? null)
    expect(receivedLine.cmm).toBe(commande.lignes![0].cmm)
    expect(receivedLine.stockRestant).toBe(commande.lignes![0].stockRestant)
    expect(receivedLine.quantiteCommandee).toBe(10)
    expect(receivedLine.quantiteLivree).toBe(4)
    expect(receivedLine.quantiteRecue).toBe(4)
    expect(receivedLine.numeroLot).toBe('LOT-TEST-9')
    expect(receivedLine.datePeremption).toBe('2028-12-31')

    const lot = await db.selectFrom('stock_lots').selectAll().where('medicament_id', '=', medicamentId).executeTakeFirstOrThrow()
    expect(Number(lot.quantite)).toBe(4)
    expect(Number(lot.commande_reception_id)).toBe(partial.receptions![0].id)
    expect(Number(lot.fournisseur_id)).toBe(fournisseurId)
    expect(lot.prix_achat).toBeNull()
    const depenses = await db.selectFrom('depense').selectAll().execute()
    expect(depenses).toHaveLength(0)

    const complete = await service.receptionner(commande.id, {
      dateReception: '2026-10-26',
      lignes: [{ commandeLigneId: ligneId, quantiteRecue: 6 }],
      createdBy: 1,
    })
    expect(complete.statut).toBe('livree')
    expect(complete.lignes![0].quantiteLivree).toBe(10)

    const closed = await service.cloturer(commande.id)
    expect(closed.statut).toBe('cloturee')
    await expect(service.update(commande.id, { notes: 'trop tard' }))
      .rejects.toThrow(/brouillon/)
  })

  it('réceptionne un fournisseur désactivé après l’émission du bon', async () => {
    const commande = await createCommande(4)
    await service.envoyer(commande.id)
    await sql`UPDATE fournisseurs SET actif = 0 WHERE id = ${fournisseurId}`.execute(db)

    const received = await service.receptionner(commande.id, {
      lignes: [{ commandeLigneId: commande.lignes![0].id!, quantiteRecue: 4 }],
    })
    expect(received.statut).toBe('livree')
    const lot = await db.selectFrom('stock_lots').selectAll().where('medicament_id', '=', medicamentId).executeTakeFirstOrThrow()
    expect(Number(lot.fournisseur_id)).toBe(fournisseurId)
  })

  it('gère les pièces jointes de réception et rejette les types interdits', async () => {
    const commande = await createCommande(5)
    await service.envoyer(commande.id)
    const received = await service.receptionner(commande.id, {
      lignes: [{ commandeLigneId: commande.lignes![0].id!, quantiteRecue: 5 }],
    })
    const receptionId = received.receptions![0].id!

    await expect(service.createReceptionAttachment(receptionId, {
      fileName: 'virus.exe', fileType: 'application/x-msdownload', fileData: 'data:application/x-msdownload;base64,AAAA',
    })).rejects.toThrow(/Type de fichier/)

    // Extension déclarée incohérente avec le MIME.
    await expect(service.createReceptionAttachment(receptionId, {
      fileName: 'bl.pdf', fileType: 'image/png', fileData: PNG_DATA_URI,
    })).rejects.toThrow(/extension/i)

    // MIME cohérent avec l'extension mais magic bytes usurpés.
    await expect(service.createReceptionAttachment(receptionId, {
      fileName: 'bl.pdf', fileType: 'application/pdf', fileData: PNG_DATA_URI,
    })).rejects.toThrow(/contenu/i)

    // Limite de 10 Mo : un octet au-delà est refusé (taille recalculée base64).
    const tooLarge = 'A'.repeat(Math.ceil((MAX_ATTACHMENT_SIZE + 1) * 4 / 3))
    await expect(service.createReceptionAttachment(receptionId, {
      fileName: 'huge.pdf', fileType: 'application/pdf', fileData: `data:application/pdf;base64,${tooLarge}`,
    })).rejects.toThrow(/10 Mo/)

    const attachment = await service.createReceptionAttachment(receptionId, {
      fileName: 'bl.pdf', fileType: 'application/pdf', fileData: PDF_DATA_URI,
    }, 1)
    expect(attachment.fileName).toBe('bl.pdf')
    expect((await service.listReceptionAttachments(receptionId))).toHaveLength(1)
    const download = await service.downloadReceptionAttachment(receptionId, attachment.id)
    expect(download.fileData).toBe(PDF_DATA_URI)

    const other = await sql<{ id: number }>`
      INSERT INTO commande_receptions (commande_id, date_reception)
      VALUES (${commande.id}, '2026-10-27') RETURNING id
    `.execute(db)
    await expect(service.getReceptionAttachment(Number(other.rows[0].id), attachment.id!))
      .rejects.toThrow(/introuvable/)
    await expect(service.downloadReceptionAttachment(Number(other.rows[0].id), attachment.id!))
      .rejects.toThrow(/introuvable/)
    await expect(service.deleteReceptionAttachment(Number(other.rows[0].id), attachment.id!))
      .rejects.toThrow(/introuvable/)

    // Juste sous la limite : accepté (le validateur ne doit pas être trop strict).
    const nearLimit = Buffer.concat([
      Buffer.from('%PDF-'),
      Buffer.alloc(MAX_ATTACHMENT_SIZE - 3 - 5),
    ]).toString('base64')
    const boundary = await service.createReceptionAttachment(receptionId, {
      fileName: 'limite.pdf', fileType: 'application/pdf', fileData: `data:application/pdf;base64,${nearLimit}`,
    })
    expect(boundary.fileSize).toBeLessThanOrEqual(MAX_ATTACHMENT_SIZE)
  })


  it('séries mensuelles fournisseurs : commandes, ventes, annulations et mois vides', async () => {
    const other = await sql<{ id: number; nom: string }>`
      INSERT INTO fournisseurs (nom) VALUES ('Alpha Distribution') RETURNING id, nom
    `.execute(db)
    const otherId = Number(other.rows[0].id)
    await sql`UPDATE medicaments SET prix_vente = 500 WHERE id = ${medicamentId}`.execute(db)

    const sent = await createCommande(10, '2026-01-10')
    await service.envoyer(sent.id)
    // Le brouillon ne doit pas entrer dans la série : seul le bon envoyé
    // (10 unités) compte pour janvier, malgré ces 5 unités supplémentaires.
    const draft = await createCommande(5, '2026-01-15')
    expect(draft.statut).toBe('brouillon')
    const cancelled = await createCommande(9, '2026-02-11')
    await service.annuler(cancelled.id)
    const sentMarch = await createCommande(7, '2026-03-12')
    await service.envoyer(sentMarch.id)

    const lot = await sql<{ id: number }>`
      INSERT INTO stock_lots (medicament_id, fournisseur_id, numero_lot, quantite, quantite_initiale)
      VALUES (${medicamentId}, ${otherId}, 'LOT-SERIE', 20, 20) RETURNING id
    `.execute(db)
    const lotId = Number(lot.rows[0].id)
    const delivrance = await sql<{ id: number }>`
      INSERT INTO delivrances (source, source_document_id, patient_id, statut, served_at)
      VALUES ('ordonnance_libre', 9101, 1, 'servie', '2026-02-20') RETURNING id
    `.execute(db)
    await sql`
      INSERT INTO delivrance_lignes (delivrance_id, medicament_id, libelle, quantite_demandee, quantite_servie, lot_id, prix_unitaire, montant)
      VALUES (${Number(delivrance.rows[0].id)}, ${medicamentId}, 'Metformine', 4, 4, ${lotId}, 500, 2000)
    `.execute(db)
    // Le prix catalogue change après la vente : la série doit garder le
    // montant historique figé sur la ligne de délivrance.
    await sql`UPDATE medicaments SET prix_vente = 999 WHERE id = ${medicamentId}`.execute(db)
    const annulee = await sql<{ id: number }>`
      INSERT INTO delivrances (source, source_document_id, patient_id, statut, served_at)
      VALUES ('ordonnance_libre', 9102, 1, 'annulee', '2026-02-21') RETURNING id
    `.execute(db)
    await sql`
      INSERT INTO delivrance_lignes (delivrance_id, medicament_id, libelle, quantite_demandee, quantite_servie, lot_id, prix_unitaire, montant)
      VALUES (${Number(annulee.rows[0].id)}, ${medicamentId}, 'Metformine', 9, 9, ${lotId}, 500, 4500)
    `.execute(db)

    const gratuite = await sql<{ id: number }>`
      INSERT INTO delivrances (source, source_document_id, patient_id, statut, served_at, type_vente)
      VALUES ('ordonnance_libre', 9103, 1, 'servie', '2026-02-22', 'gratuite') RETURNING id
    `.execute(db)
    await sql`
      INSERT INTO delivrance_lignes (delivrance_id, medicament_id, libelle, quantite_demandee, quantite_servie, lot_id, prix_unitaire, montant)
      VALUES (${Number(gratuite.rows[0].id)}, ${medicamentId}, 'Metformine', 3, 3, ${lotId}, 0, 0)
    `.execute(db)

    const series = await service.seriesFournisseurs({ dateDebut: '2026-01-01', dateFin: '2026-03-31' })
    expect(series.mois).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(series.fournisseurs).toEqual([
      { id: otherId, nom: 'Alpha Distribution' },
      { id: fournisseurId, nom: 'PCG' },
    ])

    const pcgCommandes = series.commandes.filter((p) => p.fournisseurId === fournisseurId)
    expect(pcgCommandes.map((p) => [p.mois, p.quantite])).toEqual([
      ['2026-01', 10], ['2026-02', 0], ['2026-03', 7],
    ])
    expect(pcgCommandes.every((p) => !('montant' in p))).toBe(true)

    const autresVentes = series.ventes.filter((p) => p.fournisseurId === otherId)
    expect(autresVentes).toEqual([
      { fournisseurId: otherId, mois: '2026-01', quantite: 0, montant: 0 },
      { fournisseurId: otherId, mois: '2026-02', quantite: 4, montant: 2000 },
      { fournisseurId: otherId, mois: '2026-03', quantite: 0, montant: 0 },
    ])

    const filtered = await service.seriesFournisseurs({
      dateDebut: '2026-01-01', dateFin: '2026-03-31', fournisseurIds: [fournisseurId],
    })
    expect(filtered.fournisseurs).toEqual([{ id: fournisseurId, nom: 'PCG' }])
    expect(filtered.ventes.every((p) => p.fournisseurId === fournisseurId)).toBe(true)
  })
  it('interdit une réception supérieure au restant et une annulation après réception', async () => {
    const commande = await createCommande(3)
    await service.envoyer(commande.id)
    await expect(service.receptionner(commande.id, {
      lignes: [{ commandeLigneId: commande.lignes![0].id!, quantiteRecue: 4 }],
    })).rejects.toThrow(/supérieure/)
    await service.receptionner(commande.id, {
      lignes: [{ commandeLigneId: commande.lignes![0].id!, quantiteRecue: 3 }],
    })
    await expect(service.annuler(commande.id)).rejects.toThrow(/état actuel/)
  })
})
