import 'reflect-metadata'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import { StockService } from '../stock.service'
import { MedicamentService } from '../medicament.service'
import { DepenseService } from '../depense.service'
import { createMockDataSource, createTestDb } from './test-helper'
import { getBase64DecodedSize } from '../../utils/file-utils'

const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('fake-png'),
])
const PNG_DATA_URI = `data:image/png;base64,${PNG_BYTES.toString('base64')}`

describe('StockService — pièces jointes de lot', () => {
  let db: Kysely<any>
  let service: StockService
  let lotId: number
  let medicamentId: number

  beforeEach(async () => {
    db = await createTestDb()
    const ds = createMockDataSource(db) as any
    service = new StockService(ds, new MedicamentService(ds), new DepenseService(ds))
    const med = await sql<{ id: number }>`SELECT id FROM medicaments ORDER BY id LIMIT 1`.execute(db)
    medicamentId = Number(med.rows[0].id)
    const lot = await sql<{ id: number }>`
      INSERT INTO stock_lots (medicament_id, numero_lot, quantite, quantite_initiale)
      VALUES (${medicamentId}, 'LOT-ATT-1', 12, 12) RETURNING id
    `.execute(db)
    lotId = Number(lot.rows[0].id)
  })

  afterEach(async () => {
    await db.destroy()
  })

  it('valide le type MIME', async () => {
    await expect(service.createLotAttachment({
      stockLotId: lotId,
      fileName: 'facture.exe',
      fileType: 'application/x-msdownload',
      fileData: 'data:application/x-msdownload;base64,AAAA',
    })).rejects.toThrow(/Type de fichier/)
  })

  it('accepte exactement 10 Mo, refuse 10 Mo + 1 octet et ignore le préfixe data URI et les espaces', async () => {
    const maxSize = 10 * 1024 * 1024
    const pngOfSize = (size: number) => Buffer.concat([
      PNG_BYTES,
      Buffer.alloc(size - PNG_BYTES.length),
    ]).toString('base64')

    // 10 485 760 octets : la limite exacte (base64 terminé par « == »).
    const exactBase64 = pngOfSize(maxSize)
    const exactUri = `data:image/png;base64,${exactBase64}`
    expect(getBase64DecodedSize(exactUri)).toBe(maxSize)
    const boundary = await service.createLotAttachment({
      stockLotId: lotId,
      fileName: 'limite.png',
      fileType: 'image/png',
      fileData: exactUri,
    })
    expect(boundary.fileSize).toBe(maxSize)

    const overBase64 = pngOfSize(maxSize + 1)
    const overUri = `data:image/png;base64,${overBase64}`
    expect(getBase64DecodedSize(overUri)).toBe(maxSize + 1)
    await expect(service.createLotAttachment({
      stockLotId: lotId,
      fileName: 'trop-gros.png',
      fileType: 'image/png',
      fileData: overUri,
    })).rejects.toThrow(/10 Mo/)

    const pngBase64 = PNG_BYTES.toString('base64')
    const spacedUri = `data:image/png;base64, ${pngBase64.slice(0, 8)}\n ${pngBase64.slice(8)}`
    expect(getBase64DecodedSize(spacedUri)).toBe(PNG_BYTES.length)
  })

  it('refuse une extension incohérente ou un contenu usurpant le MIME', async () => {
    await expect(service.createLotAttachment({
      stockLotId: lotId,
      fileName: 'facture.pdf',
      fileType: 'image/png',
      fileData: PNG_DATA_URI,
    })).rejects.toThrow(/extension/i)

    await expect(service.createLotAttachment({
      stockLotId: lotId,
      fileName: 'facture.pdf',
      fileType: 'application/pdf',
      fileData: PNG_DATA_URI,
    })).rejects.toThrow(/contenu/i)
  })

  it('refuse l’accès à une pièce jointe via un autre lot', async () => {
    const created = await service.createLotAttachment({
      stockLotId: lotId,
      fileName: 'bon-livraison.png',
      fileType: 'image/png',
      fileData: PNG_DATA_URI,
    })
    const other = await sql<{ id: number }>`
      INSERT INTO stock_lots (medicament_id, numero_lot, quantite, quantite_initiale)
      VALUES (${medicamentId}, 'LOT-ATT-2', 1, 1) RETURNING id
    `.execute(db)
    const otherId = Number(other.rows[0].id)

    await expect(service.getLotAttachment(otherId, created.id!)).rejects.toThrow(/introuvable/)
    await expect(service.downloadLotAttachment(otherId, created.id!)).rejects.toThrow(/introuvable/)
    await expect(service.deleteLotAttachment(otherId, created.id!)).rejects.toThrow(/introuvable/)
    expect(await service.listLotAttachments(lotId)).toHaveLength(1)
  })

  it('crée, liste, télécharge et supprime une pièce jointe', async () => {
    const created = await service.createLotAttachment({
      stockLotId: lotId,
      fileName: 'bon-livraison.png',
      fileType: 'image/png',
      fileSize: 1,
      fileData: PNG_DATA_URI,
      uploadedBy: 1,
    })
    expect(created.fileName).toBe('bon-livraison.png')
    expect(created.fileSize).toBe(getBase64DecodedSize(PNG_DATA_URI))

    expect(await service.listLotAttachments(lotId)).toHaveLength(1)
    const downloaded = await service.downloadLotAttachment(lotId, created.id)
    expect(downloaded.fileData).toBe(PNG_DATA_URI)

    const lots = await service.lots(medicamentId)
    expect(lots[0].attachments_count).toBe(1)

    await service.deleteLotAttachment(lotId, created.id)
    expect(await service.listLotAttachments(lotId)).toHaveLength(0)
  })
})
