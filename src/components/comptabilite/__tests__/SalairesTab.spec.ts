// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { cloneVNode, h } from 'vue'
import SalairesTab from '../SalairesTab.vue'

const { mockIpcInvoke, mockElMessage, mockConfirm, dialogOpens } = vi.hoisted(() => ({
  mockIpcInvoke: vi.fn(),
  mockElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
  mockConfirm: vi.fn(),
  dialogOpens: {
    config: vi.fn(),
    payment: vi.fn(),
    bulk: vi.fn(),
    payslip: vi.fn(),
  },
}))

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
  ElMessageBox: { confirm: mockConfirm },
}))

vi.mock('@element-plus/icons-vue', () => ({
  CopyDocument: { name: 'CopyDocument', render: () => null },
  Document: { name: 'Document', render: () => null },
  Edit: { name: 'Edit', render: () => null },
  Money: { name: 'Money', render: () => null },
}))

vi.mock('@/currency/useCurrency', () => ({
  useCurrency: () => ({ formatCurrency: (value: number) => `${value} GNF` }),
}))

vi.mock('@/components/comptabilite/SalaireConfigDialog.vue', () => ({
  default: {
    name: 'SalaireConfigDialog',
    template: '<div />',
    emits: ['saved'],
    methods: { open: dialogOpens.config },
  },
}))
vi.mock('@/components/comptabilite/SalairePaiementDialog.vue', () => ({
  default: {
    name: 'SalairePaiementDialog',
    template: '<div />',
    emits: ['paid'],
    methods: { open: dialogOpens.payment },
  },
}))
vi.mock('@/components/comptabilite/PaiementBulkDialog.vue', () => ({
  default: {
    name: 'PaiementBulkDialog',
    template: '<div />',
    emits: ['paid'],
    methods: { open: dialogOpens.bulk },
  },
}))
vi.mock('@/components/comptabilite/PayslipPreviewDialog.vue', () => ({
  default: {
    name: 'PayslipPreviewDialog',
    template: '<div />',
    methods: { open: dialogOpens.payslip },
  },
}))

/**
 * Le stub rend `#empty` dès que `data` est vide, comme Element Plus : les états
 * vides (et leur absence) sont ainsi réellement assertables.
 */
const stubs = {
  'el-table': {
    props: ['data'],
    emits: ['expand-change'],
    setup(props: any, { slots }: any) {
      return () => {
        const rows = (props.data || []).map((row: any, rowIndex: number) =>
          h(
            'div',
            { class: 'el-table__row', key: rowIndex },
            (slots.default?.() ?? []).map((vnode: any, columnIndex: number) =>
              cloneVNode(vnode, { row, key: `${rowIndex}-${columnIndex}` }),
            ),
          ),
        )

        if (rows.length === 0 && slots.empty) {
          rows.push(h('div', { class: 'el-table__empty-block' }, slots.empty()))
        }

        return h('div', { class: 'el-table' }, rows)
      }
    },
  },
  'el-table-column': {
    template: '<div class="el-table-column"><slot :row="row" /></div>',
    props: ['row', 'label', 'prop', 'width', 'minWidth', 'align', 'fixed', 'size'],
  },
  'el-date-picker': {
    name: 'ElDatePickerStub',
    template: '<input class="el-date-picker" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'valueFormat', 'clearable'],
    emits: ['update:modelValue', 'change'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['type', 'text', 'size', 'icon', 'loading', 'disabled'],
    emits: ['click'],
  },
  'el-tag': {
    template: '<span class="el-tag"><slot /></span>',
    props: ['type', 'size', 'round'],
  },
}

const CURRENT_PERIOD = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})()

const ROWS = [
  {
    userId: 1,
    nom: 'Diallo',
    prenom: 'Aïssatou',
    role: 'COMPTABLE',
    config: { base: 2000000, joursTravailles: 22, rubriques: [{ libelle: 'Prime', type: 'fixe', montant: 100000 }] },
    montantNet: 2100000,
    paye: false,
    paiement: null,
  },
  {
    userId: 2,
    nom: 'Camara',
    prenom: 'Moussa',
    role: 'SECRETAIRE',
    config: { base: 1500000, joursTravailles: 22, rubriques: [] },
    montantNet: 1500000,
    paye: true,
    paiement: { montantNet: 1500000, datePaiement: '2026-09-28', modePaiement: 'virement' },
    datePaiement: '2026-09-28',
    modePaiement: 'virement',
  },
  {
    userId: 3,
    nom: 'Barry',
    prenom: 'Fatou',
    role: 'MEDECIN',
    config: null,
    montantNet: 0,
    paye: false,
    paiement: null,
  },
]

const PAIEMENTS = [
  {
    id: 2,
    userId: 1,
    periode: '2026-09',
    montantNet: 2050000,
    modePaiement: 'virement',
    datePaiement: '2026-09-28',
    reference: 'VIR-0926',
    nom: 'Diallo',
    prenom: 'Aïssatou',
    role: 'COMPTABLE',
  },
  {
    id: 1,
    userId: 1,
    periode: '2026-08',
    montantNet: 2000000,
    modePaiement: 'espèces',
    datePaiement: '2026-08-27',
    reference: undefined,
    nom: 'Diallo',
    prenom: 'Aïssatou',
    role: 'COMPTABLE',
  },
]

function mountTab() {
  return mount(SalairesTab, {
    global: {
      stubs,
      directives: { loading: {} },
    },
  })
}

/** Les paiements sont formatés par `toLocaleString('fr-FR')` (espaces insécables). */
function normalizedText(wrapper: ReturnType<typeof mountTab>): string {
  return wrapper.text().replace(/[\s\u00a0\u202f]+/g, ' ')
}

/** Table extérieure (feuille de paie) du stub `el-table`. */
function outerTable(wrapper: ReturnType<typeof mountTab>) {
  return wrapper.findAllComponents(stubs['el-table'])[0]
}

/**
 * Sous-tableau d'historique d'une ligne, identifié par son `aria-label` unique
 * (`Historique des paiements de Prénom Nom`).
 */
function subTable(wrapper: ReturnType<typeof mountTab>, rowIndex: number) {
  const row = ROWS[rowIndex]
  const label = `Historique des paiements de ${row.prenom} ${row.nom}`
  return wrapper
    .findAllComponents(stubs['el-table'])
    .find((table) => table.attributes('aria-label') === label)!
}

function historiqueCalls() {
  return mockIpcInvoke.mock.calls.filter(([channel]) => channel === 'salaire:historique')
}

function buttonByText(wrapper: ReturnType<typeof mountTab>, text: string) {
  return wrapper.findAll('button').find((button) => button.text().trim() === text)
}

/** Boutons d'action en icônes seules : nom accessible porté par `aria-label`. */
function buttonsByAriaLabel(wrapper: ReturnType<typeof mountTab>, label: string) {
  return wrapper.findAll('button').filter((button) => button.attributes('aria-label') === label)
}

function buttonByAriaLabel(wrapper: ReturnType<typeof mountTab>, label: string) {
  return buttonsByAriaLabel(wrapper, label)[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  mockConfirm.mockResolvedValue(undefined)
  mockIpcInvoke.mockImplementation((channel: string) => {
    if (channel === 'salaire:paie') return Promise.resolve(ROWS)
    if (channel === 'salaire:historique') return Promise.resolve(PAIEMENTS)
    if (channel === 'salaire:config:copy-previous') return Promise.resolve({ copied: 2, skipped: 1 })
    return Promise.resolve(null)
  })
})

describe('SalairesTab', () => {
  it('charge la paie du mois courant et affiche les totaux', async () => {
    const wrapper = mountTab()
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('salaire:paie', { periode: CURRENT_PERIOD })

    const values = wrapper.findAll('.summary-card__value').map((node) => node.text())
    expect(values).toEqual(['3', '3600000 GNF', '1500000 GNF', '2100000 GNF'])
    expect(wrapper.text()).toContain('Aïssatou Diallo')
    expect(wrapper.text()).toContain('Payé')
    expect(wrapper.text()).toContain('À payer')
    expect(wrapper.text()).toContain('Non configuré')
  })

  it('ouvre les dialogues de configuration, paiement et paiement en masse', async () => {
    const wrapper = mountTab()
    await flushPromises()

    await buttonByAriaLabel(wrapper, 'Configurer le salaire')!.trigger('click')
    expect(dialogOpens.config).toHaveBeenCalledWith(ROWS[0], CURRENT_PERIOD)

    await buttonByAriaLabel(wrapper, 'Payer le salaire')!.trigger('click')
    expect(dialogOpens.payment).toHaveBeenCalledWith(ROWS[0], CURRENT_PERIOD)

    await buttonByText(wrapper, 'Payer en masse')!.trigger('click')
    expect(dialogOpens.bulk).toHaveBeenCalledWith(CURRENT_PERIOD, ROWS)
  })

  it('ouvre l’aperçu de la fiche de paie avant téléchargement', async () => {
    const wrapper = mountTab()
    await flushPromises()

    const ficheButtons = buttonsByAriaLabel(wrapper, 'Voir la fiche de paie')
    expect(ficheButtons).toHaveLength(3)
    await ficheButtons[2].trigger('click')

    expect(dialogOpens.payslip).toHaveBeenCalledWith(3, CURRENT_PERIOD)
  })

  it('rend les actions en icônes seules avec un nom accessible', async () => {
    const wrapper = mountTab()
    await flushPromises()

    for (const label of ['Configurer le salaire', 'Payer le salaire', 'Voir la fiche de paie']) {
      const boutons = buttonsByAriaLabel(wrapper, label)
      expect(boutons.length).toBeGreaterThan(0)
      for (const bouton of boutons) {
        // Icône seule : aucun libellé visible, mais un intitulé accessible.
        expect(bouton.text()).toBe('')
        expect(bouton.attributes('title')).toBe(label)
      }
    }
  })

  it('copie les configurations du mois précédent après confirmation', async () => {
    const wrapper = mountTab()
    await flushPromises()

    await buttonByText(wrapper, 'Copier le mois précédent')!.trigger('click')
    await flushPromises()

    expect(mockConfirm).toHaveBeenCalled()
    expect(mockIpcInvoke).toHaveBeenCalledWith('salaire:config:copy-previous', { periode: CURRENT_PERIOD })
    expect(mockElMessage.success).toHaveBeenCalledWith('2 configuration(s) copiée(s), 1 ignorée(s)')
    expect(mockIpcInvoke.mock.calls.filter(([channel]) => channel === 'salaire:paie')).toHaveLength(2)
  })

  it('ne charge pas l’historique tant que la ligne n’est pas dépliée', async () => {
    const wrapper = mountTab()
    await flushPromises()

    expect(mockIpcInvoke.mock.calls.filter(([channel]) => channel === 'salaire:historique')).toHaveLength(0)
    // Le stub rend toutes les colonnes : seul le cache vide atteste l'absence de chargement.
    expect(normalizedText(wrapper)).not.toContain('VIR-0926')
  })

  it('charge et affiche l’historique des paiements d’un employé déplié', async () => {
    const wrapper = mountTab()
    await flushPromises()

    outerTable(wrapper).vm.$emit('expand-change', ROWS[0], [ROWS[0]])
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('salaire:historique', { userId: 1 })

    const text = normalizedText(wrapper)
    expect(text).toContain('Historique des paiements — Aïssatou Diallo')
    expect(text).toContain('(2 paiement(s))')
    expect(text).toContain('2026-09')
    expect(text).toContain('28/09/2026')
    expect(text).toContain('Virement')
    expect(text).toContain('VIR-0926')
    expect(text).toContain('2 050 000')
    expect(text).toContain('2026-08')
    expect(text).toContain('27/08/2026')
    expect(text).toContain('Espèces')
    expect(text).toContain('2 000 000')
    // Le sous-tableau déplié contient deux lignes : son état vide n'est pas rendu.
    expect(subTable(wrapper, 0).text()).not.toContain('Aucun paiement')
  })

  it('réutilise le cache à la réouverture d’une ligne et le vide au rechargement', async () => {
    const wrapper = mountTab()
    await flushPromises()

    const outer = outerTable(wrapper)
    outer.vm.$emit('expand-change', ROWS[0], [ROWS[0]])
    await flushPromises()
    outer.vm.$emit('expand-change', ROWS[0], [])
    await flushPromises()
    outer.vm.$emit('expand-change', ROWS[0], [ROWS[0]])
    await flushPromises()

    expect(mockIpcInvoke.mock.calls.filter(([channel]) => channel === 'salaire:historique')).toHaveLength(1)

    // Une copie du mois précédent recharge la feuille : le cache repart à vide.
    await buttonByText(wrapper, 'Copier le mois précédent')!.trigger('click')
    await flushPromises()
    expect(normalizedText(wrapper)).not.toContain('VIR-0926')

    outer.vm.$emit('expand-change', ROWS[0], [ROWS[0]])
    await flushPromises()
    expect(mockIpcInvoke.mock.calls.filter(([channel]) => channel === 'salaire:historique')).toHaveLength(2)
  })
})

describe('SalairesTab — historique : cas limites', () => {
  it('affiche « Aucun paiement » et le compte à zéro pour un employé sans historique', async () => {
    mockIpcInvoke.mockImplementation((channel: string) => {
      if (channel === 'salaire:paie') return Promise.resolve(ROWS)
      if (channel === 'salaire:historique') return Promise.resolve([])
      return Promise.resolve(null)
    })

    const wrapper = mountTab()
    await flushPromises()

    outerTable(wrapper).vm.$emit('expand-change', ROWS[2], [ROWS[2]])
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('salaire:historique', { userId: 3 })
    const sousTable = subTable(wrapper, 2)
    expect(sousTable.text()).toContain('Aucun paiement')
    expect(sousTable.attributes('aria-label')).toBe('Historique des paiements de Fatou Barry')

    const texte = normalizedText(wrapper)
    expect(texte).toContain('Historique des paiements — Fatou Barry')
    expect(texte).toContain('(0 paiement(s))')
    expect(wrapper.find('.salaires-tab__historique-count').classes()).toContain('cde-muted')
  })

  it('reste stable si `salaire:historique` échoue et réessaie à la réouverture', async () => {
    let echec = true
    mockIpcInvoke.mockImplementation((channel: string) => {
      if (channel === 'salaire:paie') return Promise.resolve(ROWS)
      if (channel === 'salaire:historique') {
        return echec ? Promise.reject(new Error('backend indisponible')) : Promise.resolve(PAIEMENTS)
      }
      return Promise.resolve(null)
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mountTab()
    await flushPromises()
    const outer = outerTable(wrapper)

    outer.vm.$emit('expand-change', ROWS[0], [ROWS[0]])
    await flushPromises()

    expect(consoleError).not.toHaveBeenCalled()
    expect(normalizedText(wrapper)).toContain('Historique indisponible')
    expect(normalizedText(wrapper)).not.toContain('Aucun paiement')
    // Le reste de l’onglet n’est pas cassé : les autres lignes et actions restent là.
    expect(wrapper.text()).toContain('Aïssatou Diallo')
    expect(wrapper.findAll('button').some((button) => button.text().trim() === 'Payer en masse')).toBe(true)

    // Un échec n’est pas mis en cache : la réouverture retente l’appel.
    echec = false
    outer.vm.$emit('expand-change', ROWS[0], [])
    await flushPromises()
    outer.vm.$emit('expand-change', ROWS[0], [ROWS[0]])
    await flushPromises()

    expect(historiqueCalls()).toHaveLength(2)
    expect(subTable(wrapper, 0).text()).toContain('VIR-0926')
    consoleError.mockRestore()
  })

  it('permet de réessayer après une erreur d’historique', async () => {
    let echec = true
    mockIpcInvoke.mockImplementation((channel: string) => {
      if (channel === 'salaire:paie') return Promise.resolve(ROWS)
      if (channel === 'salaire:historique') {
        return echec ? Promise.reject(new Error('backend indisponible')) : Promise.resolve(PAIEMENTS)
      }
      return Promise.resolve(null)
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mountTab()
    await flushPromises()

    outerTable(wrapper).vm.$emit('expand-change', ROWS[0], [ROWS[0]])
    await flushPromises()

    expect(normalizedText(wrapper)).toContain('Historique indisponible')
    expect(normalizedText(wrapper)).not.toContain('Aucun paiement')

    echec = false
    const reessayer = buttonByText(wrapper, 'Réessayer')
    expect(reessayer).toBeTruthy()
    await reessayer!.trigger('click')
    await flushPromises()

    expect(historiqueCalls()).toHaveLength(2)
    expect(normalizedText(wrapper)).toContain('VIR-0926')
    expect(normalizedText(wrapper)).not.toContain('Historique indisponible')
    consoleError.mockRestore()
  })

  it('ne lance aucun appel lors d’un repli sans chargement préalable', async () => {
    const wrapper = mountTab()
    await flushPromises()

    outerTable(wrapper).vm.$emit('expand-change', ROWS[0], [])
    await flushPromises()

    expect(historiqueCalls()).toHaveLength(0)
  })

  it('ouvre la fiche du paiement d’historique avec sa propre période', async () => {
    const wrapper = mountTab()
    await flushPromises()

    outerTable(wrapper).vm.$emit('expand-change', ROWS[0], [ROWS[0]])
    await flushPromises()

    const fiches = subTable(wrapper, 0)
      .findAll('button')
      .filter((button) => button.text().trim() === 'Fiche')
    expect(fiches).toHaveLength(2)

    await fiches[1].trigger('click')
    expect(dialogOpens.payslip).toHaveBeenCalledWith(1, '2026-08')
  })

  it('ignore une réponse d’historique obsolète après un rechargement', async () => {
    let resolveHistorique: (rows: typeof PAIEMENTS) => void = () => {}
    const enAttente = new Promise<typeof PAIEMENTS>((resolve) => {
      resolveHistorique = resolve
    })
    let appelsHistorique = 0
    mockIpcInvoke.mockImplementation((channel: string) => {
      if (channel === 'salaire:paie') return Promise.resolve(ROWS)
      if (channel === 'salaire:historique') {
        appelsHistorique += 1
        return appelsHistorique === 1 ? enAttente : Promise.resolve(PAIEMENTS)
      }
      return Promise.resolve(null)
    })

    const wrapper = mountTab()
    await flushPromises()

    outerTable(wrapper).vm.$emit('expand-change', ROWS[0], [ROWS[0]])
    await flushPromises()
    expect(historiqueCalls()).toHaveLength(1)

    // Rechargement pendant que la requête est encore en vol.
    const picker = wrapper.findComponent({ name: 'ElDatePickerStub' })
    picker.vm.$emit('update:modelValue', '2026-08')
    picker.vm.$emit('change', '2026-08')
    await flushPromises()

    resolveHistorique(PAIEMENTS)
    await flushPromises()

    expect(normalizedText(wrapper)).not.toContain('VIR-0926')
  })

  it('affiche — pour une référence, un mode et un montant absents', async () => {
    const paiementIncomplet = {
      id: 5,
      userId: 1,
      periode: '2026-07',
      montantNet: null,
      modePaiement: 'crypto',
      datePaiement: null,
      reference: null,
    }
    mockIpcInvoke.mockImplementation((channel: string) => {
      if (channel === 'salaire:paie') return Promise.resolve(ROWS)
      if (channel === 'salaire:historique') return Promise.resolve([paiementIncomplet])
      return Promise.resolve(null)
    })

    const wrapper = mountTab()
    await flushPromises()

    outerTable(wrapper).vm.$emit('expand-change', ROWS[0], [ROWS[0]])
    await flushPromises()

    const sousTable = subTable(wrapper, 0)
    const texte = sousTable.text()
    // Date, mode inconnu, référence et montant : quatre fallbacks.
    expect(texte.match(/—/g) ?? []).toHaveLength(4)
    expect(texte).toContain('2026-07')
    expect(sousTable.find('.cde-num').exists()).toBe(true)
  })

  it('trie l’historique dans l’ordre renvoyé par le backend (période décroissante)', async () => {
    mockIpcInvoke.mockImplementation((channel: string) => {
      if (channel === 'salaire:paie') return Promise.resolve(ROWS)
      if (channel === 'salaire:historique') return Promise.resolve(PAIEMENTS)
      return Promise.resolve(null)
    })

    const wrapper = mountTab()
    await flushPromises()

    outerTable(wrapper).vm.$emit('expand-change', ROWS[0], [ROWS[0]])
    await flushPromises()

    const texte = subTable(wrapper, 0).text()
    expect(texte.indexOf('2026-09')).toBeGreaterThanOrEqual(0)
    expect(texte.indexOf('2026-09')).toBeLessThan(texte.indexOf('2026-08'))
  })

  it('invalide le cache après un paiement individuel puis un paiement en masse', async () => {
    const wrapper = mountTab()
    await flushPromises()
    const outer = outerTable(wrapper)

    outer.vm.$emit('expand-change', ROWS[0], [ROWS[0]])
    await flushPromises()
    expect(historiqueCalls()).toHaveLength(1)

    wrapper.findComponent({ name: 'SalairePaiementDialog' }).vm.$emit('paid')
    await flushPromises()
    expect(normalizedText(wrapper)).not.toContain('VIR-0926')

    outer.vm.$emit('expand-change', ROWS[0], [ROWS[0]])
    await flushPromises()
    expect(historiqueCalls()).toHaveLength(2)

    wrapper.findComponent({ name: 'PaiementBulkDialog' }).vm.$emit('paid')
    await flushPromises()
    expect(normalizedText(wrapper)).not.toContain('VIR-0926')

    outer.vm.$emit('expand-change', ROWS[0], [ROWS[0]])
    await flushPromises()
    expect(historiqueCalls()).toHaveLength(3)
  })

  it('conserve l’historique affiché quand le rechargement après paiement échoue', async () => {
    let echecPaie = false
    mockIpcInvoke.mockImplementation((channel: string) => {
      if (channel === 'salaire:paie') {
        return echecPaie ? Promise.reject(new Error('backend indisponible')) : Promise.resolve(ROWS)
      }
      if (channel === 'salaire:historique') return Promise.resolve(PAIEMENTS)
      return Promise.resolve(null)
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mountTab()
    await flushPromises()
    const outer = outerTable(wrapper)

    outer.vm.$emit('expand-change', ROWS[0], [ROWS[0]])
    await flushPromises()
    expect(normalizedText(wrapper)).toContain('VIR-0926')

    // Le rechargement de la feuille échoue alors que la ligne est dépliée.
    echecPaie = true
    wrapper.findComponent({ name: 'SalairePaiementDialog' }).vm.$emit('paid')
    await flushPromises()

    // L'ancien historique reste affiché : plus de « Chargement… » éternel.
    expect(subTable(wrapper, 0).text()).not.toContain('Chargement…')
    expect(normalizedText(wrapper)).toContain('VIR-0926')

    // Une nouvelle ouverture de la ligne recharge bien l'historique.
    echecPaie = false
    outer.vm.$emit('expand-change', ROWS[0], [])
    await flushPromises()
    outer.vm.$emit('expand-change', ROWS[0], [ROWS[0]])
    await flushPromises()

    expect(historiqueCalls()).toHaveLength(2)
    expect(normalizedText(wrapper)).toContain('VIR-0926')
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('invalide le cache quand la période de paie change', async () => {
    const wrapper = mountTab()
    await flushPromises()
    const outer = outerTable(wrapper)

    outer.vm.$emit('expand-change', ROWS[0], [ROWS[0]])
    await flushPromises()
    expect(historiqueCalls()).toHaveLength(1)

    const picker = wrapper.findComponent({ name: 'ElDatePickerStub' })
    picker.vm.$emit('update:modelValue', '2026-08')
    await flushPromises()
    picker.vm.$emit('change', '2026-08')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('salaire:paie', { periode: '2026-08' })
    expect(normalizedText(wrapper)).not.toContain('VIR-0926')

    outer.vm.$emit('expand-change', ROWS[0], [ROWS[0]])
    await flushPromises()
    expect(historiqueCalls()).toHaveLength(2)
  })
})
