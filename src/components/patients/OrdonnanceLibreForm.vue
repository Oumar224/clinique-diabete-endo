<template>
  <div class="ordonnance-libre-form">
    <el-alert
      v-if="readonly"
      title="Ce document est verrouillé en lecture seule."
      type="warning"
      show-icon
      :closable="false"
      class="ordonnance-libre-form__alert"
    />

    <!-- Document header -->
    <div class="ordonnance-libre-form__header">
      <div class="ordonnance-libre-form__header-left">
        <h3 class="ordonnance-libre-form__title">Ordonnance Libre</h3>
        <el-tag
          :type="document?.status === 'signed' ? 'success' : 'warning'"
          size="small"
          effect="light"
        >
          {{ document?.status === 'signed' ? 'Signé' : 'Brouillon' }}
        </el-tag>
      </div>
    </div>

    <!-- Section: Nouvelle ordonnance (prescriptions existantes + formulaire) -->
    <SectionHeader label="Ordonnance" level="secondary" class="ordonnance-libre-form__section">
      <template #badge>{{ selectedPrescriptionIds.length + inlinePrescriptions.length }}</template>

      <!-- Prescriptions existantes du patient -->
      <div class="ordonnance-libre-form__existing" v-loading="prescriptionsLoading" element-loading-text="Chargement des prescriptions...">
        <div v-if="availablePrescriptions.length > 0" class="ordonnance-libre-form__existing-header">
          <span class="ordonnance-libre-form__existing-label">Prescriptions existantes</span>
        </div>
        <el-table
          v-if="availablePrescriptions.length > 0"
          :data="availablePrescriptions"
          style="width:100%"
          size="small"
          max-height="200"
        >
          <el-table-column width="50" align="center">
            <template #default="{ row }">
              <el-checkbox
                :model-value="selectedPrescriptionIds.includes(row.id)"
                :disabled="readonly"
                @change="(val: any) => togglePrescription(row.id, val as boolean)"
              />
            </template>
          </el-table-column>
          <el-table-column prop="medicament" label="Médicament" min-width="180" />
          <el-table-column prop="dosage" label="Dosage" width="100" />
          <el-table-column prop="voie" label="Voie" width="70" />
          <el-table-column label="Fréquence" width="160">
            <template #default="{ row }">
              {{ row.frequence instanceof Array ? row.frequence.join(', ') : row.frequence }}
            </template>
          </el-table-column>
          <el-table-column label="Statut" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.statut === 'active' ? 'success' : 'info'" size="small" effect="plain">
                {{ row.statut === 'active' ? 'Active' : row.statut }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!prescriptionsLoading && availablePrescriptions.length === 0" description="Aucune prescription existante" :image-size="40" />
      </div>

      <!-- Formulaire de nouvelle prescription inline -->
      <div v-if="!readonly" class="ordonnance-libre-form__inline-form">
        <div class="ordonnance-libre-form__inline-form-header">
          <span class="ordonnance-libre-form__inline-form-title">Ajouter une prescription</span>
        </div>
        <el-form
          ref="inlineFormRef"
          :model="inlineForm"
          :rules="inlineFormRules"
          label-position="top"
          size="small"
        >
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="Dénomination du médicament" prop="medicament">
                <el-select v-model="inlineForm.medicament" filterable placeholder="Rechercher un médicament..." style="width:100%">
                  <el-option v-for="m in MEDICAMENTS" :key="m" :label="m" :value="m" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Quantité" prop="dosage">
                <el-input v-model="inlineForm.dosage" placeholder="1" />
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Unité" prop="unite">
                <el-select v-model="inlineForm.unite" placeholder="Unité" style="width:100%">
                  <el-option v-for="u in UNITES" :key="u" :label="u" :value="u" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Voie" prop="voie">
                <el-select v-model="inlineForm.voie" placeholder="Voie" style="width:100%">
                  <el-option v-for="v in VOIE_OPTIONS" :key="v" :label="v" :value="v" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="Durée (jours)" prop="duree">
                <el-input-number v-model="inlineForm.duree" :min="1" :max="90" style="width:100%" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="Type de fréquence">
                <el-radio-group v-model="inlineForm.frequenceType">
                  <el-radio value="moments">Moments</el-radio>
                  <el-radio value="fixed-times">Heures fixes</el-radio>
                  <el-radio value="interval">Intervalle</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Fréquence" prop="frequence">
                <el-select
                  v-if="inlineForm.frequenceType === 'moments'"
                  v-model="inlineForm.frequence" multiple placeholder="Sélectionnez les moments"
                  collapse-tags collapse-tags-tooltip style="width:100%"
                >
                  <el-option v-for="opt in MOMENTS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
                <el-select
                  v-else-if="inlineForm.frequenceType === 'fixed-times'"
                  v-model="inlineForm.frequence" multiple placeholder="Sélectionnez les heures"
                  collapse-tags collapse-tags-tooltip style="width:100%"
                >
                  <el-option v-for="t in FIXED_TIMES_OPTIONS" :key="t" :label="t" :value="t" />
                </el-select>
                <el-select
                  v-else-if="inlineForm.frequenceType === 'interval'"
                  v-model="inlineForm.frequence" placeholder="Choisissez l'intervalle" style="width:100%"
                >
                  <el-option
                    v-for="h in INTERVAL_OPTIONS"
                    :key="h"
                    :label="`Toutes les ${h}h`"
                    :value="`Toutes les ${h}h`"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label=" ">
                <el-button type="primary" size="small" @click="addInlinePrescription">
                  Ajouter
                </el-button>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="4">
              <el-form-item label="Si besoin">
                <el-switch v-model="inlineForm.prn" />
              </el-form-item>
            </el-col>
            <el-col :span="20">
              <el-form-item label="Instructions">
                <RichTextEditor v-model="inlineForm.instructions" :rows="2" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>

        <!-- Inline prescriptions list -->
        <div v-if="inlinePrescriptions.length > 0" class="ordonnance-libre-form__inline-list">
          <div
            v-for="(item, idx) in inlinePrescriptions"
            :key="idx"
            class="ordonnance-libre-form__inline-item"
          >
            <span class="ordonnance-libre-form__inline-medicament">{{ item.medicament }}</span>
            <span class="ordonnance-libre-form__inline-detail">{{ item.dosage }} {{ item.unite }}</span>
            <span class="ordonnance-libre-form__inline-detail">{{ item.voie }}</span>
            <span class="ordonnance-libre-form__inline-detail">{{ formatFrequence(item.frequence) }}</span>
            <el-button
              text
              type="danger"
              size="small"
              :icon="Delete"
              @click="removeInlinePrescription(idx)"
            />
          </div>
        </div>
      </div>

      <!-- Aperçu -->
      <div class="ordonnance-libre-form__preview">
        <div v-if="selectedPrescriptions.length === 0 && inlinePrescriptions.length === 0" class="ordonnance-libre-form__preview-empty">
          <el-empty description="Aucune prescription sélectionnée ou ajoutée" :image-size="40" />
        </div>
        <div v-else class="ordonnance-libre-form__preview-content">
          <div class="ordonnance-libre-form__preview-title">Aperçu de l'ordonnance</div>
          <div v-if="selectedPrescriptions.length > 0" class="ordonnance-libre-form__preview-section">
            <div class="ordonnance-libre-form__preview-section-title">Prescriptions existantes</div>
            <div v-for="rx in selectedPrescriptions" :key="rx.id" class="ordonnance-libre-form__preview-item">
              <strong>{{ rx.medicament }}</strong> — {{ rx.dosage }} — {{ rx.voie }} —
              {{ rx.frequence instanceof Array ? rx.frequence.join(', ') : rx.frequence }}
            </div>
          </div>
          <div v-if="inlinePrescriptions.length > 0" class="ordonnance-libre-form__preview-section">
            <div class="ordonnance-libre-form__preview-section-title">Nouvelles prescriptions</div>
            <div v-for="(item, idx) in inlinePrescriptions" :key="'inline-' + idx" class="ordonnance-libre-form__preview-item">
              <strong>{{ item.medicament }}</strong> — {{ item.dosage }} {{ item.unite }} — {{ item.voie }} —
              {{ formatFrequence(item.frequence) }}
              <span v-if="item.prn" class="ordonnance-libre-form__preview-prn">(si besoin)</span>
              <span v-if="!isRichTextEmpty(item.instructions)" class="ordonnance-libre-form__preview-instructions" v-html="item.instructions"></span>
            </div>
          </div>
        </div>
      </div>
    </SectionHeader>

    <!-- Footer actions -->
    <div v-if="!readonly" class="ordonnance-libre-form__footer">
      <el-button :loading="saving" :disabled="saving || signing" @click="handleSaveDraft">
        Enregistrer Brouillon
      </el-button>
      <el-button
        type="primary"
        :loading="signing"
        :disabled="saving || signing"
        @click="handleSign"
      >
        {{ document?.status === 'signed' ? 'Resigner' : 'Signer' }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import SectionHeader from '@/components/common/SectionHeader.vue'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import { isRichTextEmpty } from '@/utils/rich-text'
import { useOrdonnanceLibre } from '@/composables/useOrdonnanceLibre'
import { usePatientContext } from '@/composables/usePatientContext'
import {
  MOMENTS_OPTIONS,
  FIXED_TIMES_OPTIONS,
  INTERVAL_OPTIONS,
} from '@/utils/constants'

interface PrescriptionRecord {
  id: number
  medicament: string
  dosage: string
  voie: string
  frequence: string[] | string
  statut: string
}

interface InlinePrescription {
  medicament: string
  dosage: string
  unite: string
  voie: string
  duree: number
  frequenceType: string
  frequence: string[]
  prn: boolean
  instructions: string
}

const props = defineProps<{
  document: { id: string; contactId: string; status: string; formData: Record<string, any> | null; createdAt?: string; createdBy?: string; signedAt?: string; signedBy?: string } | null
  documentType: { id: string; code: string; label: string } | null
  readonly: boolean
  contactDisplay?: string
}>()

const emit = defineEmits<{
  save: [formData: Record<string, any>]
  sign: []
  close: []
}>()

const { activePatient } = usePatientContext()
const { fetchAvailablePrescriptions } = useOrdonnanceLibre()

const inlineFormRef = ref<FormInstance>()
const saving = ref(false)
const signing = ref(false)
const prescriptionsLoading = ref(false)

const availablePrescriptions = ref<PrescriptionRecord[]>([])
const selectedPrescriptionIds = ref<number[]>([])
const inlinePrescriptions = ref<InlinePrescription[]>([])

const MEDICAMENTS = [
  'Amoxicilline 500 mg', 'Furosémide 40 mg', 'Metformine 500 mg', 'Ramipril 5 mg',
  'Paracétamol 500 mg', 'Ibuprofène 400 mg', 'Warfarine 5 mg', 'Aspirine 100 mg',
  'Atorvastatine 20 mg', 'Oméprazole 20 mg',
]

const UNITES = ['cp', 'UI', 'mg', 'g', 'mL', 'ampoule', 'sachet', 'cuillère', 'goutte']

const VOIE_OPTIONS = ['Orale', 'Sublinguale', 'IV', 'IM', 'SC', 'PO', 'SL', 'Rectale', 'Cutanée']

const inlineForm = reactive<InlinePrescription>({
  medicament: '',
  dosage: '',
  unite: 'mg',
  voie: 'Orale',
  duree: 7,
  frequenceType: 'moments',
  frequence: [],
  prn: false,
  instructions: '',
})

const inlineFormRules = computed<FormRules>(() => ({
  medicament: [{ required: true, message: 'Choisissez un médicament', trigger: 'change' }],
  dosage: [{ required: true, message: 'Indiquez la quantité', trigger: 'blur' }],
  unite: [{ required: true, message: 'Sélectionnez l\'unité', trigger: 'change' }],
  voie: [{ required: true, message: 'Sélectionnez la voie d\'administration', trigger: 'change' }],
  duree: [{ required: true, message: 'Indiquez la durée', trigger: 'blur' }],
}))

const selectedPrescriptions = computed(() =>
  availablePrescriptions.value.filter(rx => selectedPrescriptionIds.value.includes(rx.id)),
)

function togglePrescription(id: number, checked: boolean) {
  if (checked) {
    selectedPrescriptionIds.value.push(id)
  } else {
    selectedPrescriptionIds.value = selectedPrescriptionIds.value.filter(i => i !== id)
  }
}

async function addInlinePrescription() {
  const valid = await inlineFormRef.value?.validate().catch(() => false)
  if (!valid) return

  inlinePrescriptions.value.push({ ...inlineForm })

  inlineForm.medicament = ''
  inlineForm.dosage = ''
  inlineForm.prn = false
  inlineForm.instructions = ''
  inlineForm.frequence = []
  inlineFormRef.value?.resetFields()
}

function removeInlinePrescription(idx: number) {
  inlinePrescriptions.value.splice(idx, 1)
}

function formatFrequence(freq: string[] | string): string {
  if (Array.isArray(freq)) return freq.join(', ')
  return freq || '—'
}

function buildFormData(): Record<string, any> {
  return {
    linkedPrescriptionIds: selectedPrescriptionIds.value,
    inlinePrescriptions: inlinePrescriptions.value,
    title: 'Ordonnance Libre',
  }
}

async function handleSaveDraft() {
  if (!props.document) return
  saving.value = true
  emit('save', buildFormData())
  saving.value = false
}

async function handleSign() {
  if (!props.document) return

  try {
    const resigning = props.document?.status === 'signed'
    await ElMessageBox.confirm(
      resigning
        ? 'Resigner ce document ? L\'ancienne signature sera écrasée.'
        : 'Êtes-vous sûr de vouloir signer et verrouiller ce document ? Cette action est irréversible.',
      resigning ? 'Re-signature' : 'Confirmation de signature',
      {
        confirmButtonText: resigning ? 'Resigner' : 'Signer',
        cancelButtonText: 'Annuler',
        type: 'warning',
      },
    )
    signing.value = true
    emit('save', buildFormData())
    await new Promise(r => setTimeout(r, 100))
    emit('sign')
    signing.value = false
  } catch {
    // User cancelled
  }
}

// Initialize from document formData and load available prescriptions
watch(
  () => props.document,
  async (doc) => {
    if (!doc) return
    const fd = doc.formData
    if (fd) {
      selectedPrescriptionIds.value = fd.linkedPrescriptionIds ?? []
      inlinePrescriptions.value = fd.inlinePrescriptions ?? []
    }
    // Load available prescriptions using patient ID from context
    const patient = activePatient.value
    if (patient?.id) {
      prescriptionsLoading.value = true
      try {
        const all = await fetchAvailablePrescriptions(patient.id)
        availablePrescriptions.value = (all ?? []).filter((rx: any) => rx.statut === 'active')
      } catch {
        availablePrescriptions.value = []
      } finally {
        prescriptionsLoading.value = false
      }
    }
  },
  { immediate: true },
)
</script>

<style scoped lang="scss">
.ordonnance-libre-form {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.ordonnance-libre-form__alert {
  margin-bottom: 16px;
}

.ordonnance-libre-form__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.ordonnance-libre-form__header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ordonnance-libre-form__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.ordonnance-libre-form__section {
  flex: 1;
  min-height: 0;
}

.ordonnance-libre-form__existing {
  margin-bottom: 16px;
}

.ordonnance-libre-form__existing-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.ordonnance-libre-form__existing-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.ordonnance-libre-form__inline-form {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.ordonnance-libre-form__inline-form-header {
  margin-bottom: 12px;
}

.ordonnance-libre-form__inline-form-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.ordonnance-libre-form__inline-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ordonnance-libre-form__inline-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  font-size: 13px;
}

.ordonnance-libre-form__inline-medicament {
  font-weight: 600;
  color: var(--el-text-color-primary);
  min-width: 160px;
}

.ordonnance-libre-form__inline-detail {
  color: var(--el-text-color-secondary);
}

.ordonnance-libre-form__preview {
  min-height: 60px;
}

.ordonnance-libre-form__preview-empty {
  padding: 12px 0;
}

.ordonnance-libre-form__preview-content {
  font-size: 13px;
  line-height: 1.6;
}

.ordonnance-libre-form__preview-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--el-text-color-secondary);
}

.ordonnance-libre-form__preview-section {
  margin-bottom: 8px;
}

.ordonnance-libre-form__preview-section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--el-text-color-placeholder);
  margin-bottom: 2px;
}

.ordonnance-libre-form__preview-item {
  padding: 3px 0;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}

.ordonnance-libre-form__preview-prn {
  font-style: italic;
  color: var(--el-color-warning);
}

.ordonnance-libre-form__preview-instructions {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.ordonnance-libre-form__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-light);
  margin-top: 12px;
  flex-shrink: 0;
}
</style>
