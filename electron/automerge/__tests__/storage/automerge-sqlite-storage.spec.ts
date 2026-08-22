import "reflect-metadata"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { container } from "tsyringe"
import { AppDatabaseDatasource } from "../../../sqlite-data-source"
import { AutomergeSqliteStorageAdapter } from "../../storage/automerge-sqlite-storage"
import { EntityRegistry } from "../../entity-registry"
import type { StorageKey } from "@automerge/automerge-repo"

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
    } catch { /* empty */ }
  })

  it("should save and load a document", async () => {
    const data = new Uint8Array([1, 2, 3, 4])
    await storage.save(["doc-1"], data)

    const loaded = await storage.load(["doc-1"])
    expect(loaded).toBeDefined()
    expect(Array.from(loaded!)).toEqual([1, 2, 3, 4])
  })

  it("should return undefined for missing document", async () => {
    const loaded = await storage.load(["non-existent"])
    expect(loaded).toBeUndefined()
  })

  it("should remove a document", async () => {
    await storage.save(["doc-2"], new Uint8Array([5, 6, 7]))
    await storage.remove(["doc-2"])
    const loaded = await storage.load(["doc-2"])
    expect(loaded).toBeUndefined()
  })

  it("should list all document IDs", async () => {
    await storage.save(["a"], new Uint8Array([1]))
    await storage.save(["b"], new Uint8Array([2]))
    await storage.save(["c"], new Uint8Array([3]))

    const list = await storage.list()
    expect(list).toContain("a")
    expect(list).toContain("b")
    expect(list).toContain("c")
    expect(list.length).toBe(3)
  })

  it("should overwrite existing document on save", async () => {
    await storage.save(["doc-3"], new Uint8Array([10]))
    await storage.save(["doc-3"], new Uint8Array([20, 30]))

    const loaded = await storage.load(["doc-3"])
    expect(loaded).toBeDefined()
    expect(Array.from(loaded!)).toEqual([20, 30])
  })

  it("should save and load with multi-segment storage keys", async () => {
    const data = new Uint8Array([9, 8, 7])
    await storage.save(["doc-4", "snapshot", "hash1"], data)

    expect(Array.from((await storage.load(["doc-4", "snapshot", "hash1"]))!)).toEqual([9, 8, 7])
    // sibling subkeys are independent
    expect(await storage.load(["doc-4", "incremental", "hash1"])).toBeUndefined()

    await storage.remove(["doc-4", "snapshot", "hash1"])
    expect(await storage.load(["doc-4", "snapshot", "hash1"])).toBeUndefined()
  })

  it("should loadRange by document prefix", async () => {
    await storage.save(["docA", "snapshot", "h1"], new Uint8Array([1]))
    await storage.save(["docA", "incremental", "h2"], new Uint8Array([2]))
    await storage.save(["docB", "snapshot", "h3"], new Uint8Array([3]))

    const docA = await storage.loadRange(["docA"])
    expect(docA).toHaveLength(2)
    expect(docA.map((c) => c.key)).toEqual(
      expect.arrayContaining([
        ["docA", "snapshot", "h1"],
        ["docA", "incremental", "h2"],
      ]),
    )
    const byKey = new Map(docA.map((c) => [c.key.join("/"), Array.from(c.data)]))
    expect(byKey.get("docA/snapshot/h1")).toEqual([1])
    expect(byKey.get("docA/incremental/h2")).toEqual([2])

    const docB = await storage.loadRange(["docB"])
    expect(docB).toHaveLength(1)
    expect(docB[0].key).toEqual(["docB", "snapshot", "h3"])
  })

  it("should loadRange with a deeper prefix", async () => {
    await storage.save(["docA", "snapshot", "h1"], new Uint8Array([1]))
    await storage.save(["docA", "incremental", "h2"], new Uint8Array([2]))

    const snapshot = await storage.loadRange(["docA", "snapshot"])
    expect(snapshot).toHaveLength(1)
    expect(snapshot[0].key).toEqual(["docA", "snapshot", "h1"])
  })

  it("should removeRange by prefix", async () => {
    await storage.save(["docA", "snapshot", "h1"], new Uint8Array([1]))
    await storage.save(["docA", "incremental", "h2"], new Uint8Array([2]))
    await storage.save(["docB", "snapshot", "h3"], new Uint8Array([3]))

    await storage.removeRange(["docA"])

    expect(await storage.loadRange(["docA"])).toHaveLength(0)
    expect(await storage.loadRange(["docB"])).toHaveLength(1)
  })

  it("should saveBatch entries and load them back", async () => {
    const entries: Array<[StorageKey, Uint8Array]> = [
      [["batch", "snapshot", "h1"], new Uint8Array([1])],
      [["batch", "snapshot", "h2"], new Uint8Array([2])],
      [["other", "snapshot", "h3"], new Uint8Array([3])],
    ]

    await storage.saveBatch(entries)

    expect(Array.from((await storage.load(["batch", "snapshot", "h1"]))!)).toEqual([1])
    expect(Array.from((await storage.load(["batch", "snapshot", "h2"]))!)).toEqual([2])
    expect(Array.from((await storage.load(["other", "snapshot", "h3"]))!)).toEqual([3])
  })

  it("should be NUL-safe for keys containing NUL bytes", async () => {
    const data = new Uint8Array([42])
    const keyWithNul: StorageKey = ["doc\u0000name", "snapshot"]

    await storage.save(keyWithNul, data)

    expect(Array.from((await storage.load(keyWithNul))!)).toEqual([42])
    const range = await storage.loadRange(["doc\u0000name"])
    expect(range).toHaveLength(1)
    expect(range[0].key).toEqual(keyWithNul)
  })
})