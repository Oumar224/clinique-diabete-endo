<template>
  <el-dialog
    v-model="visible"
    :title="encounterId ? `Modifier le contact — ${patientName}` : `Nouveau contact médical — ${patientName}`"
    width="820px"
    top="4vh"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="160px"
      label-position="top"
    >
      <!-- Row 1: Type de contact -->
      <el-row :gutter="24">
        <el-col :span="24">
          <el-form-item label="Type de contact *" prop="contact_type">
            <el-tooltip
              :disabled="!contactTypeLocked"
              content="Type verrouillé : un dossier clinique est associé à ce contact"
              placement="top"
              class="contact-type-tooltip"
            >
              <el-select v-model="form.contact_type" filterable :disabled="contactTypeLocked" placeholder="Sélectionner...">
                <el-option
                  v-for="opt in CONTACT_TYPE_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-tooltip>
          </el-form-item>
        </el-col>
      </el-row>

      <!-- Row 2: Service & Médecin -->
      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="Service *" prop="service_id">
            <el-autocomplete
              v-model="form.service_name"
              :fetch-suggestions="queryServices"
              :trigger-on-focus="true"
              placeholder="Rechercher un service..."
              clearable
              @select="onServiceSelect"
              @clear="onServiceClear"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
              <template #default="{ item }">
                <div class="service-suggestion">
                  <span class="service-suggestion__name">{{ item.name }}</span>
                  <span v-if="item.parent_name" class="service-suggestion__parent">{{ item.parent_name }}</span>
                </div>
              </template>
            </el-autocomplete>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Médecin">
            <el-autocomplete
              v-model="form.medecin_name"
              :fetch-suggestions="queryMedecins"
              :trigger-on-focus="true"
              placeholder="Rechercher un médecin..."
              clearable
              @select="onMedecinSelect"
              @clear="form.medecin_id = null"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
              <template #default="{ item }">
                <div class="medecin-suggestion">
                  <span>{{ formatMedecinName(item) }}</span>
                  <el-tag size="small" type="info" style="margin-left:8px">{{ roleLabel(item.role ?? '') }}</el-tag>
                </div>
              </template>
            </el-autocomplete>
          </el-form-item>
        </el-col>
      </el-row>

      <!-- Row 3: Unité de soins -->
      <el-row :gutter="24">
        <el-col :span="24">
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

      <!-- Row 4: Prise en charge & Assurance -->
      <el-row :gutter="24">
        <el-col :span="showAssuranceField ? 12 : 24">
          <el-form-item label="Prise en charge *" prop="prise_en_charge">
            <el-select v-model="form.prise_en_charge" filterable placeholder="Sélectionner...">
              <el-option
                v-for="opt in PRISE_EN_CHARGE_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col v-if="showAssuranceField" :span="12">
          <el-form-item label="Assurance *" prop="assurance_id">
            <el-select v-model="form.assurance_id" filterable placeholder="Sélectionner une assurance...">
              <el-option
                v-for="ins in insuranceOptions"
                :key="ins.id"
                :label="ins.name"
                :value="ins.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <!-- Row 5: Mécanisme de contact & Précisez -->
      <el-row :gutter="24">
        <el-col :span="showOriginPrecision ? 12 : 24">
          <el-form-item label="Mécanisme de contact *" prop="origin">
            <el-select v-model="form.origin" filterable placeholder="Sélectionner...">
              <el-option
                v-for="opt in originOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col v-if="showOriginPrecision" :span="12">
          <el-form-item label="Précisez" prop="origin_precision">
            <el-input v-model="form.origin_precision" placeholder="Nom de la structure..." />
          </el-form-item>
        </el-col>
      </el-row>

      <!-- Row 6: Date de début & Date de fin -->
      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="Date de début *" prop="start_date">
            <el-date-picker
              v-model="form.start_date"
              type="datetime"
              format="DD/MM/YYYY HH:mm"
              value-format="YYYY-MM-DD HH:mm"
              style="width:100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Date de fin" prop="end_date">
            <el-date-picker
              v-if="form.contact_type === 'hospitalisation'"
              v-model="form.end_date"
              type="datetime"
              format="DD/MM/YYYY HH:mm"
              value-format="YYYY-MM-DD HH:mm"
              style="width:100%"
              placeholder="Date de sortie..."
            />
            <el-input v-else :model-value="endDateFormatted" disabled>
              <template #suffix>
                <span class="auto-badge">Clôture automatique après 24h</span>
              </template>
            </el-input>
          </el-form-item>
        </el-col>
      </el-row>

      <!-- Row 7: Responsable -->
      <el-row :gutter="24">
        <el-col :span="24">
          <el-form-item label="Responsable" prop="responsable_id">
            <el-autocomplete
              v-model="form.responsable_name"
              :fetch-suggestions="queryResponsables"
              :trigger-on-focus="true"
              placeholder="Rechercher un responsable..."
              clearable
              @select="onResponsableSelect"
              @clear="form.responsable_id = null"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
              <template #default="{ item }">
                <div class="medecin-suggestion">
                  <span>{{ formatMedecinName(item) }}</span>
                </div>
              </template>
            </el-autocomplete>
          </el-form-item>
        </el-col>
      </el-row>

      <!-- Row 8: Notes -->
      <el-row :gutter="24">
        <el-col :span="24">
          <el-form-item label="Notes">
            <RichTextEditor v-model="form.notes" :rows="3" placeholder="Observations..." />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">Annuler</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          Enregistrer le Contact
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { ipcInvoke } from '@/utils/ipc'
import { useEncounters } from '@/composables/useEncounters'
import type { EncounterDto } from '@/composables/useEncounters'
import {
  CONTACT_TYPE_OPTIONS,
  originOptions,
  fetchOriginOptions,
  insuranceOptions,
  fetchInsuranceOptions,
  PRISE_EN_CHARGE_OPTIONS,
  useContactFormLogic,
} from '@/composables/useContactFormLogic'
import { useMedicalStaff, formatMedecinName } from '@/composables/useMedicalStaff'
import { roleLabel } from '@/composables/useUsers'
import type { UserDto } from '@/composables/useUsers'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'

interface ServiceSuggestion {
  value: string
  name: string
  id: number
  parent_name?: string
}

const emit = defineEmits<{
  saved: []
}>()

const props = defineProps<{
  patientId: number
  patientName: string
  userId?: number | null
  encounter?: EncounterDto | null
}>()

const visible = defineModel<boolean>('visible')
const { createEncounter, updateEncounter } = useEncounters()

const { fetchMedicalStaff, searchMedicalStaff } = useMedicalStaff()
const formRef = ref<FormInstance>()
const submitting = ref(false)
const services = ref<ServiceSuggestion[]>([])
const staffLoaded = ref(false)
const careUnits = ref<{ id: number; name: string }[]>([])

const encounterId = ref<number | null>(null)
const contactTypeLocked = ref(false)

const {
  form,
  endDateFormatted,
  showOriginPrecision,
  showAssuranceField,
  resetForm,
  patchForm,
} = useContactFormLogic()

const rules: Record<string, any[]> = {
  contact_type: [{ required: true, message: 'Le type de contact est requis', trigger: 'change' }],
  start_date: [{ required: true, message: 'La date de début est requise', trigger: 'change' }],
  service_id: [{ required: true, message: 'Le service est requis', trigger: 'change' }],
  origin: [{ required: true, message: 'Le mécanisme de contact est requis', trigger: 'change' }],
  prise_en_charge: [{ required: true, message: 'La prise en charge est requise', trigger: 'change' }],
  assurance_id: [
    {
      required: true,
      message: "L'assurance est requise",
      trigger: 'change',
      validator: (_r: any, v: number | null) => {
        if (form.value.prise_en_charge === 'assurance' && !v) return false
        return true
      },
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

async function queryServices(query: string, cb: (results: ServiceSuggestion[]) => void) {
  if (services.value.length === 0) {
    const raw = await ipcInvoke<any[]>('services:list', { activeOnly: true })
    services.value = raw.map(s => ({
      value: s.name,
      name: s.name,
      id: s.id,
      parent_name: s.parent_name,
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
  form.value.service_id = item.id as number
  form.value.service_name = item.name as string
  fetchCareUnitsByService(item.id as number)
}

async function fetchCareUnitsByService(serviceId: number) {
  if (!serviceId) {
    careUnits.value = []
    form.value.care_unit_id = null
    return
  }
  try {
    const units = await ipcInvoke<{ id: number; name: string }[]>('care-units:list', { serviceId, activeOnly: true })
    careUnits.value = units ?? []
    if (careUnits.value.length === 0 || !careUnits.value.find(u => u.id === form.value.care_unit_id)) {
      form.value.care_unit_id = null
    }
  } catch {
    careUnits.value = []
    form.value.care_unit_id = null
  }
}

function onServiceClear() {
  form.value.service_id = null
  form.value.service_name = ''
  careUnits.value = []
  form.value.care_unit_id = null
}

function onMedecinSelect(item: UserDto) {
  form.value.medecin_id = item.id ?? null
  form.value.medecin_name = formatMedecinName(item)
}

function queryResponsables(query: string, cb: (results: UserDto[]) => void) {
  cb(searchMedicalStaff(query))
}

function onResponsableSelect(item: UserDto) {
  form.value.responsable_id = item.id ?? null
  form.value.responsable_name = formatMedecinName(item)
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
    submitting.value = false
    return
  }

  submitting.value = true
  try {
    const startDate = form.value.start_date
      ? new Date(form.value.start_date).toISOString()
      : new Date().toISOString()

    // Resolve the selected insurance name for sinistre_info
    let sinistreInfo: string | null = null
    if (form.value.prise_en_charge === 'assurance' && form.value.assurance_id) {
      const selected = insuranceOptions.value.find(i => i.id === form.value.assurance_id)
      sinistreInfo = selected ? selected.name : null
    }

    const payload = {
      patient_id: props.patientId,
      contact_type: form.value.contact_type,
      contact_type_precision: null,
      start_date: startDate,
      end_date: form.value.contact_type === 'hospitalisation' ? form.value.end_date || null : null,
      service_id: form.value.service_id!,
      medecin_id: form.value.medecin_id,
      responsable_id: form.value.responsable_id,
      origin: form.value.origin,
      origin_precision: showOriginPrecision.value ? form.value.origin_precision || null : null,
      zone_situation: form.value.prise_en_charge,
      zone_precision: null,
      prise_en_charge: form.value.prise_en_charge,
      prise_en_charge_precision: null,
      sinistre_info: sinistreInfo,
      notes: form.value.notes || null,
      care_unit_id: form.value.care_unit_id,
      created_by: props.userId ?? null,
    }

    if (encounterId.value) {
      await updateEncounter(encounterId.value, payload)
      ElMessage.success('Contact modifié avec succès')
    } else {
      await createEncounter(payload)
      ElMessage.success('Contact enregistré avec succès')
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

function handleCancel() {
  visible.value = false
}

function handleClosed() {
  encounterId.value = null
  contactTypeLocked.value = false
  resetForm()
  formRef.value?.resetFields()
}

async function checkContactTypeLocked(contactId: number) {
  try {
    const count = await ipcInvoke<number>('clinical-documents:count', { contactId: String(contactId) })
    if (encounterId.value !== contactId) return
    contactTypeLocked.value = (count ?? 0) > 0
  } catch {
    contactTypeLocked.value = false
  }
}

watch(() => props.encounter, (enc) => {
  if (!enc) {
    contactTypeLocked.value = false
    return
  }
  encounterId.value = enc.id ?? null
  if (enc.id) {
    checkContactTypeLocked(enc.id)
    patchForm({
      contact_type: enc.contact_type,
      start_date: enc.start_date ? enc.start_date.replace('T', ' ').slice(0, 16) : '',
      end_date: enc.end_date || '',
      service_id: enc.service_id,
      service_name: enc.service_name || '',
      medecin_id: enc.medecin_id ?? null,
      medecin_name: enc.medecin_name || '',
      responsable_id: enc.responsable_id ?? null,
      responsable_name: enc.responsable_name || '',
      origin: enc.origin,
      origin_precision: enc.origin_precision || '',
      prise_en_charge: enc.prise_en_charge,
      prise_en_charge_precision: enc.prise_en_charge_precision || '',
      sinistre_info: enc.sinistre_info || '',
      notes: enc.notes || '',
      care_unit_id: enc.care_unit_id ?? null,
    })
  }
}, { immediate: true })

onMounted(async () => {
  if (!staffLoaded.value) {
    await fetchMedicalStaff()
    staffLoaded.value = true
  }
  if (originOptions.value.length === 0) {
    await fetchOriginOptions()
  }
  if (insuranceOptions.value.length === 0) {
    await fetchInsuranceOptions()
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

.contact-type-tooltip {
  display: block;
}

.service-suggestion {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
}

.service-suggestion__name {
  font-weight: 600;
  color: var(--cd-gray-900);
}

.service-suggestion__parent {
  font-size: 11px;
  color: var(--cd-gray-400);
}

.medecin-suggestion {
  display: flex;
  align-items: center;
}

.auto-badge {
  font-size: 10px;
  color: var(--cd-gray-400);
  font-style: italic;
  white-space: nowrap;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
