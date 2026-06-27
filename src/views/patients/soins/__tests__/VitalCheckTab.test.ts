// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import VitalCheckTab from '../VitalCheckTab.vue'

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockSaveVitalSigns } = vi.hoisted(() => ({
  mockSaveVitalSigns: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('@/composables/useVitalSigns', () => ({
  useVitalSigns: vi.fn(() => ({
    vitalSigns: ref(null),
    hasGlycemieToday: computed(() => false),
    saveVitalSigns: mockSaveVitalSigns,
    resetVitalSigns: vi.fn(),
    loading: ref(false),
    error: ref(null),
    fetchVitalSigns: vi.fn(),
  })),
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

import { useVitalSigns } from '@/composables/useVitalSigns'
const mockedUseVitalSigns = vi.mocked(useVitalSigns)

// ---------------------------------------------------------------------------
// Element Plus stubs
// ---------------------------------------------------------------------------
const stubs = {
  'el-card': {
    template: '<div class="el-card"><div class="el-card__header"><slot name="header" /></div><slot /></div>',
  },
  'el-form': {
    template: '<form class="el-form"><slot /></form>',
    props: ['model', 'rules', 'labelPosition', 'size'],
    methods: {
      validate() { return Promise.resolve(true) },
    },
  },
  'el-form-item': {
    template: '<div class="el-form-item"><label class="el-form-item__label">{{ label }}</label><slot /></div>',
    props: ['label', 'prop', 'required'],
  },
  'el-input-number': {
    template: '<input class="el-input-number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
    props: ['modelValue', 'min', 'max', 'step', 'precision'],
  },
  'el-row': { template: '<div class="el-row"><slot /></div>', props: ['gutter'] },
  'el-col': { template: '<div class="el-col"><slot /></div>', props: ['span'] },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size'],
    emits: ['click'],
  },
  'el-divider': { template: '<hr class="el-divider" />' },
  'el-empty': {
    template: '<div class="el-empty"><p class="el-empty__description">{{ description }}</p></div>',
    props: ['description', 'imageSize'],
  },
}

function createMockState(overrides: { vitalSigns?: any } = {}) {
  return {
    vitalSigns: ref(overrides.vitalSigns ?? null),
    hasGlycemieToday: computed(() => false),
    saveVitalSigns: mockSaveVitalSigns,
    resetVitalSigns: vi.fn(),
    loading: ref(false),
    error: ref(null),
    fetchVitalSigns: vi.fn(),
  }
}

// ---------------------------------------------------------------------------
// VitalCheckTab
// ---------------------------------------------------------------------------
describe('VitalCheckTab', () => {
  beforeEach(() => {
    mockSaveVitalSigns.mockReset()
    mockedUseVitalSigns.mockImplementation(() => createMockState())
  })

  // -----------------------------------------------------------------------
  // Form rendering
  // -----------------------------------------------------------------------
  describe('form rendering', () => {
    it('renders all expected input field labels', () => {
      const wrapper = mount(VitalCheckTab, { global: { stubs } })
      const labels = wrapper.findAll('.el-form-item__label').map(l => l.text())
      expect(labels).toContain('TA Systolique (mmHg)')
      expect(labels).toContain('TA Diastolique (mmHg)')
      expect(labels).toContain('Fréquence cardiaque (bpm)')
      expect(labels).toContain('Température (°C)')
      expect(labels).toContain('Glycémie (g/L)')
    })

    it('renders the save button', () => {
      const wrapper = mount(VitalCheckTab, { global: { stubs } })
      const btn = wrapper.find('button.el-button')
      expect(btn.exists()).toBe(true)
      expect(btn.text()).toContain('Enregistrer')
    })
  })

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------
  describe('empty state', () => {
    it('shows el-empty when no vital signs recorded', () => {
      const wrapper = mount(VitalCheckTab, { global: { stubs } })
      const empty = wrapper.find('.el-empty')
      expect(empty.exists()).toBe(true)
      expect(empty.text()).toContain('Aucune constante')
    })

    it('hides empty and shows values when vital signs exist', () => {
      mockedUseVitalSigns.mockImplementation(() => createMockState({
        vitalSigns: {
          date: new Date().toISOString(),
          taSystolique: 120,
          taDiastolique: 80,
          frequenceCardiaque: 72,
          temperature: 37.0,
          glycemie: null,
        },
      }))
      const wrapper = mount(VitalCheckTab, { global: { stubs } })
      expect(wrapper.find('.el-empty').exists()).toBe(false)
      expect(wrapper.find('.vital-check__values').exists()).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Last vital signs display
  // -----------------------------------------------------------------------
  describe('last vital signs display', () => {
    it('shows heading when data exists', () => {
      mockedUseVitalSigns.mockImplementation(() => createMockState({
        vitalSigns: {
          date: new Date().toISOString(),
          taSystolique: 120,
          taDiastolique: 80,
          frequenceCardiaque: 72,
          temperature: 37.0,
          glycemie: 1.2,
        },
      }))
      const wrapper = mount(VitalCheckTab, { global: { stubs } })
      expect(wrapper.text()).toContain('Dernières constantes enregistrées')
    })

    it('displays all vital sign values', () => {
      mockedUseVitalSigns.mockImplementation(() => createMockState({
        vitalSigns: {
          date: new Date().toISOString(),
          taSystolique: 130,
          taDiastolique: 85,
          frequenceCardiaque: 80,
          temperature: 37.5,
          glycemie: 1.5,
        },
      }))
      const wrapper = mount(VitalCheckTab, { global: { stubs } })
      expect(wrapper.text()).toContain('130')
      expect(wrapper.text()).toContain('85')
      expect(wrapper.text()).toContain('80')
      expect(wrapper.text()).toContain('37.5')
      expect(wrapper.text()).toContain('1.5')
    })
  })

  // -----------------------------------------------------------------------
  // Save button
  // -----------------------------------------------------------------------
  describe('save button', () => {
    it('calls saveVitalSigns with correct data', async () => {
      const wrapper = mount(VitalCheckTab, { global: { stubs } })
      const inputs = wrapper.findAll('input.el-input-number')
      await inputs[0].setValue(130)
      await inputs[1].setValue(85)
      await inputs[2].setValue(80)
      await inputs[3].setValue(37.5)

      await wrapper.find('button.el-button').trigger('click')
      await new Promise(r => setTimeout(r, 10))

      expect(mockSaveVitalSigns).toHaveBeenCalled()
      const saved = mockSaveVitalSigns.mock.calls[0][0]
      expect(saved.taSystolique).toBe(130)
      expect(saved.taDiastolique).toBe(85)
      expect(saved.frequenceCardiaque).toBe(80)
      expect(saved.temperature).toBe(37.5)
      expect(saved.date).toBeDefined()
    })

    it('passes glycemia as null when not filled', async () => {
      const wrapper = mount(VitalCheckTab, { global: { stubs } })
      const inputs = wrapper.findAll('input.el-input-number')
      await inputs[0].setValue(120)
      await inputs[1].setValue(80)
      await inputs[2].setValue(72)
      await inputs[3].setValue(37.0)

      await wrapper.find('button.el-button').trigger('click')
      await new Promise(r => setTimeout(r, 10))

      expect(mockSaveVitalSigns).toHaveBeenCalled()
      expect(mockSaveVitalSigns.mock.calls[0][0].glycemie).toBeNull()
    })

    it('passes glycemia value when filled', async () => {
      const wrapper = mount(VitalCheckTab, { global: { stubs } })
      const inputs = wrapper.findAll('input.el-input-number')
      await inputs[0].setValue(120)
      await inputs[1].setValue(80)
      await inputs[2].setValue(72)
      await inputs[3].setValue(37.0)
      await inputs[4].setValue(1.5)

      await wrapper.find('button.el-button').trigger('click')
      await new Promise(r => setTimeout(r, 10))

      expect(mockSaveVitalSigns).toHaveBeenCalled()
      expect(mockSaveVitalSigns.mock.calls[0][0].glycemie).toBe(1.5)
    })
  })

  // -----------------------------------------------------------------------
  // Glycemia high class
  // -----------------------------------------------------------------------
  describe('glycemia --high class', () => {
    it('applies --high class when glycemia > 1.1', () => {
      mockedUseVitalSigns.mockImplementation(() => createMockState({
        vitalSigns: {
          date: new Date().toISOString(),
          taSystolique: 120,
          taDiastolique: 80,
          frequenceCardiaque: 72,
          temperature: 37.0,
          glycemie: 1.5,
        },
      }))
      const wrapper = mount(VitalCheckTab, { global: { stubs } })
      expect(wrapper.find('.vital-check__data--high').exists()).toBe(true)
    })

    it('does not apply --high class when glycemia <= 1.1', () => {
      mockedUseVitalSigns.mockImplementation(() => createMockState({
        vitalSigns: {
          date: new Date().toISOString(),
          taSystolique: 120,
          taDiastolique: 80,
          frequenceCardiaque: 72,
          temperature: 37.0,
          glycemie: 0.9,
        },
      }))
      const wrapper = mount(VitalCheckTab, { global: { stubs } })
      expect(wrapper.find('.vital-check__data--high').exists()).toBe(false)
    })

    it('does not apply --high class when glycemia is exactly 1.1', () => {
      mockedUseVitalSigns.mockImplementation(() => createMockState({
        vitalSigns: {
          date: new Date().toISOString(),
          taSystolique: 120,
          taDiastolique: 80,
          frequenceCardiaque: 72,
          temperature: 37.0,
          glycemie: 1.1,
        },
      }))
      const wrapper = mount(VitalCheckTab, { global: { stubs } })
      expect(wrapper.find('.vital-check__data--high').exists()).toBe(false)
    })

    it('does not apply --high class when glycemia is null', () => {
      mockedUseVitalSigns.mockImplementation(() => createMockState({
        vitalSigns: {
          date: new Date().toISOString(),
          taSystolique: 120,
          taDiastolique: 80,
          frequenceCardiaque: 72,
          temperature: 37.0,
          glycemie: null,
        },
      }))
      const wrapper = mount(VitalCheckTab, { global: { stubs } })
      expect(wrapper.find('.vital-check__data--high').exists()).toBe(false)
    })
  })
})
