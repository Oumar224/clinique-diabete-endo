import { ref, computed } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export const CONTACT_TYPE_OPTIONS = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'hospitalisation', label: 'Hospitalisation' },
]

export interface ContactFormData {
  contact_type: string
  contact_type_precision: string
  start_date: string
  end_date: string
  service_id: number | null
  service_name: string
  medecin_id: number | null
  medecin_name: string
  responsable_id: number | null
  responsable_name: string
  origin: string
  origin_precision: string
  zone_situation: string
  zone_precision: string
  prise_en_charge: string
  prise_en_charge_precision: string
  sinistre_info: string
  notes: string
  assurance_id: number | null
  contact_category_id: string | null
  care_unit_id: number | null
}

export const PRISE_EN_CHARGE_OPTIONS = [
  { value: 'individuel', label: 'Individuel' },
  { value: 'assurance', label: 'Assurance' },
]

export const originOptions = ref<{ value: string; label: string }[]>([])

export async function fetchOriginOptions() {
  try {
    const result = await ipcInvoke<{ value: string; label: string }[]>('contact-origins:list-active')
    originOptions.value = result ?? []
  } catch {
    originOptions.value = []
  }
}

export const insuranceOptions = ref<{ id: number; name: string; code: string }[]>([])

export async function fetchInsuranceOptions() {
  try {
    const result = await ipcInvoke<{ id: number; name: string; code: string }[]>('insurances:list-active')
    insuranceOptions.value = result ?? []
  } catch {
    insuranceOptions.value = []
  }
}

export const contactCategoryOptions = ref<{ value: string; label: string }[]>([])

export async function fetchContactCategoryOptions() {
  try {
    const result = await ipcInvoke<{ value: string; label: string }[]>('contact-categories:list-active')
    contactCategoryOptions.value = result ?? []
  } catch {
    contactCategoryOptions.value = []
  }
}

export function useContactFormLogic() {
  const form = ref<ContactFormData>({
    contact_type: '',
    contact_type_precision: '',
    start_date: new Date().toISOString().slice(0, 16),
    end_date: '',
    service_id: null,
    service_name: '',
    medecin_id: null,
    medecin_name: '',
    responsable_id: null,
    responsable_name: '',
    origin: '',
    origin_precision: '',
    zone_situation: '',
    zone_precision: '',
    prise_en_charge: '',
    prise_en_charge_precision: '',
    sinistre_info: '',
    notes: '',
    assurance_id: null,
    contact_category_id: null,
    care_unit_id: null,
  })

  const endDateFormatted = computed(() => {
    if (form.value.contact_type === 'hospitalisation' && form.value.end_date) {
      const d = new Date(form.value.end_date)
      return d.toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    }
    if (!form.value.start_date) return ''
    const d = new Date(form.value.start_date)
    d.setHours(d.getHours() + 24)
    return d.toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  })

  const showOriginPrecision = computed(() =>
    !!form.value.origin && ['centre_sante', 'poste_sante', 'clinique_privee', 'autre'].includes(form.value.origin)
  )

  const showAssuranceField = computed(() =>
    form.value.prise_en_charge === 'assurance'
  )

  const showPrecisionField = (fieldValue: string) => fieldValue === 'autre'

  function patchForm(data: Partial<ContactFormData>) {
    Object.assign(form.value, data)
  }

  function resetForm() {
    form.value = {
      contact_type: '',
      contact_type_precision: '',
      start_date: new Date().toISOString().slice(0, 16),
      end_date: '',
      service_id: null,
      service_name: '',
      medecin_id: null,
      medecin_name: '',
      responsable_id: null,
      responsable_name: '',
      origin: '',
      origin_precision: '',
      zone_situation: '',
      zone_precision: '',
      prise_en_charge: '',
      prise_en_charge_precision: '',
      sinistre_info: '',
      notes: '',
      assurance_id: null,
      contact_category_id: null,
      care_unit_id: null,
    }
  }

  return {
    form,
    endDateFormatted,
    showOriginPrecision,
    showAssuranceField,
    showPrecisionField,
    patchForm,
    resetForm,
  }
}
