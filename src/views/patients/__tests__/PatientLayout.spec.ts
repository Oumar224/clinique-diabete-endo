// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PatientLayout from '../PatientLayout.vue'
import type { Patient } from '@/composables/usePatientContext'

// ===========================================================================
// Hoisted mocks — must be defined before any vi.mock()
// ===========================================================================
const mockGetPatient = vi.hoisted(() => vi.fn())
const mockSetActivePatient = vi.hoisted(() => vi.fn())
const mockClearPatient = vi.hoisted(() => vi.fn())
const mockRemovePatient = vi.hoisted(() => vi.fn())
const mockElMessage = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}))

// ===========================================================================
// Module mocks — hoisted by vitest above all imports
// ===========================================================================
vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({ params: { id: '42' }, name: 'patient-dossier' })),
}))

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
}))

vi.mock('@element-plus/icons-vue', () => ({
  FolderOpened: { render: () => {} },
  DataAnalysis: { render: () => {} },
  Tickets: { render: () => {} },
  Search: { render: () => {} },
  List: { render: () => {} },
  Aim: { render: () => {} },
  HomeFilled: { render: () => {} },
  Calendar: { render: () => {} },
  Money: { render: () => {} },
}))

vi.mock('@/composables/usePatientContext', () => ({
  usePatientContext: vi.fn(() => ({
    activePatient: { value: null },
    age: { value: null },
    setActivePatient: mockSetActivePatient,
    clearPatient: mockClearPatient,
  })),
}))

vi.mock('@/composables/useOpenPatients', () => ({
  useOpenPatients: vi.fn(() => ({
    removePatient: mockRemovePatient,
  })),
}))

vi.mock('@/composables/usePatients', () => ({
  usePatients: vi.fn(() => ({
    getPatient: mockGetPatient,
  })),
}))

// ===========================================================================
// Stubs for child components
// ===========================================================================
const stubs = {
  'router-view': { template: '<div class="router-view-stub" />' },
  'el-empty': {
    template: '<div class="el-empty"><p class="el-empty__description">{{ description }}</p></div>',
    props: ['description', 'imageSize'],
  },
  PatientBanner: { template: '<div class="patient-banner-stub" />', props: ['patient', 'age'] },
  PatientContextToolbar: {
    template: '<div class="patient-context-toolbar-stub"><slot /></div>',
    props: ['patientId', 'showPdf'],
  },
  SectionHeader: { template: '<div class="section-header-stub" />', props: ['label', 'icon', 'level'] },
}

// ===========================================================================
// Test fixtures
// ===========================================================================
function makePatient(id: number, overrides: Partial<Patient> = {}): Patient {
  return {
    id,
    civilite: 'M',
    nom: `Patient${id}`,
    prenom: `Prenom${id}`,
    date_naissance: '1990-01-01',
    nir: `123456789${id}`,
    telephone: `+224600000${id}`,
    allergies: [],
    ...overrides,
  }
}

async function waitForTicks() {
  for (let i = 0; i < 3; i++) {
    await nextTick()
  }
}

// ===========================================================================
// Tests
// ===========================================================================
describe('PatientLayout — loadPatient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ────────────────────────────────────────────────────────────────────
  // loadPatient() with existing patient
  // ────────────────────────────────────────────────────────────────────
  describe('loadPatient() with existing patient', () => {
    it('calls getPatient with the given ID (from onMounted)', async () => {
      mockGetPatient.mockResolvedValue(makePatient(42))

      const wrapper = mount(PatientLayout, { global: { stubs } })
      await waitForTicks()

      // onMounted calls loadPatient(42) which calls getPatient(42)
      expect(mockGetPatient).toHaveBeenCalledWith(42)
    })

    it('calls setActivePatient with the patient data from DB', async () => {
      const dbPatient = makePatient(42, { nom: 'Doe', prenom: 'John' })
      mockGetPatient.mockResolvedValue(dbPatient)

      const wrapper = mount(PatientLayout, { global: { stubs } })
      await waitForTicks()

      expect(mockSetActivePatient).toHaveBeenCalledWith(dbPatient)
    })

    it('does NOT set patientNotFound', async () => {
      mockGetPatient.mockResolvedValue(makePatient(42))

      const wrapper = mount(PatientLayout, { global: { stubs } })
      await waitForTicks()

      expect(wrapper.vm.patientNotFound).toBe(false)
    })

    it('does not show a warning message for existing patient', async () => {
      mockGetPatient.mockResolvedValue(makePatient(42))

      const wrapper = mount(PatientLayout, { global: { stubs } })
      await waitForTicks()

      expect(mockElMessage.warning).not.toHaveBeenCalled()
      expect(mockElMessage.error).not.toHaveBeenCalled()
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // loadPatient() with non-existent patient
  // ────────────────────────────────────────────────────────────────────
  describe('loadPatient() with non-existent patient', () => {
    it('calls getPatient which returns null', async () => {
      mockGetPatient.mockResolvedValue(null)

      const wrapper = mount(PatientLayout, { global: { stubs } })
      await waitForTicks()

      expect(mockGetPatient).toHaveBeenCalledWith(42)
    })

    it('shows patientNotFound = true', async () => {
      mockGetPatient.mockResolvedValue(null)

      const wrapper = mount(PatientLayout, { global: { stubs } })
      await waitForTicks()

      expect(wrapper.vm.patientNotFound).toBe(true)
    })

    it('calls clearPatient() to reset stale context', async () => {
      mockGetPatient.mockResolvedValue(null)

      const wrapper = mount(PatientLayout, { global: { stubs } })
      await waitForTicks()

      expect(mockClearPatient).toHaveBeenCalled()
    })

    it('calls removePatient(id) to clean up stale sidebar entry', async () => {
      mockGetPatient.mockResolvedValue(null)

      const wrapper = mount(PatientLayout, { global: { stubs } })
      await waitForTicks()

      expect(mockRemovePatient).toHaveBeenCalledWith(42)
    })

    it('shows a warning message about the deleted patient', async () => {
      mockGetPatient.mockResolvedValue(null)

      const wrapper = mount(PatientLayout, { global: { stubs } })
      await waitForTicks()

      expect(mockElMessage.warning).toHaveBeenCalledWith(
        expect.stringContaining("n'existe plus"),
      )
    })

    it('does NOT call setActivePatient when patient is not found', async () => {
      mockGetPatient.mockResolvedValue(null)

      const wrapper = mount(PatientLayout, { global: { stubs } })
      await waitForTicks()

      expect(mockSetActivePatient).not.toHaveBeenCalled()
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // onMounted with valid route param
  // ────────────────────────────────────────────────────────────────────
  describe('onMounted with valid route param', () => {
    it('calls loadPatient with the route param ID through getPatient', async () => {
      mockGetPatient.mockResolvedValue(makePatient(42))

      const wrapper = mount(PatientLayout, { global: { stubs } })
      await waitForTicks()

      // onMounted calls loadPatient(Number(route.params.id)) = loadPatient(42)
      // which calls getPatient(42)
      expect(mockGetPatient).toHaveBeenCalledWith(42)
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // Error handling in loadPatient
  // ────────────────────────────────────────────────────────────────────
  describe('error handling in loadPatient', () => {
    it('shows ElMessage.error when getPatient throws', async () => {
      mockGetPatient.mockRejectedValue(new Error('DB connection failed'))

      const wrapper = mount(PatientLayout, { global: { stubs } })
      await waitForTicks()

      expect(mockElMessage.error).toHaveBeenCalledWith(
        expect.stringContaining('DB connection failed'),
      )
    })

    it('sets patientNotFound on error', async () => {
      mockGetPatient.mockRejectedValue(new Error('DB error'))

      const wrapper = mount(PatientLayout, { global: { stubs } })
      await waitForTicks()

      expect(wrapper.vm.patientNotFound).toBe(true)
    })

    it('still sets loading to false after error', async () => {
      mockGetPatient.mockRejectedValue(new Error('DB error'))

      const wrapper = mount(PatientLayout, { global: { stubs } })
      await waitForTicks()

      expect(wrapper.vm.loading).toBe(false)
    })
  })
})
