import "reflect-metadata"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { container } from "tsyringe"
import { AppDatabaseDatasource } from "../../sqlite-data-source"
import { EntityRegistry } from "../../automerge/entity-registry"
import { EmailService } from "../email/email.service"

describe("EmailService", () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    EntityRegistry.getInstance().clear()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cd-email-test-"))
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

  it("sendResetPasswordEmail should not throw when SMTP is not configured", async () => {
    const emailService = container.resolve(EmailService)
    // Fire-and-forget: should return void without throwing
    await expect(emailService.sendResetPasswordEmail(
      { nom: "Test", prenom: "User", email: "test@test.com" } as any,
      "tempPass123"
    )).resolves.toBeUndefined()
  })
})
