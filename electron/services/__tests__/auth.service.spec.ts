import "reflect-metadata"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { container } from "tsyringe"
import { AppDatabaseDatasource } from "../../sqlite-data-source"
import { AuthService } from "../auth.service"
import { SpecialtyService } from "../specialty.service"
import { FonctionService } from "../fonction.service"
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

  // ── Email validation tests ───────────────────────────────────────────

  it("should reject invalid email format on createUser", async () => {
    const authService = container.resolve(AuthService)
    await expect(authService.createUser({
      nom: "Test",
      prenom: "User",
      email: "not-an-email",
      role: "MEDECIN",
    } as any)).rejects.toThrow("Format d'email invalide")
  })

  it("should reject duplicate email on createUser", async () => {
    const authService = container.resolve(AuthService)
    // Create first user
    await authService.createUser({
      nom: "First",
      prenom: "User",
      email: "duplicate@test.com",
      role: "MEDECIN",
    } as any)
    // Try creating with same email
    await expect(authService.createUser({
      nom: "Second",
      prenom: "User",
      email: "duplicate@test.com",
      role: "SECRETAIRE",
    } as any)).rejects.toThrow("Cet email est déjà utilisé par un autre utilisateur")
  })

  it("should reject invalid email format on updateUser", async () => {
    const authService = container.resolve(AuthService)
    // Create a user first
    const user = await authService.createUser({
      nom: "Update",
      prenom: "Test",
      email: "update@test.com",
      role: "MEDECIN",
    } as any)
    // Try updating with invalid email
    await expect(authService.updateUser({
      id: user.id!,
      email: "bad-email",
    } as any)).rejects.toThrow("Format d'email invalide")
  })

  // ── Fonction_id tests ───────────────────────────────────────────

  it("should create user with fonction_id", async () => {
    const authService = container.resolve(AuthService)
    const fonctionService = container.resolve(FonctionService)

    // Create a fonction first
    const fonction = await fonctionService.create({ name: "Médecin Chef" })
    expect(fonction.id).toBeDefined()

    // Create a user with fonction_id
    const created = await authService.createUser({
      nom: "Fonction",
      prenom: "User",
      email: "fonction-user@cde.com",
      role: "MEDECIN",
      fonction_id: fonction.id!,
    })

    // Retrieve the user and verify fonction_id
    const user = await authService.getUserById(created.id!)
    expect(user).toBeDefined()
    expect(user!.fonction_id).toBe(fonction.id!)
  })

  // ── enrichUserWithRelations: title_prefix ────────────────────────

  it("should return title_prefix in enrichUserWithRelations specialties", async () => {
    const authService = container.resolve(AuthService)
    const specialtyService = container.resolve(SpecialtyService)

    // Create a user
    const user = await authService.createUser({
      nom: "TitlePrefix",
      prenom: "Test",
      email: "title-prefix@cde.com",
      role: "MEDECIN",
    })

    // Create a specialty with a non-default title_prefix
    const specialty = await specialtyService.create({
      name: "Test Titre Prefixe",
      code: "TITRPFX",
      title_prefix: "Pr",
    })

    // Link the user to the specialty via syncUserRelations
    await authService.syncUserRelations(user.id!, {
      specialty_ids: [specialty.id!],
    })

    // Call enrichUserWithRelations
    const relations = await authService.enrichUserWithRelations(user.id!)

    // Assert title_prefix is present and correct
    expect(relations.specialties).toHaveLength(1)
    expect(relations.specialties[0].title_prefix).toBe("Pr")
    expect(relations.specialties[0].id).toBe(specialty.id!)
    expect(relations.specialties[0].name).toBe("Test Titre Prefixe")
    expect(relations.specialties[0].code).toBe("TITRPFX")

    // Verify other relation fields are present (empty arrays by default)
    expect(relations.services).toEqual([])
    expect(relations.sites).toEqual([])
    expect(relations.medical_units).toEqual([])
    expect(relations.fonction).toBeNull()
    expect(relations.statut_contrat).toBe("Actif")
  })

  // ── Password reset tests ─────────────────────────────────────────────

  it("should not throw when resetting password for unknown email", async () => {
    const authService = container.resolve(AuthService)
    // Should not throw (security: silent return to avoid revealing if email exists)
    await expect(authService.sendResetPassword("unknown@test.com")).resolves.not.toThrow()
  })

  it("should reset password and set is_validated=0 for existing email", async () => {
    const authService = container.resolve(AuthService)
    // Create a user
    const user = await authService.createUser({
      nom: "Reset",
      prenom: "Test",
      email: "reset@test.com",
      role: "MEDECIN",
      password: "changeme",
    } as any)

    // Mark as validated first
    await authService.validatePassword(user.id!, "changeme", "newpassword123")

    // Send reset password
    await authService.sendResetPassword("reset@test.com")

    // Verify user is now not validated
    const users = await authService.listUsers()
    const updated = users.find(u => u.email === "reset@test.com")
    expect(updated).toBeDefined()
    expect(updated!.is_validated).toBe(false)
  })
})
