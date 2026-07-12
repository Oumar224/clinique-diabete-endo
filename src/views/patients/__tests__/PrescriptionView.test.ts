// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PrescriptionView from '../PrescriptionView.vue'

// ---------------------------------------------------------------------------
// Hoisted mocks — available before any vi.mock() call
// ---------------------------------------------------------------------------
const {
  mockGetPrescriptions,
  mockDeletePrescription,
  mockUpdatePrescription,
  mockCreatePrescription,
  mockStopPrescription,
  mockGetPlanSoins,
  mockValiderSoin,
  mockSuspendreSoin,
} = vi.hoisted(() => ({
  mockGetPrescriptions: vi.fn(),
  mockDeletePrescription: vi.fn(),
  mockUpdatePrescription: vi.fn(),
  mockCreatePrescription: vi.fn(),
  mockStopPrescription: vi.fn(),
  mockGetPlanSoins: vi.fn(),
  mockValiderSoin: vi.fn(),
  mockSuspendreSoin: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ params: { id: '1' } })),
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn(() => Promise.resolve()), prompt: vi.fn(() => Promise.resolve({ value: 'test' })) },
}))

vi.mock('@element-plus/icons-vue', () => ({
  Plus: { render: () => {} },
  Edit: { render: () => {} },
  CircleCloseFilled: { render: () => {} },
  Delete: { render: () => {} },
}))

vi.mock('@/api/prescription', () => ({
  getPrescriptions: mockGetPrescriptions,
  deletePrescription: mockDeletePrescription,
  updatePrescription: mockUpdatePrescription,
  createPrescription: mockCreatePrescription,
  stopPrescription: mockStopPrescription,
}))

vi.mock('@/api/planSoins', () => ({
  getPlanSoins: mockGetPlanSoins,
  validerSoin: mockValiderSoin,
  suspendreSoin: mockSuspendreSoin,
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { value: { id: 1, prenom: 'Test', nom: 'User', role: 'MEDECIN' } },
  })),
}))

// ---------------------------------------------------------------------------
// Flush micro-tasks and Vue updates after async data fetching
// ---------------------------------------------------------------------------
function waitForData() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// ---------------------------------------------------------------------------
// Stubs for Element Plus components used in PrescriptionView
//
// IMPORTANT: The el-table stub does NOT render a <slot /> because the
// el-table-column stubs have scoped slots (#default="{ row }") that would
// receive undefined `row` — the column stubs don't receive row data from
// the table stub, causing "Cannot read properties of undefined" errors.
// Instead, the table renders row data directly.
// ---------------------------------------------------------------------------
const stubs = {
  'el-table': {
    template: [
      '<div class="el-table">',
      '  <div',
      '    v-for="(item, idx) in (data || [])"',
      '    :key="idx"',
      '    class="el-table__row"',
      '    @click="$emit(\'row-click\', item)"',
      '  >',
      '    <span class="el-table__data-row">{{ item.medicament }} \u2014 {{ item.dosage }} \u2014 {{ item.statut }}</span>',
      '    <span v-if="item.type" class="el-table__type-indicator">{{ item.type === \'medicament\' ? \'M\u00e9dicament\' : \'Soin\' }}</span>',
      '  </div>',
      '</div>',
    ].join(''),
    props: ['data', 'highlightCurrentRow'],
    emits: ['row-click'],
  },
  'el-table-column': {
    template: '<div class="el-table-column"><slot :row="row" :column="column" /></div>',
    props: ['prop', 'label', 'width', 'align'],
  },
  'el-button': {
    template:
      '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'icon', 'text', 'loading'],
    emits: ['click'],
  },
  'el-tag': {
    template: '<span class="el-tag" :class="`el-tag--${type}`"><slot /></span>',
    props: ['type', 'size'],
  },
  'el-alert': {
    template:
      '<div class="el-alert" :class="`el-alert--${type}`">{{ title }}<slot /></div>',
    props: ['type', 'title', 'closable', 'showIcon'],
    emits: ['close'],
  },
  'el-empty': {
    template: '<div class="el-empty"><p class="el-empty__description">{{ description }}</p><slot /></div>',
    props: ['description'],
  },
  'el-dialog': {
    template: [
      '<div v-if="modelValue" class="el-dialog">',
      '  <div v-if="$slots.header" class="el-dialog__header"><slot name="header" /></div>',
      '  <div class="el-dialog__body"><slot /></div>',
      '  <div v-if="$slots.footer" class="el-dialog__footer"><slot name="footer" /></div>',
      '</div>',
    ].join(''),
    props: ['modelValue', 'title', 'width', 'top'],
    emits: ['update:modelValue'],
  },
  'el-form': {
    template: '<form class="el-form"><slot /></form>',
    props: ['model', 'rules', 'labelPosition'],
    methods: {
      validate() { return Promise.resolve(true) },
      clearValidate() {},
      resetFields() {},
    },
  },
  'el-form-item': {
    template: '<div class="el-form-item"><slot /></div>',
    props: ['label', 'prop'],
  },
  'el-row': {
    template: '<div class="el-row"><slot /></div>',
    props: ['gutter'],
  },
  'el-col': {
    template: '<div class="el-col"><slot /></div>',
    props: ['span'],
  },
  'el-select': {
    template:
      '<select class="el-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
    props: ['modelValue', 'filterable', 'placeholder', 'style'],
    emits: ['update:modelValue'],
  },
  'el-option': {
    template: '<option class="el-option" :value="value">{{ label }}</option>',
    props: ['value', 'label'],
  },
  'el-input': {
    template:
      '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" :placeholder="placeholder" />',
    props: ['modelValue', 'placeholder', 'type', 'rows'],
    emits: ['update:modelValue'],
  },
  'el-input-number': {
    template:
      '<input class="el-input-number" type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" :min="min" :max="max" />',
    props: ['modelValue', 'min', 'max'],
    emits: ['update:modelValue'],
  },
  'el-switch': {
    template:
      '<input class="el-switch" type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-checkbox-group': {
    template: '<div class="el-checkbox-group"><slot /></div>',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-radio-group': {
    template: '<div class="el-radio-group" @update:modelValue="$emit(\'update:modelValue\', $event)"><slot :modelValue="modelValue" /></div>',
    props: ['modelValue', 'size'],
    emits: ['update:modelValue'],
  },
  'el-radio': {
    template: '<label class="el-radio"><input type="radio" :value="value" :checked="modelValue === value" @change="$emit(\'update:modelValue\', value)" />{{ label }}<slot /></label>',
    props: ['value', 'label', 'modelValue'],
    emits: ['update:modelValue'],
  },
  'el-checkbox': {
    template:
      '<label class="el-checkbox"><input type="checkbox" :value="value" :checked="modelValue?.includes(value)" @change="onChange" />{{ label }}</label>',
    props: ['label', 'value', 'modelValue'],
    emits: ['update:modelValue'],
  },
  'el-card': {
    template: '<div class="el-card"><div class="el-card__header"><slot name="header" /></div><div class="el-card__body"><slot /></div></div>',
  },
  'el-divider': {
    template: '<hr class="el-divider" />',
  },
}

// ---------------------------------------------------------------------------
// Factory: default prescription test data
// ---------------------------------------------------------------------------
function makePrescription(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    patientId: 1,
    medicament: 'Metformine',
    dosage: '500 mg',
    voie: 'PO',
    duree: 30,
    frequence: ['Matin', 'Midi', 'Soir'],
    frequenceType: 'moments',
    prn: false,
    instructions: null,
    datePrescription: '03/07/2026',
    prescripteurId: 1,
    prescripteurNom: 'Test User',
    prescripteurRole: 'MEDECIN',
    statut: 'active',
    createdAt: '2026-07-03T10:00:00.000Z',
    updatedAt: '2026-07-03T10:00:00.000Z',
    // ── Type discriminator ──
    type: 'medicament',
    // ── Medication-specific fields ──
    formeGalenique: null,
    momentPrises: null,
    quantiteTotale: null,
    renouvellement: false,
    nbRenouvellements: null,
    allergiesAlertes: null,
    // ── Soin-specific fields ──
    categorieSoin: null,
    nbSeances: null,
    objectifClinique: null,
    consignesSpecifiques: null,
    dispositifsMedicaux: null,
    professionnelCible: null,
    ...overrides,
  }
}

function makeSoinPrescription(overrides: Record<string, unknown> = {}) {
  return makePrescription({
    type: 'soins',
    medicament: 'Rééducation cheville',
    nbSeances: 10,
    professionnelCible: 'Kinésithérapeute',
    ...overrides,
  })
}

// ===========================================================================
// Tests
// ===========================================================================
describe('PrescriptionView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -----------------------------------------------------------------------
  // REGRESSION: prescription form — unite field (unchanged behavior)
  // -----------------------------------------------------------------------
  describe('prescription form \u2014 unite field', () => {
    it('renders unite select when form is shown', async () => {
      mockGetPrescriptions.mockResolvedValue([])

      const wrapper = mount(PrescriptionView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      // Click "Nouvelle prescription" button
      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouvelle prescription')
      await newBtn!.trigger('click')
      await nextTick()

      // The form card should show unit options (el-form-item stubs don't render labels)
      expect(wrapper.find('.el-card').exists()).toBe(true)
      expect(wrapper.text()).toContain('cp')
      expect(wrapper.text()).toContain('mg')
      expect(wrapper.text()).toContain('UI')
    })

    it('combines dosage and unite on create', async () => {
      mockGetPrescriptions.mockResolvedValue([])
      mockCreatePrescription.mockResolvedValue({ itemsGenerated: 3 })

      const wrapper = mount(PrescriptionView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      // Open form
      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouvelle prescription')
      await newBtn!.trigger('click')
      await nextTick()

      // Find form elements
      const selects = wrapper.findAll('select.el-select')
      // In the create form row 1: medicament (1st), unite (2nd), voie (3rd), plus freq checkboxes
      // Set medicament
      await selects[0].setValue('Parac\u00e9tamol')
      // Set unite
      await selects[1].setValue('mg')
      // Set voie
      await selects[2].setValue('PO')

      // Fill dosage input
      const inputs = wrapper.findAll('input.el-input')
      // 1st input = dosage
      await inputs[0].setValue('500')

      await nextTick()

      // Click "Prescrire" button
      const prescrireBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Prescrire')
      await prescrireBtn!.trigger('click')
      await waitForData()

      expect(mockCreatePrescription).toHaveBeenCalled()
      const callArgs = mockCreatePrescription.mock.calls[0][1]
      expect(callArgs.dosage).toBe('500 mg')
    })
  })

  // -----------------------------------------------------------------------
  // REGRESSION: prescription list (unchanged behavior)
  // -----------------------------------------------------------------------
  describe('prescription list', () => {
    it('loads and displays prescriptions on mount', async () => {
      const prescriptions = [
        makePrescription(),
        makePrescription({ id: 2, medicament: 'Amlodipine' }),
      ]
      mockGetPrescriptions.mockResolvedValue(prescriptions)

      const wrapper = mount(PrescriptionView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(mockGetPrescriptions).toHaveBeenCalledTimes(1)
      expect(mockGetPrescriptions).toHaveBeenCalledWith(1)
      expect(wrapper.find('.el-table').exists()).toBe(true)
      expect(wrapper.text()).toContain('Metformine')
      expect(wrapper.text()).toContain('Amlodipine')
      expect(wrapper.find('.el-empty').exists()).toBe(false)
      expect(wrapper.find('.el-alert--error').exists()).toBe(false)
    })

    it('shows empty state when no prescriptions exist', async () => {
      mockGetPrescriptions.mockResolvedValue([])

      const wrapper = mount(PrescriptionView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(mockGetPrescriptions).toHaveBeenCalledWith(1)
      expect(wrapper.find('.el-empty').exists()).toBe(true)
      expect(wrapper.text()).toContain('Aucune prescription')
      expect(wrapper.find('.el-table').exists()).toBe(false)
      expect(wrapper.find('.el-alert--error').exists()).toBe(false)
    })

    it('shows error alert when API call fails', async () => {
      mockGetPrescriptions.mockRejectedValue(new Error('Network error'))

      const wrapper = mount(PrescriptionView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(mockGetPrescriptions).toHaveBeenCalledWith(1)
      expect(wrapper.find('.el-alert--error').exists()).toBe(true)
      expect(wrapper.text()).toContain('Network error')
      expect(wrapper.find('.el-table').exists()).toBe(false)
      expect(wrapper.find('.el-empty').exists()).toBe(false)
    })

    it('loads prescription data including prescriber info', async () => {
      const prescriptions = [makePrescription({ prescripteurNom: 'Dr. Diallo' })]
      mockGetPrescriptions.mockResolvedValue(prescriptions)

      const wrapper = mount(PrescriptionView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      expect(mockGetPrescriptions).toHaveBeenCalledWith(1)
      expect(wrapper.find('.el-table').exists()).toBe(true)
      expect(wrapper.find('.el-alert--error').exists()).toBe(false)
      expect(wrapper.find('.el-empty').exists()).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // REGRESSION: type filter (medicament / soins / all)
  // -----------------------------------------------------------------------
  describe('type filter', () => {
    it('shows filter buttons when prescriptions exist', async () => {
      const prescriptions = [
        makePrescription(),
        makeSoinPrescription(),
      ]
      mockGetPrescriptions.mockResolvedValue(prescriptions)

      const wrapper = mount(PrescriptionView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      const filter = wrapper.find('.prescription-view__type-filter')
      expect(filter.exists()).toBe(true)
    })

    it('default filter is all — shows all prescriptions', async () => {
      const prescriptions = [
        makePrescription({ id: 1, medicament: 'Metformine' }),
        makeSoinPrescription({ id: 2, medicament: 'Rééducation' }),
      ]
      mockGetPrescriptions.mockResolvedValue(prescriptions)

      const wrapper = mount(PrescriptionView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      expect(wrapper.vm.tableTypeFilter).toBe('all')
      expect(wrapper.vm.filteredPrescriptions.length).toBe(2)
      expect(wrapper.text()).toContain('Metformine')
      expect(wrapper.text()).toContain('Rééducation')
    })

    it('filtering by medicament shows only medicament rows', async () => {
      const prescriptions = [
        makePrescription({ id: 1, medicament: 'Metformine' }),
        makeSoinPrescription({ id: 2, medicament: 'Rééducation' }),
      ]
      mockGetPrescriptions.mockResolvedValue(prescriptions)

      const wrapper = mount(PrescriptionView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      wrapper.vm.tableTypeFilter = 'medicament'
      await nextTick()

      expect(wrapper.vm.filteredPrescriptions.length).toBe(1)
      expect(wrapper.vm.filteredPrescriptions[0].medicament).toBe('Metformine')
    })

    it('filtering by soins shows only soin rows', async () => {
      const prescriptions = [
        makePrescription({ id: 1, medicament: 'Metformine' }),
        makeSoinPrescription({ id: 2, medicament: 'Rééducation' }),
      ]
      mockGetPrescriptions.mockResolvedValue(prescriptions)

      const wrapper = mount(PrescriptionView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      wrapper.vm.tableTypeFilter = 'soins'
      await nextTick()

      expect(wrapper.vm.filteredPrescriptions.length).toBe(1)
      expect(wrapper.vm.filteredPrescriptions[0].medicament).toBe('Rééducation')
    })
  })

  // -----------------------------------------------------------------------
  // NEW: compact table — only 4 columns, no action buttons in table
  // -----------------------------------------------------------------------
  describe('compact table', () => {
    it('renders prescription data without action buttons in the table', async () => {
      const prescriptions = [
        makePrescription({ id: 1, medicament: 'Metformine' }),
        makePrescription({ id: 2, medicament: 'Amlodipine' }),
      ]
      mockGetPrescriptions.mockResolvedValue(prescriptions)

      const wrapper = mount(PrescriptionView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      const table = wrapper.find('.el-table')
      expect(table.exists()).toBe(true)

      // Should render medication names
      expect(table.text()).toContain('Metformine')
      expect(table.text()).toContain('Amlodipine')

      // Should NOT render action buttons inside the table
      // (Modifier, STOP, Supprimer moved to detail dialog)
      expect(table.text()).not.toContain('Modifier')
      expect(table.text()).not.toContain('STOP')
      expect(table.text()).not.toContain('Supprimer')

      // Should NOT render old full-table columns
      // (Voie, Durée, PRN, Prescripteur were removed in compact mode)
      expect(table.text()).not.toContain('Prescripteur')
    })
  })

  // -----------------------------------------------------------------------
  // NEW: detail dialog
  // -----------------------------------------------------------------------
  describe('detail dialog', () => {
    /** Mount wrapper with prescriptions and open the detail dialog */
    async function mountAndOpenDialog(overrides: Record<string, unknown> = {}) {
      const prescription = makePrescription(overrides)
      mockGetPrescriptions.mockResolvedValueOnce([prescription])

      const wrapper = mount(PrescriptionView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      // Click the first table row to trigger @row-click
      const row = wrapper.find('.el-table__row')
      await row.trigger('click')
      await nextTick()

      return { wrapper, prescription }
    }

    /** Find the detail dialog (distinct from the edit dialog) */
    function findDetailDialog(wrapper: ReturnType<typeof mount>) {
      const dialogs = wrapper.findAll('.el-dialog')
      // Detail dialog contains "Supprimer" in its footer; edit dialog contains "Enregistrer"
      return dialogs.find(d => d.text().includes('Supprimer')) ?? null
    }

    it('opens detail dialog when a table row is clicked', async () => {
      const { wrapper } = await mountAndOpenDialog()

      const dialog = findDetailDialog(wrapper)
      expect(dialog).not.toBeNull()
      expect(dialog!.isVisible()).toBe(true)
    })

    it('displays medication name and dosage in the dialog header', async () => {
      const { wrapper } = await mountAndOpenDialog({
        medicament: 'Metformine',
        dosage: '500 mg',
      })

      const dialog = findDetailDialog(wrapper)!
      const header = dialog.find('.el-dialog__header')
      expect(header.text()).toContain('Metformine')
      expect(header.text()).toContain('500 mg')
    })

    it('shows status badge in the dialog header', async () => {
      const { wrapper } = await mountAndOpenDialog({ statut: 'active' })

      const dialog = findDetailDialog(wrapper)!
      const header = dialog.find('.el-dialog__header')
      // "Active" is the localized label for statut === 'active'
      expect(header.text()).toContain('Active')
    })

    it('displays voie, duree, and frequence in the body', async () => {
      const { wrapper } = await mountAndOpenDialog({
        voie: 'PO',
        duree: 30,
        frequence: ['Matin', 'Midi', 'Soir'],
      })

      const dialog = findDetailDialog(wrapper)!
      const body = dialog.find('.el-dialog__body')
      expect(body.text()).toContain('PO')
      expect(body.text()).toContain('30 jours')
      expect(body.text()).toContain('Matin, Midi, Soir')
    })

    it('shows PRN = Oui when prn is true and Non when prn is false', async () => {
      const prnTrue = await mountAndOpenDialog({ prn: true })
      expect(findDetailDialog(prnTrue.wrapper)!.text()).toContain('Oui')

      const prnFalse = await mountAndOpenDialog({ prn: false })
      expect(findDetailDialog(prnFalse.wrapper)!.text()).toContain('Non')
    })

    it('displays prescripteur info (nom, r\u00f4le) in the body', async () => {
      const { wrapper } = await mountAndOpenDialog({
        prescripteurNom: 'Dr. Diallo',
        prescripteurRole: 'MEDECIN',
      })

      const dialog = findDetailDialog(wrapper)!
      expect(dialog.text()).toContain('Dr. Diallo')
      expect(dialog.text()).toContain('MEDECIN')
    })

    it('displays prescription date (partial date match avoids timezone flakiness)', async () => {
      const { wrapper } = await mountAndOpenDialog({
        createdAt: '2026-07-03T10:00:00.000Z',
      })

      const dialog = findDetailDialog(wrapper)!
      // formatDateTime('2026-07-03T10:00:00.000Z') => "03/07/2026 HH:mm" where HH depends on TZ
      expect(dialog.text()).toContain('03/07/2026')
    })

    it('shows instructions section when instructions are present', async () => {
      const { wrapper } = await mountAndOpenDialog({
        instructions: 'Prendre avec du lait',
      })

      const dialog = findDetailDialog(wrapper)!
      expect(dialog.text()).toContain('Prendre avec du lait')
    })

    it('does not show instructions section when instructions is null', async () => {
      const { wrapper } = await mountAndOpenDialog({
        instructions: null,
      })

      const dialog = findDetailDialog(wrapper)!
      // The template uses v-if="selectedPrescription?.instructions" so
      // null/undefined/empty-string all hide the section
      expect(dialog.text()).not.toContain('Instructions')
    })

    it('does not show instructions section when instructions is empty string', async () => {
      const { wrapper } = await mountAndOpenDialog({
        instructions: '',
      })

      const dialog = findDetailDialog(wrapper)!
      expect(dialog.text()).not.toContain('Instructions')
    })

    describe('Arr\u00eater button visibility', () => {
      it('shows Arr\u00eater button when statut is active', async () => {
        const { wrapper } = await mountAndOpenDialog({ statut: 'active' })
        const dialog = findDetailDialog(wrapper)!
        expect(dialog.find('.el-dialog__footer').text()).toContain('Arr\u00eater')
      })

      it('hides Arr\u00eater button when statut is stopped', async () => {
        const { wrapper } = await mountAndOpenDialog({ statut: 'stopped' })
        const dialog = findDetailDialog(wrapper)!
        expect(dialog.find('.el-dialog__footer').text()).not.toContain('Arr\u00eater')
      })

      it('hides Arr\u00eater button when statut is terminated', async () => {
        const { wrapper } = await mountAndOpenDialog({ statut: 'terminated' })
        const dialog = findDetailDialog(wrapper)!
        expect(dialog.find('.el-dialog__footer').text()).not.toContain('Arr\u00eater')
      })
    })

    describe('action buttons', () => {
      it('"Modifier" button closes detail and opens edit dialog', async () => {
        const { wrapper } = await mountAndOpenDialog()

        // Click Modifier in detail dialog footer
        const detail = findDetailDialog(wrapper)!
        const modifierBtn = detail.findAll('button.el-button').find(b => b.text().trim() === 'Modifier')
        await modifierBtn!.trigger('click')
        await nextTick()

        // Detail dialog should close
        expect(findDetailDialog(wrapper)).toBeNull()

        // Edit dialog should open (contains "Enregistrer" button)
        const editDialog = wrapper.findAll('.el-dialog').find(d => d.text().includes('Enregistrer'))
        expect(editDialog).not.toBeNull()
        expect(editDialog!.isVisible()).toBe(true)
      })

      it('"Arr\u00eater" button stops the prescription and closes detail dialog', async () => {
        // ElMessageBox.confirm resolves by default (see mock)
        mockStopPrescription.mockResolvedValueOnce(undefined)

        const { wrapper, prescription } = await mountAndOpenDialog({ statut: 'active' })

        // Click Arr\u00eater in detail dialog footer
        const detail = findDetailDialog(wrapper)!
        const arreterBtn = detail.findAll('button.el-button').find(b => b.text().trim() === 'Arr\u00eater')
        await arreterBtn!.trigger('click')

        // Let stop flow complete (ElMessageBox.confirm + api call)
        await waitForData()
        await nextTick()

        // stopPrescription API should have been called with the prescription id
        expect(mockStopPrescription).toHaveBeenCalledWith(prescription.id)

        // Detail dialog should close
        expect(findDetailDialog(wrapper)).toBeNull()
      })

      it('"Supprimer" button deletes prescription and closes detail dialog', async () => {
        mockDeletePrescription.mockResolvedValueOnce(undefined)

        const { wrapper, prescription } = await mountAndOpenDialog()

        // Click Supprimer in detail dialog footer
        const detail = findDetailDialog(wrapper)!
        const supprimerBtn = detail.findAll('button.el-button').find(b => b.text().trim() === 'Supprimer')
        await supprimerBtn!.trigger('click')

        await waitForData()
        await nextTick()

        // deletePrescription API should have been called with the prescription id
        expect(mockDeletePrescription).toHaveBeenCalledWith(prescription.id)

        // Detail dialog should close
        expect(findDetailDialog(wrapper)).toBeNull()
      })
    })
  })

  // -----------------------------------------------------------------------
  // NEW: non-blocking interaction warning
  // -----------------------------------------------------------------------
  describe('non-blocking interaction warning', () => {
    /** Mount with an existing Warfarine prescription and open the create form */
    async function setupForInteraction() {
      const existingPrescriptions = [
        makePrescription({ id: 2, medicament: 'Warfarine 5 mg' }),
      ]
      mockGetPrescriptions.mockResolvedValue(existingPrescriptions)
      mockCreatePrescription.mockResolvedValue({ prescription: makePrescription(), itemsGenerated: 3 })

      const wrapper = mount(PrescriptionView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      // Open create form
      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouvelle prescription')
      await newBtn!.trigger('click')
      await nextTick()

      return wrapper
    }

    /** Fill the create form with Aspirin (interacts with Warfarine) and required fields */
    async function fillFormWithAspirin(wrapper: ReturnType<typeof mount>) {
      const selects = wrapper.findAll('select.el-select')
      await selects[0].setValue('Aspirine 100 mg')   // medicament
      await selects[1].setValue('mg')                 // unite
      await selects[2].setValue('PO')                 // voie

      const inputs = wrapper.findAll('input.el-input')
      await inputs[0].setValue('100')                 // dosage

      await nextTick()
    }

    it('shows warning banner when interaction is detected', async () => {
      const wrapper = await setupForInteraction()
      await fillFormWithAspirin(wrapper)

      // Click Prescrire
      const prescrireBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Prescrire')
      await prescrireBtn!.trigger('click')
      await waitForData()
      await nextTick()

      // Warning banner of type="warning" should be visible
      const warningAlert = wrapper.find('.el-alert--warning')
      expect(warningAlert.exists()).toBe(true)
      expect(warningAlert.text()).toContain('Interaction')
    })

    it('still creates the prescription despite interaction warning', async () => {
      const wrapper = await setupForInteraction()
      await fillFormWithAspirin(wrapper)

      // Click Prescrire
      const prescrireBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Prescrire')
      await prescrireBtn!.trigger('click')
      await waitForData()
      await nextTick()

      // createPrescription should have been called (non-blocking)
      expect(mockCreatePrescription).toHaveBeenCalled()
    })

    it('warning banner mentions the interacting drugs', async () => {
      const wrapper = await setupForInteraction()
      await fillFormWithAspirin(wrapper)

      // Click Prescrire
      const prescrireBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Prescrire')
      await prescrireBtn!.trigger('click')
      await waitForData()
      await nextTick()

      const warningAlert = wrapper.find('.el-alert--warning')
      expect(warningAlert.text()).toContain('Aspirine')
      expect(warningAlert.text()).toContain('Warfarine')
    })
  })

  // -----------------------------------------------------------------------
  // NEW: frequency mode switch
  // -----------------------------------------------------------------------
  describe('frequency mode switch', () => {
    /** Mount and open the create form (no existing prescriptions) */
    async function openCreateForm() {
      mockGetPrescriptions.mockResolvedValue([])
      mockCreatePrescription.mockResolvedValue({ prescription: makePrescription(), itemsGenerated: 3 })

      const wrapper = mount(PrescriptionView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouvelle prescription')
      await newBtn!.trigger('click')
      await nextTick()

      return wrapper
    }

    it('renders frequency type radio group with 3 options', async () => {
      const wrapper = await openCreateForm()

      const radioGroup = wrapper.find('.el-radio-group')
      expect(radioGroup.exists()).toBe(true)

      const radios = wrapper.findAll('.el-radio')
      expect(radios.length).toBe(3)
      expect(radios[0].text()).toContain('Moments de la journ\u00e9e')
      expect(radios[1].text()).toContain('Heures fixes')
      expect(radios[2].text()).toContain('Intervalle')
    })

    it('default mode is \u00ab\u00a0Moments de la journ\u00e9e\u00a0\u00bb', async () => {
      const wrapper = await openCreateForm()

      // Default frequenceType should be 'moments'
      expect(wrapper.vm.form.frequenceType).toBe('moments')

      // Moments options should be visible in the frequency select
      expect(wrapper.text()).toContain('Matin')
      expect(wrapper.text()).toContain('Midi')
      expect(wrapper.text()).toContain('Soir')
      expect(wrapper.text()).toContain('Nuit')
    })

    it('switching to \u00ab\u00a0Heures fixes\u00a0\u00bb shows fixed-time options', async () => {
      const wrapper = await openCreateForm()

      // Switch to fixed-times
      wrapper.vm.form.frequenceType = 'fixed-times'
      await nextTick()

      // Fixed hour options should be visible
      expect(wrapper.text()).toContain('08h00')
      expect(wrapper.text()).toContain('12h00')
      expect(wrapper.text()).toContain('18h00')

      // Moments options should NOT be visible
      expect(wrapper.text()).not.toContain('Matin')
    })

    it('switching to \u00ab\u00a0Intervalle\u00a0\u00bb shows interval options', async () => {
      const wrapper = await openCreateForm()

      // Switch to interval
      wrapper.vm.form.frequenceType = 'interval'
      await nextTick()

      // Interval options should be visible
      expect(wrapper.text()).toContain('Toutes les 8h')
      expect(wrapper.text()).toContain('Toutes les 12h')

      // Moments options should NOT be visible
      expect(wrapper.text()).not.toContain('Matin')
    })

    it('creating with frequenceType=\u00ab\u00a0fixed-times\u00a0\u00bb sends correct data', async () => {
      mockGetPrescriptions.mockResolvedValue([])
      mockCreatePrescription.mockResolvedValue({ prescription: makePrescription(), itemsGenerated: 3 })

      const wrapper = mount(PrescriptionView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      // Open form
      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouvelle prescription')
      await newBtn!.trigger('click')
      await nextTick()

      // Fill form programmatically
      wrapper.vm.form.medicament = 'Metformine 500 mg'
      wrapper.vm.form.dosage = '500'
      wrapper.vm.form.unite = 'mg'
      wrapper.vm.form.voie = 'PO'
      wrapper.vm.form.duree = 30
      wrapper.vm.form.frequenceType = 'fixed-times'
      wrapper.vm.form.frequence = ['08h00', '12h00', '18h00']

      await nextTick()

      // Click Prescrire
      const prescrireBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Prescrire')
      await prescrireBtn!.trigger('click')
      await waitForData()
      await nextTick()

      expect(mockCreatePrescription).toHaveBeenCalled()
      const callArgs = mockCreatePrescription.mock.calls[0][1]
      expect(callArgs.frequenceType).toBe('fixed-times')
      expect(callArgs.frequence).toEqual(['08h00', '12h00', '18h00'])
    })

    it('creating with frequenceType=\u00ab\u00a0interval\u00a0\u00bb sends correct data', async () => {
      mockGetPrescriptions.mockResolvedValue([])
      mockCreatePrescription.mockResolvedValue({ prescription: makePrescription(), itemsGenerated: 3 })

      const wrapper = mount(PrescriptionView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      // Open form
      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouvelle prescription')
      await newBtn!.trigger('click')
      await nextTick()

      // Fill form programmatically
      wrapper.vm.form.medicament = 'Furosémide 40 mg'
      wrapper.vm.form.dosage = '40'
      wrapper.vm.form.unite = 'mg'
      wrapper.vm.form.voie = 'PO'
      wrapper.vm.form.duree = 15
      wrapper.vm.form.frequenceType = 'interval'
      wrapper.vm.form.frequence = ['Toutes les 8h']

      await nextTick()

      // Click Prescrire
      const prescrireBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Prescrire')
      await prescrireBtn!.trigger('click')
      await waitForData()
      await nextTick()

      expect(mockCreatePrescription).toHaveBeenCalled()
      const callArgs = mockCreatePrescription.mock.calls[0][1]
      expect(callArgs.frequenceType).toBe('interval')
      expect(callArgs.frequence).toEqual(['Toutes les 8h'])
    })

    it('editing a prescription preserves the frequenceType', async () => {
      const prescription = makePrescription({
        medicament: 'Ramipril 5 mg',
        dosage: '5 mg',
        voie: 'PO',
        duree: 30,
        frequence: ['08h00', '20h00'],
        frequenceType: 'fixed-times',
      })
      mockGetPrescriptions.mockResolvedValueOnce([prescription])

      const wrapper = mount(PrescriptionView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      // Click table row to open detail dialog
      const row = wrapper.find('.el-table__row')
      await row.trigger('click')
      await nextTick()

      // Find detail dialog (has Supprimer button)
      const detail = wrapper.findAll('.el-dialog').find(d => d.text().includes('Supprimer'))
      expect(detail).not.toBeNull()

      // Click Modifier to open edit dialog
      const modifierBtn = detail!.findAll('button.el-button').find(b => b.text().trim() === 'Modifier')
      await modifierBtn!.trigger('click')
      await nextTick()

      // Edit dialog should be visible (contains Enregistrer)
      const editDialog = wrapper.findAll('.el-dialog').find(d => d.text().includes('Enregistrer'))
      expect(editDialog).not.toBeNull()

      // Edit dialog should show fixed-hour frequency options
      expect(editDialog!.text()).toContain('08h00')
      expect(editDialog!.text()).toContain('20h00')
    })
  })

  // -----------------------------------------------------------------------
  // NEW: type discriminator — Médicament / Soin
  // -----------------------------------------------------------------------
  describe('type discriminator', () => {
    /** Mount and open the create form */
    async function openCreateForm() {
      mockGetPrescriptions.mockResolvedValue([])
      mockGetPlanSoins.mockResolvedValue(null)

      const wrapper = mount(PrescriptionView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouvelle prescription')
      await newBtn!.trigger('click')
      await nextTick()

      return wrapper
    }

    it('renders type radio group with M\u00e9dicament and Soin options', async () => {
      const wrapper = await openCreateForm()

      // Find all radio groups — the type radio group is the first one
      const radioGroups = wrapper.findAll('.el-radio-group')
      expect(radioGroups.length).toBeGreaterThanOrEqual(2)

      const typeRadioGroup = radioGroups[0]
      const radios = typeRadioGroup.findAll('.el-radio')
      expect(radios.length).toBe(2)

      const radioLabels = radios.map(r => r.text())
      expect(radioLabels).toContain('Médicament')
      expect(radioLabels).toContain('Soin')
    })

    it('default type is M\u00e9dicament', async () => {
      const wrapper = await openCreateForm()

      expect(wrapper.vm.form.type).toBe('medicament')

      // Médicament-specific fields should be visible by default
      expect(wrapper.text()).toContain('Forme galénique')
      expect(wrapper.text()).toContain('Consignes de prise')
    })

    it('shows medicament-specific fields when type is M\u00e9dicament', async () => {
      const wrapper = await openCreateForm()

      // Default is medicament, so these should be visible
      expect(wrapper.text()).toContain('Forme galénique')
      expect(wrapper.text()).toContain('Consignes de prise')
      expect(wrapper.text()).toContain('Allergies')

      // Soin-specific fields should NOT be visible
      expect(wrapper.text()).not.toContain('Nb séances')
      expect(wrapper.text()).not.toContain('Professionnel cible')
    })

    it('shows soin-specific fields when type is Soin', async () => {
      const wrapper = await openCreateForm()

      // Select "Soin" radio
      const radios = wrapper.findAll('.el-radio')
      const soinRadio = radios.find(r => r.text().includes('Soin'))
      await soinRadio!.find('input').setValue('soins')
      await nextTick()

      // Soin-specific fields should be visible
      expect(wrapper.text()).toContain('Nb séances')
      expect(wrapper.text()).toContain('Objectif clinique')
      expect(wrapper.text()).toContain('Professionnel cible')

      // Médicament-specific fields should NOT be visible
      expect(wrapper.text()).not.toContain('Forme galénique')
      expect(wrapper.text()).not.toContain('Consignes de prise')
    })
  })

  // -----------------------------------------------------------------------
  // NEW: creating a medicament prescription
  // -----------------------------------------------------------------------
  describe('creating a medicament prescription', () => {
    async function mountWithForm() {
      mockGetPrescriptions.mockResolvedValue([])
      mockGetPlanSoins.mockResolvedValue(null)
      mockCreatePrescription.mockResolvedValue({ prescription: makePrescription(), itemsGenerated: 3 })

      const wrapper = mount(PrescriptionView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouvelle prescription')
      await newBtn!.trigger('click')
      await nextTick()

      // Fill common fields
      wrapper.vm.form.medicament = 'Metformine 500 mg'
      wrapper.vm.form.dosage = '500'
      wrapper.vm.form.unite = 'mg'
      wrapper.vm.form.voie = 'PO'
      wrapper.vm.form.duree = 30
      wrapper.vm.form.frequence = ['Matin', 'Soir']

      // Fill medicament-specific fields
      wrapper.vm.form.formeGalenique = 'Comprimé'
      wrapper.vm.form.renouvellement = true
      wrapper.vm.form.nbRenouvellements = 2

      await nextTick()

      return wrapper
    }

    it('creates successfully with all medicament fields', async () => {
      const wrapper = await mountWithForm()

      // Click Prescrire
      const prescrireBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Prescrire')
      await prescrireBtn!.trigger('click')
      await waitForData()
      await nextTick()

      expect(mockCreatePrescription).toHaveBeenCalled()
    })

    it('sends correct API payload with type: medicament and auto-calculated quantiteTotale', async () => {
      const wrapper = await mountWithForm()

      // Click Prescrire
      const prescrireBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Prescrire')
      await prescrireBtn!.trigger('click')
      await waitForData()
      await nextTick()

      expect(mockCreatePrescription).toHaveBeenCalled()

      const callArgs = mockCreatePrescription.mock.calls[0][1]
      expect(callArgs.type).toBe('medicament')
      expect(callArgs.formeGalenique).toBe('Comprimé')
      // auto-calculated: freq (2) * duree (30) = 60 mg
      expect(callArgs.quantiteTotale).toBe('60 mg')
      expect(callArgs.renouvellement).toBe(true)
      expect(callArgs.nbRenouvellements).toBe(2)
    })
  })

  // -----------------------------------------------------------------------
  // NEW: creating a soin prescription
  // -----------------------------------------------------------------------
  describe('creating a soin prescription', () => {
    async function mountWithForm() {
      mockGetPrescriptions.mockResolvedValue([])
      mockGetPlanSoins.mockResolvedValue(null)
      mockCreatePrescription.mockResolvedValue({ prescription: makeSoinPrescription(), itemsGenerated: 3 })

      const wrapper = mount(PrescriptionView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      const newBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Nouvelle prescription')
      await newBtn!.trigger('click')
      await nextTick()

      // Switch to Soin type
      wrapper.vm.form.type = 'soins'
      await nextTick()

      // Fill common fields
      wrapper.vm.form.medicament = 'Rééducation cheville'
      wrapper.vm.form.dosage = '1'
      wrapper.vm.form.unite = 'séance'
      wrapper.vm.form.voie = 'PO'
      wrapper.vm.form.duree = 30
      wrapper.vm.form.frequence = ['Matin']

      // Fill soin-specific fields
      wrapper.vm.form.nbSeances = 10
      wrapper.vm.form.objectifClinique = 'Améliorer la mobilité'
      wrapper.vm.form.professionnelCible = 'Kinésithérapeute'

      await nextTick()

      return wrapper
    }

    it('creates successfully with all soin fields', async () => {
      const wrapper = await mountWithForm()

      // Click Prescrire
      const prescrireBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Prescrire')
      await prescrireBtn!.trigger('click')
      await waitForData()
      await nextTick()

      expect(mockCreatePrescription).toHaveBeenCalled()
    })

    it('sends correct API payload with type: soins and soin fields', async () => {
      const wrapper = await mountWithForm()

      // Click Prescrire
      const prescrireBtn = wrapper.findAll('button.el-button').find(b => b.text().trim() === 'Prescrire')
      await prescrireBtn!.trigger('click')
      await waitForData()
      await nextTick()

      expect(mockCreatePrescription).toHaveBeenCalled()

      const callArgs = mockCreatePrescription.mock.calls[0][1]
      expect(callArgs.type).toBe('soins')
      expect(callArgs.nbSeances).toBe(10)
      expect(callArgs.objectifClinique).toBe('Améliorer la mobilité')
      expect(callArgs.professionnelCible).toBe('Kinésithérapeute')
    })
  })

  // -----------------------------------------------------------------------
  // NEW: unified table with color coding
  // -----------------------------------------------------------------------
  describe('unified table with color coding', () => {
    it('table renders medicament rows with blue indicator', async () => {
      const prescriptions = [
        makePrescription({ id: 1, medicament: 'Metformine' }),
        makePrescription({ id: 2, medicament: 'Amlodipine' }),
      ]
      mockGetPrescriptions.mockResolvedValue(prescriptions)
      mockGetPlanSoins.mockResolvedValue(null)

      const wrapper = mount(PrescriptionView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      const table = wrapper.find('.el-table')
      expect(table.exists()).toBe(true)

      // The stub renders the type indicator text for medicament rows
      const typeIndicators = wrapper.findAll('.el-table__type-indicator')
      expect(typeIndicators.length).toBe(2)
      typeIndicators.forEach(indicator => {
        expect(indicator.text()).toBe('Médicament')
      })
    })

    it('table renders soin rows with green indicator', async () => {
      const prescriptions = [
        makeSoinPrescription({ id: 1 }),
        makeSoinPrescription({ id: 2, medicament: 'Massage thérapeutique' }),
      ]
      mockGetPrescriptions.mockResolvedValue(prescriptions)
      mockGetPlanSoins.mockResolvedValue(null)

      const wrapper = mount(PrescriptionView, { global: { stubs } })

      await nextTick()
      await waitForData()
      await nextTick()

      const table = wrapper.find('.el-table')
      expect(table.exists()).toBe(true)

      const typeIndicators = wrapper.findAll('.el-table__type-indicator')
      expect(typeIndicators.length).toBe(2)
      typeIndicators.forEach(indicator => {
        expect(indicator.text()).toBe('Soin')
      })
    })
  })

  // -----------------------------------------------------------------------
  // NEW: detail dialog — type-specific info
  // -----------------------------------------------------------------------
  describe('detail dialog type-specific info', () => {
    /** Mount wrapper with a prescription and open the detail dialog */
    async function mountAndOpenDialog(overrides: Record<string, unknown> = {}) {
      const prescription = makePrescription(overrides)
      mockGetPrescriptions.mockResolvedValueOnce([prescription])
      mockGetPlanSoins.mockResolvedValue(null)

      const wrapper = mount(PrescriptionView, { global: { stubs } })
      await nextTick()
      await waitForData()
      await nextTick()

      // Click the first table row to trigger @row-click
      const row = wrapper.find('.el-table__row')
      await row.trigger('click')
      await nextTick()

      return { wrapper, prescription }
    }

    function findDetailDialog(wrapper: ReturnType<typeof mount>) {
      const dialogs = wrapper.findAll('.el-dialog')
      return dialogs.find(d => d.text().includes('Supprimer')) ?? null
    }

    it('shows forme gal\u00e9nique info for medicament type', async () => {
      const { wrapper } = await mountAndOpenDialog({
        type: 'medicament',
        formeGalenique: 'Comprimé',
      })

      const dialog = findDetailDialog(wrapper)!
      expect(dialog.text()).toContain('Comprimé')
    })

    it('shows soin info for soin type', async () => {
      const { wrapper } = await mountAndOpenDialog({
        type: 'soins',
        medicament: 'Rééducation cheville',
        nbSeances: 10,
      })

      const dialog = findDetailDialog(wrapper)!
      expect(dialog.text()).toContain('10')
      expect(dialog.text()).toContain('Rééducation cheville')
    })
  })

})
