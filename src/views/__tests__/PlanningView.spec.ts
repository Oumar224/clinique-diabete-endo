// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const mockInvoke = vi.fn()
vi.stubGlobal('window', {
  electronAPI: { invoke: mockInvoke, getVersion: vi.fn(), autoUpdater: {} as any },
})

const mockSuccess = vi.fn()
vi.mock('element-plus', () => ({
  ElMessage: {
    get success() { return mockSuccess },
    get warning() { return vi.fn() },
    get error() { return vi.fn() },
  },
  ElMessageBox: { confirm: vi.fn(() => Promise.resolve()) },
}))

import PlanningView from '../PlanningView.vue'

const EL_STUBS: Record<string, any> = {
  'el-button-group': { template: '<div><slot /></div>' },
  'el-button': { template: '<button><slot /></button>' },
  'el-select': { template: '<div><slot /></div>', props: ['modelValue'] },
  'el-option': { template: '<div><slot /></div>' },
  'el-skeleton': { template: '<div />' },
  'el-alert': { template: '<div />' },
  'el-dialog': { template: '<div><slot /></div>', props: ['modelValue'] },
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-row': { template: '<div><slot /></div>' },
  'el-col': { template: '<div><slot /></div>' },
  'el-date-picker': { template: '<input />' },
  'el-time-picker': { template: '<input />' },
  'el-input': { template: '<input />' },
  'el-autocomplete': { template: '<input />' },
}

describe('PlanningView — vraies données + DnD', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    mockInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'appointments:list') {
        return {
          success: true,
          data: [
            { id: 11, patient_id: 7, date: '2026-09-28', time: '09:00', motif: 'Contrôle', status: 'confirmed', medecin_id: 3 },
            { id: 12, patient_id: 8, date: '2026-09-29', time: '14:00', motif: 'Suivi', status: 'pending', medecin_id: 4 },
          ],
        }
      }
      if (channel === 'patients:list') {
        return {
          success: true,
          data: [
            { id: 7, nom: 'Diallo', prenom: 'Amadou' },
            { id: 8, nom: 'Barry', prenom: 'Aïssatou' },
          ],
        }
      }
      if (channel === 'appointments:update') return { success: true, data: { id: 11 } }
      return { success: true, data: null }
    })
    mockSuccess.mockClear()
  })

  it('charge via appointments:list (listJoined) et filtre la semaine', async () => {
    const w = mount(PlanningView, {
      global: { stubs: { ...EL_STUBS, AppointmentFormDialog: { template: '<div />' } } },
      attachTo: document.body,
    })
    await flushPromises()
    const calls = mockInvoke.mock.calls.filter(([c]) => c === 'appointments:list')
    expect(calls.length).toBeGreaterThan(0)
    const s: any = w.vm.$.setupState ?? (w.vm as any)
    expect(Array.isArray(s.weekAppointments)).toBe(true)
    w.unmount()
  })

  it('onCellClick pré-remplit le dialog', async () => {
    const w = mount(PlanningView, {
      global: { stubs: { ...EL_STUBS, AppointmentFormDialog: { template: '<div />' } } },
      attachTo: document.body,
    })
    await flushPromises()
    const s: any = w.vm.$.setupState ?? (w.vm as any)
    const day = s.weekDays[2]
    s.onCellClick(day, 14)
    expect(s.prefill.date).toBe(day.isoDate)
    expect(s.prefill.time).toBe('14:00')
    expect(s.formVisible).toBe(true)
    w.unmount()
  })

  it('drop inter-jours appelle update + toast', async () => {
    const w = mount(PlanningView, {
      global: { stubs: { ...EL_STUBS, AppointmentFormDialog: { template: '<div />' } } },
      attachTo: document.body,
    })
    await flushPromises()
    const s: any = w.vm.$.setupState ?? (w.vm as any)
    const day = s.weekDays[3]
    s.draggedId = 11
    await s.onCellDrop(day, 11)
    const upd = mockInvoke.mock.calls.filter(([c]) => c === 'appointments:update')
    expect(upd.length).toBeGreaterThan(0)
    expect(upd[0][1]).toMatchObject({ id: 11, date: day.isoDate, time: '11:00' })
    expect(mockSuccess).toHaveBeenCalled()
    w.unmount()
  })
})
