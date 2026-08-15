// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import type { CrhDiabeteFormData, PrescriptionSortie, RdvSuivi } from '@/types/crh-diabete'
import { createDefaultFormData } from '@/types/crh-diabete'

// ─── Mock composables ──────────────────────────────────────────────

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    user: ref({ id: 1, nom: 'Dupont', prenom: 'Jean', role: 'MEDECIN' }),
  }),
}))

const mockActivePatient = ref(null)

vi.mock('@/composables/usePatientContext', () => ({
  usePatientContext: () => ({
    activePatient: mockActivePatient,
  }),
}))

vi.mock('@/composables/useEncounters', () => ({
  useEncounters: () => ({
    getEncounter: vi.fn().mockResolvedValue(null),
  }),
}))

vi.mock('@/composables/useExport', () => ({
  useExport: () => ({
    exportCrhDiabetePdf: vi.fn().mockResolvedValue(undefined),
  }),
}))

const mockFetchMedicalStaff = vi.fn().mockResolvedValue([
  { id: 10, nom: 'Martin', prenom: 'Pierre', role: 'MEDECIN', is_active: true },
])

vi.mock('@/composables/useMedicalStaff', () => ({
  useMedicalStaff: () => ({
    fetchMedicalStaff: mockFetchMedicalStaff,
  }),
  formatMedecinName: (user: any) => {
    const prefix = user.specialties?.[0]?.title_prefix
    const nom = (user.nom || '').toUpperCase()
    const prenom = user.prenom || ''
    return prefix ? `${prefix} ${nom} ${prenom}` : `${nom} ${prenom}`
  },
}))

vi.mock('@/composables/useCrhDiabeteCalculations', () => ({
  useCrhDiabeteCalculations: () => ({
    calcAge: vi.fn().mockReturnValue(45),
    calcGlasgowScore: vi.fn().mockReturnValue(15),
  }),
}))

vi.mock('@/composables/usePatients', () => ({
  usePatients: () => ({
    updatePatient: vi.fn().mockResolvedValue(undefined),
  }),
}))

const mockIpcInvoke = vi.hoisted(() => vi.fn())

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

// ─── Mock Element Plus ─────────────────────────────────────────────

const { mockConfirm } = vi.hoisted(() => ({
  mockConfirm: vi.fn(),
}))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: mockConfirm },
}))

// ─── Mock @element-plus/icons-vue ──────────────────────────────────

vi.mock('@element-plus/icons-vue', () => ({
  Plus: { name: 'Plus', render: () => null },
  Edit: { name: 'Edit', render: () => null },
  Delete: { name: 'Delete', render: () => null },
  Download: { name: 'Download', render: () => null },
  Printer: { name: 'Printer', render: () => null },
  Close: { name: 'Close', render: () => null },
  ZoomIn: { name: 'ZoomIn', render: () => null },
  ZoomOut: { name: 'ZoomOut', render: () => null },
}))

// ─── Child component stubs ─────────────────────────────────────────

const ChildTabStub = {
  template: '<div class="child-tab-stub" />',
  props: ['data', 'readonly'],
  emits: ['change'],
}

const EL_STUBS: Record<string, any> = {
  'el-tabs': {
    template: '<div class="el-tabs"><slot /></div>',
    props: ['modelValue', 'type'],
    emits: ['update:modelValue'],
  },
  'el-tab-pane': {
    template: '<div class="el-tab-pane"><slot /><slot name="label" /></div>',
    props: ['name', 'label'],
  },
  'el-tag': {
    template: '<span class="el-tag" :type="type" :effect="effect"><slot /></span>',
    props: ['type', 'size', 'effect'],
  },
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" :type="type" :loading="loading" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'text', 'loading'],
    emits: ['click'],
  },
  'el-alert': {
    template: '<div class="el-alert" :title="title" :type="type"><slot /></div>',
    props: ['title', 'type', 'showIcon', 'closable'],
  },
  AdmissionTab: ChildTabStub,
  ModeVieAtcdTab: ChildTabStub,
  FicheDiabeteTab: ChildTabStub,
  BilanInitialTab: ChildTabStub,
  ExamensComplementairesTab: ChildTabStub,
  EvolutionMedicaleTab: ChildTabStub,
  OrdonnanceSortieTab: ChildTabStub,
  SortieTab: ChildTabStub,
  ParameterHistoryDialog: {
    // Renders the dialog payload when open so the form tests can assert the
    // title and the entries fetched via IPC (the real dialog is stubbed).
    template: `
      <div v-if="modelValue" class="parameter-history-dialog-stub">
        <h4 class="phd-title">{{ title }}</h4>
        <ul class="phd-entries">
          <li v-for="entry in entries" :key="entry.documentId" class="phd-entry">
            {{ entry.documentLabel }} — {{ entry.value }}
          </li>
        </ul>
      </div>
    `,
    props: ['modelValue', 'title', 'path', 'loading', 'entries'],
    emits: ['update:modelValue'],
  },
}

// ─── Import component ──────────────────────────────────────────────

import CrhDiabeteForm from '../CrhDiabeteForm.vue'

// ─── Test suite ────────────────────────────────────────────────────

describe('CrhDiabeteForm – mergeFormData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockResolvedValue(true)
    mockActivePatient.value = null
  })

  function createWrapper(modelValue: Record<string, any> = {}) {
    return mount(CrhDiabeteForm, {
      props: {
        modelValue,
        readonly: false,
        contactId: '1',
        contactDisplay: 'Test Patient',
      },
      global: {
        stubs: EL_STUBS,
      },
    })
  }

  // ─── ordonnanceSortie preserved as array ───────────────────────

  describe('ordonnanceSortie preserved as array', () => {
    it('mergeFormData préserve ordonnanceSortie comme tableau', async () => {
      const rx: PrescriptionSortie = {
        _key: 'test-key',
        medicament: 'Amoxicilline',
        dosage: '500',
        unite: 'mg',
        voie: 'VO',
        duree: 7,
        formeGalenique: 'Comprimé',
        momentPrises: ['Matin'],
        renouvellement: false,
        nbRenouvellements: 1,
        frequenceType: 'moments',
        frequence: ['Matin'],
        instructions: '',
      }

      const wrapper = createWrapper({
        ordonnanceSortie: [rx],
      })
      await flushPromises()

      // Access the internal formData through the component instance
      const vm = wrapper.vm as any
      const ordonnance = vm.formData.ordonnanceSortie

      expect(Array.isArray(ordonnance)).toBe(true)
      expect(ordonnance).toHaveLength(1)
      expect(ordonnance[0].medicament).toBe('Amoxicilline')
    })

    it('ordonnanceSortie supporte push() sans erreur', async () => {
      const rx: PrescriptionSortie = {
        _key: 'test-key',
        medicament: 'Metformine',
        dosage: '500',
        unite: 'mg',
        voie: 'VO',
        duree: 14,
        formeGalenique: '',
        momentPrises: [],
        renouvellement: false,
        nbRenouvellements: 1,
        frequenceType: 'moments',
        frequence: [],
        instructions: '',
      }

      const wrapper = createWrapper({
        ordonnanceSortie: [rx],
      })
      await flushPromises()

      const vm = wrapper.vm as any
      const ordonnance = vm.formData.ordonnanceSortie

      // This would fail if ordonnanceSortie was spread as an object
      expect(() => {
        ordonnance.push({
          _key: 'new-key',
          medicament: 'Nouveau',
          dosage: '100',
          unite: 'mg',
          voie: 'IV',
          duree: 3,
          formeGalenique: '',
          momentPrises: [],
          renouvellement: false,
          nbRenouvellements: 1,
          frequenceType: 'moments',
          frequence: [],
          instructions: '',
        })
      }).not.toThrow()

      expect(ordonnance).toHaveLength(2)
    })

    it('ordonnanceSortie est un tableau même quand modelValue est vide', async () => {
      const wrapper = createWrapper({})
      await flushPromises()

      const vm = wrapper.vm as any
      const ordonnance = vm.formData.ordonnanceSortie

      expect(Array.isArray(ordonnance)).toBe(true)
      expect(ordonnance).toHaveLength(0)
    })
  })

  // ─── sortie.rdvSuivi preserved as array ────────────────────────

  describe('sortie.rdvSuivi preserved as array', () => {
    it('mergeFormData préserve rdvSuivi dans sortie comme tableau', async () => {
      const rdv: RdvSuivi = {
        _key: 'rdv-1',
        date: '2025-01-15',
        heure: '10:00',
        intitule: 'Consultation de suivi',
        lieuPraticien: 'Cabinet Dr. Martin',
      }

      const wrapper = createWrapper({
        sortie: {
          dateSortie: '2025-01-10',
          destinationSortie: 'Domicile',
          conclusionSortie: 'Bon état',
          rdvSuivi: [rdv],
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      const sortie = vm.formData.sortie

      expect(Array.isArray(sortie.rdvSuivi)).toBe(true)
      expect(sortie.rdvSuivi).toHaveLength(1)
      expect(sortie.rdvSuivi[0].intitule).toBe('Consultation de suivi')
    })

    it('rdvSuivi supporte push() sans erreur', async () => {
      const rdv: RdvSuivi = {
        _key: 'rdv-1',
        date: '2025-01-15',
        heure: '10:00',
        intitule: 'Consultation',
        lieuPraticien: 'Cabinet',
      }

      const wrapper = createWrapper({
        sortie: {
          rdvSuivi: [rdv],
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      const rdvSuivi = vm.formData.sortie.rdvSuivi

      expect(() => {
        rdvSuivi.push({
          _key: 'rdv-2',
          date: '2025-02-01',
          heure: '14:00',
          intitule: 'Contrôle',
          lieuPraticien: 'Hôpital',
        })
      }).not.toThrow()

      expect(rdvSuivi).toHaveLength(2)
    })
  })

  // ─── mergeFormData with empty data ─────────────────────────────

  describe('mergeFormData with empty data', () => {
    it('les defaults sont corrects quand modelValue est vide', async () => {
      const wrapper = createWrapper({})
      await flushPromises()

      const vm = wrapper.vm as any
      const defaults = createDefaultFormData()

      // ordonnanceSortie should be an empty array
      expect(vm.formData.ordonnanceSortie).toEqual([])
      expect(Array.isArray(vm.formData.ordonnanceSortie)).toBe(true)

      // sortie.rdvSuivi should be an empty array
      expect(vm.formData.sortie.rdvSuivi).toEqual([])
      expect(Array.isArray(vm.formData.sortie.rdvSuivi)).toBe(true)

      // admission defaults
      expect(vm.formData.admission.motifHospitalisation).toBe('')

      // modeVieAtcd defaults
      expect(vm.formData.modeVieAtcd.tabagisme).toBe('Non-fumeur')
    })

    it('les defaults sont corrects quand modelValue est null/undefined', async () => {
      const wrapper = mount(CrhDiabeteForm, {
        props: {
          modelValue: null as any,
          readonly: false,
          contactId: '1',
          contactDisplay: 'Test Patient',
        },
        global: {
          stubs: EL_STUBS,
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any

      // Should use defaults (createDefaultFormData was called)
      expect(Array.isArray(vm.formData.ordonnanceSortie)).toBe(true)
      expect(vm.formData.ordonnanceSortie).toHaveLength(0)
    })
  })

  // ─── mergeFormData merges objects correctly ────────────────────

  describe('mergeFormData merges objects correctly', () => {
    it('fusionne modeVieAtcd avec les defaults', async () => {
      const wrapper = createWrapper({
        modeVieAtcd: {
          allergies: [{ libelle: 'Pénicilline', type: 'Médicamenteuse' }],
          tabagisme: 'Fumeur',
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any

      // Les valeurs fournies sont préservées
      expect(vm.formData.modeVieAtcd.allergies).toEqual([
        { libelle: 'Pénicilline', type: 'Médicamenteuse' },
      ])
      expect(vm.formData.modeVieAtcd.tabagisme).toBe('Fumeur')

      // Les valeurs par défaut sont préservées pour les champs non fournis
      expect(vm.formData.modeVieAtcd.isolement).toBe(false)
      expect(vm.formData.modeVieAtcd.hebergement).toBe('')
    })

    it('fusionne bilanInitial avec les defaults', async () => {
      const wrapper = createWrapper({
        bilanInitial: {
          traitementEntree: 'Metformine 1000 mg matin et soir',
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.formData.bilanInitial.traitementEntree).toBe('Metformine 1000 mg matin et soir')
      // Les defaults sont préservés (Glasgow max = 15/15 par défaut)
      expect(vm.formData.bilanInitial.glasgow.ouvertureYeux).toBe(4)
      expect(vm.formData.bilanInitial.glasgow.reponseVerbale).toBe(5)
      expect(vm.formData.bilanInitial.glasgow.reponseMotrice).toBe(6)
    })

    it('preserves examensComplementaires.imagerieTests and bilanBio.results as arrays', async () => {
      const wrapper = createWrapper({
        examensComplementaires: {
          imagerieTests: [
            { _key: 'k1', date: '', type: '', typeLibre: '', resultat: '' },
          ],
          bilanBio: {
            dateFrom: '2026-01-01',
            dateTo: '2026-01-31',
            results: [{ parameterName: 'HbA1c', value: '7.2' }],
          },
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      const examens = vm.formData.examensComplementaires

      expect(Array.isArray(examens.imagerieTests)).toBe(true)
      expect(examens.imagerieTests).toHaveLength(1)
      expect(() => {
        examens.imagerieTests.push({
          _key: 'k2',
          date: '',
          type: '',
          typeLibre: '',
          resultat: '',
        })
      }).not.toThrow()
      expect(examens.imagerieTests).toHaveLength(2)

      expect(Array.isArray(examens.bilanBio.results)).toBe(true)
      expect(examens.bilanBio.results).toHaveLength(1)
      expect(() => {
        examens.bilanBio.results.push({ parameterName: 'Glycémie', value: '1.1' })
      }).not.toThrow()
      expect(examens.bilanBio.results).toHaveLength(2)
    })
  })

  // ─── showAllergyAlert — array-based check ─────────────────────

  describe('showAllergyAlert', () => {
    it('shows allergy alert when allergies array has entries', async () => {
      const wrapper = createWrapper({
        modeVieAtcd: {
          allergies: [{ libelle: 'Pénicilline', type: 'Médicamenteuse' }],
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.showAllergyAlert).toBe(true)
    })

    it('does NOT show allergy alert when allergies array is empty', async () => {
      const wrapper = createWrapper({})
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.showAllergyAlert).toBe(false)
    })
  })

  // ─── Allergy sync from patient ─────────────────────────────────

  describe('allergy sync from patient', () => {
    it('syncs patient allergies to formData.modeVieAtcd.allergies on mount', async () => {
      mockActivePatient.value = {
        allergies: ['Pénicilline', 'Arachide'],
      }

      const wrapper = createWrapper({})
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.formData.modeVieAtcd.allergies).toHaveLength(2)
      expect(vm.formData.modeVieAtcd.allergies[0].libelle).toBe('Pénicilline')
      expect(vm.formData.modeVieAtcd.allergies[0].type).toBe('Autre')
      expect(vm.formData.modeVieAtcd.allergies[1].libelle).toBe('Arachide')
      // synced entries use the new { libelle, type } shape — no annee
      expect('annee' in vm.formData.modeVieAtcd.allergies[0]).toBe(false)
    })

    it('does NOT overwrite existing allergies on mount', async () => {
      mockActivePatient.value = {
        allergies: ['Arachide'],
      }

      const wrapper = createWrapper({
        modeVieAtcd: {
          allergies: [{ libelle: 'Pénicilline', type: 'Médicamenteuse' }],
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      // Should keep existing, not overwrite from patient
      expect(vm.formData.modeVieAtcd.allergies).toHaveLength(1)
      expect(vm.formData.modeVieAtcd.allergies[0].libelle).toBe('Pénicilline')
    })
  })

  // ─── antecedents defaults ──────────────────────────────────────

  describe('antecedents defaults', () => {
    it('antecedents is an empty array by default', async () => {
      const wrapper = createWrapper({})
      await flushPromises()

      const vm = wrapper.vm as any
      expect(Array.isArray(vm.formData.modeVieAtcd.antecedents)).toBe(true)
      expect(vm.formData.modeVieAtcd.antecedents).toHaveLength(0)
    })

    it('preserves antecedents array when provided', async () => {
      const wrapper = createWrapper({
        modeVieAtcd: {
          antecedents: [
            { libelle: 'Diabète', annee: '2010', type: 'Familiale' },
          ],
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.formData.modeVieAtcd.antecedents).toHaveLength(1)
      expect(vm.formData.modeVieAtcd.antecedents[0].libelle).toBe('Diabète')
      expect(vm.formData.modeVieAtcd.antecedents[0].type).toBe('Familiale')
    })
  })

  // ─── Legacy string migration (allergies/antecedents) ─────────────

  describe('legacy string migration in modeVieAtcd', () => {
    it('converts legacy string allergies into [{ libelle, type: "Autre" }] on merge', async () => {
      const wrapper = createWrapper({
        modeVieAtcd: {
          allergies: 'Pénicilline',
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.formData.modeVieAtcd.allergies).toEqual([
        { libelle: 'Pénicilline', type: 'Autre' },
      ])
    })

    it('converts legacy string antecedents into [{ libelle, annee: "", type: "Familiale" }] on merge', async () => {
      const wrapper = createWrapper({
        modeVieAtcd: {
          antecedents: 'Appendicite',
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.formData.modeVieAtcd.antecedents).toEqual([
        { libelle: 'Appendicite', annee: '', type: 'Familiale' },
      ])
    })

    it('maps blank legacy strings to empty arrays (no crash)', async () => {
      const wrapper = createWrapper({
        modeVieAtcd: {
          allergies: '',
          antecedents: '   ',
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      expect(Array.isArray(vm.formData.modeVieAtcd.allergies)).toBe(true)
      expect(vm.formData.modeVieAtcd.allergies).toHaveLength(0)
      expect(Array.isArray(vm.formData.modeVieAtcd.antecedents)).toBe(true)
      expect(vm.formData.modeVieAtcd.antecedents).toHaveLength(0)
    })

    it('seeds antecedents from legacy antecedentsMedicaux string when antecedents ends up empty (regression F2)', async () => {
      // Older drafts stored modeVieAtcd.antecedentsMedicaux as a plain string
      // (pre-`antecedents` rename). When `antecedents` is a non-array that
      // normalizes to empty (blank legacy string), the merge must seed
      // antecedents from antecedentsMedicaux instead of losing the data.
      const wrapper = createWrapper({
        modeVieAtcd: {
          antecedents: '',
          antecedentsMedicaux: 'HTA',
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.formData.modeVieAtcd.antecedents).toEqual([
        { libelle: 'HTA', annee: '', type: 'Familiale' },
      ])
    })

    it('keeps the newer string antecedents when antecedentsMedicaux also exists (regression F2: no clobber)', async () => {
      const wrapper = createWrapper({
        modeVieAtcd: {
          antecedents: 'Appendicite',
          antecedentsMedicaux: 'HTA',
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      // The newer `antecedents` field wins; the legacy antecedentsMedicaux
      // value must NOT overwrite it.
      expect(vm.formData.modeVieAtcd.antecedents).toEqual([
        { libelle: 'Appendicite', annee: '', type: 'Familiale' },
      ])
    })

    it('seeds antecedents from antecedentsMedicaux when antecedents is null (regression F2: legacy null shape)', async () => {
      // Some legacy rows carry `antecedents: null` alongside the older
      // string `antecedentsMedicaux`. A null antecedents is not an array and
      // normalizes to empty, so the merge must seed it from antecedentsMedicaux
      // instead of dropping the data.
      const wrapper = createWrapper({
        modeVieAtcd: {
          antecedents: null,
          antecedentsMedicaux: 'HTA',
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.formData.modeVieAtcd.antecedents).toEqual([
        { libelle: 'HTA', annee: '', type: 'Familiale' },
      ])
    })

    it('seeds antecedents from antecedentsMedicaux when antecedents key is absent (regression F2: missing key)', async () => {
      // Some legacy drafts have no `antecedents` key at all: the default merge
      // yields an empty array, and the migration must still seed it from the
      // older `antecedentsMedicaux` string.
      const wrapper = createWrapper({
        modeVieAtcd: {
          antecedentsMedicaux: 'HTA',
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.formData.modeVieAtcd.antecedents).toEqual([
        { libelle: 'HTA', annee: '', type: 'Familiale' },
      ])
    })

    it('strips legacy antecedentsMedicaux after migration so a cleared list is not re-seeded (regression F2: one-shot)', async () => {
      // The migration must be one-shot: after seeding from the legacy string,
      // the stale `antecedentsMedicaux` key must be dropped from the in-memory
      // form so a later deliberate clear is not resurrected on reload.
      const wrapper = createWrapper({
        modeVieAtcd: {
          antecedents: [],
          antecedentsMedicaux: 'HTA',
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.formData.modeVieAtcd.antecedents).toEqual([
        { libelle: 'HTA', annee: '', type: 'Familiale' },
      ])
      expect('antecedentsMedicaux' in vm.formData.modeVieAtcd).toBe(false)
    })
  })

  // ─── Form rendering (basic) ────────────────────────────────────

  describe('form rendering', () => {
    it('renders the CRH title', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Compte-Rendu')
      expect(wrapper.text()).toContain('Hospitalisation')
    })

    it('renders the patient contact display', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Test Patient')
    })

    it('shows "Brouillon" status tag when not readonly', () => {
      const wrapper = createWrapper()
      expect(wrapper.text()).toContain('Brouillon')
    })

    it('shows "Signé" status tag when readonly', async () => {
      const wrapper = mount(CrhDiabeteForm, {
        props: {
          modelValue: {},
          readonly: true,
          contactId: '1',
          contactDisplay: 'Test Patient',
        },
        global: {
          stubs: EL_STUBS,
        },
      })
      await flushPromises()
      expect(wrapper.text()).toContain('Signé')
    })

    it('renders the close button', () => {
      const wrapper = createWrapper()
      const closeBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Fermer'))
      expect(closeBtn).toBeDefined()
    })

    it('emits close when close button is clicked', async () => {
      const wrapper = createWrapper()
      const closeBtn = wrapper.findAll('.el-button').find(b => b.text().includes('Fermer'))
      await closeBtn!.trigger('click')
      expect(wrapper.emitted('close')).toBeDefined()
    })
  })

  // ─── documentCreatedAt sets dateEntree ───────────────────────────

  describe('documentCreatedAt prop', () => {
    it('documentCreatedAt prop sets dateEntree on mount', async () => {
      const wrapper = mount(CrhDiabeteForm, {
        props: {
          modelValue: {},
          readonly: false,
          contactId: '1',
          contactDisplay: 'Test Patient',
          documentCreatedAt: '2025-03-15T10:30:00Z',
        },
        global: {
          stubs: EL_STUBS,
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.formData.admission.dateEntree).toBe('2025-03-15')
    })
  })

  // ─── Responsable auto-filled from current user ───────────────────

  describe('Responsable auto-fill', () => {
    it('interneIPANom is auto-filled from the current user on mount', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      const vm = wrapper.vm as any
      // formatMedecinName({ nom: 'Dupont', prenom: 'Jean' }) → 'DUPONT Jean'
      expect(vm.formData.admission.interneIPANom).toBe('DUPONT Jean')
    })
  })

  // ─── Médecin référent auto-filled from patient.medecin_traitant ──

  describe('médecin référent auto-fill', () => {
    it('auto-fills médecin référent from patient.medecin_traitant', async () => {
      mockActivePatient.value = { medecin_traitant: 'Dr Martin Pierre' }
      const wrapper = createWrapper()
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.formData.admission.medecinTraitantNom).toBe('Dr Martin Pierre')
    })
  })

  // ─── Medical staff fetching removed (médecin soignant is now read-only from patient) ──

  // ─── motifHospitalisation is in admission, not bilanInitial ──────

  describe('motifHospitalisation location', () => {
    it('motifHospitalisation exists in admission', async () => {
      const wrapper = createWrapper({
        admission: {
          motifHospitalisation: '<p>Décompensation diabétique</p>',
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.formData.admission.motifHospitalisation).toBe('<p>Décompensation diabétique</p>')
    })

    it('bilanInitial does not have motifHospitalisation by default', async () => {
      const wrapper = createWrapper({})
      await flushPromises()

      const vm = wrapper.vm as any
      // BilanInitialData type does not include motifHospitalisation
      expect('motifHospitalisation' in vm.formData.bilanInitial).toBe(false)
    })
  })

  // ─── mergeFormData preserves admission.motifHospitalisation ──────

  describe('mergeFormData preserves admission.motifHospitalisation', () => {
    it('mergeFormData preserves motifHospitalisation from saved data', async () => {
      const wrapper = createWrapper({
        admission: {
          motifHospitalisation: '<p>test</p>',
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      // After merge + mount, the motifHospitalisation from saved data should be present
      expect(vm.formData.admission.motifHospitalisation).toBe('<p>test</p>')
    })

    it('mergeFormData does not clobber admission fields set by onMounted', async () => {
      const wrapper = mount(CrhDiabeteForm, {
        props: {
          modelValue: {
            admission: {
              motifHospitalisation: '<p>saved motif</p>',
              dateEntree: '2020-01-01', // should be overwritten by documentCreatedAt
            },
          },
          readonly: false,
          contactId: '1',
          contactDisplay: 'Test Patient',
          documentCreatedAt: '2025-03-15T10:30:00Z',
        },
        global: {
          stubs: EL_STUBS,
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      // motifHospitalisation from saved data should be preserved
      expect(vm.formData.admission.motifHospitalisation).toBe('<p>saved motif</p>')
      // dateEntree should be overwritten by documentCreatedAt
      expect(vm.formData.admission.dateEntree).toBe('2025-03-15')
    })
  })

  // ─── Field-level meta (dernière modification) ─────────────────────

  describe('field meta (dernière modification)', () => {
    it('records a timestamp in meta.champs when a field is edited after mount', async () => {
      const wrapper = createWrapper({})
      await flushPromises()

      const vm = wrapper.vm as any
      vm.formData.admission.serviceAccueil = 'Cardiologie'
      await nextTick()

      const entry = vm.formData.meta.champs['admission.serviceAccueil']
      expect(entry).toBeDefined()
      expect(typeof entry.updatedAt).toBe('string')
      expect(entry.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('does NOT timestamp fields initialized at bootstrap', async () => {
      const wrapper = createWrapper({
        admission: {
          dateEntree: '2025-01-15',
          serviceAccueil: 'Cardiologie',
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.formData.meta.champs['admission.dateEntree']).toBeUndefined()
      expect(vm.formData.meta.champs['admission.serviceAccueil']).toBeUndefined()
    })

    it('preserves meta.champs across mergeFormData', async () => {
      const wrapper = createWrapper({
        admission: { serviceAccueil: 'Cardiologie' },
        meta: {
          champs: {
            'admission.serviceAccueil': { updatedAt: '2026-01-01T10:00:00.000Z' },
          },
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.formData.meta.champs['admission.serviceAccueil']).toEqual({
        updatedAt: '2026-01-01T10:00:00.000Z',
      })
    })

    it('exposes meta.champs as a flat path → updatedAt map through fieldMeta', async () => {
      const wrapper = createWrapper({
        meta: {
          champs: {
            'admission.dateEntree': { updatedAt: '2026-01-01T10:00:00.000Z' },
            'modeVieAtcd.tabagisme': { updatedAt: '2026-02-01T09:30:00.000Z' },
          },
        },
      })
      await flushPromises()

      const vm = wrapper.vm as any
      expect(vm.fieldMeta['admission.dateEntree']).toBe('2026-01-01T10:00:00.000Z')
      expect(vm.fieldMeta['modeVieAtcd.tabagisme']).toBe('2026-02-01T09:30:00.000Z')
      expect(Object.keys(vm.fieldMeta)).toHaveLength(2)
    })
  })
})

// ─── onFormCellClick — delegated history dialog ────────────────────

describe('CrhDiabeteForm – onFormCellClick (historique paramètre)', () => {
  let wrapper: ReturnType<typeof createWrapper> | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    mockIpcInvoke.mockReset()
    mockConfirm.mockResolvedValue(true)
    mockActivePatient.value = null
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  function createWrapper() {
    return mount(CrhDiabeteForm, {
      props: {
        modelValue: {},
        readonly: false,
        contactId: '1',
        contactDisplay: 'Test Patient',
      },
      global: {
        stubs: EL_STUBS,
      },
    })
  }

  /** Creates a tracked-field cell the user could click (background/label). */
  function makeCell(path: string): HTMLDivElement {
    const cell = document.createElement('div')
    cell.className = 'history-cell'
    cell.setAttribute('data-history-path', path)
    return cell
  }

  /** Dispatches a bubbling click; the root div's @click handler receives it. */
  function clickOn(el: Element): void {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }

  function crhDoc(overrides: Record<string, any> = {}): Record<string, any> {
    return {
      id: 'doc-1',
      documentTypeCode: 'CRH_DIABETE',
      documentTypeLabel: 'CRH Diabète',
      status: 'signed',
      formData: JSON.stringify({ modeVieAtcd: { isolement: true } }),
      createdAt: '2025-03-15T10:30:00.000Z',
      ...overrides,
    }
  }

  it('opens the dialog and calls IPC with patientId when clicking a tracked field cell', async () => {
    mockActivePatient.value = { id: 7 }
    mockIpcInvoke.mockResolvedValue([crhDoc()])

    wrapper = createWrapper()
    await flushPromises()

    const cell = makeCell('modeVieAtcd.isolement')
    wrapper.element.appendChild(cell)
    clickOn(cell)
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('clinical-documents:list-by-patient', { patientId: 7 })

    const vm = wrapper.vm as any
    expect(vm.historyDialogOpen).toBe(true)
    expect(vm.historyDialogTitle).toBe('Historique — Isolement')
    expect(vm.historyEntries).toHaveLength(1)
    expect(vm.historyEntries[0]).toMatchObject({ documentId: 'doc-1', value: true })

    // The dialog is rendered with the title and the mocked IPC entries.
    const dialog = wrapper.find('.parameter-history-dialog-stub')
    expect(dialog.exists()).toBe(true)
    expect(dialog.find('.phd-title').text()).toContain('Historique — ')
    expect(dialog.text()).toContain('CRH Diabète')
  })

  it('opens the dialog when clicking a field label (el-form-item label is not an interactive control)', async () => {
    mockActivePatient.value = { id: 7 }
    mockIpcInvoke.mockResolvedValue([crhDoc()])

    wrapper = createWrapper()
    await flushPromises()

    const cell = makeCell('modeVieAtcd.isolement')
    cell.innerHTML = '<label class="field-label">Isolement</label>'
    wrapper.element.appendChild(cell)
    clickOn(cell.querySelector('label')!)
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.historyDialogOpen).toBe(true)
    expect(mockIpcInvoke).toHaveBeenCalledWith('clinical-documents:list-by-patient', { patientId: 7 })
  })

  it('does NOT open the dialog when clicking inside an interactive control', async () => {
    mockActivePatient.value = { id: 7 }

    wrapper = createWrapper()
    await flushPromises()

    // A real <input> inside a tracked cell…
    const cellWithInput = makeCell('modeVieAtcd.isolement')
    cellWithInput.innerHTML = '<input class="inner-input" type="text" />'
    wrapper.element.appendChild(cellWithInput)
    clickOn(cellWithInput.querySelector('input')!)

    // …and an Element Plus input wrapper (.el-input) — both are excluded.
    const cellWithElInput = makeCell('modeVieAtcd.isolement')
    cellWithElInput.innerHTML = '<div class="el-input"><input /></div>'
    wrapper.element.appendChild(cellWithElInput)
    clickOn(cellWithElInput.querySelector('.el-input')!)

    const vm = wrapper.vm as any
    expect(vm.historyDialogOpen).toBe(false)
    expect(mockIpcInvoke).not.toHaveBeenCalled()
  })

  it('closes the dialog when the IPC history fetch fails', async () => {
    mockActivePatient.value = { id: 7 }
    mockIpcInvoke.mockRejectedValue(new Error('IPC failure'))

    wrapper = createWrapper()
    await flushPromises()

    const cell = makeCell('modeVieAtcd.isolement')
    wrapper.element.appendChild(cell)
    clickOn(cell)
    await flushPromises()

    const vm = wrapper.vm as any
    // Regression: an IPC failure must not leave a misleading dialog open.
    expect(vm.historyDialogOpen).toBe(false)
    expect(wrapper.find('.parameter-history-dialog-stub').exists()).toBe(false)
  })

  it('discards stale responses when another field is clicked meanwhile', async () => {
    mockActivePatient.value = { id: 7 }
    let resolveFirst!: (value: unknown) => void
    mockIpcInvoke
      .mockImplementationOnce(() => new Promise(res => { resolveFirst = res }))
      .mockResolvedValueOnce([
        {
          id: 'doc-service',
          documentTypeCode: 'CRH_DIABETE',
          documentTypeLabel: 'CRH Diabète',
          status: 'draft',
          formData: JSON.stringify({ admission: { serviceAccueil: 'Cardiologie' } }),
          createdAt: '2025-04-01T10:00:00.000Z',
        },
      ])

    wrapper = createWrapper()
    await flushPromises()

    const vm = wrapper.vm as any
    const cellIsolement = makeCell('modeVieAtcd.isolement')
    wrapper.element.appendChild(cellIsolement)
    const cellService = makeCell('admission.serviceAccueil')
    wrapper.element.appendChild(cellService)

    // First click: the IPC request stays pending.
    clickOn(cellIsolement)
    expect(vm.historyDialogTitle).toBe('Historique — Isolement')

    // Second click on another field: its response resolves immediately.
    clickOn(cellService)
    await flushPromises()
    expect(vm.historyDialogTitle).toBe("Historique — Service d'accueil")

    // The stale first response arrives late — it must be discarded.
    resolveFirst([crhDoc({ id: 'doc-isolement' })])
    await flushPromises()

    expect(vm.historyEntries).toHaveLength(1)
    expect(vm.historyEntries[0].documentId).toBe('doc-service')
    expect(vm.historyEntries[0].value).toBe('Cardiologie')
  })
})
