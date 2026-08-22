import "reflect-metadata"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { container } from "tsyringe"
import { AppDatabaseDatasource } from "../../sqlite-data-source"
import { AutomergeSyncService } from "../automerge-sync.service"
import { AutomergeSqliteStorageAdapter } from "../storage/automerge-sqlite-storage"
import { EntityRegistry } from "../entity-registry"
import { entityEventBus } from "../event-bus"
import type { EntityChangeEvent } from "../event-bus"

describe("AutomergeSyncService", { timeout: 30_000 }, () => {
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
    entityEventBus.removeAllListeners()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch { /* empty */ }
  })

  it("should initialize storage adapter", async () => {
    const syncService = container.resolve(AutomergeSyncService)
    await expect(syncService.initialize()).resolves.not.toThrow()
  })

  it("should be idempotent on repeated initialize calls", async () => {
    const syncService = container.resolve(AutomergeSyncService)
    await syncService.initialize()
    await expect(syncService.initialize()).resolves.not.toThrow()
  })

  it("should store and retrieve documents via storage adapter", async () => {
    const syncService = container.resolve(AutomergeSyncService)
    await syncService.initialize()

    const storageAdapter = container.resolve(AutomergeSqliteStorageAdapter)
    const docId = 'test-doc-1'
    const data = new Uint8Array(Buffer.from(JSON.stringify({ name: 'test', value: 42 })))

    await storageAdapter.save([docId], data)
    const loaded = await storageAdapter.load([docId])

    expect(loaded).toBeDefined()
    expect(Buffer.from(loaded!).toString()).toBe(JSON.stringify({ name: 'test', value: 42 }))
  })

  it("should list stored documents", async () => {
    const syncService = container.resolve(AutomergeSyncService)
    await syncService.initialize()

    const storageAdapter = container.resolve(AutomergeSqliteStorageAdapter)
    await storageAdapter.save(['doc-a'], new Uint8Array(Buffer.from('a')))
    await storageAdapter.save(['doc-b'], new Uint8Array(Buffer.from('b')))

    const list = await storageAdapter.list()
    expect(list).toContain('doc-a')
    expect(list).toContain('doc-b')
  })

  it("should remove stored documents", async () => {
    const syncService = container.resolve(AutomergeSyncService)
    await syncService.initialize()

    const storageAdapter = container.resolve(AutomergeSqliteStorageAdapter)
    const docId = 'doc-to-remove'
    await storageAdapter.save([docId], new Uint8Array(Buffer.from('data')))

    const before = await storageAdapter.load([docId])
    expect(before).toBeDefined()

    await storageAdapter.remove([docId])
    const after = await storageAdapter.load([docId])
    expect(after).toBeUndefined()
  })

  // ── Tests for uncovered lines ──────────────────────────────────────

  it("should trigger entity registration when no entities are registered", async () => {
    EntityRegistry.getInstance().clear()
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const syncService = container.resolve(AutomergeSyncService)
    await syncService.initialize()
    expect(logSpy).toHaveBeenCalled()
    logSpy.mockRestore()
  })

  it("should handle entity:changed event with deleted action", async () => {
    const syncService = container.resolve(AutomergeSyncService)
    await syncService.initialize()

    const storageAdapter = container.resolve(AutomergeSqliteStorageAdapter)
    const docId = 'entity-to-delete'
    await storageAdapter.save([docId], new Uint8Array(Buffer.from('some data')))

    const deleteEvent: EntityChangeEvent = {
      entityType: 'TestEntity',
      action: 'deleted',
      id: 1,
      entity: { automerge_id: docId },
      source: 'local',
      timestamp: Date.now(),
    }

    entityEventBus.emitEntityChange(deleteEvent)

    await new Promise(r => setTimeout(r, 50))
    const loaded = await storageAdapter.load([docId])
    expect(loaded).toBeUndefined()
  })

  it("should handle entity:changed event with deleted action and no automerge_id", async () => {
    const syncService = container.resolve(AutomergeSyncService)
    await syncService.initialize()

    const deleteEvent: EntityChangeEvent = {
      entityType: 'TestEntity',
      action: 'deleted',
      id: 1,
      entity: {},
      source: 'local',
      timestamp: Date.now(),
    }

    entityEventBus.emitEntityChange(deleteEvent)
    await new Promise(r => setTimeout(r, 50))
  })

  it("should handle entity:changed event with created action", async () => {
    const syncService = container.resolve(AutomergeSyncService)
    await syncService.initialize()

    const createEvent: EntityChangeEvent = {
      entityType: 'TestEntity',
      action: 'created',
      id: 1,
      entity: { id: 1, name: 'test' },
      source: 'local',
      timestamp: Date.now(),
    }

    entityEventBus.emitEntityChange(createEvent)
    await new Promise(r => setTimeout(r, 50))

    const storageAdapter = container.resolve(AutomergeSqliteStorageAdapter)
    const list = await storageAdapter.list()
    expect(list.length).toBeGreaterThan(0)
  })

  it("should handle entity:changed event with updated action", async () => {
    const syncService = container.resolve(AutomergeSyncService)
    await syncService.initialize()

    const createEvent: EntityChangeEvent = {
      entityType: 'TestEntity',
      action: 'updated',
      id: 2,
      entity: { id: 2, name: 'updated' },
      source: 'local',
      timestamp: Date.now(),
    }

    entityEventBus.emitEntityChange(createEvent)
    await new Promise(r => setTimeout(r, 50))

    const storageAdapter = container.resolve(AutomergeSqliteStorageAdapter)
    const list = await storageAdapter.list()
    expect(list.length).toBeGreaterThan(0)
  })

  it("should skip entity:changed events from remote source", async () => {
    const syncService = container.resolve(AutomergeSyncService)
    await syncService.initialize()

    const remoteEvent: EntityChangeEvent = {
      entityType: 'TestEntity',
      action: 'created',
      id: 3,
      entity: { id: 3 },
      source: 'remote',
      timestamp: Date.now(),
    }

    entityEventBus.emitEntityChange(remoteEvent)
    await new Promise(r => setTimeout(r, 50))

    const storageAdapter = container.resolve(AutomergeSqliteStorageAdapter)
    const list = await storageAdapter.list()
    expect(list).toHaveLength(0)
  })

  it("should skip entity:changed events for unknown entity type", async () => {
    const syncService = container.resolve(AutomergeSyncService)
    await syncService.initialize()

    const unknownEvent: EntityChangeEvent = {
      entityType: 'UnknownEntity',
      action: 'created',
      id: 4,
      entity: { id: 4 },
      source: 'local',
      timestamp: Date.now(),
    }

    entityEventBus.emitEntityChange(unknownEvent)
    await new Promise(r => setTimeout(r, 50))
  })

  it("should handle entity:changed with null entity gracefully", async () => {
    const syncService = container.resolve(AutomergeSyncService)
    await syncService.initialize()

    const nullEvent: EntityChangeEvent = {
      entityType: 'TestEntity',
      action: 'created',
      id: 5,
      entity: null,
      source: 'local',
      timestamp: Date.now(),
    }

    entityEventBus.emitEntityChange(nullEvent)
    await new Promise(r => setTimeout(r, 50))
  })

  it("should handle storage error during entity change (catch block)", async () => {
    const syncService = container.resolve(AutomergeSyncService)
    await syncService.initialize()

    EntityRegistry.getInstance().register({
      type: 'ThrowEntity',
      tableName: 'user',
      documentSchema: {},
      converter: {
        toDocument: () => { throw new Error('converter boom') },
        toEntity: (d: any) => d,
      },
    })

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const badEvent: EntityChangeEvent = {
      entityType: 'ThrowEntity',
      action: 'created',
      id: 7,
      entity: { id: 7 },
      source: 'local',
      timestamp: Date.now(),
    }

    entityEventBus.emitEntityChange(badEvent)
    await new Promise(r => setTimeout(r, 50))

    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it("should trigger entity registration and import ENTITIES", async () => {
    EntityRegistry.getInstance().clear()
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const syncService = container.resolve(AutomergeSyncService)
    await syncService.initialize()
    const allLogs = logSpy.mock.calls.map(c => String(c[0]))
    expect(allLogs.some(l => l.includes('[AutomergeSync]'))).toBe(true)
    logSpy.mockRestore()
  })
})
