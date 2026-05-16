import "reflect-metadata"
import { describe, it, expect } from "vitest"
import { PasswordService } from "../auth/password.service"

describe("PasswordService", () => {
  const service = new PasswordService()

  it("hash and verify should work", async () => {
    const hash = await service.hash("admin123")
    expect(hash).toBeDefined()
    expect(hash).not.toBe("admin123")

    const valid = await service.verify("admin123", hash)
    expect(valid).toBe(true)
  })

  it("verify should reject wrong password", async () => {
    const hash = await service.hash("correct")
    const valid = await service.verify("wrong", hash)
    expect(valid).toBe(false)
  })

  it("hash should produce different results each time", async () => {
    const hash1 = await service.hash("same")
    const hash2 = await service.hash("same")
    expect(hash1).not.toBe(hash2)
  })
})
