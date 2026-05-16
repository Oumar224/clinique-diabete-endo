import "reflect-metadata"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { container } from "tsyringe"
import { AppDatabaseDatasource } from "../../sqlite-data-source"
import { AuthService } from "../auth.service"
import { EntityRegistry } from "../../automerge/entity-registry"

describe("AuthService", () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    EntityRegistry.getInstance().clear()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cd-auth-test-"))
    dbPath = path.join(tempDir, "test.db")
    container.register("DB_PATH", { useValue: dbPath })
    const datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()
  })

  afterEach(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it("should login with admin credentials", async () => {
    const authService = container.resolve(AuthService)
    const result = await authService.login("admin@cde.com", "admin")
    expect(result.token).toBeDefined()
    expect(result.user.email).toBe("admin@cde.com")
    expect(result.mustChangePassword).toBe(false)
  })

  it("should reject wrong password", async () => {
    const authService = container.resolve(AuthService)
    await expect(
      authService.login("admin@cde.com", "wrong")
    ).rejects.toThrow("Email ou mot de passe incorrect")
  })

  it("should reject unknown email", async () => {
    const authService = container.resolve(AuthService)
    await expect(
      authService.login("unknown@test.com", "pass")
    ).rejects.toThrow("Email ou mot de passe incorrect")
  })

  it("should create and list users", async () => {
    const authService = container.resolve(AuthService)
    await authService.createUser({
      nom: "Test",
      prenom: "User",
      email: "test@cde.com",
      role: "MEDECIN",
      service: "Endocrinologie",
    })

    const users = await authService.listUsers()
    expect(users.length).toBeGreaterThanOrEqual(2)
    const created = users.find(u => u.email === "test@cde.com")
    expect(created).toBeDefined()
    expect(created!.is_validated).toBe(false)
  })

  it("should validate password for new users", async () => {
    const authService = container.resolve(AuthService)

    const created = await authService.createUser({
      nom: "New", prenom: "User",
      email: "new@cde.com", role: "SECRETAIRE",
      password: "temp123",
    })

    expect(created.is_validated).toBe(false)

    const validated = await authService.validatePassword(
      created.id!, "temp123", "newpass456"
    )
    expect(validated.is_validated).toBe(true)
  })

  it("should delete (deactivate) user", async () => {
    const authService = container.resolve(AuthService)
    const created = await authService.createUser({
      nom: "Del", prenom: "User",
      email: "del@cde.com", role: "ADMIN",
    })

    await authService.deleteUser(created.id!)
    const user = await authService.getUserById(created.id!)
    expect(user!.is_active).toBe(false)
  })
})
