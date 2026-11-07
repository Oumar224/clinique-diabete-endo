// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

const mockInvoke = vi.fn()
vi.stubGlobal('window', {
  electronAPI: { invoke: mockInvoke, getVersion: vi.fn(), autoUpdater: {} as any },
})

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '7' } }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/composables/usePatientContext', () => ({
  usePatientContext: () => ({
    activePatient: ref({ id: 7, nom: 'Diallo', prenom: 'Amadou' }),
  }),
}))

const mockSuccess = vi.fn()
const mockError = vi.fn()
const mockWarning = vi.fn()
vi.mock('element-plus', () => ({
  ElMessage: {
    get success() { return mockSuccess },
    get error() { return mockError },
    get warning() { return mockWarning },
  },
  ElMessageBox: { confirm: vi.fn(() => Promise.resolve()), alert: vi.fn() },
}))

import RendezVousView from '../RendezVousView.vue'
import { toISODate, timeToMinutes, findTimeConflict } from '@/composables/useAppointments'

const EL_STUBS: Record<string, any> = {
  'el-radio-group': { template: '<div><slot /></div>' },
  'el-radio-button': { template: '<div><slot /></div>' },
  'el-button-group': { template: '<div><slot /></div>' },
  'el-button': { template: '<button><slot /></button>' },
  'el-skeleton': { template: '<div />' },
  'el-alert': { template: '<div />' },
  'el-table': { template: '<div><slot /></div>' },
  'el-table-column': { template: '<div><slot /></div>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-dialog': { template: '<div><slot /></div>', props: ['modelValue'] },
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-row': { template: '<div><slot /></div>' },
  'el-col': { template: '<div><slot /></div>' },
  'el-date-picker': { template: '<input />' },
  'el-time-picker': { template: '<input />' },
  'el-select': { template: '<div><slot /></div>' },
  'el-option': { template: '<div><slot /></div>' },
  'el-input': { template: '<input />' },
  'el-autocomplete': { template: '<input />' },
}

function rdvList() {
  return [
    { id: 1, patient_id: 7, date: '2026-09-28', time: '09:00', motif: 'Contrôle', status: 'pending', medecin_id: 3 },
    { id: 2, patient_id: 7, date: '2026-09-29', time: '10:00', motif: 'Suivi', status: 'confirmed', medecin_id: 3 },
  ]
}

function mockChannels() {
  mockInvoke.mockImplementation(async (channel: string) => {
    if (channel === 'appointments:list-by-patient') return { success: true, data: rdvList() }
    if (channel === 'appointments:update') return { success: true, data: { id: 1 } }
    if (channel === 'appointments:update-status') return { success: true, data: { success: true } }
    return { success: true, data: null }
  })
}

describe('RendezVousView — DnD + click cellule', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    mockChannels()
    mockSuccess.mockClear()
  })

  it('onCellClick pré-remplit date ISO + heure', async () => {
    const w = mount(RendezVousView, {
      global: { stubs: { ...EL_STUBS, AppointmentFormDialog: { template: '<div />', props: ['initialDate', 'initialTime', 'appointment'] } } },
      attachTo: document.body,
    })
    await flushPromises()
    const s: any = w.vm.$.setupState ?? (w.vm as any)
    const day = s.weekDays[0]
    expect(day.isoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    s.onCellClick(day, 9)
    expect(s.prefill.date).toBe(day.isoDate)
    expect(s.prefill.time).toBe('09:00')
    expect(s.formDialogVisible).toBe(true)
    expect(s.selectedAppointment).toBeNull()
    w.unmount()
  })

  it('drop déplace via updateAppointment + toast + reload', async () => {
    const w = mount(RendezVousView, {
      global: { stubs: { ...EL_STUBS, AppointmentFormDialog: { template: '<div />' } } },
      attachTo: document.body,
    })
    await flushPromises()
    const s: any = w.vm.$.setupState ?? (w.vm as any)
    const day = s.weekDays[1]
    s.draggedId = 1
    await s.onCellDrop(day, 10)
    const updateCalls = mockInvoke.mock.calls.filter(([c]) => c === 'appointments:update')
    expect(updateCalls.length).toBeGreaterThan(0)
    expect(updateCalls[0][1]).toMatchObject({ id: 1, date: day.isoDate, time: '10:00' })
    expect(mockSuccess).toHaveBeenCalled()
    w.unmount()
  })

  it('quickStatus appelle update-status Confirmer/Annuler/Effectué', async () => {
    const w = mount(RendezVousView, {
      global: { stubs: { ...EL_STUBS, AppointmentFormDialog: { template: '<div />' } } },
      attachTo: document.body,
    })
    await flushPromises()
    const s: any = w.vm.$.setupState ?? (w.vm as any)
    await s.quickStatus({ id: 1, status: 'pending' }, 'confirmed')
    await s.quickStatus({ id: 1, status: 'confirmed' }, 'done')
    await s.quickStatus({ id: 1, status: 'done' }, 'cancelled')
    const calls = mockInvoke.mock.calls.filter(([c]) => c === 'appointments:update-status')
    expect(calls.map(([, p]: any) => p.status)).toEqual(['confirmed', 'done', 'cancelled'])
    w.unmount()
  })

  it('helpers: toISODate / timeToMinutes / findTimeConflict', () => {
    expect(toISODate(new Date(2026, 8, 28))).toBe('2026-09-28')
    expect(timeToMinutes('09:30')).toBe(570)
    const hit = findTimeConflict(
      [{ date: '2026-09-28', time: '09:00', medecin_id: 3 }],
      { date: '2026-09-28', time: '09:15', medecin_id: 3 },
      30,
    )
    expect(hit).toBeDefined()
    const noHit = findTimeConflict(
      [{ date: '2026-09-28', time: '09:00', medecin_id: 3 }],
      { date: '2026-09-28', time: '10:00', medecin_id: 3 },
      30,
    )
    expect(noHit).toBeUndefined()
  })

  it('does not render its own page title (the layout band owns the H1)', async () => {
    const w = mount(RendezVousView, {
      global: { stubs: { ...EL_STUBS, AppointmentFormDialog: { template: '<div />' } } },
    })
    await flushPromises()

    expect(w.findAll('h1')).toHaveLength(0)
    expect(w.find('.cde-page-title').exists()).toBe(false)
    expect(w.find('.cde-page-sub').text()).toContain('Historique, statuts et planification')

    w.unmount()
  })
})
