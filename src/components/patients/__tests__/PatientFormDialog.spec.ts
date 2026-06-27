// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ─── Mock Electron IPC ──────────────────────────────────────────────────────
const mockInvoke = vi.fn()
vi.stubGlobal('window', {
  electronAPI: {
    invoke: mockInvoke,
    getVersion: vi.fn(),
    autoUpdater: {} as any,
  },
})

// ─── Mock Element Plus globals ─────────────────────────────────────────────
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn(), alert: vi.fn() },
}))

// ─── Test data ─────────────────────────────────────────────────────────────
function createLocalites() {
  return [
    { id: 1, code: 'GN-CONAKRY', name: 'Conakry', type: 'region', parent_id: null, country: 'GN', is_active: true },
    { id: 2, code: 'GN-CONAKRY-COM', name: 'Conakry', type: 'prefecture', parent_id: 1, country: 'GN', is_active: true, region: 'Conakry' },
    { id: 3, code: 'GN-CONAKRY-COM-MATAM', name: 'Matam', type: 'commune', parent_id: 2, country: 'GN', is_active: true, region: 'Conakry' },
    { id: 4, code: 'GN-BOKE', name: 'Boké', type: 'region', parent_id: null, country: 'GN', is_active: true },
    { id: 5, code: 'GN-BOKE-BOKE', name: 'Boké', type: 'prefecture', parent_id: 4, country: 'GN', is_active: true, region: 'Boké' },
    { id: 6, code: 'GN-BOKE-BOKE-C', name: 'Boké Centre', type: 'commune', parent_id: 5, country: 'GN', is_active: true, region: 'Boké' },
  ]
}

function mockLocalites() {
  mockInvoke.mockImplementation((channel: string) => {
    if (channel === 'localites:list') {
      return { success: true, data: createLocalites() }
    }
    return { success: true, data: null }
  })
}

// ─── Stubs for all Element Plus components ──────────────────────────────────
const EL_STUBS: Record<string, any> = {
  'el-dialog': {
    template: '<div class="el-dialog" v-if="modelValue"><slot /></div>',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': { template: '<div class="el-form-item"><slot /></div>' },
  'el-select': { template: '<div class="el-select"><slot /></div>' },
  'el-option': { template: '<div class="el-option"><slot /></div>' },
  'el-input': { template: '<input class="el-input" />' },
  'el-button': { template: '<button class="el-button"><slot /></button>' },
  'el-tag': { template: '<span class="el-tag"><slot /></span>' },
  'el-avatar': { template: '<div class="el-avatar"><slot /></div>' },
  'el-date-picker': { template: '<input class="el-date-picker" />' },
  'el-input-number': { template: '<input class="el-input-number" />' },
  'el-row': { template: '<div class="el-row"><slot /></div>' },
  'el-col': { template: '<div class="el-col"><slot /></div>' },
  'el-divider': { template: '<hr class="el-divider" />' },
  'el-icon': { template: '<i class="el-icon"><slot /></i>' },
  'el-alert': { template: '<div class="el-alert"><slot /></div>' },
  PatientAttachmentsSection: { template: '<div class="patient-attachments-section" />' },
}

import PatientFormDialog from '../PatientFormDialog.vue'
import { useLocalites } from '@/composables/useLocalites'

describe('PatientFormDialog', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    mockInvoke.mockResolvedValue({ success: true, data: [] })
    document.body.innerHTML = ''
    // Reset module-level composable state between tests
    const { localites } = useLocalites()
    localites.value = []
  })

  function createWrapper() {
    return mount(PatientFormDialog, {
      global: { stubs: EL_STUBS },
      attachTo: document.body,
    })
  }

  /** Helper: access internal <script setup> state for assertions */
  function setupState(wrapper: any): Record<string, any> {
    return wrapper.vm.$.setupState ?? {}
  }

  // ─── open() ───────────────────────────────────────────────────────────

  it('opens the dialog when open() is called', async () => {
    mockLocalites()
    const wrapper = createWrapper()
    await wrapper.vm.open()
    expect(wrapper.find('.el-dialog').exists()).toBe(true)
  })

  // ─── reconstructResidence ──────────────────────────────────────────────

  it('reconstructs residence region from a commune code on open', async () => {
    mockLocalites()
    const wrapper = createWrapper()

    await wrapper.vm.open({
      id: 1,
      civilite: 'M', nom: 'Diallo', prenom: 'Amadou',
      date_naissance: '1985-06-15', nir: '1850615123456', telephone: '0612345678',
      residence_code: 'GN-CONAKRY-COM-MATAM',
      allergies: [],
    })

    const state = setupState(wrapper)
    // reconstructResidence walks: Matam → Conakry pref → Conakry region
    expect(state.selectedRegion).toBe('GN-CONAKRY')
    expect(state.selectedPrefecture).toBe('GN-CONAKRY-COM')
    expect(state.form.residence_code).toBe('GN-CONAKRY-COM-MATAM')
    expect(state.form.region).toBe('Conakry')
  })

  it('falls back gracefully when residence code does not match any localite', async () => {
    mockLocalites()
    const wrapper = createWrapper()

    await wrapper.vm.open({
      id: 2,
      civilite: 'Mme', nom: 'Barry', prenom: 'Aïssatou',
      date_naissance: '1990-03-20', nir: '2900320123456', telephone: '0622222222',
      residence_code: 'GN-NONEXISTENT',
      allergies: [],
    })

    const state = setupState(wrapper)
    // reconstructResidence can't find leaf, does nothing
    expect(state.selectedRegion).toBe('')
    expect(state.selectedPrefecture).toBe('')
    // form.residence_code was set directly from patient data
    expect(state.form.residence_code).toBe('GN-NONEXISTENT')
  })

  it('sets selectedPrefecture from parent when residence code is a prefecture', async () => {
    mockLocalites()
    const wrapper = createWrapper()

    await wrapper.vm.open({
      id: 3,
      civilite: 'M', nom: 'Sow', prenom: 'Ibrahima',
      date_naissance: '1975-11-08', nir: '1751108123456', telephone: '0633333333',
      residence_code: 'GN-BOKE-BOKE',
      allergies: [],
    })

    const state = setupState(wrapper)
    // Leaf (Boké prefecture, id 5) has parent_id=4 (Boké region)
    // selectedPrefecture = parent.code = 'GN-BOKE'
    // selectedRegion stays '' because parent has no parent_id
    // Since selectedRegion doesn't change, watch doesn't fire
    expect(state.selectedPrefecture).toBe('GN-BOKE')
    expect(state.selectedRegion).toBe('')
    expect(state.form.region).toBe('')
  })

  // ─── resetForm ─────────────────────────────────────────────────────────

  it('resets all form fields to defaults when resetForm is called', async () => {
    mockLocalites()
    const wrapper = createWrapper()
    const state = setupState(wrapper)

    // Populate with non-default values
    state.form.nom = 'Test'
    state.form.prenom = 'User'
    state.form.region = 'Conakry'
    state.form.residence_code = 'GN-CONAKRY-COM-MATAM'
    state.form.civilite = 'Mme'
    state.form.allergies = ['Pénicilline']
    state.selectedRegion = 'GN-CONAKRY'
    state.selectedPrefecture = 'GN-CONAKRY-COM'
    state.form.nip = 'NIP123'
    state.form.date_naissance = '1990-01-01'
    state.form.telephone = '0612345678'

    // Call resetForm
    state.resetForm()

    // Verify fields are cleared
    expect(state.form.nom).toBe('')
    expect(state.form.prenom).toBe('')
    expect(state.form.region).toBe('')
    expect(state.form.residence_code).toBe('')
    expect(state.form.complement_adresse).toBe('')
    expect(state.form.civilite).toBe('') // default
    expect(state.form.allergies).toEqual([])
    expect(state.form.nip).toBe('')
    expect(state.form.date_naissance).toBe('')
    expect(state.form.telephone).toBe('')
    expect(state.form.photo).toBeNull()
    expect(state.selectedRegion).toBe('')
    expect(state.selectedPrefecture).toBe('')
    expect(state.isPostCreate).toBe(false)
    expect(state.editId).toBeNull()
    expect(state.allergyInputVisible).toBe(false)
  })

  // ─── SelectedRegion watch behavior ─────────────────────────────────────

  it('updates form.region to region name when selectedRegion changes', async () => {
    mockLocalites()
    const wrapper = createWrapper()
    const state = setupState(wrapper)

    await wrapper.vm.open({
      id: 4,
      civilite: 'M', nom: 'Camara', prenom: 'Mamadou',
      date_naissance: '1988-07-22', nir: '1880722123456', telephone: '0644444444',
      residence_code: '',
      allergies: [],
    })

    // Simulate user selecting a region from the dropdown
    state.selectedRegion = 'GN-BOKE'
    await new Promise(r => setTimeout(r, 50))

    // Watch handler: form.region = region name
    expect(state.form.region).toBe('Boké')
  })

  it('clears selectedPrefecture and form.residence_code when selectedRegion changes via user interaction', async () => {
    mockLocalites()
    const wrapper = createWrapper()
    const state = setupState(wrapper)

    await wrapper.vm.open({
      id: 5,
      civilite: 'M', nom: 'Diallo', prenom: 'Mariam',
      date_naissance: '1992-01-15', nir: '2920115123456', telephone: '0655555555',
      residence_code: '',
      allergies: [],
    })

    // Set up prefecture and residence (as if user had selected them)
    state.selectedPrefecture = 'GN-CONAKRY-COM'
    state.form.residence_code = 'GN-CONAKRY-COM-MATAM'

    // Simulate user interaction: call onRegionChange directly
    state.onRegionChange()
    await new Promise(r => setTimeout(r, 50))

    // onRegionChange clears prefecture and residence_code
    expect(state.selectedPrefecture).toBe('')
    expect(state.form.residence_code).toBe('')
  })

  it('clears form.region when selectedRegion is cleared', async () => {
    mockLocalites()
    const wrapper = createWrapper()
    const state = setupState(wrapper)

    await wrapper.vm.open({
      id: 6,
      civilite: 'M', nom: 'Touré', prenom: 'Sékou',
      date_naissance: '1980-12-01', nir: '1801201123456', telephone: '0677777777',
      residence_code: '',
      allergies: [],
    })

    // Set a region
    state.selectedRegion = 'GN-CONAKRY'
    await new Promise(r => setTimeout(r, 50))
    expect(state.form.region).toBe('Conakry')

    // Clear selectedRegion (user clears the select)
    state.selectedRegion = ''
    await new Promise(r => setTimeout(r, 50))

    // Watch handler else-branch: form.region = ''
    expect(state.form.region).toBe('')
  })

  // ─── Regions computed ────────────────────────────────────────────────

  it('has empty regions list before localites are fetched', async () => {
    mockLocalites()
    const wrapper = createWrapper()
    const state = setupState(wrapper)

    // Before open() is called, localites haven't been fetched yet
    // regions computed should be empty
    expect(state.regions).toBeDefined()
    expect(state.regions.length).toBe(0)
  })

  it('populates regions list after open() fetches localites', async () => {
    mockLocalites()
    const wrapper = createWrapper()
    await wrapper.vm.open()

    const state = setupState(wrapper)
    // After open() and fetchLocalites(), regions should be populated
    expect(state.regions.length).toBeGreaterThan(0)
    expect(state.regions[0].type).toBe('region')
  })
})
