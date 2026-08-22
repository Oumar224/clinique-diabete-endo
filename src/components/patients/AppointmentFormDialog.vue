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
        <el-col :span="12">
          <el-form-item label="Heure *" prop="time">
            <el-time-picker
              v-model="form.time"
              format="HH:mm"
              value-format="HH:mm"
              style="width:100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

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
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { ipcInvoke } from '@/utils/ipc'
import { createAppointment, updateAppointment, type AppointmentDto } from '@/composables/useAppointments'
import { useMedicalStaff, formatMedecinName } from '@/composables/useMedicalStaff'
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
}>()

const { searchMedicalStaff, fetchMedicalStaff } = useMedicalStaff()
const visible = defineModel<boolean>('visible')
const formRef = ref<FormInstance>()
const submitting = ref(false)
const services = ref<ServiceSuggestion[]>([])
const careUnits = ref<{ id: number; name: string }[]>([])
const staffLoaded = ref(false)

const isEdit = computed(() => !!props.appointment)

const form = reactive({
  date: '',
  time: '',
  motif: '',
  service_id: null as number | null,
  service_name: '',
  care_unit_id: null as number | null,
  medecin_id: null as number | null,
  medecin_name: '',
  status: 'confirmed' as string,
  notes: '',
})

const rules: Record<string, any[]> = {
  date: [{ required: true, message: 'La date est requise', trigger: 'change' }],
  time: [{ required: true, message: 'L\'heure est requise', trigger: 'change' }],
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
    form.motif = appt.motif || ''
    form.service_id = appt.service_id ?? null
    form.service_name = appt.service_name || ''
    form.care_unit_id = appt.care_unit_id ?? null
    form.medecin_id = appt.medecin_id ?? null
    form.medecin_name = appt.medecin_name || ''
    form.status = appt.status || 'confirmed'
    form.notes = appt.notes || ''
    if (appt.service_id) {
      fetchCareUnitsByService(appt.service_id)
    }
  } else {
    form.date = ''
    form.time = ''
    form.motif = ''
    form.service_id = null
    form.service_name = ''
    form.care_unit_id = null
    form.medecin_id = null
    form.medecin_name = ''
    form.status = 'confirmed'
    form.notes = ''
    careUnits.value = []
  }
}, { immediate: true })

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
    ElMessage.warning('Veuillez remplir tous les champs obligatoires')
    return
  }

  if (!props.patientId || props.patientId <= 0) {
    ElMessage.error('Patient non valide. Veuillez réessayer.')
    return
  }

  submitting.value = true
  try {
    const payload = {
      patient_id: props.patientId,
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
