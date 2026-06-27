import { ref, computed, provide, inject, type Ref } from 'vue'
import { calculateAge } from '@/utils/age'
import { useOpenPatients } from '@/composables/useOpenPatients'

export interface Patient {
  id: number
  civilite: '' | 'M' | 'Mme' | 'Mlle'
  nom: string
  prenom: string
  date_naissance: string
  nir: string
  telephone: string
  email?: string
  profession?: string
  mutuelle?: string
  assuranceMutuelle?: string
  consentementEtude?: string
  medecin_traitant?: string
  allergies: string[]
  photo?: string | null
  nip?: string
  lieu_naissance?: string
  residence_code?: string
  complement_adresse?: string
  region?: string
  site_id?: number
}

const PATIENT_CONTEXT_KEY = Symbol('patientContext')

const activePatient = ref<Patient | null>(null)

export function providePatientContext() {
  const age = computed(() => {
    if (!activePatient.value) return null
    return calculateAge(activePatient.value.date_naissance)
  })

  const hasActivePatient = computed(() => !!activePatient.value)

  function setActivePatient(patient: Patient) {
    activePatient.value = patient
    // Track in open patients for quick-access feature
    useOpenPatients().addPatient(patient)
  }

  function clearPatient() {
    activePatient.value = null
  }

  provide(PATIENT_CONTEXT_KEY, {
    activePatient,
    age,
    hasActivePatient,
    setActivePatient,
    clearPatient,
  })

  return { activePatient, age, hasActivePatient, setActivePatient, clearPatient }
}

export function usePatientContext() {
  const context = inject<{
    activePatient: Ref<Patient | null>
    age: Ref<number | null>
    hasActivePatient: Ref<boolean>
    setActivePatient: (p: Patient) => void
    clearPatient: () => void
  }>(PATIENT_CONTEXT_KEY)

  if (!context) {
    throw new Error('usePatientContext must be used within a DashboardLayout')
  }

  return context
}
