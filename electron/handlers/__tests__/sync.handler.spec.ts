import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockHandle = vi.hoisted(() => vi.fn())
const mockResolve = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle },
}))

vi.mock('tsyringe', () => ({
  container: { resolve: mockResolve },
}))

vi.mock('../../automerge/remote-sync.service', () => ({
  RemoteSyncService: class {},
}))

const mockGetStatus = vi.hoisted(() => vi.fn())
const mockStart = vi.hoisted(() => vi.fn())
const mockStop = vi.hoisted(() => vi.fn())

import { registerSyncHandlers } from '../sync.handler'

describe('registerSyncHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolve.mockReturnValue({
      getStatus: mockGetStatus.mockResolvedValue({ isRunning: false, serverUrl: null }),
      start: mockStart.mockResolvedValue(undefined),
      stop: mockStop.mockResolvedValue(undefined),
    })
  })

  it('registers all 3 handlers', () => {
    registerSyncHandlers()
    const channels = mockHandle.mock.calls.map((c: any[]) => c[0])
    expect(channels).toContain('sync:status')
    expect(channels).toContain('sync:start')
    expect(channels).toContain('sync:stop')
    expect(mockHandle).toHaveBeenCalledTimes(3)
  })

  it('sync:status resolves service and calls getStatus', async () => {
    registerSyncHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'sync:status')![1]
    const result = await handler()
    expect(mockResolve).toHaveBeenCalled()
    expect(mockGetStatus).toHaveBeenCalled()
    expect(result).toEqual({ isRunning: false, serverUrl: null })
  })

  it('sync:start resolves service and calls start with url', async () => {
    registerSyncHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'sync:start')![1]
    const result = await handler({}, 'wss://sync.example.com')
    expect(mockStart).toHaveBeenCalledWith('wss://sync.example.com')
    expect(result).toEqual({ isRunning: false, serverUrl: null })
  })

  it('sync:start allows ws:// url', async () => {
    registerSyncHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'sync:start')![1]
    await handler({}, 'ws://localhost:8080')
    expect(mockStart).toHaveBeenCalledWith('ws://localhost:8080')
  })

  it('sync:start throws on invalid url', async () => {
    registerSyncHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'sync:start')![1]
    await expect(handler({}, 'http://invalid.com')).rejects.toThrow('Invalid server URL: must start with wss:// or ws://')
  })

  it('sync:start allows undefined url', async () => {
    registerSyncHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'sync:start')![1]
    await handler({})
    expect(mockStart).toHaveBeenCalledWith(undefined)
  })

  it('sync:stop resolves service and calls stop', async () => {
    registerSyncHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'sync:stop')![1]
    const result = await handler()
    expect(mockStop).toHaveBeenCalled()
    expect(result).toEqual({ isRunning: false, serverUrl: null })
  })
})
