import "reflect-metadata"
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("../../sqlite-data-source", () => ({
  AppDatabaseDatasource: vi.fn().mockImplementation(() => ({})),
}))

vi.mock("../entity-type-map", () => ({
  ENTITY_TYPE_MAP: {
    patient: {
      type: "patient",
      tableName: "patient",
      documentSchema: {},
      converter: {
        toDocument: vi.fn((e: any) => e),
        toEntity: vi.fn((d: any) => ({ id: 1, ...d })),
      },
    },
    user: {
      type: "user",
      tableName: "user",
      documentSchema: {},
      converter: {
        toDocument: vi.fn((e: any) => e),
        toEntity: vi.fn((d: any) => ({ id: 10, ...d })),
      },
    },
  },
}))

vi.mock("../event-bus", () => {
  const handlers: Record<string, Function[]> = {}
  return {
    entityEventBus: {
      emitEntityChange: vi.fn(),
      emitSyncProgress: vi.fn(),
      on: vi.fn((event: string, handler: Function) => {
        if (!handlers[event]) handlers[event] = []
        handlers[event].push(handler)
      }),
    },
    __handlers: handlers,
  }
})

import { RemoteSyncService } from "../remote-sync.service"
import { entityEventBus } from "../event-bus"
import { ENTITY_TYPE_MAP } from "../entity-type-map"

describe("RemoteSyncService", { timeout: 30_000 }, () => {
  let service: RemoteSyncService

  beforeEach(async () => {
    vi.clearAllMocks()
    const { AppDatabaseDatasource } = await import("../../sqlite-data-source")
    service = new RemoteSyncService(new (AppDatabaseDatasource as any)())
  })

  describe("start / stop", () => {
    it("should start with default status", () => {
      const status = service.getStatus()
      expect(status.isRunning).toBe(false)
      expect(status.serverUrl).toBeNull()
    })

    it("should toggle isRunning and set serverUrl on start", async () => {
      await service.start("wss://custom.server.com")
      const status = service.getStatus()
      expect(status.isRunning).toBe(true)
      expect(status.serverUrl).toBe("wss://custom.server.com")
    })

    it("should not restart if already running", async () => {
      await service.start("wss://first.com")
      await service.start("wss://second.com")
      const status = service.getStatus()
      expect(status.serverUrl).toBe("wss://first.com")
    })

    it("should stop and clear state", async () => {
      await service.start("wss://server.com")
      await service.stop()
      const status = service.getStatus()
      expect(status.isRunning).toBe(false)
      expect(status.serverUrl).toBeNull()
    })
  })

  describe("handleIncomingDocument", () => {
    it("should emit sync:progress started and completed for a valid entity", async () => {
      await service.handleIncomingDocument("patient", "automerge-123", { name: "John" }, "created")

      expect(entityEventBus.emitSyncProgress).toHaveBeenCalledWith(
        expect.objectContaining({ phase: "started", entityType: "patient" }),
      )
      expect(entityEventBus.emitSyncProgress).toHaveBeenCalledWith(
        expect.objectContaining({ phase: "completed", entityType: "patient" }),
      )
      expect(entityEventBus.emitEntityChange).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "patient",
          action: "created",
          source: "remote",
        }),
      )
    })

    it("should call converter.toEntity with document data and automergeId", async () => {
      const registration = (ENTITY_TYPE_MAP as any)["patient"]
      await service.handleIncomingDocument("patient", "automerge-abc", { name: "Jane" }, "updated")

      expect(registration.converter.toEntity).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Jane", automergeId: "automerge-abc" }),
      )
    })

    it("should return early for unknown entity types", async () => {
      await service.handleIncomingDocument("unknown_type", "automerge-999", {}, "created")

      expect(entityEventBus.emitSyncProgress).not.toHaveBeenCalled()
      expect(entityEventBus.emitEntityChange).not.toHaveBeenCalled()
    })

    it("should emit entity change with null entity for deleted action", async () => {
      await service.handleIncomingDocument("user", "automerge-456", {}, "deleted")

      expect(entityEventBus.emitEntityChange).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: "user",
          action: "deleted",
        }),
      )
    })

    it("should emit error sync progress when converter throws", async () => {
      const registration = (ENTITY_TYPE_MAP as any)["user"]
      registration.converter.toEntity.mockImplementationOnce(() => {
        throw new Error("Conversion failed")
      })

      await service.handleIncomingDocument("user", "automerge-err", {}, "created")

      expect(entityEventBus.emitSyncProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: "error",
          entityType: "user",
          error: "Conversion failed",
        }),
      )
    })
  })
})
