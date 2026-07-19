// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SideBar from '../SideBar.vue'
import type { Patient } from '@/composables/usePatientContext'

// ===========================================================================
// Hoisted mocks
// ===========================================================================
const mockRouterPush = vi.hoisted(() => vi.fn())
const mockGetPatient = vi.hoisted(() => vi.fn())
const mockSetActivePatient = vi.hoisted(() => vi.fn())
const mockRemovePatient = vi.hoisted(() => vi.fn())
const mockClearPatient = vi.hoisted(() => vi.fn())
const mockElMessage = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}))

// ===========================================================================
// Module mocks — hoisted by vitest above all imports
// ===========================================================================
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({ push: mockRouterPush })),
  useRoute: vi.fn(() => ({ path: '/app', name: '' })),
}))

vi.mock('element-plus', () => ({
  ElMessage: mockElMessage,
}))

vi.mock('@/composables/usePatients', () => ({
  getPatient: mockGetPatient,
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
    openPatients: { value: [] },
    removePatient: mockRemovePatient,
  })),
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { value: { role: 'ADMIN', prenom: 'Test', nom: 'User' } },
    logout: vi.fn(),
  })),
}))

vi.mock('@/composables/useSidebar', () => ({
  useSidebar: vi.fn(() => ({
    isCollapsed: { value: false },
    sidebarWidth: { value: '200px' },
    toggle: vi.fn(),
  })),
}))

vi.mock('@/composables/useLogo', () => ({
  useLogo: vi.fn(() => ({
    logoUrl: { value: '' },
  })),
}))

vi.mock('@/composables/useUsers', () => ({
  getUserDisplayName: vi.fn(() => 'Test User'),
}))

vi.mock('@/utils/civilite', () => ({
  getCiviliteSymbol: vi.fn(() => 'M'),
}))

// ===========================================================================
// Stubs for Element Plus components (may be used conditionally in template)
// ===========================================================================
const stubs = {
  'el-empty': {
    template: '<div class="el-empty"><slot /></div>',
    props: ['description', 'imageSize'],
  },
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
describe('SideBar — onOpenPatientClick', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ────────────────────────────────────────────────────────────────────
  // Valid patient
  // ────────────────────────────────────────────────────────────────────
  describe('with valid patient (exists in DB)', () => {
    it('calls getPatient to verify the patient exists', async () => {
      mockGetPatient.mockResolvedValue(makePatient(42, { nom: 'Doe', prenom: 'John' }))

      const wrapper = mount(SideBar, { global: { stubs } })
      await waitForTicks()

      await wrapper.vm.onOpenPatientClick(makePatient(42))

      expect(mockGetPatient).toHaveBeenCalledWith(42)
    })

    it('calls setActivePatient with DB-fresh data (not stale sidebar data)', async () => {
      const dbPatient = makePatient(42, { nom: 'Doe', prenom: 'John', telephone: '111' })
      mockGetPatient.mockResolvedValue(dbPatient)

      const wrapper = mount(SideBar, { global: { stubs } })
      await waitForTicks()

      // Stale sidebar data with different phone number
      const stalePatient = makePatient(42, { nom: 'Doe', prenom: 'John', telephone: '999' })
      await wrapper.vm.onOpenPatientClick(stalePatient)

      expect(mockSetActivePatient).toHaveBeenCalledWith(dbPatient)
      expect(mockSetActivePatient).not.toHaveBeenCalledWith(stalePatient)
    })

    it('navigates to the correct patient path via router.push', async () => {
      mockGetPatient.mockResolvedValue(makePatient(42))

      const wrapper = mount(SideBar, { global: { stubs } })
      await waitForTicks()

      await wrapper.vm.onOpenPatientClick(makePatient(42))

      expect(mockRouterPush).toHaveBeenCalledWith('/app/patients/42')
    })

    it('does not show error message for a valid patient', async () => {
      mockGetPatient.mockResolvedValue(makePatient(42))

      const wrapper = mount(SideBar, { global: { stubs } })
      await waitForTicks()

      await wrapper.vm.onOpenPatientClick(makePatient(42))

      expect(mockElMessage.error).not.toHaveBeenCalled()
    })

    it('does not call removePatient for a valid patient', async () => {
      mockGetPatient.mockResolvedValue(makePatient(42))

      const wrapper = mount(SideBar, { global: { stubs } })
      await waitForTicks()

      await wrapper.vm.onOpenPatientClick(makePatient(42))

      expect(mockRemovePatient).not.toHaveBeenCalled()
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // Deleted patient
  // ────────────────────────────────────────────────────────────────────
  describe('with deleted patient (not in DB)', () => {
    it('calls getPatient which returns null', async () => {
      mockGetPatient.mockResolvedValue(null)

      const wrapper = mount(SideBar, { global: { stubs } })
      await waitForTicks()

      await wrapper.vm.onOpenPatientClick(makePatient(99, { nom: 'Ghost', prenom: 'Lost' }))

      expect(mockGetPatient).toHaveBeenCalledWith(99)
    })

    it('shows ElMessage.error with patient name', async () => {
      mockGetPatient.mockResolvedValue(null)

      const wrapper = mount(SideBar, { global: { stubs } })
      await waitForTicks()

      await wrapper.vm.onOpenPatientClick(makePatient(99, { nom: 'Ghost', prenom: 'Lost' }))

      expect(mockElMessage.error).toHaveBeenCalledWith(
        expect.stringContaining('Ghost'),
      )
    })

    it('calls removePatient to clean up the stale entry', async () => {
      mockGetPatient.mockResolvedValue(null)

      const wrapper = mount(SideBar, { global: { stubs } })
      await waitForTicks()

      await wrapper.vm.onOpenPatientClick(makePatient(99))

      expect(mockRemovePatient).toHaveBeenCalledWith(99)
    })

    it('does NOT call router.push when patient is not found', async () => {
      mockGetPatient.mockResolvedValue(null)

      const wrapper = mount(SideBar, { global: { stubs } })
      await waitForTicks()

      await wrapper.vm.onOpenPatientClick(makePatient(99))

      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it('does NOT call setActivePatient when patient is not found', async () => {
      mockGetPatient.mockResolvedValue(null)

      const wrapper = mount(SideBar, { global: { stubs } })
      await waitForTicks()

      await wrapper.vm.onOpenPatientClick(makePatient(99))

      expect(mockSetActivePatient).not.toHaveBeenCalled()
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // Error handling
  // ────────────────────────────────────────────────────────────────────
  describe('when getPatient throws an error', () => {
    it('shows ElMessage.error with generic error message', async () => {
      mockGetPatient.mockRejectedValue(new Error('Network error'))

      const wrapper = mount(SideBar, { global: { stubs } })
      await waitForTicks()

      await wrapper.vm.onOpenPatientClick(makePatient(1))

      expect(mockElMessage.error).toHaveBeenCalledWith(
        expect.stringContaining('Erreur'),
      )
      expect(mockRouterPush).not.toHaveBeenCalled()
    })
  })
})
