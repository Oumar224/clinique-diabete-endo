import "reflect-metadata"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { container } from "tsyringe"
import { AppDatabaseDatasource } from "../../sqlite-data-source"
import { AutomergeSyncService } from "../automerge-sync.service"
import { EntityRegistry } from "../entity-registry"

describe("AutomergeSyncService", () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    EntityRegistry.getInstance().clear()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cd-automerge-test-"))
    dbPath = path.join(tempDir, "test.db")
    container.register("DB_PATH", { useValue: dbPath })
    const datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()

    EntityRegistry.getInstance().register({
      type: 'TestEntity',
      tableName: 'user',
      documentSchema: {},
      converter: {
        toDocument: (e: any) => ({ ...e, automergeId: '', lastModified: Date.now(), modifiedBy: 'local' }),
        toEntity: (d: any) => ({ id: d.localId, ...d }),
      },
    })
  })

  afterEach(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it("should initialize and create a document", async () => {
    const syncService = container.resolve(AutomergeSyncService)
    await syncService.initialize()

    const automergeId = await syncService.create('TestEntity', { id: 1, name: 'test', email: 'test@test.com' })
    expect(automergeId).toBeDefined()
    expect(automergeId.length).toBeGreaterThan(0)
  })

  it("should watch and notify changes", async () => {
    const syncService = container.resolve(AutomergeSyncService)
    await syncService.initialize()

    let notified = false
    syncService.watch('TestEntity', (id) => {
      notified = true
      expect(id).toBe('1')
    })

    await syncService.create('TestEntity', { id: 1, name: 'test' })
    expect(notified).toBe(true)
  })

  it("should allow unsubscribe from watch", async () => {
    const syncService = container.resolve(AutomergeSyncService)
    await syncService.initialize()

    let count = 0
    const unsub = syncService.watch('TestEntity', () => { count++ })
    unsub()

    await syncService.create('TestEntity', { id: 2, name: 'test2' })
    expect(count).toBe(0)
  })

  it("should throw for unknown entity type", async () => {
    const syncService = container.resolve(AutomergeSyncService)
    await syncService.initialize()

    await expect(
      syncService.create('UnknownType', { id: 1 })
    ).rejects.toThrow('Unknown entity type')
  })
})
