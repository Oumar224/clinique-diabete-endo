// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import PayslipPreviewDialog from '../PayslipPreviewDialog.vue'

const { mockFetchPayslip, mockExportPayslipPdf } = vi.hoisted(() => ({
  mockFetchPayslip: vi.fn(),
  mockExportPayslipPdf: vi.fn(),
}))

vi.mock('element-plus', () => ({}))

vi.mock('@/composables/useSalaires', () => ({
  useSalaires: () => ({ fetchPayslip: mockFetchPayslip }),
}))

vi.mock('@/composables/useExport', () => ({
  useExport: () => ({
    exportPayslipPdf: mockExportPayslipPdf,
    exportingPdf: ref(false),
  }),
}))

vi.mock('@/composables/useHospitalInfo', () => ({
  useHospitalInfo: () => ({ info: ref({ name: 'Clinique Test' }), loadInfo: vi.fn() }),
}))

vi.mock('@/composables/useLogo', () => ({
  useLogo: () => ({ logoUrl: ref(null) }),
}))

vi.mock('@/currency/useCurrency', () => ({
  useCurrency: () => ({ formatCurrency: (value: number) => `${value} GNF` }),
}))

vi.mock('@/components/common/HospitalHeader.vue', () => ({
  default: { name: 'HospitalHeader', template: '<div class="hospital-header" />' },
}))

const stubs = {
  'el-dialog': {
    template: '<div class="el-dialog"><slot /><slot name="footer" /></div>',
    props: ['modelValue', 'title', 'fullscreen'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'icon', 'loading', 'disabled'],
    emits: ['click'],
  },
}

const PAYSLIP = {
  employee: {
    userId: 7,
    nom: 'Diallo',
    prenom: 'Aminata',
    role: 'MEDECIN',
    fonction: 'Endocrinologue',
    service: 'Cardiologie',
    telephone: '+224 600 00 00 00',
    typeContrat: 'CDI',
    dateDebutContrat: '2024-01-15',
    tempsTravail: 'PLEIN',
    numeroSecuriteSociale: 'NSS-2026-0042',
  },
  periode: '2026-10',
  base: 5_000_000,
  joursTravailles: 22,
  rubriques: [
    {
      libelle: 'Prime de transport',
      type: 'journalier',
      montant: 0,
      montantJour: 10_000,
      jours: 24,
      impactNet: false,
      montantCalcule: 240_000,
    },
  ],
  totalMensuel: 5_240_000,
  totalInformations: 240_000,
  netAPayer: 5_000_000,
  paiement: null,
}

function mountDialog() {
  return mount(PayslipPreviewDialog, {
    global: { stubs, directives: { loading: {} } },
  })
}

function buttonByText(wrapper: ReturnType<typeof mountDialog>, text: string) {
  return wrapper.findAll('button').find((button) => button.text().trim() === text)
}

describe('PayslipPreviewDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchPayslip.mockResolvedValue(PAYSLIP)
    mockExportPayslipPdf.mockResolvedValue(true)
  })

  it('affiche la fiche et ne télécharge rien à l’ouverture', async () => {
    const wrapper = mountDialog()
    await (wrapper.vm as unknown as { open: (id: number, periode: string) => Promise<void> })
      .open(7, '2026-10')
    await flushPromises()

    expect(mockFetchPayslip).toHaveBeenCalledWith(7, '2026-10')
    expect(wrapper.text()).toContain('Aminata Diallo')
    expect(wrapper.text()).toContain('Endocrinologue')
    expect(wrapper.text()).toContain('Prime de transport')
    expect(wrapper.text()).toContain('(informatif)')
    expect(wrapper.text()).toContain('NET À PAYER')
    expect(wrapper.text()).toContain('non réglé à ce jour')
    // En-tête employé : une seule ligne, alignée sur le PDF.
    expect(wrapper.text()).toContain('Sécurité sociale : NSS-2026-0042')
    expect(wrapper.text()).toContain('Temps travaillé : Temps plein')
    expect(wrapper.text()).not.toContain('Début de contrat')
    expect(wrapper.text()).not.toContain('15 janvier 2024')
    expect(wrapper.text()).not.toContain('Service :')
    expect(wrapper.text()).not.toContain('Cardiologie')
    expect(wrapper.text()).not.toContain('Jours travaillés')
    // La période est rendue en mots et en chiffres par l'en-tête.
    expect(wrapper.find('.hospital-header').attributes('doc-date'))
      .toBe('Période : Octobre 2026 (2026-10)')
    expect(mockExportPayslipPdf).not.toHaveBeenCalled()
  })

  it('télécharge le PDF seulement après action explicite', async () => {
    const wrapper = mountDialog()
    await (wrapper.vm as unknown as { open: (id: number, periode: string) => Promise<void> })
      .open(7, '2026-10')
    await flushPromises()

    await buttonByText(wrapper, 'Télécharger PDF')!.trigger('click')
    await flushPromises()

    expect(mockExportPayslipPdf).toHaveBeenCalledWith({ userId: 7, periode: '2026-10' })
  })
})
