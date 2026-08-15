// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { AdmissionData } from '@/types/crh-diabete'

// ─── Mock RichTextEditor ──────────────────────────────────────────

vi.mock('@/components/patients/RichTextEditor.vue', () => ({
  default: {
    name: 'RichTextEditor',
    template: '<div class="rich-editor-mock" />',
    props: ['modelValue', 'readonly', 'rows', 'placeholder'],
    emits: ['update:modelValue', 'change'],
  },
}))

// ─── Mock Element Plus ─────────────────────────────────────────────

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn().mockResolvedValue('confirm') },
}))

// ─── Mock ipcInvoke ───────────────────────────────────────────────

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: vi.fn().mockResolvedValue([
    { id: 1, nom: 'Martin', prenom: 'Pierre' },
    { id: 2, nom: 'Dupont', prenom: 'Jean' },
  ]),
}))

// ─── Mock @element-plus/icons-vue ──────────────────────────────────

vi.mock('@element-plus/icons-vue', () => ({
  Plus: { name: 'Plus', render: () => null },
  Minus: { name: 'Minus', render: () => null },
  ArrowDown: { name: 'ArrowDown', render: () => null },
  Edit: { name: 'Edit', render: () => null },
}))

// ─── EL Stubs ──────────────────────────────────────────────────────

const EL_STUBS: Record<string, any> = {
  'el-form': {
    template: '<form class="el-form" @submit.prevent><slot /></form>',
    props: ['labelPosition', 'class'],
  },
  'el-form-item': {
    template: '<div class="el-form-item"><label v-if="label">{{ label }}</label><slot /></div>',
    props: ['label', 'prop'],
  },
  'el-divider': {
    template: '<div class="el-divider"><slot /></div>',
    props: ['contentPosition'],
  },
  'el-row': {
    template: '<div class="el-row"><slot /></div>',
    props: ['gutter'],
  },
  'el-col': {
    template: '<div class="el-col"><slot /></div>',
    props: ['span'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" :disabled="disabled" />',
    props: ['modelValue', 'disabled', 'type', 'rows'],
  },
  'el-date-picker': {
    template: '<input class="el-date-picker" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'type', 'valueFormat', 'disabled', 'style'],
    emits: ['update:modelValue'],
  },
  'el-select': {
    template: '<select class="el-select" :value="modelValue"><slot /></select>',
    props: ['modelValue', 'filterable', 'clearable', 'placeholder', 'style'],
    emits: ['change'],
  },
  'el-option': {
    template: '<option class="el-option" :value="value">{{ label }}</option>',
    props: ['key', 'label', 'value'],
  },
  'el-empty': {
    template: '<div class="el-empty" :description="description" :image-size="imageSize"><slot /></div>',
    props: ['description', 'imageSize'],
  },
  'el-icon': {
    template: '<span class="el-icon"><slot /></span>',
  },
  'el-badge': {
    template: '<span class="el-badge" :value="value"><slot /></span>',
    props: ['value'],
  },
  'el-button': {
    template: '<button type="button" class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'text'],
    emits: ['click'],
  },
}

// ─── Import component ──────────────────────────────────────────────

import AdmissionTab from '../AdmissionTab.vue'

// ─── Test suite ────────────────────────────────────────────────────

describe('AdmissionTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createDefaultData(overrides: Partial<AdmissionData> = {}): AdmissionData {
    return {
      dateEntree: '2025-01-15',
      serviceAccueil: 'Cardiologie',
      motifHospitalisation: '',
      medecinTraitantNom: 'Martin Pierre',
      interneIPANom: 'Dupont Jean',
      ...overrides,
    }
  }

  function createWrapper(options: {
    data?: AdmissionData
    readonly?: boolean
    fieldMeta?: Record<string, string>
  } = {}) {
    const {
      data = createDefaultData(),
      readonly = false,
      fieldMeta,
    } = options

    return mount(AdmissionTab, {
      props: {
        data,
        readonly,
        fieldMeta,
      },
      global: {
        stubs: EL_STUBS,
      },
    })
  }

  function sectionHeaders(wrapper: ReturnType<typeof createWrapper>) {
    return wrapper.findAll('.collapsible-section__header')
  }

  function sectionBodies(wrapper: ReturnType<typeof createWrapper>) {
    return wrapper.findAll('.collapsible-section__body')
  }

  /** Opens a section by clicking its header. */
  async function openSection(wrapper: ReturnType<typeof createWrapper>, index: number) {
    await sectionHeaders(wrapper)[index].trigger('click')
    await nextTick()
  }

  /** Clicks the "Enregistrer" button of the section's staged footer. */
  async function saveSection(wrapper: ReturnType<typeof createWrapper>, index: number) {
    const buttons = wrapper.findAll('.staged-section__footer .el-button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
    await buttons[index * 2].trigger('click')
    await nextTick()
  }

  // ─── 1. Détails du Séjour section ────────────────────────────────

  describe('Détails du Séjour section', () => {
    it('renders the "Détails du Séjour" CollapsibleSection header', () => {
      const wrapper = createWrapper()
      const titles = wrapper.findAll('.collapsible-section__title').map(el => el.text())
      expect(titles).toContain('Détails du Séjour')
    })

    it('is collapsed by default', () => {
      const wrapper = createWrapper()
      expect(sectionBodies(wrapper)[0].attributes('style') ?? '').toContain('display: none')
    })

    it('renders the dateEntree field when opened', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 0)
      expect(wrapper.text()).toContain("Date d'entrée")
    })

    it('renders the serviceAccueil field when opened', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 0)
      expect(wrapper.text()).toContain("Service d'accueil")
    })
  })

  // ─── 2. Identity fields NOT rendered ──────────────────────────────

  describe('does NOT render identity fields', () => {
    it('does not render "Nom" label', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 0)
      await openSection(wrapper, 1)
      await openSection(wrapper, 2)
      const formItems = wrapper.findAll('.el-form-item')
      const nomItem = formItems.find(item => {
        const label = item.find('label')
        return label.exists() && label.text().trim() === 'Nom'
      })
      expect(nomItem).toBeUndefined()
    })

    it('does not render "Prénom" label', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 0)
      await openSection(wrapper, 1)
      await openSection(wrapper, 2)
      const formItems = wrapper.findAll('.el-form-item')
      const prenomItem = formItems.find(item => {
        const label = item.find('label')
        return label.exists() && label.text().trim() === 'Prénom'
      })
      expect(prenomItem).toBeUndefined()
    })

    it('does not render "Sexe" label', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 0)
      await openSection(wrapper, 1)
      await openSection(wrapper, 2)
      const formItems = wrapper.findAll('.el-form-item')
      const sexeItem = formItems.find(item => {
        const label = item.find('label')
        return label.exists() && label.text().trim() === 'Sexe'
      })
      expect(sexeItem).toBeUndefined()
    })

    it('does not render "Date de naissance" label', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 0)
      await openSection(wrapper, 1)
      await openSection(wrapper, 2)
      const formItems = wrapper.findAll('.el-form-item')
      const dateItem = formItems.find(item => {
        const label = item.find('label')
        return label.exists() && label.text().trim() === 'Date de naissance'
      })
      expect(dateItem).toBeUndefined()
    })

    it('does not render "Âge" label', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 0)
      await openSection(wrapper, 1)
      await openSection(wrapper, 2)
      const formItems = wrapper.findAll('.el-form-item')
      const ageItem = formItems.find(item => {
        const label = item.find('label')
        return label.exists() && label.text().trim() === 'Âge'
      })
      expect(ageItem).toBeUndefined()
    })
  })

  // ─── 3. Dividers NOT rendered ─────────────────────────────────────

  describe('dividers NOT rendered', () => {
    it('does not render "Identité & Identitévigilance" section', () => {
      const wrapper = createWrapper()
      const titles = wrapper.findAll('.collapsible-section__title').map(el => el.text())
      expect(titles).not.toContain('Identité')
    })

    it('does not render "Identifiants Majeurs" section', () => {
      const wrapper = createWrapper()
      const titles = wrapper.findAll('.collapsible-section__title').map(el => el.text())
      expect(titles).not.toContain('Identifiants Majeurs')
    })
  })

  // ─── 4. Motif d'hospitalisation section ───────────────────────────

  describe("Motif d'hospitalisation section", () => {
    it('renders the "Motif d\'hospitalisation" CollapsibleSection header', () => {
      const wrapper = createWrapper()
      const titles = wrapper.findAll('.collapsible-section__title').map(el => el.text())
      expect(titles).toContain("Motif d'hospitalisation")
    })

    it('renders RichTextEditor for motif when opened', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 1)
      expect(wrapper.find('.rich-editor-mock').exists()).toBe(true)
    })

    it('passes correct props to RichTextEditor', async () => {
      const wrapper = createWrapper({ readonly: false })
      await openSection(wrapper, 1)
      const editor = wrapper.find('.rich-editor-mock')
      expect(editor.exists()).toBe(true)
    })

    it('passes data.motifHospitalisation as modelValue to RichTextEditor', async () => {
      const motif = '<p>Décompensation diabétique sévère</p>'
      const wrapper = createWrapper({
        data: createDefaultData({ motifHospitalisation: motif }),
      })
      await openSection(wrapper, 1)
      const editor = wrapper.findComponent({ name: 'RichTextEditor' })
      expect(editor.exists()).toBe(true)
      expect(editor.props('modelValue')).toBe(motif)
    })

    it('passes readonly prop to RichTextEditor', async () => {
      const wrapper = createWrapper({ readonly: true })
      await openSection(wrapper, 1)
      const editor = wrapper.findComponent({ name: 'RichTextEditor' })
      expect(editor.props('readonly')).toBe(true)
    })

    it('passes rows prop to RichTextEditor', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 1)
      const editor = wrapper.findComponent({ name: 'RichTextEditor' })
      expect(editor.props('rows')).toBe(6)
    })

    it('passes placeholder prop to RichTextEditor', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 1)
      const editor = wrapper.findComponent({ name: 'RichTextEditor' })
      expect(editor.props('placeholder')).toBe("Saisissez le motif d'hospitalisation...")
    })
  })

  // ─── 5. Médecin référent ─────────────────────────────────────────

  describe('Médecin référent', () => {
    it('renders the "Médecin référent" label', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 2)
      await flushPromises()
      expect(wrapper.text()).toContain('Médecin référent')
    })

    it('renders médecin référent as a selectable dropdown', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 2)
      await flushPromises()
      const selects = wrapper.findAll('.el-select')
      expect(selects.length).toBeGreaterThanOrEqual(1)
    })

    it('loads doctors from IPC on mount', async () => {
      const { ipcInvoke } = await import('@/utils/ipc')
      const wrapper = createWrapper()
      await flushPromises()
      expect(ipcInvoke).toHaveBeenCalledWith('doctors:list-by-site', {})
    })
  })

  // ─── 6. Responsable ──────────────────────────────────────────────

  describe('Responsable', () => {
    it('renders the "Responsable" label', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 2)
      expect(wrapper.text()).toContain('Responsable')
    })

    it('renders as a read-only field (disabled)', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 2)
      const disabledInputs = wrapper.findAll('.el-input[disabled=""]')
      expect(disabledInputs.length).toBeGreaterThanOrEqual(1)
    })

    it('shows interneIPA name correctly', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({ interneIPANom: 'Dupont Jean' }),
      })
      await openSection(wrapper, 2)
      const allInputs = wrapper.findAll('.el-input')
      const interneInput = allInputs.find(el => el.attributes('value') === 'Dupont Jean')
      expect(interneInput).toBeDefined()
    })

    it('shows "—" when interneIPANom is empty', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({ interneIPANom: '' }),
      })
      await openSection(wrapper, 2)
      const allInputs = wrapper.findAll('.el-input')
      const dashInputs = allInputs.filter(el => el.attributes('value') === '—')
      expect(dashInputs.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ─── 7. FormPreview (nouveau pattern) ───────────────────────────

  describe('FormPreview', () => {
    it('renders a FormPreview at the bottom of the form', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.form-preview').exists()).toBe(true)
    })

    it('shows el-empty when no scalar field has a value', () => {
      const wrapper = createWrapper({
        data: {
          dateEntree: '',
          serviceAccueil: '',
          motifHospitalisation: '',
          medecinTraitantNom: '',
          interneIPANom: '',
        },
      })
      expect(wrapper.find('.el-empty').exists()).toBe(true)
      expect(wrapper.findAll('.form-preview__row')).toHaveLength(0)
    })

    it('hides empty fields from the preview (per-section semantics)', () => {
      const wrapper = createWrapper()
      const sections = wrapper.findAll('.collapsible-section')
      expect(sections.length).toBe(3)
      const previews = wrapper.findAll('.form-preview')
      expect(previews.length).toBe(3)

      const sejourPreview = previews[0]
      const sejourRows = sejourPreview.findAll('.form-preview__row')
      const dateRow = sejourRows.find(r => r.text().includes("Date d'entrée"))
      expect(dateRow).toBeDefined()
      expect(dateRow!.text()).toContain('2025-01-15')
      expect(sejourPreview.find('.el-empty').exists()).toBe(false)

      const motifPreview = previews[1]
      expect(motifPreview.find('.el-empty').exists()).toBe(true)
      expect(motifPreview.findAll('.form-preview__row')).toHaveLength(0)

      const motifRows = wrapper.findAll('.form-preview__row')
        .filter(r => r.text().includes("Motif d'hospitalisation"))
      expect(motifRows).toHaveLength(0)
    })

    it('shows a preview row once the user fills a field and saves (date picker)', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 0)
      const picker = wrapper.find('.el-date-picker')
      await picker.setValue('2025-06-01')
      await saveSection(wrapper, 0)
      const rows = wrapper.findAll('.form-preview__row')
      const dateRow = rows.find(r => r.text().includes("Date d'entrée"))
      expect(dateRow).toBeDefined()
      expect(dateRow!.text()).toContain('2025-06-01')
    })

    it('does not update the preview before Enregistrer is clicked', async () => {
      const wrapper = createWrapper()
      await openSection(wrapper, 0)
      const picker = wrapper.find('.el-date-picker')
      await picker.setValue('2025-06-01')
      const rows = wrapper.findAll('.form-preview__row')
      const dateRow = rows.find(r => r.text().includes("Date d'entrée"))
      expect(dateRow).toBeDefined()
      expect(dateRow!.text()).toContain('2025-01-15')
    })

    it('shows the motif value in the preview once motifHospitalisation is filled', async () => {
      const wrapper = createWrapper()
      await wrapper.setProps({
        data: {
          ...createDefaultData(),
          motifHospitalisation: 'Décompensation diabétique sévère',
        },
      })
      const rows = wrapper.findAll('.form-preview__row')
      const motifRow = rows.find(r => r.text().includes("Motif d'hospitalisation"))
      expect(motifRow).toBeDefined()
      expect(motifRow!.text()).toContain('Décompensation diabétique sévère')
    })

    it('strips HTML from the motif preview (regression F1: per-section preview shows plain text)', () => {
      const wrapper = createWrapper({
        data: createDefaultData({
          motifHospitalisation: '<p>Décompensation &lt;glycémie&gt;</p>',
        }),
      })
      const rows = wrapper.findAll('.form-preview__row')
      const motifRow = rows.find(r => r.text().includes("Motif d'hospitalisation"))
      expect(motifRow).toBeDefined()
      expect(motifRow!.text()).not.toContain('<p>')
      expect(motifRow!.text()).toContain('Décompensation')
      expect(motifRow!.text()).toContain('<glycémie>')
    })

    it('typing into the date picker makes the Détails du Séjour preview row appear after save', async () => {
      const wrapper = createWrapper({
        data: createDefaultData({ dateEntree: '' }),
      })
      const sejourPreview = () => wrapper.findAll('.form-preview')[0]

      const before = sejourPreview().findAll('.form-preview__row')
        .filter(r => r.text().includes("Date d'entrée"))
      expect(before).toHaveLength(0)

      await openSection(wrapper, 0)
      await wrapper.find('.el-date-picker').setValue('2025-06-01')
      await saveSection(wrapper, 0)

      const after = sejourPreview().findAll('.form-preview__row')
        .filter(r => r.text().includes("Date d'entrée"))
      expect(after).toHaveLength(1)
      expect(after[0].text()).toContain('2025-06-01')
    })
  })

  // ─── 8. Field meta (dernière modification) ────────────────────────

  describe('field meta (dernière modification)', () => {
    let scrollSpy: ReturnType<typeof vi.fn>

    beforeEach(() => {
      scrollSpy = vi.fn()
      Object.defineProperty(Element.prototype, 'scrollIntoView', {
        value: scrollSpy,
        configurable: true,
        writable: true,
      })
    })

    afterEach(() => {
      delete (Element.prototype as any).scrollIntoView
    })

    it('renders "Modifié le" with a formatted date and a Modifier button for a tracked field', () => {
      const wrapper = createWrapper({
        fieldMeta: { 'admission.dateEntree': '2026-06-15T10:30:00.000Z' },
      })

      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes("Date d'entrée"))
      expect(row).toBeDefined()

      expect(row!.find('.form-preview__updated').text())
        .toMatch(/^Modifié le \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)

      const btn = row!.find('.form-preview__edit')
      expect(btn.exists()).toBe(true)
      expect(btn.attributes('aria-label')).toBe("Modifier Date d'entrée")
    })

    it('re-opens the collapsed section and scrolls to it when Modifier is clicked', async () => {
      const wrapper = createWrapper({
        fieldMeta: { 'admission.dateEntree': '2026-06-15T10:30:00.000Z' },
      })

      const body = sectionBodies(wrapper)[0]

      // Prove the section is collapsed BEFORE the click
      expect(body.attributes('style') ?? '').toContain('display: none')

      // The first preview (Détails du Séjour) holds the Date d'entrée row
      const btn = wrapper.findAll('.form-preview')[0]
        .find('.form-preview__row .form-preview__edit')
      expect(btn.exists()).toBe(true)
      await btn.trigger('click')
      await nextTick()

      // openSection() re-opened the section and scrolled to it
      expect(body.attributes('style') ?? '').not.toContain('display: none')
      expect(scrollSpy).toHaveBeenCalled()
    })

    it('renders "Non modifié" when the field is tracked but has no timestamp', () => {
      const wrapper = createWrapper({ fieldMeta: {} })

      const row = wrapper.findAll('.form-preview__row')
        .find(r => r.text().includes("Date d'entrée"))
      expect(row).toBeDefined()
      expect(row!.find('.form-preview__updated').text()).toBe('Non modifié')
    })
  })
})
