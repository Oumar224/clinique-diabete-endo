import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { ConservateurService } from '../conservateur.service'

describe('ConservateurService', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-conservateur-test-'))
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
    } catch { /* best-effort cleanup */ }
  })

  async function createTestStockage(): Promise<number> {
    const service = container.resolve(ConservateurService)
    const stockage = await service.createStockage({
      code: 'FRIGO-A',
      name: 'Frigo A',
      description: 'Frigo principal',
    } as any)
    return stockage.id!
  }

  // ─── Champ validation (stockage_id FK) ──────────────────────────

  it('should reject createChamp with invalid stockage_id', async () => {
    const service = container.resolve(ConservateurService)

    await expect(
      service.createChamp({
        stockage_id: 99999,
        cle: 'etagere-1',
        label: 'Étagère 1',
      } as any)
    ).rejects.toThrow()
  })

  it('should create a champ with valid stockage_id', async () => {
    const service = container.resolve(ConservateurService)
    const stockageId = await createTestStockage()

    const champ = await service.createChamp({
      stockage_id: stockageId,
      cle: 'etagere-1',
      label: 'Étagère 1',
    } as any)

    expect(champ).toBeDefined()
    expect(champ.id).toBeGreaterThan(0)
    expect(champ.stockage_id).toBe(stockageId)
  })
})
