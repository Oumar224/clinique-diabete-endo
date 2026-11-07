// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ResultatsBioView from '../ResultatsBioView.vue'
import { EXAM_GRID_HOURS } from '@/composables/useExamResults'

// ---------------------------------------------------------------------------
// Hoisted mocks — available before any vi.mock() call
// ---------------------------------------------------------------------------
const { mockIpcInvoke } = vi.hoisted(() => ({
  mockIpcInvoke: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('@element-plus/icons-vue', () => {
  const stub = { render: () => {} }
  return new Proxy({} as Record<string, any>, {
    get(_, key) {
      if (key === 'default') return undefined
      return stub
    },
    has() { return true },
  })
})

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}))

vi.mock('@/composables/usePatientContext', () => ({
  usePatientContext: vi.fn(() => ({
    activePatient: { value: { id: 42, nom: 'Diallo', prenom: 'Amadou' } },
    age: { value: null },
    hasActivePatient: { value: true },
    setActivePatient: vi.fn(),
    clearPatient: vi.fn(),
  })),
}))

// useExamResults est mocké pour piloter fetchByPatient via le mock IPC,
// mais buildMatrix est la VRAIE implémentation (importée réellement) afin de
// tester le peuplement des groupes par EXAMEN (fusion multi-demandes) de bout
// en bout. Les champs DTO requestDate/requestStatus/validatedAt/examRequestId
// sont volontairement laissés dans les mocks : le composable les ignore.
vi.mock('@/composables/useExamResults', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  const actual = await vi.importActual<typeof import('@/composables/useExamResults')>('@/composables/useExamResults')
  const results = vue.ref<any[]>([])
  const loading = vue.ref(false)
  const error = vue.ref<string | null>(null)
  return {
    EXAM_GRID_HOURS: actual.EXAM_GRID_HOURS,
    useExamResults: vi.fn(() => ({
      results,
      loading,
      error,
      fetchByPatient: async (patientId: number, filters: Record<string, unknown>) => {
        const raw = await mockIpcInvoke('exam-results:list-by-patient', { patientId, ...filters })
        results.value = Array.isArray(raw) ? raw : []
      },
      buildMatrix: actual.useExamResults().buildMatrix,
    })),
  }
})

// ---------------------------------------------------------------------------
// Stubs for Element Plus components used in ResultatsBioView
// ---------------------------------------------------------------------------
const stubs = {
  'el-select': {
    template: '<select class="el-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'placeholder', 'filterable', 'style', 'disabled'],
    emits: ['update:modelValue'],
  },
  'el-option': {
    template: '<option class="el-option" :value="value">{{ label }}</option>',
    props: ['value', 'label'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" :placeholder="placeholder" />',
    props: ['modelValue', 'placeholder', 'type', 'rows', 'size'],
    emits: ['update:modelValue'],
  },
  'el-button': {
    template: '<button class="el-button" :type="attrType" :disabled="disabled" :loading="loading" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['type', 'disabled', 'loading', 'size', 'icon', 'text', 'danger'],
    computed: {
      attrType() { return this.type === 'primary' ? 'submit' : 'button' },
    },
    emits: ['click'],
  },
  'el-button-group': {
    template: '<div class="el-button-group"><slot /></div>',
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function waitForData() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Horodatage UTC sans suffixe (`toISOString().slice(0, 19)`) — contrat exact
 * du backend — désignant l'heure LOCALE `hour` à `daysOffset` jours
 * d'aujourd'hui. Cercle UTC↔local : Date locale à `hour` → émission UTC →
 * `buildMatrix` reparse en UTC et relit en local → retrouve `hour`, quel que
 * soit le fuseau du runner.
 */
function dateAt(daysOffset: number, hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

/**
 * Clé `YYYY-MM-DD` (heure LOCALE) du jour situé `daysAgo` jours avant
 * aujourd'hui. `daysAgo = 0` → aujourd'hui, seule ancre de la fenêtre
 * glissante de la grille.
 */
function localKey(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Libellé `dd/MM` affiché dans l'en-tête, pour le jour situé `daysAgo` jours avant aujourd'hui. */
function localLabel(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Colonne CSS attendue pour un horodatage UTC backend : miroir de
 * `buildMatrix` (slot = plus grand créneau ≤ heure locale) + formule
 * `4 + di * EXAM_GRID_HOURS.length + hi` de la vue. Indépendant du fuseau.
 * `dayIndex` suit l'ordre décroissant de la grille : 0 = aujourd'hui
 * (colonne la plus à gauche), 1 = hier, etc.
 */
function columnFor(iso: string, dayIndex: number): number {
  const hour = new Date(iso.replace(' ', 'T') + 'Z').getHours()
  const slot = [...EXAM_GRID_HOURS].reverse().find(h => h <= hour) ?? EXAM_GRID_HOURS[0]
  return 4 + dayIndex * EXAM_GRID_HOURS.length + EXAM_GRID_HOURS.indexOf(slot)
}

function makeResult(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    examRequestId: 10,
    parameterId: 100,
    value: '0.95',
    isNormal: true,
    filledAt: dateAt(0, 8),
    parameterName: 'Glycémie à jeun',
    parameterUnit: 'g/L',
    parameterInputType: 'numeric',
    parameterReferenceValues: {},
    filledByName: 'Dr. Diallo',
    requestDate: dateAt(0, 8),
    requestStatus: 'realise',
    examName: 'Bilan lipidique',
    validatedAt: dateAt(0, 14),
    ...overrides,
  }
}

function setupIpcMock(results?: any[]) {
  mockIpcInvoke.mockImplementation(async (channel: string) => {
    if (channel === 'exam-results:list-by-patient') return results ?? []
    if (channel === 'exam-types:list-by-category') return []
    if (channel === 'exam-types:list-all-by-category') return []
    return []
  })
}

function mountView() {
  return mount(ResultatsBioView, {
    global: {
      stubs,
      directives: { loading: () => {} },
    },
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ResultatsBioView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    setupIpcMock()
  })

  // ─── Affichage initial ─────────────────────────────────────────────

  describe('affichage initial', () => {
    it('affiche le champ de recherche sans titre de page propre', async () => {
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      expect(wrapper.find('.rb__title').exists()).toBe(false)
      expect(wrapper.findAll('h1')).toHaveLength(0)
      const search = wrapper.find('.el-input')
      expect(search.exists()).toBe(true)
      expect(search.attributes('placeholder')).toContain('Rechercher une analyse')
    })

    it('récupère les résultats du patient actif au montage', async () => {
      mountView()
      await nextTick()
      await waitForData()

      expect(mockIpcInvoke).toHaveBeenCalledWith(
        'exam-results:list-by-patient',
        expect.objectContaining({ patientId: 42 }),
      )
    })
  })

  // ─── Ordre des dates : décroissant, aujourd'hui à gauche ───────────

  describe('ordre des dates (décroissant, aujourd\'hui à gauche)', () => {
    it('affiche les 7 colonnes du plus récent au plus ancien, aujourd\'hui en tête', async () => {
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      const headers = wrapper.findAll('.rb__date-header')
      expect(headers).toHaveLength(7)

      // Colonne 0 = aujourd'hui, puis J-1 … J-6 : ordre strictement décroissant.
      for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
        expect(headers[daysAgo].text()).toContain(localLabel(daysAgo))
      }

      // Mise en évidence « aujourd'hui » basée sur la VALEUR de date, pas sur
      // l'index : elle tombe donc sur la première colonne quand la fenêtre
      // se termine aujourd'hui.
      expect(headers[0].classes()).toContain('rb__date-header--today')
      for (let i = 1; i < headers.length; i++) {
        expect(headers[i].classes()).not.toContain('rb__date-header--today')
      }
    })

    it('charge par défaut la fenêtre qui se termine aujourd\'hui', async () => {
      mountView()
      await nextTick()
      await waitForData()

      expect(mockIpcInvoke).toHaveBeenCalledWith(
        'exam-results:list-by-patient',
        expect.objectContaining({ dateFrom: localKey(6), dateTo: localKey(0) }),
      )
    })

    it('place le résultat du jour dans la première colonne et un résultat antérieur dans sa colonne', async () => {
      const todayIso = dateAt(0, 8)
      const olderIso = dateAt(-2, 10)
      setupIpcMock([
        makeResult({ id: 1, examRequestId: 10, parameterId: 100, value: '0.95', filledAt: todayIso }),
        makeResult({ id: 2, examRequestId: 10, parameterId: 100, value: '1.05', filledAt: olderIso }),
      ])
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      const valueCells = wrapper
        .findAll('.rb__cell')
        .filter(cell => cell.find('.rb__cell-value').exists())
      expect(valueCells).toHaveLength(2)

      const todayCell = valueCells.find(cell => cell.find('.rb__cell-value').text() === '0.95')!
      const olderCell = valueCells.find(cell => cell.find('.rb__cell-value').text() === '1.05')!

      // Aucun décalage : la cellule du jour occupe la 1re colonne de données
      // (index jour 0), l'ancienne celle du jour J-2 (index 2).
      const todayColumn = columnFor(todayIso, 0)
      const olderColumn = columnFor(olderIso, 2)
      expect(todayCell.attributes('style')).toContain(`grid-column: ${todayColumn}`)
      expect(olderCell.attributes('style')).toContain(`grid-column: ${olderColumn}`)
      expect(todayColumn).toBeLessThan(olderColumn)
    })

    it('déplace la fenêtre vers le passé avec › puis revient avec ‹', async () => {
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      // › = vers les dates antérieures (la droite de la grille = passé) :
      // la fenêtre devient J-7 … J-13, aujourd'hui n'est plus affiché.
      await wrapper.find('.el-button-group').findAll('.el-button')[2].trigger('click')
      await nextTick()
      await waitForData()

      let headers = wrapper.findAll('.rb__date-header')
      expect(headers).toHaveLength(7)
      expect(headers[0].text()).toContain(localLabel(7))
      expect(headers[6].text()).toContain(localLabel(13))
      expect(wrapper.find('.rb__date-header--today').exists()).toBe(false)

      const listCalls = mockIpcInvoke.mock.calls.filter(
        ([channel]) => channel === 'exam-results:list-by-patient',
      )
      expect(listCalls.at(-1)?.[1]).toEqual(
        expect.objectContaining({ dateFrom: localKey(13), dateTo: localKey(7) }),
      )

      // ‹ = vers les dates plus récentes : retour à la fenêtre par défaut,
      // aujourd'hui de nouveau en première colonne.
      await wrapper.find('.el-button-group').findAll('.el-button')[0].trigger('click')
      await nextTick()
      await waitForData()

      headers = wrapper.findAll('.rb__date-header')
      expect(headers[0].text()).toContain(localLabel(0))
      expect(headers[0].classes()).toContain('rb__date-header--today')
    })
  })

  // ─── En-tête de groupe (uniquement le nom d'examen) ────────────────

  describe('en-tête de groupe', () => {
    it('affiche uniquement le nom d\'examen (ni « Demandé (…) », ni « Réalisé (…) », ni badge)', async () => {
      setupIpcMock([
        makeResult({
          examRequestId: 10,
          parameterId: 100,
          requestDate: '2026-08-05T08:00:00.000',
          filledAt: '2026-08-05T08:30:00.000',
          validatedAt: '2026-08-07T14:30:00.000',
        }),
      ])
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      const header = wrapper.find('.rb__group-header')
      expect(header.exists()).toBe(true)
      expect(header.text()).toBe('Bilan lipidique')
      // Plus aucune mention de date, de demande ou de statut dans l'en-tête
      expect(header.text()).not.toContain('Demandé (')
      expect(header.text()).not.toContain('Réalisé (')
      expect(header.text()).not.toContain('Demande')
      expect(header.text()).not.toContain('05/08/2026')
      expect(header.text()).not.toContain('07/08/2026')
      // Plus de badge de statut ni de méta
      expect(wrapper.find('.rb__group-status').exists()).toBe(false)
      expect(wrapper.find('.rb__group-meta').exists()).toBe(false)
    })

    it('affiche le fallback « (Examen non précisé) » quand examName est vide', async () => {
      setupIpcMock([
        makeResult({
          examRequestId: 10,
          parameterId: 100,
          requestDate: '2026-08-05',
          filledAt: '2026-08-05T08:30:00.000',
          validatedAt: null,
          examName: '',
        }),
      ])
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      const header = wrapper.find('.rb__group-header')
      expect(header.exists()).toBe(true)
      expect(header.text()).toBe('(Examen non précisé)')
      expect(header.text()).not.toContain('Demande')
      expect(header.text()).not.toContain('Demandé (')
      expect(header.text()).not.toContain('Réalisé (')
      expect(wrapper.find('.rb__group-status').exists()).toBe(false)
    })

    it('affiche le fallback quand examName est undefined (leftJoin backend)', async () => {
      setupIpcMock([
        makeResult({
          examRequestId: 10,
          parameterId: 100,
          requestDate: '2026-08-05',
          filledAt: '2026-08-05T08:30:00.000',
          validatedAt: null,
          examName: undefined,
        }),
      ])
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      const header = wrapper.find('.rb__group-header')
      expect(header.exists()).toBe(true)
      expect(header.text()).toBe('(Examen non précisé)')
      expect(header.text()).not.toContain('Demande')
      expect(wrapper.find('.rb__group-status').exists()).toBe(false)
    })
  })

  // ─── Unité : pas de doublon dans les cellules-jours ────────────────

  describe('colonne Unités', () => {
    it('n\'affiche pas l\'unité dans la cellule de valeur (colonne Unités seule)', async () => {
      setupIpcMock([
        makeResult({
          examRequestId: 10,
          parameterId: 100,
          requestDate: dateAt(0, 8),
          filledAt: dateAt(0, 8),
          validatedAt: dateAt(0, 14),
        }),
      ])
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      // La colonne « Unités » affiche bien l'unité
      const unitCells = wrapper.findAll('.rb__unites-cell')
      expect(unitCells.length).toBeGreaterThan(0)
      expect(unitCells[0].text()).toContain('g/L')

      // Plus aucun span .rb__cell-unit dans les cellules-jours
      expect(wrapper.find('.rb__cell-unit').exists()).toBe(false)

      // La valeur est affichée seule, sans l'unité
      const valueCells = wrapper.findAll('.rb__cell-value')
      expect(valueCells.length).toBeGreaterThan(0)
      valueCells.forEach(cell => {
        expect(cell.text()).toBe('0.95')
      })

      // L'unité n'apparaît qu'UNE seule fois dans toute la grille
      const occurrences = wrapper.text().match(/g\/L/g)
      expect(occurrences).toHaveLength(1)
    })
  })

  // ─── Recherche par nom d'analyse ───────────────────────────────────

  describe('recherche par nom d\'analyse', () => {
    function twoGroups() {
      return [
        makeResult({
          id: 1,
          examRequestId: 10,
          parameterId: 100,
          parameterName: 'Glycémie à jeun',
          parameterUnit: 'g/L',
          requestDate: dateAt(0, 8),
          filledAt: dateAt(0, 8),
          validatedAt: dateAt(0, 14),
          examName: 'Bilan lipidique',
        }),
        makeResult({
          id: 2,
          examRequestId: 11,
          parameterId: 200,
          parameterName: 'Créatinine',
          parameterUnit: 'mg/L',
          value: '12',
          requestDate: dateAt(0, 9),
          filledAt: dateAt(0, 9),
          validatedAt: null,
          examName: 'Ionogramme',
        }),
      ]
    }

    it('filtre les lignes par nom d\'analyse et masque les groupes vides', async () => {
      setupIpcMock(twoGroups())
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      expect(wrapper.findAll('.rb__group-header')).toHaveLength(2)
      expect(wrapper.findAll('.rb__analyses-name')).toHaveLength(2)

      const input = wrapper.find('.el-input')
      await input.setValue('Glycémie')
      await nextTick()

      // Le groupe « Ionogramme » (devenu vide) est masqué
      expect(wrapper.findAll('.rb__group-header')).toHaveLength(1)
      expect(wrapper.findAll('.rb__analyses-name')).toHaveLength(1)
      expect(wrapper.text()).toContain('Glycémie à jeun')
      expect(wrapper.text()).not.toContain('Créatinine')
      expect(wrapper.text()).not.toContain('Ionogramme')
    })

    it('filtre aussi par nom d\'examen (examName)', async () => {
      setupIpcMock(twoGroups())
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      const input = wrapper.find('.el-input')
      await input.setValue('Ionogramme')
      await nextTick()

      expect(wrapper.findAll('.rb__group-header')).toHaveLength(1)
      expect(wrapper.text()).toContain('Créatinine')
      expect(wrapper.text()).not.toContain('Glycémie à jeun')
    })

    it('est insensible à la casse', async () => {
      setupIpcMock(twoGroups())
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      const input = wrapper.find('.el-input')
      await input.setValue('glycÉmie')
      await nextTick()

      expect(wrapper.findAll('.rb__group-header')).toHaveLength(1)
      expect(wrapper.text()).toContain('Glycémie à jeun')
    })

    it('réinitialise la recherche et restaure toutes les lignes', async () => {
      setupIpcMock(twoGroups())
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      const input = wrapper.find('.el-input')
      await input.setValue('Glycémie')
      await nextTick()
      expect(wrapper.findAll('.rb__group-header')).toHaveLength(1)

      await input.setValue('')
      await nextTick()
      expect(wrapper.findAll('.rb__group-header')).toHaveLength(2)
      expect(wrapper.findAll('.rb__analyses-name')).toHaveLength(2)
    })

    it('ignore les espaces autour de la recherche (trim)', async () => {
      setupIpcMock(twoGroups())
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      const input = wrapper.find('.el-input')
      await input.setValue(' Glycémie ')
      await nextTick()

      expect(wrapper.findAll('.rb__group-header')).toHaveLength(1)
      expect(wrapper.findAll('.rb__analyses-name')).toHaveLength(1)
      expect(wrapper.text()).toContain('Glycémie à jeun')
      expect(wrapper.text()).not.toContain('Créatinine')
    })

    it('affiche l\'état vide quand la recherche ne correspond à rien', async () => {
      setupIpcMock(twoGroups())
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      const input = wrapper.find('.el-input')
      await input.setValue('Introuvable')
      await nextTick()

      expect(wrapper.findAll('.rb__group-header')).toHaveLength(0)
      expect(wrapper.find('.rb__empty-row').text()).toContain(
        'Aucun résultat ne correspond à la recherche',
      )
    })
  })

  // ─── buildMatrix : regroupement par EXAMEN ─────────────────────────

  describe('buildMatrix (regroupement par examen)', () => {
    it('sépare 2 examens d\'une même demande en 2 groupes distincts (plus de « A + B »)', async () => {
      setupIpcMock([
        makeResult({
          id: 1,
          examRequestId: 10,
          parameterId: 100,
          parameterName: 'Cholestérol total',
          parameterUnit: 'g/L',
          filledAt: dateAt(0, 8),
          examName: 'Bilan lipidique',
        }),
        makeResult({
          id: 2,
          examRequestId: 10,
          parameterId: 101,
          parameterName: 'Triglycérides',
          parameterUnit: 'g/L',
          value: '1.2',
          filledAt: dateAt(0, 8),
          examName: 'Bilan lipidique',
        }),
        makeResult({
          id: 3,
          examRequestId: 10,
          parameterId: 102,
          parameterName: 'Glycémie à jeun',
          parameterUnit: 'g/L',
          value: '0.9',
          filledAt: dateAt(0, 8),
          examName: 'Glycémie',
        }),
      ])
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      // 2 groupes, triés alphabétiquement par nom d'examen
      const headers = wrapper.findAll('.rb__group-header')
      expect(headers).toHaveLength(2)
      expect(headers[0].text()).toBe('Bilan lipidique')
      expect(headers[1].text()).toBe('Glycémie')
      expect(wrapper.text()).not.toContain('Bilan lipidique + Glycémie')

      // Chaque groupe ne contient que SES paramètres, triés par nom
      const names = wrapper.findAll('.rb__analyses-name').map(n => n.text())
      expect(names).toEqual(['Cholestérol total', 'Triglycérides', 'Glycémie à jeun'])
    })

    it('fusionne un même examen présent sur 2 demandes en un seul groupe', async () => {
      setupIpcMock([
        makeResult({
          id: 1,
          examRequestId: 10,
          parameterId: 100,
          parameterName: 'Cholestérol total',
          filledAt: dateAt(0, 8),
          examName: 'Bilan lipidique',
        }),
        makeResult({
          id: 2,
          examRequestId: 11,
          parameterId: 101,
          parameterName: 'Triglycérides',
          filledAt: dateAt(0, 9),
          examName: 'Bilan lipidique',
        }),
      ])
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      const headers = wrapper.findAll('.rb__group-header')
      expect(headers).toHaveLength(1)
      expect(headers[0].text()).toBe('Bilan lipidique')
      // Les paramètres des 2 demandes sont fusionnés dans le groupe
      expect(wrapper.findAll('.rb__analyses-name')).toHaveLength(2)
    })

    it('conserve les valeurs d\'un paramètre rempli sur 2 jours (valueMap parameterId|dateKey|hourSlot inchangé)', async () => {
      setupIpcMock([
        makeResult({
          id: 1,
          examRequestId: 10,
          parameterId: 100,
          value: '0.95',
          filledAt: dateAt(-1, 8),
          examName: 'Bilan lipidique',
        }),
        makeResult({
          id: 2,
          examRequestId: 10,
          parameterId: 100,
          value: '1.05',
          filledAt: dateAt(-2, 8),
          examName: 'Bilan lipidique',
        }),
      ])
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      // Même paramètre sur 2 jours → une seule ligne dédupliquée
      expect(wrapper.findAll('.rb__group-header')).toHaveLength(1)
      expect(wrapper.findAll('.rb__analyses-name')).toHaveLength(1)

      // 2 cellules-jours DISTINCTES portent chacune une valeur (une par jour,
      // pas deux valeurs empilées dans la même cellule)
      const dayCells = wrapper
        .findAll('.rb__cell')
        .filter(cell => cell.find('.rb__cell-value').exists())
      expect(dayCells).toHaveLength(2)
      dayCells.forEach(cell => {
        expect(cell.findAll('.rb__cell-value')).toHaveLength(1)
      })

      // Chaque cellule contient la bonne valeur, et les valeurs diffèrent
      const cellValues = dayCells.map(cell => cell.find('.rb__cell-value').text())
      expect(cellValues).toContain('0.95')
      expect(cellValues).toContain('1.05')
      expect(cellValues[0]).not.toBe(cellValues[1])
    })

    it('place 2 valeurs d\'un même paramètre le même jour dans 2 colonnes-heures distinctes (dateKey|hourSlot)', async () => {
      const filledAt8 = dateAt(-1, 8)
      const filledAt14 = dateAt(-1, 14)
      const filledAt10 = dateAt(-1, 10)
      setupIpcMock([
        makeResult({
          id: 1,
          examRequestId: 10,
          parameterId: 100,
          value: '0.95',
          filledAt: filledAt8,
          examName: 'Bilan lipidique',
        }),
        makeResult({
          id: 2,
          examRequestId: 10,
          parameterId: 100,
          value: '1.05',
          filledAt: filledAt14,
          examName: 'Bilan lipidique',
        }),
        makeResult({
          id: 3,
          examRequestId: 10,
          parameterId: 101,
          parameterName: 'Créatinine',
          parameterUnit: 'mg/L',
          value: '12',
          filledAt: filledAt10,
          examName: 'Bilan lipidique',
        }),
      ])
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      // Le paramètre réalisé 2× le même jour reste une seule ligne dédupliquée
      expect(wrapper.findAll('.rb__group-header')).toHaveLength(1)
      expect(wrapper.findAll('.rb__analyses-name')).toHaveLength(2)
      expect(wrapper.findAll('.rb__analyses-name').map(n => n.text())).toEqual([
        'Créatinine',
        'Glycémie à jeun',
      ])

      // 3 cellules de valeur : 2 pour la Glycémie (même jour, créneaux 08:00 et
      // 14:00), 1 pour la Créatinine
      const valueCells = wrapper
        .findAll('.rb__cell')
        .filter(cell => cell.find('.rb__cell-value').exists())
      expect(valueCells).toHaveLength(3)

      // Les 2 valeurs de la Glycémie sont dans la même journée mais 2 colonnes-
      // heures distinctes. Les grid-column ci-dessous dérivent de
      // EXAM_GRID_HOURS (via l'instant UTC réel, indépendant du fuseau du
      // runner) — ne pas les « corriger » à la main.
      const dayIndex = 1 // hier : 2e colonne (aujourd'hui = index 0, à gauche)
      const [creatinine, glycemia8, glycemia14] = valueCells
      expect(glycemia8.find('.rb__cell-value').text()).toBe('0.95')
      expect(glycemia14.find('.rb__cell-value').text()).toBe('1.05')
      expect(glycemia8.attributes('style')).toContain(`grid-column: ${columnFor(filledAt8, dayIndex)}`)
      expect(glycemia14.attributes('style')).toContain(`grid-column: ${columnFor(filledAt14, dayIndex)}`)

      // Une seule valeur pour la Créatinine → une seule cellule de valeur ce
      // jour-là, tous les autres créneaux de la grille affichent « — »
      expect(creatinine.find('.rb__cell-value').text()).toBe('12')
      const emptyCells = wrapper.findAll('.rb__cell-empty')
      expect(emptyCells).toHaveLength(2 * 7 * EXAM_GRID_HOURS.length - 3)
      emptyCells.forEach(cell => expect(cell.text()).toBe('—'))
    })

    it('trimme les espaces de examName : 2 demandes avec variantes espacées → 1 seul groupe', async () => {
      setupIpcMock([
        makeResult({
          id: 1,
          examRequestId: 10,
          parameterId: 100,
          parameterName: 'Cholestérol total',
          filledAt: dateAt(0, 8),
          examName: ' Bilan lipidique ',
        }),
        makeResult({
          id: 2,
          examRequestId: 11,
          parameterId: 101,
          parameterName: 'Triglycérides',
          filledAt: dateAt(0, 9),
          examName: 'Bilan lipidique',
        }),
      ])
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      // « Bilan lipidique » (avec espaces) et « Bilan lipidique » fusionnent
      const headers = wrapper.findAll('.rb__group-header')
      expect(headers).toHaveLength(1)
      expect(headers[0].text()).toBe('Bilan lipidique')
      // Les paramètres des 2 demandes sont fusionnés dans le groupe
      expect(wrapper.findAll('.rb__analyses-name')).toHaveLength(2)
    })

    it('replie sur le fallback quand examName n\'est composé que d\'espaces', async () => {
      setupIpcMock([
        makeResult({
          examRequestId: 10,
          parameterId: 100,
          filledAt: dateAt(0, 8),
          examName: '   ',
        }),
      ])
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      const header = wrapper.find('.rb__group-header')
      expect(header.exists()).toBe(true)
      expect(header.text()).toBe('(Examen non précisé)')
      expect(header.text()).not.toContain('Demande')
    })
  })

  // ─── Épinglage du nom d'examen (CSS sticky) ────────────────────────
  // NOTE : jsdom ne calcule AUCUN layout. Le comportement sticky réel
  // (`position: sticky; left: 0` sur .rb__group-exam, qui maintient le nom
  // d'examen aligné sur la colonne sticky « Analyses » au scroll horizontal)
  // se vérifie au NAVIGATEUR. Ici on ne vérifie que la STRUCTURE : le span
  // .rb__group-exam est le seul contenu du bandeau .rb__group-header.
  describe('épinglage du nom d\'examen (structure)', () => {
    it('place un span .rb__group-exam unique dans .rb__group-header', async () => {
      setupIpcMock([makeResult({ examRequestId: 10, parameterId: 100 })])
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      const header = wrapper.find('.rb__group-header')
      expect(header.exists()).toBe(true)

      const exam = header.find('.rb__group-exam')
      expect(exam.exists()).toBe(true)
      expect(exam.text()).toBe('Bilan lipidique')

      // Le span est le SEUL élément enfant du bandeau : plus de meta,
      // de date ni de badge entre lesquels le sticky pourrait « flotter »
      expect(header.element.firstElementChild?.classList.contains('rb__group-exam')).toBe(true)
      expect(wrapper.find('.rb__group-status').exists()).toBe(false)
    })
  })

  // ─── Valeur de référence (formatRefShort) ──────────────────────────

  describe('valeur de référence', () => {
    it('n\'affiche que la partie H renseignée (pas de « F: undefined »)', async () => {
      setupIpcMock([
        makeResult({
          examRequestId: 10,
          parameterId: 100,
          requestDate: dateAt(0, 8),
          filledAt: dateAt(0, 8),
          validatedAt: dateAt(0, 14),
          parameterReferenceValues: { min_h: 0.7, max_h: 1.1 },
        }),
      ])
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      const refCell = wrapper.find('.rb__ref-cell')
      expect(refCell.text()).toContain('H: 0.7–1.1')
      expect(refCell.text()).not.toContain('F:')
      expect(refCell.text()).not.toContain('undefined')
    })

    it('affiche H et F quand les deux sont renseignées', async () => {
      setupIpcMock([
        makeResult({
          examRequestId: 10,
          parameterId: 100,
          requestDate: dateAt(0, 8),
          filledAt: dateAt(0, 8),
          validatedAt: dateAt(0, 14),
          parameterReferenceValues: { min_h: 0.7, max_h: 1.1, min_f: 0.9, max_f: 1.4 },
        }),
      ])
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      const refCell = wrapper.find('.rb__ref-cell')
      expect(refCell.text()).toContain('H: 0.7–1.1 / F: 0.9–1.4')
    })

    it('retombe sur min/max quand H/F sont absentes', async () => {
      setupIpcMock([
        makeResult({
          examRequestId: 10,
          parameterId: 100,
          requestDate: dateAt(0, 8),
          filledAt: dateAt(0, 8),
          validatedAt: dateAt(0, 14),
          parameterReferenceValues: { min: 3.5, max: 5.5 },
        }),
      ])
      const wrapper = mountView()
      await nextTick()
      await waitForData()

      const refCell = wrapper.find('.rb__ref-cell')
      expect(refCell.text()).toContain('3.5 – 5.5')
    })
  })
})
