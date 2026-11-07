// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ContactDetailDialog from '../ContactDetailDialog.vue'
import type { EncounterDto, EncounterMovementDto } from '@/composables/useEncounters'

// ─── Mock Electron IPC ─────────────────────────────────────────────────────

const { mockIpcInvoke } = vi.hoisted(() => ({ mockIpcInvoke: vi.fn() }))

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

// ─── Mock Element Plus ─────────────────────────────────────────────────────

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() },
}))

// ─── Mock Element Plus Icons ───────────────────────────────────────────────

vi.mock('@element-plus/icons-vue', () => ({
  FirstAidKit: { name: 'FirstAidKit', template: '<span />' },
  Files: { name: 'Files', template: '<span />' },
  Notebook: { name: 'Notebook', template: '<span />' },
}))

// ─── Mock composables ──────────────────────────────────────────────────────

const { mockGetEncounterMovements } = vi.hoisted(() => ({
  mockGetEncounterMovements: vi.fn(),
}))

vi.mock('@/composables/useEncounters', () => ({
  useEncounters: () => ({
    getEncounterMovements: mockGetEncounterMovements,
  }),
}))

// The dialog derives zone/prise-en-charge labels from PRISE_EN_CHARGE_OPTIONS
vi.mock('@/composables/useContactFormLogic', () => ({
  PRISE_EN_CHARGE_OPTIONS: [
    { value: 'ambulatoire', label: 'Ambulatoire' },
    { value: 'hospitalise', label: 'Hospitalisé' },
  ],
  CASE_TYPE_OPTIONS: [
    { value: 'diabete', label: 'Diabète' },
    { value: 'thyroide_endocrino', label: 'Thyroïde – Endocrinologie' },
    { value: 'autre', label: 'Autre' },
  ],
  STAY_TYPE_OPTIONS: [
    { value: 'jour', label: 'Hôpital de jour' },
    { value: 'complete', label: 'Hospitalisation complète' },
  ],
}))

// ─── Stubs for all Element Plus components ─────────────────────────────────

const stubs: Record<string, any> = {
  'el-dialog': {
    template: `
      <div class="el-dialog" v-if="modelValue">
        <div class="el-dialog__header"><slot name="header" /></div>
        <div class="el-dialog__body"><slot /></div>
        <div class="el-dialog__footer"><slot name="footer" /></div>
      </div>
    `,
    props: ['modelValue', 'title', 'width', 'top', 'destroyOnClose', 'closeOnClickModal'],
    emits: ['update:modelValue', 'closed'],
  },
  'el-tag': {
    template: '<span class="el-tag" :class="`el-tag--${type}`"><slot /></span>',
    props: ['type', 'size', 'effect'],
  },
  'el-descriptions': {
    template: '<div class="el-descriptions"><slot /></div>',
    props: ['column', 'border', 'size'],
  },
  'el-descriptions-item': {
    template: [
      '<div class="el-descriptions-item" :data-label="label">',
      '  <span class="el-descriptions-item__label">{{ label }}</span>',
      '  <span class="el-descriptions-item__content"><slot /></span>',
      '</div>',
    ].join(''),
    props: ['label', 'span'],
  },
  'el-skeleton': {
    template: '<div class="el-skeleton"><slot /></div>',
    props: ['rows', 'animated'],
  },
  'el-icon': {
    template: '<span class="el-icon"><slot /></span>',
    props: ['size', 'color'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'text', 'loading', 'icon'],
    emits: ['click'],
  },
}

// ─── Test fixtures ─────────────────────────────────────────────────────────

function makeEncounter(overrides: Record<string, any> = {}): EncounterDto {
  return {
    id: 42,
    patient_id: 1,
    contact_type: 'hospitalisation',
    start_date: '2026-07-01T08:00:00.000Z',
    end_date: '2026-07-01T09:00:00.000Z',
    service_id: 5,
    service_name: 'Médecine générale',
    medecin_name: 'Dr. Camara',
    responsable_name: 'M. Sow',
    care_unit_name: 'Unité A',
    origin: 'direct',
    zone_situation: 'ambulatoire',
    prise_en_charge: 'classique',
    sinistre_info: null,
    notes: '<p>Patient stable</p>',
    status: 'active',
    created_by: 1,
    created_at: '2026-07-01T08:00:00.000Z',
    ...overrides,
  }
}

function makeMovement(overrides: Record<string, any> = {}): EncounterMovementDto {
  return {
    id: 1,
    encounter_id: 42,
    service_name: 'Urgences',
    step_label: 'Admission',
    entered_at: '2026-07-01T08:00:00.000Z',
    ...overrides,
  }
}

describe('ContactDetailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIpcInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'contact-origins:list-active') return []
      if (channel === 'clinical-documents:count') return 0
      return null
    })
    mockGetEncounterMovements.mockResolvedValue([])
  })

  function createWrapper() {
    return mount(ContactDetailDialog, {
      global: { stubs },
      attachTo: document.body,
    })
  }

  // ─── Rendering ────────────────────────────────────────────────────

  describe('rendering', () => {
    it('is hidden until open() is called', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.el-dialog').exists()).toBe(false)
    })

    it('renders dialog title and encounter summary after open()', async () => {
      const wrapper = createWrapper()
      await (wrapper.vm as any).open(makeEncounter())
      await flushPromises()

      const dialog = wrapper.find('.el-dialog')
      expect(dialog.exists()).toBe(true)
      expect(dialog.text()).toContain('Détail du contact médical')
      expect(dialog.text()).toContain('Médecine générale')
      expect(dialog.text()).toContain('Dr. Camara')
      expect(dialog.text()).toContain('M. Sow')
      expect(dialog.text()).toContain('Unité A')
    })
  })

  // ─── Descriptions ─────────────────────────────────────────────────

  describe('descriptions', () => {
    it('populates the descriptions with encounter fields', async () => {
      const wrapper = createWrapper()
      await (wrapper.vm as any).open(makeEncounter())
      await flushPromises()

      const dialog = wrapper.find('.el-dialog')
      expect(dialog.text()).toContain('Date de début')
      expect(dialog.text()).toContain('Date de fin')
      expect(dialog.text()).toContain('Type de contact')
      expect(dialog.text()).toContain('Statut')
      expect(dialog.text()).toContain('Hospitalisation')
    })

    it('affiche le type de cas, le nouveau cas et le type d\'hospitalisation', async () => {
      const wrapper = createWrapper()
      await (wrapper.vm as any).open(makeEncounter({
        case_type: 'diabete',
        is_new_case: 1,
        stay_type: 'jour',
      }))
      await flushPromises()

      expect(wrapper.text()).toContain('Type de cas')
      expect(wrapper.text()).toContain('Diabète')
      expect(wrapper.text()).toContain('Nouveau cas')
      expect(wrapper.text()).toContain('Premier passage pour ce motif')
      expect(wrapper.text()).toContain("Type d'hospitalisation")
      expect(wrapper.text()).toContain('Hôpital de jour')
    })

    it('renders rich-text notes content (not escaped) when present', async () => {
      const wrapper = createWrapper()
      await (wrapper.vm as any).open(makeEncounter({ notes: '<p>Patient stable</p>' }))
      await flushPromises()

      const notes = wrapper.find('.detail-notes')
      expect(notes.exists()).toBe(true)
      expect(notes.element.innerHTML).toContain('<p>Patient stable</p>')
    })
  })

  // ─── Status / type tags ───────────────────────────────────────────

  describe('status and type tags', () => {
    it('shows "Actif" tag for an active encounter', async () => {
      const wrapper = createWrapper()
      await (wrapper.vm as any).open(makeEncounter({ status: 'active' }))
      await flushPromises()

      expect(wrapper.text()).toContain('Actif')
      expect(wrapper.text()).not.toContain('Fermé')
    })

    it('shows "Fermé" tag for a closed encounter', async () => {
      const wrapper = createWrapper()
      await (wrapper.vm as any).open(makeEncounter({ status: 'closed' }))
      await flushPromises()

      expect(wrapper.text()).toContain('Fermé')
    })

    it('maps contact types to labels', async () => {
      const wrapper = createWrapper()
      await (wrapper.vm as any).open(makeEncounter({ contact_type: 'urgence' }))
      await flushPromises()

      expect(wrapper.text()).toContain('Urgence')
    })
  })

  // ─── Documents count ──────────────────────────────────────────────

  describe('documents count', () => {
    it('fetches the documents count via clinical-documents:count', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'contact-origins:list-active') return []
        if (channel === 'clinical-documents:count') return 3
        return null
      })
      const wrapper = createWrapper()
      await (wrapper.vm as any).open(makeEncounter({ id: 42 }))
      await flushPromises()

      expect(mockIpcInvoke).toHaveBeenCalledWith('clinical-documents:count', { contactId: '42' })
      expect(wrapper.find('.detail-stat-block').text()).toContain('3 documents')
    })

    it('falls back to 0 documents when the count call fails', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'contact-origins:list-active') return []
        if (channel === 'clinical-documents:count') throw new Error('boom')
        return null
      })
      const wrapper = createWrapper()
      await (wrapper.vm as any).open(makeEncounter({ id: 42 }))
      await flushPromises()

      expect(wrapper.find('.detail-stat-block').text()).toContain('0 document')
    })
  })

  // ─── Movements timeline ───────────────────────────────────────────

  describe('movements timeline', () => {
    it('renders one timeline item per movement', async () => {
      mockGetEncounterMovements.mockResolvedValue([
        makeMovement({ id: 1, step_label: 'Admission', service_name: 'Urgences' }),
        makeMovement({ id: 2, step_label: 'Transfert', service_name: 'Médecine générale' }),
      ])
      const wrapper = createWrapper()
      await (wrapper.vm as any).open(makeEncounter({ id: 42 }))
      await flushPromises()

      const items = wrapper.findAll('.detail-movements__timeline-item')
      expect(items).toHaveLength(2)
      expect(items[0].text()).toContain('Admission')
      expect(items[1].text()).toContain('Transfert')
      expect(items[0].text()).toContain('Urgences')
    })

    it('shows an empty message when there are no movements', async () => {
      mockGetEncounterMovements.mockResolvedValue([])
      const wrapper = createWrapper()
      await (wrapper.vm as any).open(makeEncounter({ id: 42 }))
      await flushPromises()

      expect(wrapper.find('.detail-movements__empty').text()).toContain(
        'Aucun mouvement enregistré pour ce contact',
      )
    })

    it('marks the last movement with the is-last class', async () => {
      mockGetEncounterMovements.mockResolvedValue([
        makeMovement({ id: 1, step_label: 'Admission' }),
        makeMovement({ id: 2, step_label: 'Sortie' }),
      ])
      const wrapper = createWrapper()
      await (wrapper.vm as any).open(makeEncounter({ id: 42 }))
      await flushPromises()

      const items = wrapper.findAll('.detail-movements__timeline-item')
      expect(items[1].classes()).toContain('is-last')
    })
  })
})