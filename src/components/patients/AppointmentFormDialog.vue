<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? 'Modifier le rendez-vous' : 'Planifier un rendez-vous'"
    width="640px"
    top="6vh"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="140px"
      label-position="top"
    >
      <el-row v-if="editablePatient" :gutter="24">
        <el-col :span="24">
          <el-form-item label="Patient *" prop="patient_id">
            <el-select
              v-model="selectedPatientId"
              filterable
              placeholder="Rechercher un patient..."
              style="width:100%"
            >
              <el-option
                v-for="p in patients"
                :key="p.id"
                :label="`${p.prenom} ${p.nom}`"
                :value="p.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="Date *" prop="date">
            <el-date-picker
              v-model="form.date"
              type="date"
              format="DD/MM/YYYY"
              value-format="YYYY-MM-DD"
              style="width:100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="Heure * (8h-18h)" prop="time">
            <el-time-picker
              v-model="form.time"
              format="HH:mm"
              value-format="HH:mm"
              :selectable-range="selectableRange"
              :step="step30min"
              style="width:100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="Durée" prop="duration">
            <el-select v-model="form.duration" style="width:100%">
              <el-option label="30 min" :value="30" />
              <el-option label="45 min" :value="45" />
              <el-option label="60 min" :value="60" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-alert
        v-if="conflictWarning"
        :title="conflictWarning"
        type="warning"
        show-icon
        :closable="false"
        style="margin-bottom:12px"
      />

      <el-row :gutter="24">
        <el-col :span="24">
          <el-form-item label="Motif" prop="motif">
            <el-input v-model="form.motif" placeholder="Consultation de contrôle, Écho-doppler..." />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="Service" prop="service_id">
            <el-autocomplete
              v-model="form.service_name"
              :fetch-suggestions="queryServices"
              :trigger-on-focus="true"
              placeholder="Rechercher un service..."
              clearable
              @select="onServiceSelect"
              @clear="onServiceClear"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Unité de soins" prop="care_unit_id">
            <el-select
              v-model="form.care_unit_id"
              filterable
              clearable
              :disabled="!form.service_id"
              placeholder="Sélectionner d'abord un service..."
            >
              <el-option
                v-for="unit in careUnits"
                :key="unit.id"
                :label="unit.name"
                :value="unit.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="Médecin" prop="medecin_id">
            <el-autocomplete
              v-model="form.medecin_name"
              :fetch-suggestions="queryMedecins"
              :trigger-on-focus="true"
              placeholder="Rechercher un médecin..."
              clearable
              @select="onMedecinSelect"
              @clear="form.medecin_id = null"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Statut" prop="status">
            <el-select v-model="form.status" style="width:100%">
              <el-option label="Confirmé" value="confirmed" />
              <el-option label="En attente" value="pending" />
              <el-option label="Annulé" value="cancelled" />
              <el-option label="Effectué" value="done" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="24">
        <el-col :span="24">
          <el-form-item label="Notes">
            <RichTextEditor v-model="form.notes" :rows="2" placeholder="Observations..." />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="visible = false">Annuler</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? 'Enregistrer les modifications' : 'Planifier le rendez-vous' }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { ipcInvoke } from '@/utils/ipc'
import { createAppointment, updateAppointment, listAppointments, findTimeConflict, timeToMinutes, type AppointmentDto } from '@/composables/useAppointments'
import { useMedicalStaff, formatMedecinName } from '@/composables/useMedicalStaff'
import { usePatients } from '@/composables/usePatients'
import type { UserDto } from '@/composables/useUsers'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'

interface ServiceSuggestion {
  value: string
  name: string
  id: number
}

const emit = defineEmits<{
  saved: []
}>()

const props = defineProps<{
  patientId: number
  patientName: string
  appointment?: AppointmentDto | null
  initialDate?: string
  initialTime?: string
  editablePatient?: boolean
}>()

const { searchMedicalStaff, fetchMedicalStaff } = useMedicalStaff()
const { patients, fetchPatients } = usePatients()
const visible = defineModel<boolean>('visible')
const formRef = ref<FormInstance>()
const submitting = ref(false)
const services = ref<ServiceSuggestion[]>([])
const careUnits = ref<{ id: number; name: string }[]>([])
const staffLoaded = ref(false)
const selectedPatientId = ref<number>(props.patientId)
const dayAppointments = ref<AppointmentDto[]>([])
const conflictWarning = ref('')

const selectableRange = '08:00:00 - 18:00:00'
const step30min = '00:30'

const isEdit = computed(() => !!props.appointment)

const form = reactive({
  date: '',
  time: '',
  duration: 30 as number,
  motif: '',
  service_id: null as number | null,
  service_name: '',
  care_unit_id: null as number | null,
  medecin_id: null as number | null,
  medecin_name: '',
  status: 'confirmed' as string,
  notes: '',
})

function isWithinWorkingHours(t: string): boolean {
  const mins = timeToMinutes(t)
  if (Number.isNaN(mins)) return false
  return mins >= 8 * 60 && mins <= 18 * 60
}

const rules: Record<string, any[]> = {
  date: [{ required: true, message: 'La date est requise', trigger: 'change' }],
  time: [
    { required: true, message: 'L\'heure est requise', trigger: 'change' },
    {
      validator: (_r: any, v: string, cb: (e?: Error) => void) => {
        if (!v) return cb()
        if (!isWithinWorkingHours(v)) return cb(new Error('Horaire entre 8h et 18h'))
        cb()
      },
      trigger: 'change',
    },
  ],
  service_id: [{ required: true, message: 'Le service est requis', trigger: 'change' }],
  medecin_id: [
    {
      required: false,
      validator: (_r: any, v: number | null) => {
        if (v != null && v <= 0) return new Error('Médecin invalide')
        return true
      },
      trigger: 'change',
    },
  ],
  care_unit_id: [
    {
      required: false,
      validator: (_r: any, v: number | null) => {
        if (v != null && v <= 0) return new Error('Unité de soins invalide')
        return true
      },
      trigger: 'change',
    },
  ],
}

watch(() => props.appointment, (appt) => {
  if (appt) {
    form.date = appt.date || ''
    form.time = appt.time || ''
    form.duration = 30
    form.motif = appt.motif || ''
    form.service_id = appt.service_id ?? null
    form.service_name = appt.service_name || ''
    form.care_unit_id = appt.care_unit_id ?? null
    form.medecin_id = appt.medecin_id ?? null
    form.medecin_name = appt.medecin_name || ''
    form.status = appt.status || 'confirmed'
    form.notes = appt.notes || ''
    selectedPatientId.value = appt.patient_id ?? props.patientId
    if (appt.service_id) {
      fetchCareUnitsByService(appt.service_id)
    }
  } else {
    form.date = props.initialDate || ''
    form.time = props.initialTime || ''
    form.duration = 30
    form.motif = ''
    form.service_id = null
    form.service_name = ''
    form.care_unit_id = null
    form.medecin_id = null
    form.medecin_name = ''
    form.status = 'confirmed'
    form.notes = ''
    selectedPatientId.value = props.patientId
    careUnits.value = []
  }
  conflictWarning.value = ''
}, { immediate: true })

watch(() => [props.initialDate, props.initialTime, props.patientId], ([d, t, pid]) => {
  if (!props.appointment) {
    if (d) form.date = d as string
    if (t) form.time = t as string
    if (pid) selectedPatientId.value = pid as number
  }
})

watch(() => [form.date, form.time, form.medecin_id, form.duration], async () => {
  await checkConflict()
})

watch(visible, async (v) => {
  if (v) {
    selectedPatientId.value = props.appointment?.patient_id ?? props.patientId
    if (props.editablePatient && patients.value.length === 0) {
      try { await fetchPatients() } catch { /* silencieux */ }
    }
    if (form.date) await refreshDayAppointments(form.date)
    await checkConflict()
  }
})

async function refreshDayAppointments(date: string) {
  if (!date) { dayAppointments.value = []; return }
  try {
    dayAppointments.value = await listAppointments(date)
  } catch {
    dayAppointments.value = []
  }
}

async function checkConflict() {
  conflictWarning.value = ''
  if (!form.date || !form.time || form.medecin_id == null) return
  if (dayAppointments.value.length === 0 || dayAppointments.value[0]?.date !== form.date) {
    await refreshDayAppointments(form.date)
  }
  const hit = findTimeConflict(
    dayAppointments.value,
    { date: form.date, time: form.time, medecin_id: form.medecin_id },
    form.duration || 30,
    props.appointment?.id,
  )
  if (hit) {
    conflictWarning.value = `Conflit horaire : ${hit.medecin_name || 'ce médecin'} a déjà un RDV le ${hit.date} à ${hit.time} (${hit.motif || 'RDV'}).`
  }
}

async function queryServices(query: string, cb: (results: ServiceSuggestion[]) => void) {
  if (services.value.length === 0) {
    const raw = await ipcInvoke<any[]>('services:list', { activeOnly: true })
    services.value = raw.map(s => ({
      value: s.name,
      name: s.name,
      id: s.id,
    }))
  }
  const q = query.toLowerCase().trim()
  if (!q) return cb(services.value)
  cb(services.value.filter(s => s.name.toLowerCase().includes(q)))
}

function queryMedecins(query: string, cb: (results: UserDto[]) => void) {
  cb(searchMedicalStaff(query))
}

function onServiceSelect(item: Record<string, any>) {
  form.service_id = item.id as number
  form.service_name = item.name as string
  fetchCareUnitsByService(item.id as number)
}

async function fetchCareUnitsByService(serviceId: number) {
  if (!serviceId) {
    careUnits.value = []
    form.care_unit_id = null
    return
  }
  try {
    const units = await ipcInvoke<{ id: number; name: string }[]>('care-units:list', { serviceId, activeOnly: true })
    careUnits.value = units ?? []
    if (careUnits.value.length === 0 || !careUnits.value.find(u => u.id === form.care_unit_id)) {
      form.care_unit_id = null
    }
  } catch {
    careUnits.value = []
    form.care_unit_id = null
  }
}

function onServiceClear() {
  form.service_id = null
  form.service_name = ''
  careUnits.value = []
  form.care_unit_id = null
}

function onMedecinSelect(item: UserDto) {
  form.medecin_id = item.id ?? null
  form.medecin_name = formatMedecinName(item)
}

async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    ElMessage.warning('Veuillez remplir tous les champs obligatoires (date, heure 8h-18h, service)')
    return
  }

  const effectivePatientId = props.editablePatient ? selectedPatientId.value : props.patientId
  if (!effectivePatientId || effectivePatientId <= 0) {
    ElMessage.error('Patient non valide. Veuillez sélectionner un patient.')
    return
  }

  await checkConflict()
  if (conflictWarning.value) {
    try {
      await ElMessageBox.confirm(
        `${conflictWarning.value}\nVoulez-vous quand même enregistrer ?`,
        'Conflit horaire',
        { type: 'warning', confirmButtonText: 'Enregistrer quand même', cancelButtonText: 'Annuler' },
      )
    } catch {
      return
    }
  }

  submitting.value = true
  try {
    const payload = {
      patient_id: effectivePatientId,
      date: form.date,
      time: form.time,
      motif: form.motif || undefined,
      medecin_id: form.medecin_id && form.medecin_id > 0 ? form.medecin_id : null,
      service_id: form.service_id,
      care_unit_id: form.care_unit_id && form.care_unit_id > 0 ? form.care_unit_id : null,
      status: form.status as AppointmentDto['status'],
      notes: form.notes || null,
    }

    if (isEdit.value && props.appointment?.id) {
      await updateAppointment(props.appointment.id, payload)
      ElMessage.success('Rendez-vous modifié avec succès')
    } else {
      await createAppointment(payload)
      ElMessage.success('Rendez-vous planifié avec succès')
    }
    visible.value = false
    emit('saved')
  } catch (e) {
    const msg = (e as Error).message
    if (msg.includes('introuvable dans patient')) {
      ElMessage.error('Le dossier patient semble inaccessible. Veuillez rafraîchir la page.')
    } else {
      ElMessage.error(`Erreur: ${msg}`)
    }
  } finally {
    submitting.value = false
  }
}

function handleClosed() {
  formRef.value?.resetFields()
}

onMounted(async () => {
  if (!staffLoaded.value) {
    await fetchMedicalStaff()
    staffLoaded.value = true
  }
})
</script>

<style scoped>
.el-form {
  padding: 8px 0;
}
.el-form-item {
  margin-bottom: 16px;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
