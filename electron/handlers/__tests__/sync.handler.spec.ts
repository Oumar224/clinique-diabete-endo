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

vi.mock('../../automerge/sync-config', () => ({
  DEFAULT_SERVER_URL: 'ws://localhost:3030',
}))

const mockGetStatus = vi.hoisted(() => vi.fn())
const mockStart = vi.hoisted(() => vi.fn())
const mockStop = vi.hoisted(() => vi.fn())
const mockConfigureSession = vi.hoisted(() => vi.fn())

import { registerSyncHandlers } from '../sync.handler'

describe('registerSyncHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolve.mockReturnValue({
      getStatus: mockGetStatus.mockResolvedValue({ isRunning: false, serverUrl: null }),
      start: mockStart.mockResolvedValue(undefined),
      stop: mockStop.mockResolvedValue(undefined),
      configureSession: mockConfigureSession.mockReturnValue(undefined),
    })
  })

  it('registers all 4 handlers', () => {
    registerSyncHandlers()
    const channels = mockHandle.mock.calls.map((c: any[]) => c[0])
    expect(channels).toContain('sync:configure-session')
    expect(channels).toContain('sync:status')
    expect(channels).toContain('sync:start')
    expect(channels).toContain('sync:stop')
    expect(mockHandle).toHaveBeenCalledTimes(4)
  })

  it('sync:configure-session resolves service and calls configureSession', async () => {
    registerSyncHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'sync:configure-session')![1]
    const result = await handler({}, { userId: 1, role: 'ADMIN' })
    expect(mockResolve).toHaveBeenCalled()
    expect(mockConfigureSession).toHaveBeenCalledWith(1, 'ADMIN')
    expect(result).toBe(true)
  })

  it('sync:status resolves service and calls getStatus', async () => {
    registerSyncHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'sync:status')![1]
    const result = await handler()
    expect(mockResolve).toHaveBeenCalled()
    expect(mockGetStatus).toHaveBeenCalled()
    expect(result).toEqual({ isRunning: false, serverUrl: null })
  })

  it('sync:start ignores a renderer-supplied url and starts with the default', async () => {
    registerSyncHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'sync:start')![1]
    const result = await handler({}, 'wss://custom.server.com')
    expect(mockStart).toHaveBeenCalledWith()
    expect(result).toEqual({ isRunning: false, serverUrl: null })
  })

  it('sync:start ignores a renderer-supplied ws:// url', async () => {
    registerSyncHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'sync:start')![1]
    await handler({}, 'ws://localhost:8080')
    expect(mockStart).toHaveBeenCalledWith()
  })

  it('sync:start does not throw on an invalid renderer-supplied url', async () => {
    registerSyncHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'sync:start')![1]
    await expect(handler({}, 'http://invalid.com')).resolves.toEqual({ isRunning: false, serverUrl: null })
    expect(mockStart).toHaveBeenCalledWith()
  })

  it('sync:start allows undefined url', async () => {
    registerSyncHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'sync:start')![1]
    await handler({})
    expect(mockStart).toHaveBeenCalledWith()
  })

  it('sync:stop resolves service and calls stop', async () => {
    registerSyncHandlers()
    const handler = mockHandle.mock.calls.find((c: any[]) => c[0] === 'sync:stop')![1]
    const result = await handler()
    expect(mockStop).toHaveBeenCalled()
    expect(result).toEqual({ isRunning: false, serverUrl: null })
  })
})
