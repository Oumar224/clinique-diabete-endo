// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import PharmacieView from '../PharmacieView.vue'
import MedicamentFormDialog from '@/components/pharmacie/MedicamentFormDialog.vue'
import EntreeStockDialog from '@/components/pharmacie/EntreeStockDialog.vue'
import SortieStockDialog from '@/components/pharmacie/SortieStockDialog.vue'
import AjustementStockDialog from '@/components/pharmacie/AjustementStockDialog.vue'
import ServirDispensationDialog from '@/components/pharmacie/ServirDispensationDialog.vue'
import EncaisserVenteDialog from '@/components/comptabilite/EncaisserVenteDialog.vue'

// ─── Hoisted IPC mock (channel switch) ─────────────────────────────

const { mockIpcInvoke, mockElMessage, mockPrompt, dialogOpens, mockPush, mockUser } = vi.hoisted(() => ({
  mockIpcInvoke: vi.fn(),
  mockElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
  mockPrompt: vi.fn(),
  dialogOpens: {
    medicament: vi.fn(),
    entree: vi.fn(),
    sortie: vi.fn(),
    ajustement: vi.fn(),
    servir: vi.fn(),
    encaisser: vi.fn(),
  },
  mockPush: vi.fn(),
  mockUser: {
    value: {
      id: 7, nom: 'Diallo', prenom: 'Mamadou', email: 'p@cde.gn',
      role: 'PHARMACIEN', service: 'Pharmacie',
    },
  },
}))

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
  ElMessageBox: { confirm: vi.fn(), prompt: mockPrompt },
}))

vi.mock('@element-plus/icons-vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@element-plus/icons-vue')>()
  return actual
})

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Formateur déterministe (entiers GNF, format fr-FR) : indépendant du backend devises.
vi.mock('@/currency/useCurrency', () => ({
  useCurrency: () => ({
    formatCurrency: (amount: number) =>
      `${new Intl.NumberFormat('fr-FR').format(amount).replace(/[\u00a0\u202f]/g, ' ')} GNF`,
  }),
}))

// ─── Stubs ─────────────────────────────────────────────────────────

// Row binding per el-table instance: the table stores its current row in an
// instance-level box provided to its columns. Column slot content belongs to
// the PARENT render scope (it re-renders on any parent update while tables
// bail out), so a shared mutable collapses every action button onto the last
// rendered row — per-instance boxes stay correct. Deterministic with the
// single-row fixtures below.

function dialogStub(cls: string, openSpy: (...args: any[]) => void) {
  return {
    template: `<div class="${cls}"><slot /></div>`,
    methods: { open: openSpy },
    emits: ['saved'],
  }
}

const STUBS: Record<string, any> = {
  'el-tabs': {
    name: 'ElTabs',
    template: '<div class="el-tabs"><slot /></div>',
    props: ['modelValue'],
    emits: ['update:modelValue', 'tab-click'],
  },
  'el-tab-pane': {
    template: '<div class="el-tab-pane" :data-name="name" :data-label="label"><slot /><slot name="label" /></div>',
    props: ['label', 'name'],
  },
  'el-table': {
    template: `<div class="el-table">
      <div v-for="(item, idx) in (data || [])" :key="idx">
        <div class="el-table__row">{{ setRow(item) }}{{ JSON.stringify(item) }}</div>
        <div class="el-table__cells"><slot :row="item" :index="idx" /></div>
      </div>
      <slot name="empty" v-if="!(data || []).length" />
    </div>`,
    props: ['data'],
    data: () => ({ rowBox: { current: null as any } }),
    provide() {
      return { rowBox: (this as any).rowBox }
    },
    methods: {
      setRow(item: any) {
        (this as any).rowBox.current = item
        return ''
      },
    },
  },
  'el-table-column': {
    template: '<div class="el-table-column"><slot :row="rowBox ? rowBox.current : null" /></div>',
    inject: { rowBox: { from: 'rowBox', default: null } },
  },
  'el-pagination': { template: '<div class="el-pagination" />', props: ['currentPage', 'pageSize', 'total', 'layout'] },
  'el-badge': {
    template: '<span class="el-badge" :value="value" :hidden="hidden"><slot /></span>',
    props: ['value', 'hidden'],
  },
  'el-card': { template: '<div class="el-card"><slot /></div>', props: ['shadow'] },
  'el-row': { template: '<div class="el-row"><slot /></div>', props: ['gutter', 'justify'] },
  'el-col': { template: '<div class="el-col"><slot /></div>', props: ['span'] },
  'el-select': {
    name: 'ElSelect',
    template: '<select class="el-select" :value="modelValue" :placeholder="placeholder" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue', 'change'],
  },
  'el-option': {
    template: '<option :value="value">{{ label }}</option>',
    props: ['label', 'value'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'clearable'],
    emits: ['update:modelValue'],
  },
  'el-input-number': {
    template: '<input class="el-input-number" type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
    props: ['modelValue', 'min', 'max'],
    emits: ['update:modelValue'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'text', 'icon', 'loading'],
    emits: ['click'],
  },
  'el-tag': {
    template: '<span class="el-tag"><slot /></span>',
    props: ['type', 'size', 'effect'],
  },
  'el-empty': {
    template: '<div class="el-empty">{{ description }}</div>',
    props: ['description', 'imageSize'],
  },
  'el-icon': { template: '<span class="el-icon"><slot /></span>' },
}

// ─── Fixtures ──────────────────────────────────────────────────────

const MED = {
  id: 1, dci: 'Metformine', nomCommercial: 'Glucophage', dosage: '500 mg',
  forme: 'Comprimé', uniteStock: 'cp', seuilAlerte: 20, actif: true,
}
const NIVEAU = {
  medicamentId: 1, dci: 'Metformine', nomCommercial: 'Glucophage',
  uniteStock: 'cp', seuilAlerte: 20, stockTotal: 50, nbLots: 2,
}
const RUPTURE = {
  medicamentId: 2, dci: 'Furosémide', uniteStock: 'cp',
  seuilAlerte: 20, stockTotal: 0, nbLots: 0,
}
const MOUVEMENT = {
  id: 7, medicamentId: 1, type: 'entree', quantite: 20, stockAvant: 0,
  stockApres: 20, medicamentLabel: 'Metformine 500 mg', createdAt: '2026-01-10T08:00:00',
}
const ENTRY = {
  delivrance: {
    id: 3, source: 'ordonnance_libre', sourceDocumentId: 'doc-9', patientId: 7,
    statut: 'a_servir', createdAt: new Date().toISOString(),
  },
  lignes: [],
  patient: { id: 7, nom: 'Diallo', prenom: 'Mamadou' },
  document: { id: 'doc-9', title: 'Ordonnance' },
}

const ENTRY_WITH_LIGNE = {
  ...ENTRY,
  lignes: [
    { id: 31, delivranceId: 3, medicamentId: 1, libelle: 'Metformine', quantiteDemandee: 14, quantiteServie: 0 },
  ],
}

const ENTRY_UNMAPPED = {
  ...ENTRY,
  lignes: [
    { id: 41, delivranceId: 3, medicamentId: null, libelle: 'XyzInconnu', quantiteDemandee: 2, quantiteServie: 0 },
  ],
}

const ENTRY_ANNULEE = {
  ...ENTRY,
  delivrance: { ...ENTRY.delivrance, statut: 'annulee', motif: 'Doublon' },
  lignes: [],
}

const ENTRY_SERVIE = {
  ...ENTRY,
  delivrance: {
    ...ENTRY.delivrance,
    statut: 'servie',
    typeVente: 'facturee',
    dateVente: '2026-01-10',
  },
  lignes: [
    { id: 31, delivranceId: 3, medicamentId: 1, libelle: 'Metformine', quantiteDemandee: 14, quantiteServie: 14 },
  ],
}

const VENTE_CREDIT = {
  id: 3,
  dateVente: '2026-01-10',
  typeVente: 'facturee',
  statut: 'servie',
  patient: { id: 7, nom: 'Diallo', prenom: 'Mamadou' },
  lignes: [],
  paiements: [],
  montantTotal: 10000,
  montantPaye: 0,
  reste: 10000,
  statutFinancier: 'credit',
  prixManquant: false,
}

const VENTE_PARTIELLE = { ...VENTE_CREDIT, montantPaye: 4000, reste: 6000, statutFinancier: 'partielle' }
const VENTE_PAYEE = { ...VENTE_CREDIT, montantPaye: 10000, reste: 0, statutFinancier: 'payee' }
const VENTE_GRATUITE = { ...VENTE_CREDIT, typeVente: 'gratuite', statutFinancier: 'gratuite', montantTotal: 0, reste: 0 }
const VENTE_SANS_MONTANT = { ...VENTE_CREDIT, statutFinancier: 'sans_montant', montantTotal: 0, reste: 0 }

function defaultIpc() {
  mockIpcInvoke.mockImplementation(async (channel: string) => {
    switch (channel) {
      case 'medicament:list': return [MED]
      case 'stock:niveaux': return [NIVEAU]
      case 'stock:alertes':
        return { ruptures: [RUPTURE], sousSeuil: [], perimes: [], peremptionProche: [] }
      case 'stock:mouvements': return [MOUVEMENT]
      case 'dispensation:file': return [ENTRY]
      default: return undefined
    }
  })
}

// ─── Suite ─────────────────────────────────────────────────────────

describe('PharmacieView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.value.role = 'PHARMACIEN'
    defaultIpc()
  })

  function createWrapper() {
    return mount(PharmacieView, {
      global: {
        stubs: {
          ...STUBS,
          MedicamentFormDialog: dialogStub('medicament-dialog-stub', dialogOpens.medicament),
          EntreeStockDialog: dialogStub('entree-dialog-stub', dialogOpens.entree),
          SortieStockDialog: dialogStub('sortie-dialog-stub', dialogOpens.sortie),
          AjustementStockDialog: dialogStub('ajustement-dialog-stub', dialogOpens.ajustement),
          ServirDispensationDialog: dialogStub('servir-dialog-stub', dialogOpens.servir),
          EncaisserVenteDialog: dialogStub('encaisser-dialog-stub', dialogOpens.encaisser),
        },
      },
    })
  }

  function tabLabels(wrapper: ReturnType<typeof createWrapper>): string[] {
    return wrapper.findAll('.el-tab-pane').map((p) => p.attributes('data-label') ?? '')
  }

  /**
   * Retourne le panneau d'onglet par son `name` technique.
   *
   * Indépendant de l'ordre de déclaration : ajouter/retirer un onglet (ex.
   * « Commandes » conditionné par le rôle) ne décale plus les sélections.
   */
  function paneByName(wrapper: ReturnType<typeof createWrapper>, name: string) {
    const pane = wrapper.find(`.el-tab-pane[data-name="${name}"]`)
    if (!pane.exists()) throw new Error(`Onglet introuvable : ${name}`)
    return pane
  }

  it('renders the 5 tabs and fetches catalogue, stock, alertes, mouvements and file on mount', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(tabLabels(wrapper)).toEqual(
      expect.arrayContaining(['Catalogue', 'Stock & lots', 'Mouvements', 'Délivrances']),
    )
    expect(wrapper.text()).toContain('Alertes')
    const calledChannels = mockIpcInvoke.mock.calls.map((c) => c[0])
    for (const channel of ['medicament:list', 'stock:niveaux', 'stock:alertes', 'stock:mouvements', 'dispensation:file']) {
      expect(calledChannels).toContain(channel)
    }
  })

  it('réserve l’onglet Commandes aux rôles habilités aux commandes', async () => {
    for (const role of ['ADMIN', 'PHARMACIEN']) {
      mockUser.value.role = role
      const wrapper = createWrapper()
      await flushPromises()
      expect(tabLabels(wrapper), role).toContain('Commandes')
      wrapper.unmount()
    }

    for (const role of ['SECRETAIRE', 'MEDECIN', 'INFIRMIER']) {
      mockUser.value.role = role
      const wrapper = createWrapper()
      await flushPromises()
      expect(tabLabels(wrapper), role).not.toContain('Commandes')
      wrapper.unmount()
    }
  })

  it('renders catalogue rows from medicament:list', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const cataloguePane = paneByName(wrapper, 'catalogue')
    expect(cataloguePane.find('.el-table__row').text()).toContain('Metformine')
    expect(cataloguePane.find('.el-table__row').text()).toContain('Glucophage')
  })

  it('opens the medicament dialog on Ajouter', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const addBtn = wrapper.findAll('.el-button').find((b) => b.text() === 'Ajouter')!
    await addBtn.trigger('click')

    expect(dialogOpens.medicament).toHaveBeenCalled()
  })

  it('opens the entree dialog with the row context', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const entreeBtn = wrapper.findAll('.el-button').find((b) => b.text() === 'Entrée')!
    await entreeBtn.trigger('click')

    expect(dialogOpens.entree).toHaveBeenCalledWith(
      expect.objectContaining({ medicamentId: 1 }),
    )
  })

  it('désactive « Sortie » sur une ligne en rupture et l’active sur une ligne disponible', async () => {
    // Le stub el-table partage un rowBox par instance : fixtures mono-ligne
    // obligatoires pour que chaque bouton d'action cible bien sa propre ligne.
    async function mountWithStock(stockRow: typeof NIVEAU) {
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'stock:niveaux') return [stockRow]
        if (channel === 'medicament:list') return [MED]
        if (channel === 'stock:mouvements') return []
        if (channel === 'dispensation:file') return []
        if (channel === 'stock:alertes') {
          return { ruptures: [], sousSeuil: [], perimes: [], peremptionProche: [] }
        }
        return undefined
      })
      const wrapper = createWrapper()
      await flushPromises()
      return wrapper
    }

    const rupture = await mountWithStock(RUPTURE)
    const ruptureBtn = paneByName(rupture, 'stock')
      .findAll('.el-button')
      .find((b) => b.text() === 'Sortie')!
    expect(ruptureBtn).toBeTruthy()
    expect(ruptureBtn.attributes('disabled')).toBeDefined()

    const dispo = await mountWithStock(NIVEAU)
    const dispoBtn = paneByName(dispo, 'stock')
      .findAll('.el-button')
      .find((b) => b.text() === 'Sortie')!
    expect(dispoBtn).toBeTruthy()
    expect(dispoBtn.attributes('disabled')).toBeUndefined()

    await dispoBtn.trigger('click')
    expect(dialogOpens.sortie).toHaveBeenCalledWith(
      expect.objectContaining({ medicamentId: 1, stockTotal: 50 }),
    )
  })

  it('opens the servir dialog with the entry and refreshes the file on saved', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const servirBtn = wrapper.findAll('.el-button').find((b) => b.text() === 'Servir')!
    await servirBtn.trigger('click')
    expect(dialogOpens.servir).toHaveBeenCalledWith(
      expect.objectContaining({ delivrance: expect.objectContaining({ id: 3 }) }),
    )

    const fileCalls = mockIpcInvoke.mock.calls.filter((c) => c[0] === 'dispensation:file').length
    wrapper.findComponent(ServirDispensationDialog).vm.$emit('saved')
    await flushPromises()
    expect(mockIpcInvoke.mock.calls.filter((c) => c[0] === 'dispensation:file').length).toBeGreaterThan(fileCalls)
  })

  it('renders delivrance ligne details (libellé, demandée, restant)', async () => {
    mockIpcInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'dispensation:file') return [ENTRY_WITH_LIGNE]
      if (channel === 'medicament:list') return []
      if (channel === 'stock:niveaux') return []
      if (channel === 'stock:mouvements') return []
      if (channel === 'stock:alertes') {
        return { ruptures: [], sousSeuil: [], perimes: [], peremptionProche: [] }
      }
      return undefined
    })
    const wrapper = createWrapper()
    await flushPromises()

    const filePane = paneByName(wrapper, 'delivrances')
    expect(filePane.text()).toContain('Metformine')
    expect(filePane.text()).toContain('14')
  })

  it('shows the alertes badge with the total count', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const count = wrapper.find('.cde-tabs__count')
    expect(count.text()).toBe('1')
    expect(wrapper.text()).toContain('Ruptures')
    expect(wrapper.text()).toContain('Furosémide')
  })

  it('renders honest empty states when IPC fails', async () => {
    mockIpcInvoke.mockRejectedValue(new Error('boom'))
    const wrapper = createWrapper()
    await flushPromises()
    await nextTick()

    expect(wrapper.text()).toContain('Aucun médicament au catalogue')
    expect(wrapper.text()).toContain('Aucun article en stock')
    expect(wrapper.text()).toContain('Aucun mouvement enregistré')
    expect(wrapper.text()).toContain('Aucune délivrance dans ce statut')
  })

  it('transfers a document manually and announces success', async () => {
    mockIpcInvoke.mockImplementation(async (channel: string, params: any) => {
      if (channel === 'dispensation:create-from-document') {
        return { delivrance: { id: 5, createdAt: new Date().toISOString() }, lignes: [], created: true }
      }
      if (channel === 'dispensation:file') return []
      if (channel === 'medicament:list') return []
      if (channel === 'stock:niveaux') return []
      if (channel === 'stock:mouvements') return []
      if (channel === 'stock:alertes') {
        return { ruptures: [], sousSeuil: [], perimes: [], peremptionProche: [] }
      }
      return undefined
    })
    const wrapper = createWrapper()
    await flushPromises()

    const docInput = wrapper.findAll('.el-input').find((i) => i.attributes('placeholder') === 'ID document ordonnance (transfert manuel)')!
    await docInput.setValue('doc-9')
    const transferBtn = wrapper.findAll('.el-button').find((b) => b.text() === 'Transférer')!
    await transferBtn.trigger('click')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('dispensation:create-from-document', { documentId: 'doc-9' })
    expect(mockElMessage.success).toHaveBeenCalledWith('Ordonnance transférée à la pharmacie')
  })

  it('announces an already transferred document without error', async () => {
    mockIpcInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'dispensation:create-from-document') {
        return { delivrance: { id: 5, createdAt: new Date(Date.now() - 3600_000).toISOString() }, lignes: [], created: false }
      }
      return undefined
    })
    const wrapper = createWrapper()
    await flushPromises()

    const docInput = wrapper.findAll('.el-input').find((i) => i.attributes('placeholder') === 'ID document ordonnance (transfert manuel)')!
    await docInput.setValue('doc-9')
    const transferBtn = wrapper.findAll('.el-button').find((b) => b.text() === 'Transférer')!
    await transferBtn.trigger('click')
    await flushPromises()

    expect(mockElMessage.info).toHaveBeenCalledWith('Déjà transférée à la pharmacie')
    expect(mockElMessage.success).not.toHaveBeenCalled()
  })

  it('maps an unmapped ligne through the Mapping UI and refreshes the file', async () => {
    mockIpcInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'dispensation:file') return [ENTRY_UNMAPPED]
      if (channel === 'medicament:list') return [MED]
      if (channel === 'dispensation:map-ligne') return { id: 41, medicamentId: 1 }
      return undefined
    })
    const wrapper = createWrapper()
    await flushPromises()

    const filePane = paneByName(wrapper, 'delivrances')
    expect(filePane.text()).toContain('Non mappée')

    const mapSelect = wrapper.findAllComponents({ name: 'ElSelect' })
      .find((s) => s.attributes('placeholder') === 'Médicament...')!
    await mapSelect.vm.$emit('update:modelValue', 1)
    await nextTick()

    const mapperBtn = wrapper.findAll('.el-button').find((b) => b.text() === 'Mapper')!
    expect(mapperBtn.attributes('disabled')).toBeUndefined()
    await mapperBtn.trigger('click')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('dispensation:map-ligne', { ligneId: 41, medicamentId: 1 })
    expect(mockElMessage.success).toHaveBeenCalledWith('Ligne mappée au catalogue')
  })

  it('rouvre une demande annulee via le bouton Rouvrir', async () => {
    mockPrompt.mockResolvedValue({ value: 'Erreur de saisie' })
    mockIpcInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'dispensation:file') return [ENTRY_ANNULEE]
      if (channel === 'dispensation:reouvrir') {
        return { id: 3, statut: 'a_servir', motif: 'Erreur de saisie' }
      }
      return undefined
    })
    const wrapper = createWrapper()
    await flushPromises()

    const rouvrirBtn = wrapper.findAll('.el-button').find((b) => b.text() === 'Rouvrir')!
    await rouvrirBtn.trigger('click')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('dispensation:reouvrir', { delivranceId: 3, motif: 'Erreur de saisie' })
    expect(mockElMessage.success).toHaveBeenCalledWith('Demande rouverte')
  })

  it('shows the orphelines counter and table on the alertes tab', async () => {
    mockIpcInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'dispensation:orphelines') {
        return [{ documentId: 'doc-x', patient: { id: 7, nom: 'Diallo', prenom: 'Mamadou' }, nbLignes: 2 }]
      }
      if (channel === 'medicament:list') return []
      if (channel === 'stock:niveaux') return []
      if (channel === 'stock:mouvements') return []
      if (channel === 'dispensation:file') return []
      if (channel === 'stock:alertes') {
        return { ruptures: [], sousSeuil: [], perimes: [], peremptionProche: [] }
      }
      return undefined
    })
    const wrapper = createWrapper()
    await flushPromises()

    const tabs = wrapper.findComponent({ name: 'ElTabs' })
    await tabs.vm.$emit('update:modelValue', 'alertes')
    await tabs.vm.$emit('tab-click')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('dispensation:orphelines', {}, { silent: true })
    expect(wrapper.text()).toContain('Transferts manquants')
    expect(wrapper.text()).toContain('doc-x')
  })

  it('Phase 1: renders Type + Conditionnement + Prix (— si NULL) and searches conditionnement', async () => {
    mockIpcInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'medicament:list') {
        return [{ ...MED, typeProduit: 'medicament', conditionnement: 'boîte de 30 comprimés', prixAchat: null, prixVente: 1500 }]
      }
      if (channel === 'stock:niveaux') return []
      if (channel === 'stock:mouvements') return []
      if (channel === 'dispensation:file') return []
      if (channel === 'stock:alertes') {
        return { ruptures: [], sousSeuil: [], perimes: [], peremptionProche: [] }
      }
      if (channel === 'fournisseur:list') return []
      return undefined
    })
    const wrapper = createWrapper()
    await flushPromises()

    const cataloguePane = paneByName(wrapper, 'catalogue')
    const text = cataloguePane.text()
    expect(text).toContain('Médicament')
    expect(text).toContain('boîte de 30 comprimés')
    // prixAchat NULL → '—', prixVente rendu (espaces FR insécables normalisés)
    expect(text).toContain('—')
    const normalized = text.replace(/[\u00a0\u202f]/g, ' ')
    expect(normalized).toContain('1 500')
  })

  it('Phase 1: filters catalogue by type and extends search to conditionnement', async () => {
    mockIpcInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'medicament:list') {
        return [
          { ...MED, id: 1, dci: 'Metformine', typeProduit: 'medicament', conditionnement: 'boîte de 30' },
          { ...MED, id: 2, dci: 'Seringue', typeProduit: 'dispositif', conditionnement: 'boîte de 100' },
        ]
      }
      if (channel === 'stock:niveaux') return []
      if (channel === 'stock:mouvements') return []
      if (channel === 'dispensation:file') return []
      if (channel === 'stock:alertes') {
        return { ruptures: [], sousSeuil: [], perimes: [], peremptionProche: [] }
      }
      if (channel === 'fournisseur:list') return []
      return undefined
    })
    const wrapper = createWrapper()
    await flushPromises()

    const cataloguePane = paneByName(wrapper, 'catalogue')
    // les deux lignes visibles sans filtre
    expect(cataloguePane.text()).toContain('Metformine')
    expect(cataloguePane.text()).toContain('Seringue')

    // filtre type = dispositif → seule la seringue reste
    const typeSelect = wrapper.findAllComponents({ name: 'ElSelect' })
      .find((s) => s.attributes('placeholder') === 'Type')!
    await typeSelect.vm.$emit('update:modelValue', 'dispositif')
    await nextTick()
    expect(paneByName(wrapper, 'catalogue').text()).toContain('Seringue')
    expect(paneByName(wrapper, 'catalogue').text()).not.toContain('Metformine')
  })

  it('Phase 1: entree dialog receives fournisseur principal + prix catalogue par défaut', async () => {
    mockIpcInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'medicament:list') {
        return [{ ...MED, typeProduit: 'medicament', fournisseurPrincipalId: 9, prixAchat: 250 }]
      }
      if (channel === 'stock:niveaux') return [NIVEAU]
      if (channel === 'stock:mouvements') return []
      if (channel === 'dispensation:file') return []
      if (channel === 'stock:alertes') {
        return { ruptures: [], sousSeuil: [], perimes: [], peremptionProche: [] }
      }
      if (channel === 'fournisseur:list') return [{ id: 9, nom: 'Labo A' }]
      return undefined
    })
    const wrapper = createWrapper()
    await flushPromises()

    const entreeBtn = wrapper.findAll('.el-button').find((b) => b.text() === 'Entrée')!
    await entreeBtn.trigger('click')

    expect(dialogOpens.entree).toHaveBeenCalledWith(
      expect.objectContaining({ medicamentId: 1, fournisseurPrincipalId: 9, prixAchat: 250 }),
    )
  })

  it('P0-1: un ajustement à la hausse affiche +N vert (signe delta, pas -N forcé)', async () => {
    // NOTE stub el-table : fixture mono-ligne (rowBox partagé → multi-lignes collapse sur la dernière).
    async function renderMouvements(rows: any[]) {
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'stock:mouvements') return rows
        if (channel === 'medicament:list') return [MED]
        if (channel === 'stock:niveaux') return [NIVEAU]
        if (channel === 'dispensation:file') return []
        if (channel === 'stock:alertes') {
          return { ruptures: [], sousSeuil: [], perimes: [], peremptionProche: [] }
        }
        return undefined
      })
      const wrapper = createWrapper()
      await flushPromises()
      await nextTick()
      return paneByName(wrapper, 'mouvements')
    }

    // hausse via delta stockApres-stockAvant → +5, pas -5
    const hausse = await renderMouvements([
      { id: 11, medicamentId: 1, type: 'ajustement', quantite: 5, stockAvant: 10, stockApres: 15, medicamentLabel: 'Metformine 500 mg', createdAt: '2026-01-11T08:00:00' },
    ])
    expect(hausse.text()).toContain('+5')
    expect(hausse.find('.pharmacie__pos').exists()).toBe(true)

    // baisse via delta → -3 rouge
    const baisse = await renderMouvements([
      { id: 12, medicamentId: 1, type: 'ajustement', quantite: -3, stockAvant: 15, stockApres: 12, medicamentLabel: 'Metformine 500 mg', createdAt: '2026-01-12T08:00:00' },
    ])
    expect(baisse.text()).toContain('-3')
    expect(baisse.find('.pharmacie__neg').exists()).toBe(true)

    // fallback sans avant/après : signe backend conservé (+4 hausse)
    const fallback = await renderMouvements([
      { id: 13, medicamentId: 1, type: 'ajustement', quantite: 4, medicamentLabel: 'Metformine 500 mg', createdAt: '2026-01-13T08:00:00' },
    ])
    expect(fallback.text()).toContain('+4')
    expect(fallback.find('.pharmacie__pos').exists()).toBe(true)
  })

  it('omits undefined filter keys in the mouvements payload (P0 non-regression)', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const calls = mockIpcInvoke.mock.calls.filter((c) => c[0] === 'stock:mouvements')
    expect(calls.length).toBeGreaterThan(0)
    expect(calls[0][1]).toEqual({ limit: 100 })
    expect('type' in (calls[0][1] ?? {})).toBe(false)
    expect('medicamentId' in (calls[0][1] ?? {})).toBe(false)
    // la table des mouvements rend la ligne (label résolu par le backend)
    expect(paneByName(wrapper, 'mouvements').text()).toContain('Metformine 500 mg')
  })

  // ── Situation financière & encaissement ────────────────────────

  /** Monte la vue avec une délivrance servie et une vente financière. */
  async function mountAvecVente(vente: unknown) {
    mockIpcInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'dispensation:file') return [ENTRY_SERVIE]
      if (channel === 'dispensation:ventes') return [vente]
      if (channel === 'medicament:list') return [MED]
      if (channel === 'stock:niveaux') return [NIVEAU]
      if (channel === 'stock:mouvements') return []
      if (channel === 'stock:alertes') {
        return { ruptures: [], sousSeuil: [], perimes: [], peremptionProche: [] }
      }
      return undefined
    })
    const wrapper = createWrapper()
    await flushPromises()
    await nextTick()
    return wrapper
  }

  it('affiche le badge de situation financière (total, payé, reste) sur la délivrance', async () => {
    const wrapper = await mountAvecVente(VENTE_CREDIT)
    const filePane = paneByName(wrapper, 'delivrances')
    const text = filePane.text().replace(/\s+/g, ' ')

    expect(text).toContain('Crédit')
    expect(text).toContain('Total 10 000 GNF')
    expect(text).toContain('Payé 0 GNF')
    expect(text).toContain('Reste 10 000 GNF')
  })

  it('affiche les badges Partielle, Payée, Gratuite et Sans montant', async () => {
    const partielle = await mountAvecVente(VENTE_PARTIELLE)
    expect(paneByName(partielle, 'delivrances').text()).toContain('Partielle')

    const payee = await mountAvecVente(VENTE_PAYEE)
    expect(paneByName(payee, 'delivrances').text()).toContain('Payée')

    const gratuite = await mountAvecVente(VENTE_GRATUITE)
    expect(paneByName(gratuite, 'delivrances').text()).toContain('Gratuite')

    const sansMontant = await mountAvecVente(VENTE_SANS_MONTANT)
    expect(paneByName(sansMontant, 'delivrances').text()).toContain('Sans montant')
  })

  it('ouvre le dialogue Encaisser sur une vente à crédit', async () => {
    const wrapper = await mountAvecVente(VENTE_CREDIT)

    const encaisserBtn = wrapper.findAll('.el-button').find((b) => b.text() === 'Encaisser')!
    expect(encaisserBtn).toBeTruthy()
    await encaisserBtn.trigger('click')

    expect(dialogOpens.encaisser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 3, statutFinancier: 'credit' }),
    )
  })

  it('ouvre le dialogue Encaisser sur une vente partiellement payée', async () => {
    const wrapper = await mountAvecVente(VENTE_PARTIELLE)

    const encaisserBtn = wrapper.findAll('.el-button').find((b) => b.text() === 'Encaisser')!
    await encaisserBtn.trigger('click')

    expect(dialogOpens.encaisser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 3, statutFinancier: 'partielle' }),
    )
  })

  it('masque le bouton Encaisser pour une vente déjà payée ou gratuite', async () => {
    const payee = await mountAvecVente(VENTE_PAYEE)
    expect(payee.findAll('.el-button').find((b) => b.text() === 'Encaisser')).toBeUndefined()

    const gratuite = await mountAvecVente(VENTE_GRATUITE)
    expect(gratuite.findAll('.el-button').find((b) => b.text() === 'Encaisser')).toBeUndefined()
  })

  it('réserve le bouton Encaisser aux rôles PHARMACIEN, ADMIN et COMPTABLE', async () => {
    for (const role of ['PHARMACIEN', 'ADMIN', 'COMPTABLE']) {
      mockUser.value.role = role
      const wrapper = await mountAvecVente(VENTE_CREDIT)
      expect(wrapper.findAll('.el-button').find((b) => b.text() === 'Encaisser')).toBeTruthy()
    }

    for (const role of ['SECRETAIRE', 'MEDECIN', 'INFIRMIER']) {
      mockUser.value.role = role
      const wrapper = await mountAvecVente(VENTE_CREDIT)
      expect(wrapper.findAll('.el-button').find((b) => b.text() === 'Encaisser')).toBeUndefined()
    }
  })

  it('affiche le bouton Comptabilité aux rôles ADMIN et COMPTABLE seulement', async () => {
    mockUser.value.role = 'ADMIN'
    const admin = await mountAvecVente(VENTE_CREDIT)
    const adminBtn = admin.findAll('.el-button').find((b) => b.text() === 'Comptabilité')!
    expect(adminBtn).toBeTruthy()
    await adminBtn.trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/app/comptabilite')

    mockUser.value.role = 'COMPTABLE'
    const comptable = await mountAvecVente(VENTE_CREDIT)
    expect(comptable.findAll('.el-button').find((b) => b.text() === 'Comptabilité')).toBeTruthy()

    mockUser.value.role = 'PHARMACIEN'
    const pharma = await mountAvecVente(VENTE_CREDIT)
    expect(pharma.findAll('.el-button').find((b) => b.text() === 'Comptabilité')).toBeUndefined()
  })

  it('rafraîchit les ventes après un encaissement', async () => {
    const wrapper = await mountAvecVente(VENTE_CREDIT)

    const ventesCalls = mockIpcInvoke.mock.calls.filter((c) => c[0] === 'dispensation:ventes').length
    wrapper.findComponent(EncaisserVenteDialog).vm.$emit('saved')
    await flushPromises()

    expect(mockIpcInvoke.mock.calls.filter((c) => c[0] === 'dispensation:ventes').length).toBeGreaterThan(ventesCalls)
  })
})
