// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import IndicateursAnnuelsView from '../IndicateursAnnuelsView.vue'
import {
  METRIC_KEYS,
  type IndicateursAnnuelsDto,
  type IndicateursMensuelsDto,
  type MetricKey,
} from '@/types/indicateurs'

const { mockIpcInvoke, userRef } = vi.hoisted(() => ({
  mockIpcInvoke: vi.fn(),
  userRef: { value: null as { role?: string } | null },
}))

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ user: userRef }),
}))

vi.mock('vue-chartjs', () => ({
  Bar: {
    name: 'Bar',
    props: ['data', 'options'],
    template: '<div class="ia-chart-stub" />',
  },
}))

const stubs = {
  'el-button': {
    template: '<button class="el-button" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['type', 'size', 'loading'],
    emits: ['click'],
  },
  'el-date-picker': {
    template: '<input class="el-date-picker" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'valueFormat', 'clearable', 'placeholder'],
    emits: ['update:modelValue', 'change'],
  },
}

function emptyRow(annee: number): IndicateursAnnuelsDto['lignes'][number] {
  const row = { annee, sources: {} } as unknown as IndicateursAnnuelsDto['lignes'][number]
  for (const metric of METRIC_KEYS) {
    row[metric] = null
    row.sources[metric] = 'indisponible'
  }
  return row
}

function makeFixture(): IndicateursAnnuelsDto {
  const row2025 = emptyRow(2025)
  const values: Partial<Record<MetricKey, number>> = {
    suivi_diabete_endocrino: 34,
    soins_ambulatoires: 12,
    nouveaux_cas_diabete: 10,
    nouveaux_cas_thyroide_endocrino: 4,
    nouveaux_venus_diabete: 8,
    bilan_labo: 20,
    hospitalisation_jour: 6,
    hospitalisation_complete: 2,
    autres_nouveaux_cas: 3,
    ecg: 9,
    hopital_de_jour: 5,
    total_activites: 79,
    moyenne_activites: 8,
  }
  for (const [metric, value] of Object.entries(values) as Array<[MetricKey, number]>) {
    row2025[metric] = value
    row2025.sources[metric] = metric === 'suivi_diabete_endocrino' ? 'saisi' : 'calcule'
  }

  const row2026 = emptyRow(2026)

  const totaux = {} as IndicateursAnnuelsDto['totaux']
  for (const metric of METRIC_KEYS) totaux[metric] = row2025[metric] ?? null
  totaux.moyenne_par_an = {} as Record<MetricKey, number | null>
  for (const metric of METRIC_KEYS) totaux.moyenne_par_an[metric] = row2025[metric]
  totaux.moyenne_par_an.total_activites = 8

  return { lignes: [row2025, row2026], totaux }
}

function makeMensuel(annee: number): IndicateursMensuelsDto {
  return {
    annee,
    lignes: [
      {
        metric: 'soins_ambulatoires',
        mois: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, null],
        total: 88,
      },
      {
        metric: 'bilan_labo',
        mois: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        total: 78,
      },
    ],
    totaux_mois: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 12],
    total: 166,
  }
}

function mountView() {
  return mount(IndicateursAnnuelsView, {
    global: {
      stubs,
      directives: { loading: {} },
    },
  })
}

function monthlyCallCount(): number {
  return mockIpcInvoke.mock.calls.filter(([channel]) => channel === 'indicateurs:mensuels').length
}

describe('IndicateursAnnuelsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userRef.value = { role: 'ADMIN' }
    const fixture = makeFixture()
    mockIpcInvoke.mockImplementation((channel: string, params?: { annee?: number }) => {
      if (channel === 'indicateurs:annuels') return Promise.resolve(fixture)
      if (channel === 'indicateurs:mensuels' && params?.annee != null) {
        return Promise.resolve(makeMensuel(params.annee))
      }
      return Promise.resolve(undefined)
    })
  })

  it('charge la période par défaut et affiche la synthèse et la matrice', async () => {
    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    const year = new Date().getFullYear()
    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'indicateurs:annuels',
      { fromYear: year - 4, toYear: year },
      { silent: true },
    )

    expect(wrapper.findAll('.cde-summary__label').map((node) => node.text())).toEqual([
      'Cas suivis',
      'Total activités',
      'Moyenne / an',
      'Nouveaux cas cumulés',
    ])

    const kpis = wrapper.findAll('.ia-kpi__value').map((node) => node.text())
    expect(kpis).toEqual(['34', '79', '8', '17'])

    expect(wrapper.findAll('.ia-year-row')).toHaveLength(2)
    expect(wrapper.find('.ia-foot-total').exists()).toBe(true)
    expect(wrapper.find('.ia-foot-moyenne').exists()).toBe(true)
    expect(wrapper.text()).toContain('Moyenne par an')
  })

  it('rend le titre « Indicateur », la colonne Suivi en cas et une matrice à 14 colonnes', async () => {
    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('.cde-page-title').text()).toBe('Indicateur')
    expect(wrapper.text()).not.toContain('Indicateurs annuels')
    expect(wrapper.findAll('table')).toHaveLength(1)
    expect(wrapper.find('.ia-table > colgroup').findAll('col')).toHaveLength(METRIC_KEYS.length + 1)

    // Nouvelle colonne : libellé et unité « cas » dans l'en-tête de groupe.
    const suivi = wrapper.find('.ia-th--suivi')
    expect(suivi.text()).toContain('Suivi diabète / endo.')
    expect(wrapper.findAll('.ia-head-group .ia-group__unit').map((node) => node.text()))
      .toEqual(['cas', 'cas'])
    expect(wrapper.text()).toContain('Soins ambul.')
    // Aucun montant, aucun symbole monétaire, aucun axe CA.
    expect(wrapper.text()).not.toContain('GNF')
    expect(wrapper.text()).not.toContain('CA cumulé')

    // En-tête, corps et les DEUX lignes de pied partagent le même nombre de
    // cellules : une seule table + un seul colgroup garantissent l'alignement.
    const bodyRow = wrapper.find('.ia-year-row')
    expect(bodyRow.findAll('th, td')).toHaveLength(METRIC_KEYS.length + 1)
    const footRows = wrapper.findAll('.ia-foot-row')
    expect(footRows).toHaveLength(2)
    for (const row of footRows) {
      expect(row.findAll('th, td')).toHaveLength(METRIC_KEYS.length + 1)
    }
    const groupColspans = wrapper
      .findAll('.ia-head-group .ia-group')
      .map((th) => Number(th.attributes('colspan')))
    expect(groupColspans.reduce((sum, span) => sum + span, 0)).toBe(METRIC_KEYS.length)
  })

  it('affiche « — » pour les totaux sans aucune valeur sur la période', async () => {
    mockIpcInvoke.mockImplementation((channel: string) => {
      if (channel === 'indicateurs:annuels') {
        const row = emptyRow(2025)
        const totaux = {} as IndicateursAnnuelsDto['totaux']
        for (const metric of METRIC_KEYS) totaux[metric] = null
        totaux.moyenne_par_an = {} as Record<MetricKey, number | null>
        for (const metric of METRIC_KEYS) totaux.moyenne_par_an[metric] = null
        return Promise.resolve({ lignes: [row], totaux })
      }
      return Promise.resolve(undefined)
    })

    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    const values = wrapper.findAll('.ia-foot-value').map((cell) => cell.text())
    expect(values.every((value) => value === '—')).toBe(true)
    expect(wrapper.findAll('.ia-kpi__value').map((node) => node.text())).toEqual([
      '—',
      '—',
      '—',
      '—',
    ])
  })

  it('conserve « 0 » lorsqu’un zéro réel existe sur la période', async () => {
    mockIpcInvoke.mockImplementation((channel: string) => {
      if (channel === 'indicateurs:annuels') {
        const row = emptyRow(2025)
        row.nouveaux_cas_diabete = 0
        row.sources.nouveaux_cas_diabete = 'calcule'
        row.total_activites = 0
        row.sources.total_activites = 'calcule'
        row.moyenne_activites = 0
        row.sources.moyenne_activites = 'calcule'

        const totaux = {} as IndicateursAnnuelsDto['totaux']
        for (const metric of METRIC_KEYS) totaux[metric] = null
        totaux.nouveaux_cas_diabete = 0
        totaux.total_activites = 0
        totaux.moyenne_activites = 0
        totaux.moyenne_par_an = {} as Record<MetricKey, number | null>
        for (const metric of METRIC_KEYS) totaux.moyenne_par_an[metric] = null
        totaux.moyenne_par_an.total_activites = 0

        return Promise.resolve({ lignes: [row], totaux })
      }
      return Promise.resolve(undefined)
    })

    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    expect(wrapper.findAll('.ia-kpi__value').map((node) => node.text())).toEqual([
      '—',
      '0',
      '0',
      '0',
    ])
    expect(wrapper.find('[data-annee="2025"][data-metric="nouveaux_cas_diabete"]').text()).toContain('0')
    expect(wrapper.find('[data-annee="2025"][data-metric="nouveaux_cas_diabete"]').text()).not.toContain('—')
  })

  it('laisse un trou dans le graphique et trace le suivi sur le même axe que les barres', async () => {
    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    const chart = wrapper.findComponent({ name: 'Bar' })
    const data = chart.props('data') as {
      labels: string[]
      datasets: Array<{ label: string; data: Array<number | null>; spanGaps?: boolean }>
    }
    const total = data.datasets.find((dataset) => dataset.label === 'Total activités')
    expect(total?.data).toEqual([79, null])

    const line = data.datasets.find((dataset) => dataset.label === 'Suivi diabète / endo.')
    expect(line?.data).toEqual([34, null])
    expect(line?.spanGaps).toBe(false)

    expect(data.labels).toEqual(['2025', '2026'])
    expect(JSON.stringify(data)).not.toContain('GNF')

    const options = chart.props('options') as {
      plugins: { legend: { position: string } }
      scales: {
        y: { beginAtZero: boolean; title: { text: string } }
        y1?: unknown
      }
    }
    expect(options.scales.y.beginAtZero).toBe(true)
    expect(options.scales.y.title.text).toBe('Cas')
    // Plus d'axe ni de légende monétaires : un seul axe de comptage.
    expect(options.scales.y1).toBeUndefined()
    expect(options.plugins.legend.position).toBe('bottom')
  })

  it('marque les valeurs saisies, calculées et indisponibles', async () => {
    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    const saisi = wrapper.find('[data-annee="2025"][data-metric="suivi_diabete_endocrino"]')
    expect(saisi.classes()).toContain('ia-td--saisi')
    expect(saisi.text()).toContain('saisi')
    expect(saisi.find('.ia-clear').exists()).toBe(true)

    const calcule = wrapper.find('[data-annee="2025"][data-metric="nouveaux_cas_diabete"]')
    expect(calcule.classes()).not.toContain('ia-td--saisi')
    expect(calcule.find('.ia-clear').exists()).toBe(false)

    const indisponible = wrapper.find('[data-annee="2026"][data-metric="suivi_diabete_endocrino"]')
    expect(indisponible.classes()).toContain('ia-td--empty')
    expect(indisponible.text()).toContain('—')
  })

  it('enregistre une cellule éditée par ADMIN avec Entrée', async () => {
    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    const cell = wrapper.find('[data-annee="2025"][data-metric="nouveaux_cas_diabete"]')
    await cell.trigger('click')
    await nextTick()

    const input = wrapper.find('input.ia-input')
    expect(input.exists()).toBe(true)
    await input.setValue('12')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('indicateurs:set-manuel', {
      annee: 2025,
      metric: 'nouveaux_cas_diabete',
      value: 12,
    })
    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'indicateurs:annuels',
      expect.objectContaining({ fromYear: expect.any(Number), toYear: expect.any(Number) }),
      { silent: true },
    )
  })

  it('annule l’édition avec Échap sans écrire', async () => {
    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    const cell = wrapper.find('[data-annee="2025"][data-metric="bilan_labo"]')
    await cell.trigger('click')
    await nextTick()

    const input = wrapper.find('input.ia-input')
    await input.setValue('99')
    await input.trigger('keydown', { key: 'Escape' })
    await nextTick()

    expect(wrapper.find('input.ia-input').exists()).toBe(false)
    expect(mockIpcInvoke).not.toHaveBeenCalledWith(
      'indicateurs:set-manuel',
      expect.anything(),
    )
  })

  it('efface une valeur saisie via clear-manuel', async () => {
    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    const clear = wrapper.find('[data-annee="2025"][data-metric="suivi_diabete_endocrino"] .ia-clear')
    await clear.trigger('click')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('indicateurs:clear-manuel', {
      annee: 2025,
      metric: 'suivi_diabete_endocrino',
    })
  })

  it('reste en lecture seule pour un COMPTABLE', async () => {
    userRef.value = { role: 'COMPTABLE' }
    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    const cell = wrapper.find('[data-annee="2025"][data-metric="nouveaux_cas_diabete"]')
    await cell.trigger('click')
    await nextTick()
    // Le clavier ne doit pas non plus ouvrir l'éditeur.
    await cell.trigger('keydown', { key: 'Enter' })
    await nextTick()

    expect(wrapper.find('input.ia-input').exists()).toBe(false)
    expect(cell.attributes('tabindex')).toBeUndefined()
    expect(wrapper.find('.ia-clear').exists()).toBe(false)
    expect(mockIpcInvoke).not.toHaveBeenCalledWith(
      'indicateurs:set-manuel',
      expect.anything(),
    )
  })

  it('affiche le message de période vide tout en gardant le tableau', async () => {
    mockIpcInvoke.mockImplementation((channel: string) => {
      if (channel === 'indicateurs:annuels') {
        const row = emptyRow(2025)
        const totaux = {} as IndicateursAnnuelsDto['totaux']
        for (const metric of METRIC_KEYS) totaux[metric] = null
        totaux.moyenne_par_an = {} as Record<MetricKey, number | null>
        for (const metric of METRIC_KEYS) totaux.moyenne_par_an[metric] = null
        return Promise.resolve({ lignes: [row], totaux })
      }
      return Promise.resolve(undefined)
    })

    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('Aucune donnée pour cette période')
    expect(wrapper.find('.ia-table').exists()).toBe(true)
    expect(wrapper.find('.ia-year-row').text()).toContain('—')
  })

  it('ne charge le détail mensuel qu’à l’ouverture, avec les bons mois et totaux', async () => {
    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    // Aucun appel tant que l'année est repliée.
    expect(monthlyCallCount()).toBe(0)
    expect(wrapper.find('.ia-detail-row').exists()).toBe(false)

    await wrapper.find('[data-test="expand-2025"]').trigger('click')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith(
      'indicateurs:mensuels',
      { annee: 2025 },
      { silent: true },
    )

    const detail = wrapper.find('[data-detail-annee="2025"]')
    expect(detail.exists()).toBe(true)
    expect(detail.find('.ia-monthly').exists()).toBe(true)

    // 12 mois + colonne Total, dans l'ordre Janvier → Décembre.
    const headers = detail.findAll('.ia-monthly-th').map((th) => th.text())
    expect(headers).toEqual([
      'Indicateur',
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre',
      'Total',
    ])

    // Ligne de métrique : 12 mois + total, « — » pour une valeur nulle.
    const suiviRow = detail.find('[data-monthly-metric="soins_ambulatoires"]')
    const cells = suiviRow.findAll('.ia-monthly-cell')
    expect(cells).toHaveLength(13)
    expect(cells[0].text()).toBe('3')
    expect(cells[11].text()).toBe('—')
    expect(cells[11].classes()).toContain('ia-monthly-cell--empty')
    expect(cells[12].text()).toBe('88')
    expect(cells[12].classes()).toContain('ia-monthly-cell--total')

    // Ligne Total : totaux mensuels puis total général.
    const totalRow = detail.find('.ia-monthly-total-row')
    expect(totalRow.findAll('.ia-monthly-cell')).toHaveLength(13)
    expect(totalRow.findAll('.ia-monthly-cell')[0].text()).toBe('4')
    expect(totalRow.find('.ia-monthly-cell--grand').text()).toBe('166')
  })

  it('met en cache le détail mensuel par année et ne le recharge pas', async () => {
    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    const expand = wrapper.find('[data-test="expand-2025"]')
    await expand.trigger('click')
    await flushPromises()
    expect(monthlyCallCount()).toBe(1)

    // Repli puis nouvelle ouverture : la copie en cache est réutilisée.
    await expand.trigger('click')
    await flushPromises()
    await expand.trigger('click')
    await flushPromises()

    expect(monthlyCallCount()).toBe(1)
    expect(wrapper.find('[data-detail-annee="2025"] .ia-monthly').exists()).toBe(true)
  })

  it('affiche une erreur inline et permet de réessayer le détail mensuel', async () => {
    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    mockIpcInvoke.mockImplementation((channel: string, params?: { annee?: number }) => {
      if (channel === 'indicateurs:annuels') return Promise.resolve(makeFixture())
      if (channel === 'indicateurs:mensuels' && params?.annee === 2025) {
        return Promise.reject(new Error('Service mensuel indisponible'))
      }
      return Promise.resolve(undefined)
    })

    await wrapper.find('[data-test="expand-2025"]').trigger('click')
    await flushPromises()

    const detail = wrapper.find('[data-detail-annee="2025"]')
    const alert = detail.find('.ia-detail-state--error')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain('Service mensuel indisponible')
    expect(detail.find('.ia-monthly').exists()).toBe(false)

    // Deuxième tentative réussie : l'encart disparaît, le tableau apparaît.
    mockIpcInvoke.mockResolvedValueOnce(makeMensuel(2025))
    await alert.find('.ia-detail-retry').trigger('click')
    await flushPromises()

    expect(monthlyCallCount()).toBe(2)
    expect(wrapper.find('[data-detail-annee="2025"] .ia-detail-state--error').exists()).toBe(false)
    expect(wrapper.find('[data-detail-annee="2025"] .ia-monthly').exists()).toBe(true)
  })

  it('garde un tableau mensuel en largeur fixe avec scrollport et colonne collée', async () => {
    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    await wrapper.find('[data-test="expand-2025"]').trigger('click')
    await flushPromises()

    const scrollport = wrapper.find('.ia-detail-scroll')
    expect(scrollport.exists()).toBe(true)
    expect(scrollport.attributes('tabindex')).toBe('0')

    const monthly = scrollport.find('.ia-monthly')
    // 14 colonnes déclarées : indicateur + 12 mois + total.
    expect(monthly.find('colgroup').findAll('col')).toHaveLength(14)
    expect(monthly.find('.ia-monthly-col-label').exists()).toBe(true)
    expect(monthly.find('.ia-monthly-col-total').exists()).toBe(true)
    // La colonne Indicateur est collée à gauche, le tableau ne porte aucune
    // largeur inline qui pourrait déborder du conteneur.
    expect(monthly.find('.ia-monthly-th--metric').exists()).toBe(true)
    expect(monthly.find('.ia-monthly-rowlabel').exists()).toBe(true)
    expect(monthly.attributes('style')).toBeUndefined()

    // Le tableau annuel conserve lui aussi ses 14 colonnes.
    expect(wrapper.find('.ia-table > colgroup').findAll('col')).toHaveLength(14)
  })

  it('exporte la période affichée en Excel', async () => {
    const invoke = vi.mocked(window.electronAPI.invoke)
    invoke.mockResolvedValue({ success: true, data: '/tmp/indicateurs.xlsx' })

    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    const exportButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Exporter Excel'))
    expect(exportButton).toBeTruthy()
    await exportButton!.trigger('click')
    await flushPromises()

    const year = new Date().getFullYear()
    expect(invoke).toHaveBeenCalledWith('export:indicateurs-excel', {
      fromYear: year - 4,
      toYear: year,
    })
  })

  it('exporte la plage d’années sélectionnée dans les sélecteurs', async () => {
    const invoke = vi.mocked(window.electronAPI.invoke)
    invoke.mockResolvedValue({ success: true, data: '/tmp/indicateurs.xlsx' })

    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    const pickers = wrapper.findAll('input.el-date-picker')
    expect(pickers).toHaveLength(2)
    await pickers[0].setValue('2021')
    await pickers[1].setValue('2024')

    const exportButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Exporter Excel'))
    expect(exportButton).toBeTruthy()
    await exportButton!.trigger('click')
    await flushPromises()

    expect(invoke).toHaveBeenCalledWith('export:indicateurs-excel', {
      fromYear: 2021,
      toYear: 2024,
    })
  })
})
