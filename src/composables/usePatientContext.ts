import { ref, computed, provide, inject, type Ref } from 'vue'

export interface Patient {
  id: number
  civilite: 'M' | 'Mme' | 'Mlle'
  nom: string
  prenom: string
  date_naissance: string
  nir: string
  telephone: string
  email?: string
  adresse?: string
  mutuelle?: string
  medecin_traitant?: string
  allergies: string[]
}

const PATIENT_CONTEXT_KEY = Symbol('patientContext')

const activePatient = ref<Patient | null>(null)

export function providePatientContext() {
  const age = computed(() => {
    if (!activePatient.value) return null
    const birth = new Date(activePatient.value.date_naissance)
    const today = new Date()
    let a = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--
    return a
  })

  const hasActivePatient = computed(() => !!activePatient.value)

  function setActivePatient(patient: Patient) {
    activePatient.value = patient
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
