import "reflect-metadata"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { container } from "tsyringe"

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
  const handlers: Record<string, Array<(...args: any[]) => void>> = {}
  return {
    entityEventBus: {
      emitEntityChange: vi.fn(),
      emitSyncProgress: vi.fn(),
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        if (!handlers[event]) handlers[event] = []
        handlers[event].push(handler)
      }),
    },
    __handlers: handlers,
  }
})

const mockRepoConstructor = vi.hoisted(() => vi.fn())
const mockWsAdapterConstructor = vi.hoisted(() => vi.fn())
const mockRepoInstances: any[] = []
const mockWsAdapterInstances: any[] = []

vi.mock("@automerge/automerge-repo", () => {
  return {
    Repo: class MockRepo {
      handles: Record<string, any> = {}
      on = vi.fn()
      shutdown = vi.fn(() => Promise.resolve())

      constructor(config: any) {
        mockRepoConstructor(config)
        mockRepoInstances.push(this)
      }
    },
  }
})

vi.mock("@automerge/automerge-repo-network-websocket", () => {
  return {
    WebSocketClientAdapter: class MockWebSocketClientAdapter {
      url: string
      connect = vi.fn()
      originalConnect = this.connect
      disconnect = vi.fn()
      on = vi.fn()

      constructor(url: string) {
        this.url = url
        mockWsAdapterConstructor(url)
        mockWsAdapterInstances.push(this)
      }
    },
  }
})

vi.mock("../sync-token", () => ({
  signSyncToken: vi.fn().mockResolvedValue("test-token"),
}))

vi.mock("../sync-config", () => ({
  DEFAULT_SERVER_URL: "ws://localhost:3030",
  TOKEN_TTL_SECONDS: 300,
}))

import { RemoteSyncService } from "../remote-sync.service"
import { AutomergeSqliteStorageAdapter } from "../storage/automerge-sqlite-storage"
import { entityEventBus } from "../event-bus"
import { ENTITY_TYPE_MAP } from "../entity-type-map"
import { signSyncToken } from "../sync-token"

describe("RemoteSyncService", { timeout: 30_000 }, () => {
  let service: RemoteSyncService
  let storageMock: any

  beforeEach(async () => {
    vi.clearAllMocks()
    mockRepoInstances.length = 0
    mockWsAdapterInstances.length = 0
    storageMock = {
      initialize: vi.fn(async () => {}),
      save: vi.fn(async () => {}),
      load: vi.fn(),
      remove: vi.fn(async () => {}),
      loadRange: vi.fn(async () => []),
      removeRange: vi.fn(async () => {}),
      saveBatch: vi.fn(async () => {}),
    }
    container.clearInstances()
    container.register(AutomergeSqliteStorageAdapter, { useValue: storageMock })
    service = container.resolve(RemoteSyncService)
  })

  afterEach(async () => {
    await service.stop()
    container.clearInstances()
    vi.useRealTimers()
  })

  describe("session / connection lifecycle", () => {
    it("should start with default status", () => {
      const status = service.getStatus()
      expect(status.isRunning).toBe(false)
      expect(status.serverUrl).toBeNull()
    })

    it("should throw on start without a configured session", async () => {
      await expect(service.start("ws://localhost:3030")).rejects.toThrow(
        "No active session: call configureSession() before start()",
      )
    })

    it("should connect with a token url after configureSession", async () => {
      service.configureSession(1, "ADMIN")
      const status = await service.start("ws://localhost:3030")

      expect(status.isRunning).toBe(true)
      expect(status.serverUrl).toBe("ws://localhost:3030")
      expect(mockWsAdapterConstructor).toHaveBeenCalledWith(
        expect.stringContaining("?token="),
      )
      expect(mockWsAdapterConstructor).toHaveBeenCalledWith(
        "ws://localhost:3030?token=test-token",
      )
      expect(mockRepoConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          storage: expect.any(Object),
          network: [expect.any(Object)],
        }),
      )
      expect(storageMock.initialize).toHaveBeenCalled()
    })

    it("should strip trailing slashes from the server url", async () => {
      service.configureSession(7)
      const status = await service.start("ws://localhost:3030///")

      expect(status.serverUrl).toBe("ws://localhost:3030")
      expect(mockWsAdapterConstructor).toHaveBeenCalledWith(
        "ws://localhost:3030?token=test-token",
      )
    })

    it("should return current status on idempotent start", async () => {
      service.configureSession(1)
      await service.start("ws://localhost:3030")
      const status = await service.start("ws://other.example.com")

      expect(status.isRunning).toBe(true)
      expect(status.serverUrl).toBe("ws://localhost:3030")
      expect(mockWsAdapterConstructor).toHaveBeenCalledTimes(1)
    })

    it("should stop and clear state", async () => {
      service.configureSession(1)
      await service.start("ws://localhost:3030")
      await service.stop()

      const status = service.getStatus()
      expect(status.isRunning).toBe(false)
      expect(status.serverUrl).toBeNull()
    })
  })

  describe("token refresh", () => {
    it("should recreate the adapter with a fresh token on refresh", async () => {
      service.configureSession(1)
      await service.start("ws://localhost:3030")
      expect(mockWsAdapterConstructor).toHaveBeenCalledTimes(1)

      ;(signSyncToken as any).mockResolvedValueOnce("fresh-token")
      await service.refreshToken()

      expect(mockWsAdapterConstructor).toHaveBeenCalledTimes(2)
      expect(mockWsAdapterConstructor).toHaveBeenLastCalledWith(
        "ws://localhost:3030?token=fresh-token",
      )
      expect(service.getStatus()).toEqual({ isRunning: true, serverUrl: "ws://localhost:3030" })
    })

    it("should not stack overlapping refreshes", async () => {
      service.configureSession(1)
      await service.start("ws://localhost:3030")

      let resolveSignToken!: (token: string) => void
      ;(signSyncToken as any).mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveSignToken = resolve
        }),
      )

      const refreshPromise = service.refreshToken()
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(resolveSignToken).toBeTypeOf("function")

      const secondRefresh = service.refreshToken()
      await secondRefresh
      resolveSignToken("fresh-token")
      await refreshPromise

      expect(mockWsAdapterConstructor).toHaveBeenCalledTimes(2)
    })
  })

  describe("lifecycle races", () => {
    it("should not construct an adapter when stop() happens during an in-flight start", async () => {
      service.configureSession(1, "ADMIN")
      const adaptersBefore = mockWsAdapterConstructor.mock.calls.length

      let resolveSignToken!: (token: string) => void
      ;(signSyncToken as any).mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveSignToken = resolve
        }),
      )

      const startPromise = service.start("ws://localhost:3030")
      await new Promise((resolve) => setTimeout(resolve, 0))
      await service.stop()
      resolveSignToken("late-token")
      const status = await startPromise

      expect(mockWsAdapterConstructor.mock.calls.length).toBe(adaptersBefore)
      expect(status).toEqual({ isRunning: false, serverUrl: null })
    })

    it("should not resurrect the session when stop() happens during an in-flight refresh", async () => {
      service.configureSession(1, "ADMIN")
      await service.start("ws://localhost:3030")
      const adaptersBefore = mockWsAdapterConstructor.mock.calls.length

      let resolveSignToken!: (token: string) => void
      ;(signSyncToken as any).mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveSignToken = resolve
        }),
      )

      const refreshPromise = service.refreshToken()
      await new Promise((resolve) => setTimeout(resolve, 0))
      await service.stop()
      resolveSignToken("late-token")
      await refreshPromise

      expect(mockWsAdapterConstructor.mock.calls.length).toBe(adaptersBefore)
      expect(service.getStatus()).toEqual({ isRunning: false, serverUrl: null })
    })

    it("should make a torn-down adapter's retry connect inert after a refresh", async () => {
      service.configureSession(1, "ADMIN")
      await service.start("ws://localhost:3030")
      const oldAdapter = mockWsAdapterInstances[mockWsAdapterInstances.length - 1]
      const oldOriginalConnect = oldAdapter.originalConnect

      await service.refreshToken()

      expect(mockWsAdapterInstances.length).toBe(2)
      expect(mockWsAdapterInstances[mockWsAdapterInstances.length - 1]).not.toBe(oldAdapter)

      oldAdapter.connect("stale-peer-id", {})
      expect(oldOriginalConnect).not.toHaveBeenCalled()

      const currentAdapter = mockWsAdapterInstances[mockWsAdapterInstances.length - 1]
      currentAdapter.connect("peer-id")
      expect(currentAdapter.originalConnect).toHaveBeenCalledWith("peer-id", undefined)
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