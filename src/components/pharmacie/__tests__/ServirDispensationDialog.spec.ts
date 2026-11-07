// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import ServirDispensationDialog from '../ServirDispensationDialog.vue'

const { mockIpcInvoke, mockElMessage, mockAuthUser } = vi.hoisted(() => ({
  mockIpcInvoke: vi.fn(),
  mockElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
  mockAuthUser: { value: { id: 7, nom: 'Pharma', prenom: 'Test', role: 'PHARMACIEN' } },
}))

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ user: mockAuthUser }),
}))

// Formateur déterministe (entiers GNF, format fr-FR) : indépendant du backend devises.
vi.mock('@/currency/useCurrency', () => ({
  useCurrency: () => ({
    formatCurrency: (amount: number) =>
      `${new Intl.NumberFormat('fr-FR').format(amount).replace(/[\u00a0\u202f]/g, ' ')} GNF`,
  }),
}))

const STUBS: Record<string, any> = {
  'el-dialog': {
    template: '<div v-if="modelValue" class="el-dialog" :data-width="width"><slot /><slot name="footer" /></div>',
    props: ['modelValue', 'width', 'title', 'closeOnClickModal'],
  },
  'el-table': {
    template: `<div class="el-table">
      <div v-for="(item, idx) in (data || [])" :key="idx">
        <div class="el-table__row">{{ setRow(item) }}{{ JSON.stringify(item) }}</div>
        <div class="el-table__cells"><slot :row="item" :index="idx" /></div>
      </div>
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
    template: '<div class="el-table-column"><span class="el-table-column__label">{{ label }}</span><slot :row="rowBox ? rowBox.current : null" /></div>',
    props: ['label', 'width', 'minWidth', 'align'],
    inject: { rowBox: { from: 'rowBox', default: null } },
  },
  'el-input-number': {
    template: '<input class="el-input-number" type="number" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
    props: ['modelValue', 'min', 'max', 'disabled', 'size', 'step', 'precision', 'controlsPosition'],
    emits: ['update:modelValue'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" :loading="loading" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'loading'],
    emits: ['click'],
  },
  'el-tag': {
    template: '<span class="el-tag"><slot /></span>',
    props: ['type', 'size', 'effect'],
  },
  'el-form': { template: '<form class="el-form" @submit.prevent><slot /></form>' },
  'el-form-item': {
    template: '<div class="el-form-item"><label class="el-form-item__label">{{ label }}</label><slot /></div>',
    props: ['label', 'required', 'error'],
  },
  'el-select': {
    name: 'ElSelect',
    template: '<select class="el-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue', 'change'],
  },
  'el-option': {
    template: '<option :value="value">{{ label }}</option>',
    props: ['label', 'value'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'maxlength'],
    emits: ['update:modelValue'],
  },
  'el-date-picker': {
    template: '<input class="el-date-picker" type="date" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'valueFormat', 'placeholder'],
    emits: ['update:modelValue'],
  },
  'el-alert': {
    template: '<div class="el-alert"><span class="el-alert__title">{{ title }}</span><slot /></div>',
    props: ['title', 'type', 'closable', 'showIcon'],
  },
}

const LOTS = [
  { id: 6, medicamentId: 1, numeroLot: 'EARLY', quantite: 9, datePeremption: isoDaysFromNow(30) },
  { id: 5, medicamentId: 1, numeroLot: 'LATE', quantite: 2, datePeremption: isoDaysFromNow(300) },
]

function isoDaysFromNow(deltaDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function makeEntry(lignes: Array<Record<string, any>> = [
  { id: 31, delivranceId: 3, medicamentId: 1, libelle: 'Metformine', quantiteDemandee: 14, quantiteServie: 0 },
]) {
  return {
    delivrance: { id: 3 },
    lignes,
    patient: { id: 7, nom: 'Diallo', prenom: 'Mamadou' },
  }
}

describe('ServirDispensationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthUser.value = { id: 7, nom: 'Pharma', prenom: 'Test', role: 'PHARMACIEN' }
    mockIpcInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'stock:lots') return LOTS
      if (channel === 'medicament:list') return [{ id: 1, dci: 'Metformine', prixVente: 1000 }]
      if (channel === 'dispensation:servir') {
        return { delivrance: { id: 3, statut: 'servie' }, lignes: [] }
      }
      return undefined
    })
  })

  function createWrapper() {
    return mount(ServirDispensationDialog, { global: { stubs: STUBS } })
  }

  async function openDialog(wrapper: ReturnType<typeof createWrapper>, entry: any) {
    await (wrapper.vm as any).open(entry)
    await flushPromises()
    await nextTick()
  }

  function servirButton(wrapper: ReturnType<typeof createWrapper>) {
    return wrapper.findAll('.el-button').find((b) => b.text().startsWith('Servir'))!
  }

  /** Sélecteur « Type de vente ». */
  function typeVenteSelect(wrapper: ReturnType<typeof createWrapper>) {
    return wrapper.find('.servir-dialog__select--type select')
  }

  /** Sélecteur « Motif de gratuité ». */
  function motifSelect(wrapper: ReturnType<typeof createWrapper>) {
    return wrapper.find('.servir-dialog__select--motif select')
  }

  /** Champ « Montant encaissé ». */
  function montantInput(wrapper: ReturnType<typeof createWrapper>) {
    return wrapper.find('.servir-dialog__montant .el-input-number')
  }

  it('prefills restant quantites, shows the patient and fetches lots per medicament', async () => {
    const wrapper = createWrapper()
    await openDialog(wrapper, makeEntry())

    expect(wrapper.text()).toContain('Mamadou Diallo')
    expect(mockIpcInvoke).toHaveBeenCalledWith('stock:lots', { medicamentId: 1 })
    const btn = servirButton(wrapper)
    expect(btn.attributes('disabled')).toBeUndefined()
    expect(btn.text()).toBe('Servir')
  })

  it('suggests the earliest-peremption lot first', async () => {
    const wrapper = createWrapper()
    await openDialog(wrapper, makeEntry())

    expect(wrapper.text()).toContain('Lot EARLY')
  })

  it('excludes expired lots from the FIFO suggestion', async () => {
    mockIpcInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'stock:lots') {
        return [
          { id: 8, medicamentId: 1, numeroLot: 'OLD', quantite: 50, datePeremption: isoDaysFromNow(-5) },
          ...LOTS,
        ]
      }
      return undefined
    })
    const wrapper = createWrapper()
    await openDialog(wrapper, makeEntry())

    expect(wrapper.text()).toContain('Lot EARLY')
    expect(wrapper.text()).not.toContain('Lot OLD')
  })

  it('shows Stock insuffisant when no lots are available', async () => {
    mockIpcInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'stock:lots') return []
      return undefined
    })
    const wrapper = createWrapper()
    await openDialog(wrapper, makeEntry())

    expect(wrapper.text()).toContain('Stock insuffisant')
  })

  it('submits full quantites to dispensation:servir and emits saved', async () => {
    const wrapper = createWrapper()
    await openDialog(wrapper, makeEntry())

    await servirButton(wrapper).trigger('click')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('dispensation:servir', {
      delivranceId: 3,
      lignes: [{ ligneId: 31, quantite: 14 }],
      userId: 7,
      typeVente: 'facturee',
      paiement: { montant: 14000, modePaiement: 'espèces', datePaiement: todayIso() },
    })
    expect(mockElMessage.success).toHaveBeenCalledWith('Délivrance servie')
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('submits a reduced quantity with the partiel label', async () => {
    const wrapper = createWrapper()
    await openDialog(wrapper, makeEntry())

    await wrapper.find('.el-input-number').setValue('5')
    await nextTick()
    expect(servirButton(wrapper).text()).toBe('Servir (partiel)')

    await servirButton(wrapper).trigger('click')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('dispensation:servir', {
      delivranceId: 3,
      lignes: [{ ligneId: 31, quantite: 5 }],
      userId: 7,
      typeVente: 'facturee',
      paiement: { montant: 5000, modePaiement: 'espèces', datePaiement: todayIso() },
    })
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('excludes unmapped lignes and disables Servir when nothing is servable', async () => {
    const wrapper = createWrapper()
    await openDialog(wrapper, makeEntry([
      { id: 31, delivranceId: 3, medicamentId: 1, libelle: 'Metformine', quantiteDemandee: 14, quantiteServie: 0 },
      { id: 32, delivranceId: 3, medicamentId: null, libelle: 'Inconnu', quantiteDemandee: 4, quantiteServie: 0 },
    ]))

    expect(wrapper.text()).toContain('Non mappée')
    await servirButton(wrapper).trigger('click')
    await flushPromises()
    expect(mockIpcInvoke).toHaveBeenCalledWith('dispensation:servir', {
      delivranceId: 3,
      lignes: [{ ligneId: 31, quantite: 14 }],
      userId: 7,
      typeVente: 'facturee',
      paiement: { montant: 14000, modePaiement: 'espèces', datePaiement: todayIso() },
    })

    const wrapper2 = createWrapper()
    await openDialog(wrapper2, makeEntry([
      { id: 33, delivranceId: 3, medicamentId: null, libelle: 'Inconnu', quantiteDemandee: 4, quantiteServie: 0 },
    ]))
    expect(servirButton(wrapper2).attributes('disabled')).toBeDefined()
  })

  it('surfaces servir failures inline, without closing the dialog', async () => {
    mockIpcInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'stock:lots') return LOTS
      if (channel === 'medicament:list') return [{ id: 1, dci: 'Metformine', prixVente: 1000 }]
      if (channel === 'dispensation:servir') throw new Error('Montant supérieur au total de la vente (14000)')
      return undefined
    })
    const wrapper = createWrapper()
    await openDialog(wrapper, makeEntry())

    await servirButton(wrapper).trigger('click')
    await flushPromises()

    const { useDispensations } = await import('@/composables/useDispensations')
    expect(useDispensations().error.value).toMatch(/Montant supérieur au total/)
    expect(wrapper.text()).toContain('Montant supérieur au total de la vente (14000)')
    expect(mockElMessage.error).not.toHaveBeenCalled()
    expect(wrapper.emitted('saved')).toBeFalsy()
  })

  // ── Encaissement ───────────────────────────────────────────────

  it('facturée : envoie le type de vente et le paiement encaissé', async () => {
    const wrapper = createWrapper()
    await openDialog(wrapper, makeEntry())

    expect(typeVenteSelect(wrapper).element.value).toBe('facturee')
    // Total estimé = prix catalogue (1000) × 14
    expect(wrapper.text()).toContain('14 000 GNF')
    expect(Number(montantInput(wrapper).element.value)).toBe(14000)

    await servirButton(wrapper).trigger('click')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('dispensation:servir', {
      delivranceId: 3,
      lignes: [{ ligneId: 31, quantite: 14 }],
      userId: 7,
      typeVente: 'facturee',
      paiement: { montant: 14000, modePaiement: 'espèces', datePaiement: todayIso() },
    })
  })

  it('facturée : un montant de 0 produit une vente à crédit (aucun paiement envoyé)', async () => {
    const wrapper = createWrapper()
    await openDialog(wrapper, makeEntry())

    await montantInput(wrapper).setValue('0')
    await nextTick()

    await servirButton(wrapper).trigger('click')
    await flushPromises()

    const call = mockIpcInvoke.mock.calls.find((c) => c[0] === 'dispensation:servir')!
    expect(call[1].typeVente).toBe('facturee')
    expect(call[1].paiement).toBeUndefined()
  })

  it('facturée : le montant saisiManuellement est conservé', async () => {
    const wrapper = createWrapper()
    await openDialog(wrapper, makeEntry())

    await montantInput(wrapper).setValue('5000')
    await nextTick()

    await servirButton(wrapper).trigger('click')
    await flushPromises()

    const call = mockIpcInvoke.mock.calls.find((c) => c[0] === 'dispensation:servir')!
    expect(call[1].paiement.montant).toBe(5000)
  })

  it('gratuite : exige un motif et l envoie sans paiement', async () => {
    const wrapper = createWrapper()
    await openDialog(wrapper, makeEntry())

    await typeVenteSelect(wrapper).setValue('gratuite')
    await nextTick()

    // Motif obligatoire : le bouton reste désactivé tant qu'il n'est pas choisi.
    expect(servirButton(wrapper).attributes('disabled')).toBeDefined()

    await motifSelect(wrapper).setValue('depistage_gratuit')
    await nextTick()
    expect(servirButton(wrapper).attributes('disabled')).toBeUndefined()

    await servirButton(wrapper).trigger('click')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('dispensation:servir', {
      delivranceId: 3,
      lignes: [{ ligneId: 31, quantite: 14 }],
      userId: 7,
      typeVente: 'gratuite',
      motifGratuite: 'depistage_gratuit',
    })
  })

  it('gratuite : le motif « Autre » exige une précision envoyée comme motif', async () => {
    const wrapper = createWrapper()
    await openDialog(wrapper, makeEntry())

    await typeVenteSelect(wrapper).setValue('gratuite')
    await nextTick()
    await motifSelect(wrapper).setValue('autre')
    await nextTick()

    expect(servirButton(wrapper).attributes('disabled')).toBeDefined()

    await wrapper.find('.el-input').setValue('Campagne de dépistage rural')
    await nextTick()
    expect(servirButton(wrapper).attributes('disabled')).toBeUndefined()

    await servirButton(wrapper).trigger('click')
    await flushPromises()

    const call = mockIpcInvoke.mock.calls.find((c) => c[0] === 'dispensation:servir')!
    expect(call[1].motifGratuite).toBe('Campagne de dépistage rural')
    expect(call[1].paiement).toBeUndefined()
  })

  it('bloque le service tant que le prix manque, puis envoie le prix saisi', async () => {
    mockIpcInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'stock:lots') return LOTS
      if (channel === 'medicament:list') return [{ id: 1, dci: 'Metformine', prixVente: null }]
      if (channel === 'dispensation:servir') return { delivrance: { id: 3, statut: 'servie' }, lignes: [] }
      return undefined
    })
    const wrapper = createWrapper()
    await openDialog(wrapper, makeEntry())

    expect(wrapper.text()).toContain('Prix unitaire manquant')
    expect(wrapper.text()).toContain('Metformine')
    expect(wrapper.text()).toContain('Total incomplet')
    expect(servirButton(wrapper).attributes('disabled')).toBeDefined()

    const prixInput = wrapper.find('.servir-dialog__prix .el-input-number')
    expect(prixInput.exists()).toBe(true)
    await prixInput.setValue('2500')
    await nextTick()

    // Le champ reste éditable après la saisie (correction possible).
    expect((wrapper.find('.servir-dialog__prix .el-input-number').element as HTMLInputElement).value).toBe('2500')
    expect(wrapper.text()).toContain('Saisi')
    expect(servirButton(wrapper).attributes('disabled')).toBeUndefined()
    await servirButton(wrapper).trigger('click')
    await flushPromises()

    const call = mockIpcInvoke.mock.calls.find((c) => c[0] === 'dispensation:servir')!
    expect(call[1].lignes).toEqual([{ ligneId: 31, quantite: 14, prixUnitaire: 2500 }])
    expect(call[1].paiement.montant).toBe(35000)
    expect(wrapper.emitted('saved')).toBeTruthy()
  })

  it('n’autorise pas la saisie d’un prix pour un rôle hors caisse', async () => {
    mockAuthUser.value = { id: 9, nom: 'Inf', prenom: 'Test', role: 'INFIRMIER' }
    mockIpcInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'stock:lots') return LOTS
      if (channel === 'medicament:list') return [{ id: 1, dci: 'Metformine', prixVente: null }]
      return undefined
    })
    const wrapper = createWrapper()
    await openDialog(wrapper, makeEntry())

    expect(wrapper.find('.servir-dialog__prix .el-input-number').exists()).toBe(false)
    expect(servirButton(wrapper).attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Seuls un pharmacien, un comptable ou un administrateur')
  })

  it('un prix figé prime sur le catalogue et n’est pas renvoyé', async () => {
    const wrapper = createWrapper()
    await openDialog(wrapper, makeEntry([
      {
        id: 31,
        delivranceId: 3,
        medicamentId: 1,
        libelle: 'Metformine',
        quantiteDemandee: 14,
        quantiteServie: 0,
        prixUnitaire: 2000,
      },
    ]))

    expect(wrapper.text()).toContain('Figé')
    expect(wrapper.text()).toContain('28 000 GNF')
    expect(wrapper.find('.servir-dialog__prix .el-input-number').exists()).toBe(false)

    await servirButton(wrapper).trigger('click')
    await flushPromises()

    const call = mockIpcInvoke.mock.calls.find((c) => c[0] === 'dispensation:servir')!
    expect(call[1].lignes).toEqual([{ ligneId: 31, quantite: 14 }])
  })

  it('recalcule le total et le maximum quand la quantité change', async () => {
    const wrapper = createWrapper()
    await openDialog(wrapper, makeEntry())

    expect(wrapper.text()).toContain('14 000 GNF')
    expect(Number(montantInput(wrapper).element.value)).toBe(14000)

    await wrapper.find('.el-input-number').setValue('5')
    await nextTick()

    expect(wrapper.text()).toContain('5 000 GNF')
    expect(wrapper.text()).toContain('Maximum encaissable : 5 000 GNF')
    expect(Number(montantInput(wrapper).element.value)).toBe(5000)
  })

  it('utilise une largeur confortable et des libellés courts (pas de colonne tronquée)', async () => {
    const wrapper = createWrapper()
    await openDialog(wrapper, makeEntry())

    expect(wrapper.find('.el-dialog').attributes('data-width')).toBe('min(880px, 94vw)')
    expect(wrapper.text()).toContain('Lot FIFO')
    expect(wrapper.text()).not.toContain('Lot FIFO suggéré')
    expect(wrapper.text()).toContain('Entier')
    expect(wrapper.text()).not.toContain('Quantité entière (les décimales sont refusées)')
    expect(wrapper.find('.servir-dialog__libelle').exists()).toBe(true)
  })

  it('un service ultérieur conserve le type et le motif de gratuité déjà figés', async () => {
    const entry = makeEntry()
    entry.delivrance = {
      id: 3,
      typeVente: 'gratuite',
      dateVente: '2026-01-10',
      motifGratuite: 'indigent',
    } as any

    const wrapper = createWrapper()
    await openDialog(wrapper, entry)

    expect(typeVenteSelect(wrapper).element.value).toBe('gratuite')
    expect(motifSelect(wrapper).element.value).toBe('indigent')
    expect(wrapper.text()).toContain('Type de vente figé au premier service.')

    await servirButton(wrapper).trigger('click')
    await flushPromises()

    const call = mockIpcInvoke.mock.calls.find((c) => c[0] === 'dispensation:servir')!
    expect(call[1].typeVente).toBe('gratuite')
    expect(call[1].motifGratuite).toBe('indigent')
    expect(call[1].paiement).toBeUndefined()
  })
})
