import "reflect-metadata"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { container } from "tsyringe"
import { AppDatabaseDatasource } from "../../../sqlite-data-source"
import { AutomergeSqliteStorageAdapter } from "../../storage/automerge-sqlite-storage"
import { EntityRegistry } from "../../entity-registry"

describe("AutomergeSqliteStorageAdapter", () => {
  let tempDir: string
  let dbPath: string
  let storage: AutomergeSqliteStorageAdapter

  beforeEach(async () => {
    container.clearInstances()
    EntityRegistry.getInstance().clear()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cd-storage-test-"))
    dbPath = path.join(tempDir, "test.db")
    container.register("DB_PATH", { useValue: dbPath })
    const datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()
    storage = container.resolve(AutomergeSqliteStorageAdapter)
    await storage.initialize()
  })

  afterEach(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it("should save and load a document", async () => {
    const data = new Uint8Array([1, 2, 3, 4])
    await storage.save("doc-1", data)

    const loaded = await storage.load("doc-1")
    expect(loaded).toBeDefined()
    expect(Array.from(loaded!)).toEqual([1, 2, 3, 4])
  })

  it("should return undefined for missing document", async () => {
    const loaded = await storage.load("non-existent")
    expect(loaded).toBeUndefined()
  })

  it("should remove a document", async () => {
    await storage.save("doc-2", new Uint8Array([5, 6, 7]))
    await storage.remove("doc-2")
    const loaded = await storage.load("doc-2")
    expect(loaded).toBeUndefined()
  })

  it("should list all document IDs", async () => {
    await storage.save("a", new Uint8Array([1]))
    await storage.save("b", new Uint8Array([2]))
    await storage.save("c", new Uint8Array([3]))

    const list = await storage.list()
    expect(list).toContain("a")
    expect(list).toContain("b")
    expect(list).toContain("c")
    expect(list.length).toBe(3)
  })

  it("should overwrite existing document on save", async () => {
    await storage.save("doc-3", new Uint8Array([10]))
    await storage.save("doc-3", new Uint8Array([20, 30]))

    const loaded = await storage.load("doc-3")
    expect(loaded).toBeDefined()
    expect(Array.from(loaded!)).toEqual([20, 30])
  })
})
