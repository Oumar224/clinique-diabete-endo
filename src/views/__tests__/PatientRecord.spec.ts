// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// ─── Mock usePatientContext ───────────────────────────────────────────────
const mockSetActivePatient = vi.fn()
vi.mock('@/composables/usePatientContext', () => ({
  usePatientContext: () => ({
    activePatient: ref(null), age: ref(null), hasActivePatient: ref(false),
    setActivePatient: mockSetActivePatient, clearPatient: vi.fn(),
  }),
}))

// ─── Mock Electron IPC ──────────────────────────────────────────────────────
const mockInvoke = vi.fn()
vi.stubGlobal('window', {
  electronAPI: {
    invoke: mockInvoke, getVersion: vi.fn(), autoUpdater: {} as any,
  },
})

// ─── Mock vue-router ───────────────────────────────────────────────────────
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '1' } }),
  useRouter: () => ({ push: vi.fn() }),
}))

// ─── Mock Element Plus ─────────────────────────────────────────────────────
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn(() => Promise.resolve()), alert: vi.fn() },
}))

// ─── ElCard mock ──────────────────────────────────────────────────────────
const ElCardMock = {
  name: 'ElCard',
  template: '<div class="el-card"><div v-if="$slots.header" class="el-card__header"><slot name="header" /></div><div class="el-card__body"><slot /></div></div>',
}

// ─── Test data (NOT frozen — Vue reactivity needs mutable objects) ────────
function patientWithAllergies() {
  return {
    id: 1, civilite: 'M', nom: 'Diallo', prenom: 'Amadou',
    date_naissance: '1985-06-15', nir: '1850615123456', telephone: '0612345678',
    email: 'amadou.diallo@example.com', adresse: '123 Rue de la Clinique',
    lieu_naissance: 'Conakry', residence_code: 'GN-CONAKRY-COM-MATAM',
    complement_adresse: 'Porte 5', region: 'Conakry',
    medecin_traitant: 'Dr. Camara',
    allergies: ['Pénicilline', 'Sulfamides'], photo: null, nip: 'M850615001',
  }
}

function patientNoAllergies() {
  return {
    id: 2, civilite: 'Mme', nom: 'Barry', prenom: 'Aïssatou',
    date_naissance: '1990-03-20', nir: '2900320123456', telephone: '0622222222',
    residence_code: '', allergies: [],
  }
}

function patientUnknownCode() {
  return {
    id: 3, civilite: 'M', nom: 'Sow', prenom: 'Ibrahima',
    date_naissance: '1975-11-08', nir: '1751108123456', telephone: '0633333333',
    residence_code: 'UNKNOWN-CODE', allergies: [],
  }
}

function mockPatientResponse(data: any) {
  mockInvoke.mockImplementation(async (channel: string) => {
    if (channel === 'patients:get') return { success: true, data }
    if (channel === 'patients:list') return { success: true, data: [] }
    if (channel === 'localites:list') return { success: true, data: [] }
    return { success: true, data: null }
  })
}

import PatientRecord from '../PatientRecord.vue'

describe('PatientRecord', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    mockInvoke.mockResolvedValue({ success: true, data: null })
    mockSetActivePatient.mockClear()
    document.body.innerHTML = ''
  })

  function createWrapper() {
    return mount(PatientRecord, {
      global: {
        components: { 'el-card': ElCardMock },
        stubs: {
          'el-skeleton': { template: '<div class="el-skeleton"><slot /></div>' },
          'el-empty': { template: '<div class="el-empty"><slot /></div>' },
          'el-avatar': { template: '<div class="el-avatar"><slot /></div>' },
          'el-button': { template: '<button class="el-button"><slot /></button>' },
          'el-tag': { template: '<span class="el-tag"><slot /></span>' },
          'el-divider': { template: '<hr class="el-divider" />' },
          'el-icon': { template: '<i class="el-icon"><slot /></i>' },
          PatientFormDialog: { template: '<div class="patient-form-dialog" />' },
          PatientAttachmentsSection: { template: '<div class="patient-attachments-section" />' },
        },
      },
      attachTo: document.body,
    })
  }

  // ─── Loading state ───────────────────────────────────────────────────

  it('shows loading skeleton while fetching patient', async () => {
    mockInvoke.mockImplementation(() => new Promise(() => {}))
    const wrapper = createWrapper()
    expect(wrapper.find('.el-skeleton').exists()).toBe(true)
  })

  // ─── Patient identity ────────────────────────────────────────────────

  it('displays patient full name after loading', async () => {
    mockPatientResponse(patientWithAllergies())
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('Amadou')
    expect(wrapper.text()).toContain('Diallo')
  })

  it('shows patient NIR and birth date in meta section', async () => {
    mockPatientResponse(patientWithAllergies())
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('1850615123456')
    expect(wrapper.text()).toContain('15/06/1985')
  })

  // ─── Info card ──────────────────────────────────────────────────────

  it('shows info card with Informations personnelles header', async () => {
    mockPatientResponse(patientWithAllergies())
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('Informations personnelles')
  })

  it('shows telephone in patient details', async () => {
    mockPatientResponse(patientWithAllergies())
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('0612345678')
  })

  it('displays complement_adresse when present', async () => {
    mockPatientResponse(patientWithAllergies())
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('Porte 5')
  })

  it('shows email when present', async () => {
    mockPatientResponse(patientWithAllergies())
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('amadou.diallo@example.com')
  })

  it('shows profession as placeholder when not set', async () => {
    mockPatientResponse(patientWithAllergies())
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('Profession')
    expect(wrapper.text()).toContain('—')
  })

  it('shows medecin_traitant', async () => {
    mockPatientResponse(patientWithAllergies())
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('Dr. Camara')
  })

  // ─── Allergies card ─────────────────────────────────────────────────

  it('shows allergies card with header', async () => {
    mockPatientResponse(patientWithAllergies())
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('Allergies')
  })

  it('shows allergy tags when patient has allergies', async () => {
    mockPatientResponse(patientWithAllergies())
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('Pénicilline')
    expect(wrapper.text()).toContain('Sulfamides')
  })

  it('shows "Aucune" when patient has no allergies', async () => {
    mockPatientResponse(patientNoAllergies())
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('Aucune')
  })

  // ─── Residence ────────────────────────────────────────────────────────

  it('shows residence_code value when populated', async () => {
    mockPatientResponse(patientWithAllergies())
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('GN-CONAKRY-COM-MATAM')
  })

  it('shows "—" when residence_code is empty', async () => {
    mockPatientResponse(patientNoAllergies())
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('—')
  })

  it('shows raw code when residence localite is not in localites', async () => {
    mockPatientResponse(patientUnknownCode())
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('UNKNOWN-CODE')
  })

  // ─── Action buttons ──────────────────────────────────────────────────

  it('renders Modifier and Supprimer buttons', async () => {
    mockPatientResponse(patientWithAllergies())
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    const buttons = wrapper.findAll('.el-button')
    const texts = buttons.map(b => b.text())
    expect(texts.some(t => t.includes('Modifier'))).toBe(true)
    expect(texts.some(t => t.includes('Supprimer'))).toBe(true)
  })

  // ─── Empty state ────────────────────────────────────────────────────

  it('shows empty state when patient not found', async () => {
    mockPatientResponse(null)
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.find('.el-empty').exists()).toBe(true)
  })
})
