import "reflect-metadata"
import { describe, it, expect } from "vitest"
import { EntityConverter } from "../../converters/entity-converter"

class TestEntity {
  id?: number
  name?: string
  email?: string
}

describe("EntityConverter", () => {
  it("should convert entity to document", () => {
    const entity = new TestEntity()
    entity.id = 1
    entity.name = "Test"
    entity.email = "test@test.com"

    const doc = EntityConverter.toDocument(entity)
    expect(doc).toBeDefined()
    expect(doc.automergeId).toBeDefined()
    expect(doc.localId).toBe(1)
    expect(doc.name).toBe("Test")
    expect(doc.email).toBe("test@test.com")
    expect(doc.lastModified).toBeGreaterThan(0)
  })

  it("should convert document back to entity", () => {
    const doc = {
      automergeId: "abc-123",
      localId: 42,
      lastModified: Date.now(),
      modifiedBy: "test",
      name: "Converted",
      email: "conv@test.com",
    } as any

    const entity = EntityConverter.toEntity(doc, TestEntity)
    expect(entity).toBeInstanceOf(TestEntity)
    expect(entity.id).toBe(42)
    expect(entity.name).toBe("Converted")
    expect(entity.email).toBe("conv@test.com")
  })

  it("should exclude function properties from document", () => {
    const entity = { id: 1, name: "test", method: () => "ignored" } as any
    const doc = EntityConverter.toDocument(entity)
    expect(doc.name).toBe("test")
    expect((doc as any).method).toBeUndefined()
  })
})
