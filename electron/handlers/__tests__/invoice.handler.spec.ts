import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockHandle = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle },
}))

import { container } from 'tsyringe'
import { InvoiceService } from '../../services/invoice.service'
import { SessionService } from '../../services/auth/session.service'
import { CurrentSessionService } from '../../services/auth/current-session.service'
import { registerInvoiceHandlers } from '../invoice.handler'
import type { AppRole } from '../../utils/authorization'

const mockInvoiceService = {
  list: vi.fn(),
  getById: vi.fn(),
  getByPatient: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  addPayment: vi.fn(),
  getStats: vi.fn(),
  getRecu: vi.fn(),
}

/** Faux `sessionService.validate` : revalidation en base de la session. */
const mockValidate = vi.fn()

function channel(name: string): (...args: any[]) => Promise<any> {
  const found = mockHandle.mock.calls.find((c: any[]) => c[0] === name)
  expect(found, `canal IPC ${name} enregistré`).toBeDefined()
  return found![1]
}

function openSession(role: AppRole, userId = 42): void {
  mockValidate.mockImplementation(async () => ({
    id: userId,
    role,
    is_validated: 1,
    email: `${role.toLowerCase()}@cde.test`,
    nom: 'Utilisateur',
  }))
  container.resolve(CurrentSessionService).set({ token: `token-${role}`, userId, role })
}

describe('invoice handlers — autorisation et acteur', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    container.clearInstances()

    container.registerInstance(InvoiceService, mockInvoiceService as unknown as InvoiceService)
    container.registerInstance(SessionService, {
      validate: mockValidate,
      invalidate: vi.fn(),
    } as unknown as SessionService)

    registerInvoiceHandlers()
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('refuse un MEDECIN sur les canaux d\'écriture facture', async () => {
    openSession('MEDECIN')

    const create = await channel('invoices:create')({}, { patient_id: 1, date: '2026-05-01', items: [] })
    const update = await channel('invoices:update')({}, { id: 1, status: 'annulé' })
    const pay = await channel('invoices:add-payment')({}, { invoice_id: 1, montant: 100 })

    for (const res of [create, update, pay]) {
      expect(res.success).toBe(false)
      expect(res.message).toMatch(/Accès refusé/)
    }
    expect(mockInvoiceService.create).not.toHaveBeenCalled()
    expect(mockInvoiceService.update).not.toHaveBeenCalled()
    expect(mockInvoiceService.addPayment).not.toHaveBeenCalled()
  })

  it('autorise SECRETAIRE, COMPTABLE et ADMIN sur les canaux d\'écriture', async () => {
    mockInvoiceService.addPayment.mockResolvedValue({ id: 1 })
    mockInvoiceService.update.mockResolvedValue({ id: 1 })
    mockInvoiceService.create.mockResolvedValue({ id: 1 })

    for (const role of ['SECRETAIRE', 'COMPTABLE', 'ADMIN'] as AppRole[]) {
      openSession(role)

      expect((await channel('invoices:add-payment')({}, { invoice_id: 1, montant: 100 })).success, role).toBe(true)
      expect((await channel('invoices:update')({}, { id: 1, notes: 'test' })).success, role).toBe(true)
      expect((await channel('invoices:create')({}, { patient_id: 1, date: '2026-05-01', items: [] })).success, role).toBe(true)
    }

    expect(mockInvoiceService.addPayment).toHaveBeenCalledTimes(3)
    expect(mockInvoiceService.update).toHaveBeenCalledTimes(3)
    expect(mockInvoiceService.create).toHaveBeenCalledTimes(3)
  })

  it('refuse un appel sans session sur les lectures', async () => {
    const res = await channel('invoices:list')({})

    expect(res.success).toBe(false)
    expect(res.message).toMatch(/session/i)
    expect(mockInvoiceService.list).not.toHaveBeenCalled()
  })

  it('autorise la lecture avec une session valide', async () => {
    openSession('MEDECIN')
    mockInvoiceService.list.mockResolvedValue([])

    const res = await channel('invoices:list')({})

    expect(res.success).toBe(true)
    expect(mockInvoiceService.list).toHaveBeenCalled()
  })

  it('force created_by depuis la session pour add-payment', async () => {
    openSession('COMPTABLE', 42)
    mockInvoiceService.addPayment.mockResolvedValue({ id: 1 })

    const res = await channel('invoices:add-payment')({}, {
      invoice_id: 1,
      montant: 5000,
      created_by: 999,
    })

    expect(res.success).toBe(true)
    expect(mockInvoiceService.addPayment).toHaveBeenCalledWith(
      expect.objectContaining({ invoice_id: 1, montant: 5000, created_by: 42 }),
    )
  })

  it('force created_by depuis la session pour create', async () => {
    openSession('SECRETAIRE', 7)
    mockInvoiceService.create.mockResolvedValue({ id: 1 })

    await channel('invoices:create')({}, { patient_id: 1, date: '2026-05-01', items: [], created_by: 999 })

    expect(mockInvoiceService.create).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: 7 }),
    )
  })
})
