import "reflect-metadata"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { container } from "tsyringe"
import { AppDatabaseDatasource } from "../../sqlite-data-source"
import { SessionService } from "../auth/session.service"
import { AuthService } from "../auth.service"
import { EntityRegistry } from "../../automerge/entity-registry"

describe("SessionService", () => {
  let tempDir: string
  let dbPath: string
  let sessionService: SessionService

  beforeEach(async () => {
    container.clearInstances()
    EntityRegistry.getInstance().clear()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cd-session-test-"))
    dbPath = path.join(tempDir, "test.db")
    container.register("DB_PATH", { useValue: dbPath })
    const datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()
    sessionService = container.resolve(SessionService)
  })

  afterEach(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it("should create and validate a session", async () => {
    const authService = container.resolve(AuthService)
    const user = await authService.getUserById(1) // admin

    const token = await sessionService.create(user!.id!)
    expect(token).toBeDefined()
    expect(token.length).toBeGreaterThan(0)

    const validated = await sessionService.validate(token)
    expect(validated).toBeDefined()
    expect(validated!.id).toBe(user!.id!)
  })

  it("should reject invalid token", async () => {
    const user = await sessionService.validate("non-existent-token")
    expect(user).toBeNull()
  })

  it("should invalidate session", async () => {
    const authService = container.resolve(AuthService)
    const user = await authService.getUserById(1)

    const token = await sessionService.create(user!.id!)
    await sessionService.invalidate(token)

    const validated = await sessionService.validate(token)
    expect(validated).toBeNull()
  })
})
