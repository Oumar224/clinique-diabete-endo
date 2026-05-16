import "reflect-metadata"
import { describe, it, expect, beforeEach } from "vitest"
import { EntityRegistry } from "../entity-registry"

describe("EntityRegistry", () => {
  beforeEach(() => {
    EntityRegistry.getInstance().clear()
  })

  it("should be a singleton", () => {
    const r1 = EntityRegistry.getInstance()
    const r2 = EntityRegistry.getInstance()
    expect(r1).toBe(r2)
  })

  it("should register and get an entity type", () => {
    const registry = EntityRegistry.getInstance()
    registry.register({
      type: 'User',
      tableName: 'user',
      documentSchema: {},
      converter: { toDocument: (e: any) => e, toEntity: (d: any) => d },
    })
    expect(registry.has('User')).toBe(true)
    const reg = registry.get('User')
    expect(reg).toBeDefined()
    expect(reg!.tableName).toBe('user')
  })

  it("should return all registered types", () => {
    const registry = EntityRegistry.getInstance()
    registry.register({ type: 'A', tableName: 'a', documentSchema: {}, converter: { toDocument: (e: any) => e, toEntity: (d: any) => d } })
    registry.register({ type: 'B', tableName: 'b', documentSchema: {}, converter: { toDocument: (e: any) => e, toEntity: (d: any) => d } })

    const all = registry.getAll()
    expect(all.length).toBe(2)

    const types = registry.getAllTypes()
    expect(types).toContain('A')
    expect(types).toContain('B')
  })

  it("should clear all registrations", () => {
    const registry = EntityRegistry.getInstance()
    registry.register({ type: 'Test', tableName: 'test', documentSchema: {}, converter: { toDocument: (e: any) => e, toEntity: (d: any) => d } })
    expect(registry.has('Test')).toBe(true)
    registry.clear()
    expect(registry.has('Test')).toBe(false)
  })
})
