import "reflect-metadata"
import { describe, it, expect, vi, beforeEach } from "vitest"

describe("ipc-dispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  async function loadModule(mockWins?: { isDestroyed: () => boolean }) {
    vi.doMock("electron", () => {
      const wins = mockWins
        ? [mockWins]
        : [{ isDestroyed: vi.fn().mockReturnValue(false), webContents: { send: vi.fn() } }]
      return {
        BrowserWindow: { getAllWindows: vi.fn().mockReturnValue(wins) },
      }
    })
    const { setupIpcDispatcher } = await import("../ipc-dispatcher")
    const { BrowserWindow } = await import("electron")
    const { entityEventBus } = await import("../event-bus")
    const win = (BrowserWindow as any).getAllWindows()[0]
    return { setupIpcDispatcher, BrowserWindow: BrowserWindow as any, win, entityEventBus }
  }

  it("should send entity:changed events to all BrowserWindows", async () => {
    const { setupIpcDispatcher, BrowserWindow, win, entityEventBus } = await loadModule()

    setupIpcDispatcher()

    entityEventBus.emitEntityChange({
      entityType: "patient",
      action: "created",
      id: 1,
      entity: { id: 1, name: "John" },
      source: "remote",
      timestamp: Date.now(),
    })

    expect(BrowserWindow.getAllWindows).toHaveBeenCalled()
    expect(win.webContents.send).toHaveBeenCalledWith(
      "entity:changed",
      expect.objectContaining({
        entityType: "patient",
        action: "created",
        id: 1,
        source: "remote",
      }),
    )
  })

  it("should send sync:progress events to all BrowserWindows", async () => {
    const { setupIpcDispatcher, win, entityEventBus } = await loadModule()

    setupIpcDispatcher()

    entityEventBus.emitSyncProgress({
      phase: "completed",
      entityType: "user",
      processed: 5,
      total: 10,
      timestamp: Date.now(),
    })

    expect(win.webContents.send).toHaveBeenCalledWith(
      "sync:progress",
      expect.objectContaining({
        phase: "completed",
        entityType: "user",
        processed: 5,
        total: 10,
      }),
    )
  })

  it("should skip destroyed windows", async () => {
    const destroyedWin = {
      isDestroyed: vi.fn().mockReturnValue(true),
      webContents: { send: vi.fn() },
    }
    const { setupIpcDispatcher, entityEventBus } = await loadModule(destroyedWin)

    setupIpcDispatcher()

    entityEventBus.emitEntityChange({
      entityType: "patient",
      action: "created",
      id: 1,
      entity: null,
      source: "local",
      timestamp: Date.now(),
    })

    expect(destroyedWin.webContents.send).not.toHaveBeenCalled()
  })

  it("should not re-register listeners on second call (isSetup guard)", async () => {
    const { setupIpcDispatcher, win, entityEventBus } = await loadModule()

    setupIpcDispatcher()
    setupIpcDispatcher()

    entityEventBus.emitEntityChange({
      entityType: "user",
      action: "updated",
      id: 2,
      entity: null,
      source: "local",
      timestamp: Date.now(),
    })

    expect(win.webContents.send).toHaveBeenCalledTimes(1)
  })
})
