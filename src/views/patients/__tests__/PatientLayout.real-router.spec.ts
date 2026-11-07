// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { createRouter, createMemoryHistory, RouterView } from 'vue-router'
import ElementPlus from 'element-plus'

// The layout spec is not about charts; avoid jsdom canvas work in the Soins tab.
vi.mock('vue-chartjs', () => ({ Line: { name: 'Line', template: '<div />' } }))
import { routes } from '@/router'
import type { Patient } from '@/composables/usePatientContext'

/**
 * Regression tests for the real nested route tree.
 *
 * These mount DashboardLayout → PatientLayout → the real routed view through
 * the application router (not a mocked `useRoute`). They prove that:
 *   - every patient screen renders exactly one H1, inside the page band;
 *   - the band is never empty;
 *   - the Soins tab row lives inside the band;
 *   - routed views no longer render their own `.cde-page-title`.
 */

const PATIENT: Patient = {
  id: 42,
  civilite: 'M',
  nom: 'Diallo',
  prenom: 'Mamadou',
  date_naissance: '1990-01-01',
  nir: '12345678942',
  telephone: '+22460000042',
  allergies: [],
}

const ELECTRON_CHANNELS: Record<string, unknown> = {
  'patients:get': PATIENT,
  'appointments:list-by-patient': [],
  'ordonnance-libre:list': [],
  'vital-signs:get-today': null,
  'session:validate': null,
  'sync:configure-session': null,
  'sync:start': null,
  'session:update-activity': null,
}

function installElectronMock() {
  vi.stubGlobal('electronAPI', {
    invoke: vi.fn(async (channel: string) => ({
      success: true,
      data: ELECTRON_CHANNELS[channel] ?? null,
      message: '',
    })),
  })
}

const Root = defineComponent({
  name: 'TestRoot',
  render: () => h(RouterView),
})

async function settle() {
  for (let i = 0; i < 6; i++) {
    await flushPromises()
    await nextTick()
  }
}

async function mountPatientRoute(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })

  await router.push(path)
  await router.isReady()

  const wrapper = mount(Root, {
    global: {
      plugins: [router, ElementPlus],
      stubs: { SideBar: true, TopBar: true },
    },
  })

  await settle()
  return { router, wrapper }
}

function expectSingleTitleInBand(
  wrapper: Awaited<ReturnType<typeof mountPatientRoute>>['wrapper'],
  expectedTitle: string,
) {
  const band = wrapper.find('.cde-section-head')
  expect(band.exists()).toBe(true)
  expect(band.text().trim().length).toBeGreaterThan(0)

  const headings = wrapper.findAll('h1')
  expect(headings).toHaveLength(1)
  expect(headings[0].text()).toBe(expectedTitle)
  expect(band.find('h1').element).toBe(headings[0].element)

  // Routed views must not render their own page title any more.
  expect(wrapper.find('.cde-page-title').exists()).toBe(false)
}

describe('PatientLayout — real router', () => {
  beforeEach(() => {
    installElectronMock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('resolves patient-rdv and renders a single title inside the band', async () => {
    const { router, wrapper } = await mountPatientRoute('/app/patients/42/rdv')

    expect(router.currentRoute.value.name).toBe('patient-rdv')
    expect(router.currentRoute.value.matched.map(record => record.name))
      .toContain('patient-rdv')

    expectSingleTitleInBand(wrapper, 'Rendez-vous')

    // Actions are teleported onto the title line of the band.
    expect(wrapper.find('.cde-section-head').text()).toContain('Planifier')
  })

  it('resolves patient-ordonnances and renders a single title inside the band', async () => {
    const { router, wrapper } = await mountPatientRoute('/app/patients/42/ordonnances')

    expect(router.currentRoute.value.name).toBe('patient-ordonnances')

    expectSingleTitleInBand(wrapper, 'Ordonnances')

    // OrdonnanceView keeps its refresh action, now on the band title line.
    expect(wrapper.find('.cde-section-head').text()).toContain('Rafraîchir')
  })

  it('resolves patient-soins with the tab row inside the band', async () => {
    const { router, wrapper } = await mountPatientRoute('/app/patients/42/soins')

    expect(router.currentRoute.value.name).toBe('patient-soins')

    expectSingleTitleInBand(wrapper, 'Administration Soins & Médicaments')

    const band = wrapper.find('.cde-section-head')
    const tabs = band.findAll('[role="tab"]')
    expect(tabs.map(tab => tab.text())).toEqual([
      'Plan Distribution',
      'Vital Check',
      'Diagramme de Synthèse',
    ])
    expect(tabs[0].attributes('aria-selected')).toBe('true')
  })
})
