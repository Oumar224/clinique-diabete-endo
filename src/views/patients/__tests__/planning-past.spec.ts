// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

/**
 * Past-state coverage for the two appointment grids:
 * - `PlanningView` (general Planning page)
 * - `RendezVousView` (patient Rendez-vous calendar tab)
 *
 * Only the RDV blocks may be flagged past. Grid headers and hour cells stay
 * neutral, and the teal "today" column is untouched.
 *
 * The clock is frozen at Wednesday 2026-10-21 12:30 local time so the
 * rendered week is Mon 19 → Sun 25. Monday/Tuesday are past days and
 * Wednesday is today; block 102 (09:00) is already past while block 103
 * (15:00) is still upcoming.
 */

const mockInvoke = vi.fn()
vi.stubGlobal('window', {
  electronAPI: { invoke: mockInvoke, getVersion: vi.fn(), autoUpdater: {} as never },
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

vi.mock('element-plus', () => ({
  ElMessage: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
  ElMessageBox: { confirm: vi.fn(() => Promise.resolve()), alert: vi.fn() },
}))

import PlanningView from '@/views/PlanningView.vue'
import RendezVousView from '@/views/patients/RendezVousView.vue'

const EL_STUBS: Record<string, unknown> = {
  'el-radio-group': { template: '<div><slot /></div>' },
  'el-radio-button': { template: '<div><slot /></div>' },
  'el-button-group': { template: '<div><slot /></div>' },
  'el-button': { template: '<button><slot /></button>' },
  'el-skeleton': { template: '<div />' },
  'el-alert': { template: '<div />' },
  'el-table': { template: '<div><slot /></div>' },
  'el-table-column': { template: '<div><slot /></div>' },
  'el-select': { template: '<div><slot /></div>' },
  'el-option': { template: '<div><slot /></div>' },
  'el-dialog': { template: '<div><slot /></div>' },
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': { template: '<div><slot /></div>' },
  'el-date-picker': { template: '<input />' },
  'el-time-picker': { template: '<input />' },
  'el-input': { template: '<input />' },
  'el-autocomplete': { template: '<input />' },
  AppointmentFormDialog: { template: '<div />' },
  PatientPageToolbar: { template: '<div><slot name="sub" /><slot /></div>' },
}

const APPOINTMENTS = [
  { id: 101, patient_id: 7, date: '2026-10-19', time: '09:00', motif: 'Passé', status: 'done' },
  { id: 102, patient_id: 7, date: '2026-10-21', time: '09:00', motif: 'Matin', status: 'confirmed' },
  { id: 103, patient_id: 7, date: '2026-10-21', time: '15:00', motif: 'Après-midi', status: 'pending' },
  { id: 104, patient_id: 7, date: '2026-10-23', time: '09:00', motif: 'Futur', status: 'confirmed' },
]

async function flushUi(): Promise<void> {
  for (let i = 0; i < 12; i += 1) {
    await Promise.resolve()
  }
  await nextTick()
}

async function mountGrid(component: unknown): Promise<VueWrapper> {
  const wrapper = mount(component as never, {
    global: { stubs: EL_STUBS },
  })
  await flushUi()
  return wrapper
}

function slot(wrapper: VueWrapper, isoDate: string, hour: number) {
  return wrapper.find(`[data-slot="${isoDate}-${hour}"]`)
}

function header(wrapper: VueWrapper, isoDate: string) {
  return wrapper.find(`[data-day="${isoDate}"]`)
}

function chip(wrapper: VueWrapper, id: number) {
  return wrapper.find(`[data-rdv-id="${id}"]`)
}

/** Asserts an element carries neither a `--past` class nor an inline danger background. */
function expectNeutralSurface(el: ReturnType<VueWrapper['find']>): void {
  expect(el.exists()).toBe(true)
  expect(el.classes().some(c => c.endsWith('--past'))).toBe(false)
  expect(el.classes().some(c => c.includes('danger'))).toBe(false)
  expect(el.attributes('style') ?? '').not.toContain('background')
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 21, 12, 30, 0))
  mockInvoke.mockReset()
  mockInvoke.mockImplementation(async (channel: string) => {
    if (channel === 'appointments:list' || channel === 'appointments:list-by-patient') {
      return { success: true, data: APPOINTMENTS }
    }
    if (channel === 'patients:list') {
      return { success: true, data: [{ id: 7, nom: 'Diallo', prenom: 'Amadou' }] }
    }
    return { success: true, data: null }
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PlanningView — l’état « passé » ne colore pas la grille', () => {
  it('laisse l’en-tête et la case passés neutres, sans fond de danger', async () => {
    const wrapper = await mountGrid(PlanningView)

    // Lundi 19 est passé, mais l'en-tête et la case restent neutres.
    expectNeutralSurface(header(wrapper, '2026-10-19'))
    expectNeutralSurface(slot(wrapper, '2026-10-19', 9))

    // Le passé ne doit pas non plus apparaître dans aujourd'hui ni dans le futur.
    expectNeutralSurface(header(wrapper, '2026-10-23'))
    expectNeutralSurface(slot(wrapper, '2026-10-23', 9))

    wrapper.unmount()
  })

  it('garde le surlignage teal d’aujourd’hui intact', async () => {
    const wrapper = await mountGrid(PlanningView)

    const todayHeader = header(wrapper, '2026-10-21')
    expect(todayHeader.classes()).toContain('planning__day-header--today')
    expect(todayHeader.classes().some(c => c.endsWith('--past'))).toBe(false)

    // La colonne du jour reste normale, y compris les heures déjà écoulées.
    expectNeutralSurface(slot(wrapper, '2026-10-21', 9))
    expectNeutralSurface(slot(wrapper, '2026-10-21', 15))

    wrapper.unmount()
  })

  it('applique l’accent rouge uniquement aux blocs RDV passés', async () => {
    const wrapper = await mountGrid(PlanningView)

    expect(chip(wrapper, 101).classes()).toContain('planning__rdv--past')
    expect(chip(wrapper, 102).classes()).toContain('planning__rdv--past')
    expect(chip(wrapper, 103).classes()).not.toContain('planning__rdv--past')
    expect(chip(wrapper, 104).classes()).not.toContain('planning__rdv--past')

    // Le bloc passé reste cliquable et déplaçable.
    expect(chip(wrapper, 101).attributes('draggable')).toBe('true')

    wrapper.unmount()
  })

  it('fait basculer un bloc en passé lorsqu’il franchit son heure de début', async () => {
    const wrapper = await mountGrid(PlanningView)

    expect(chip(wrapper, 103).classes()).not.toContain('planning__rdv--past')

    // 15:05 : le bloc de 15:00 est désormais dans le passé.
    vi.setSystemTime(new Date(2026, 9, 21, 15, 5, 0))
    await vi.advanceTimersByTimeAsync(60_000)
    await flushUi()

    expect(chip(wrapper, 103).classes()).toContain('planning__rdv--past')
    expect(chip(wrapper, 104).classes()).not.toContain('planning__rdv--past')

    wrapper.unmount()
  })
})

describe('RendezVousView — l’état « passé » ne colore pas le calendrier', () => {
  it('laisse l’en-tête et la case passés neutres, sans fond de danger', async () => {
    const wrapper = await mountGrid(RendezVousView)

    expectNeutralSurface(header(wrapper, '2026-10-20'))
    expectNeutralSurface(slot(wrapper, '2026-10-20', 9))

    expectNeutralSurface(header(wrapper, '2026-10-24'))
    expectNeutralSurface(slot(wrapper, '2026-10-24', 9))

    wrapper.unmount()
  })

  it('garde le surlignage teal d’aujourd’hui intact', async () => {
    const wrapper = await mountGrid(RendezVousView)

    const todayHeader = header(wrapper, '2026-10-21')
    expect(todayHeader.classes()).toContain('rdv-calendar__day-header--today')
    expect(todayHeader.classes().some(c => c.endsWith('--past'))).toBe(false)

    expectNeutralSurface(slot(wrapper, '2026-10-21', 9))
    expectNeutralSurface(slot(wrapper, '2026-10-21', 15))

    wrapper.unmount()
  })

  it('applique l’accent rouge uniquement aux blocs RDV passés', async () => {
    const wrapper = await mountGrid(RendezVousView)

    expect(chip(wrapper, 101).classes()).toContain('rdv-calendar__rdv--past')
    expect(chip(wrapper, 102).classes()).toContain('rdv-calendar__rdv--past')
    expect(chip(wrapper, 103).classes()).not.toContain('rdv-calendar__rdv--past')
    expect(chip(wrapper, 104).classes()).not.toContain('rdv-calendar__rdv--past')

    expect(chip(wrapper, 101).attributes('draggable')).toBe('true')

    wrapper.unmount()
  })

  it('fait basculer un bloc en passé lorsqu’il franchit son heure de début', async () => {
    const wrapper = await mountGrid(RendezVousView)

    expect(chip(wrapper, 103).classes()).not.toContain('rdv-calendar__rdv--past')

    vi.setSystemTime(new Date(2026, 9, 21, 15, 5, 0))
    await vi.advanceTimersByTimeAsync(60_000)
    await flushUi()

    expect(chip(wrapper, 103).classes()).toContain('rdv-calendar__rdv--past')
    expect(chip(wrapper, 104).classes()).not.toContain('rdv-calendar__rdv--past')

    wrapper.unmount()
  })
})
