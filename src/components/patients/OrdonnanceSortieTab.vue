<template>
  <div class="ordonnance-tab">
    <div class="ordonnance-tab__header">
      <div class="ordonnance-tab__header-title">
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
          <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.06"/>
          <path d="M5 4.5H9" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
          <path d="M5 6.5H8" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
          <path d="M5 8.5H7" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
        </svg>
        <span>Ordonnance de Sortie</span>
        <el-tag v-if="data.length > 0" size="small" effect="dark" round>{{ data.length }}</el-tag>
      </div>
      <el-button v-if="!readonly && !showForm" type="primary" size="small" :icon="Plus" @click="openAddForm">
        Nouveau
      </el-button>
    </div>

    <div class="ordonnance-tab__body">
      <!-- Colonne gauche : Formulaire -->
      <div class="ordonnance-tab__form-col">
        <transition name="fade-slide">
          <CollapsibleSection
            v-if="showForm"
            :title="editingIndex !== null ? 'Modifier la prescription' : 'Nouvelle prescription'"
            :default-open="true"
          >
            <el-card class="ordonnance-form-card" shadow="never">
              <el-form ref="formRef" :model="form" :rules="formRules" label-position="top" size="small">
                <el-row :gutter="12">
                  <el-col :span="12">
                    <el-form-item label="Médicament" prop="medicament">
                      <el-select v-model="form.medicament" filterable placeholder="Rechercher..." style="width:100%">
                        <el-option v-for="m in medicaments" :key="m" :label="m" :value="m" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="Dosage" prop="dosage">
                      <el-input v-model="form.dosage" placeholder="500" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="Unité" prop="unite">
                      <el-select v-model="form.unite" placeholder="Unité" style="width:100%">
                        <el-option v-for="u in UNITES" :key="u" :label="u" :value="u" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="12">
                  <el-col :span="6">
                    <el-form-item label="Voie" prop="voie">
                      <el-select v-model="form.voie" placeholder="Voie" style="width:100%">
                        <el-option v-for="v in VOIES" :key="v" :label="v" :value="v" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="Durée (jours)" prop="duree">
                      <el-input-number v-model="form.duree" :min="1" :max="365" style="width:100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="Forme galénique">
                      <el-select v-model="form.formeGalenique" placeholder="Choisir..." style="width:100%">
                        <el-option v-for="fg in FORME_GALENIQUE_OPTIONS" :key="fg" :label="fg" :value="fg" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="12">
                  <el-col :span="10">
                    <el-form-item label="Consignes de prise">
                      <el-select v-model="form.momentPrises" multiple placeholder="Sélectionnez..." style="width:100%" collapse-tags collapse-tags-tooltip>
                        <el-option v-for="c in CONSIGNES_PRISE_OPTIONS" :key="c" :label="c" :value="c" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="4">
                    <el-form-item label="Renouvellement">
                      <el-switch v-model="form.renouvellement" />
                    </el-form-item>
                  </el-col>
                  <el-col v-if="form.renouvellement" :span="4">
                    <el-form-item label="Nombre">
                      <el-input-number v-model="form.nbRenouvellements" :min="1" :max="12" />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="12">
                  <el-col :span="12">
                    <el-form-item label="Type de fréquence">
                      <el-radio-group v-model="form.frequenceType">
                        <el-radio-button value="moments">Moments</el-radio-button>
                        <el-radio-button value="fixed-times">Heures fixes</el-radio-button>
                        <el-radio-button value="interval">Intervalle</el-radio-button>
                      </el-radio-group>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="Fréquence" prop="frequence">
                      <el-select
                        v-if="form.frequenceType === 'moments'"
                        v-model="form.frequence" multiple
                        placeholder="Moments" style="width:100%"
                        collapse-tags collapse-tags-tooltip
                      >
                        <el-option v-for="opt in MOMENTS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
                      </el-select>
                      <el-select
                        v-else-if="form.frequenceType === 'fixed-times'"
                        v-model="form.frequence" multiple
                        placeholder="Heures" style="width:100%"
                        collapse-tags collapse-tags-tooltip
                      >
                        <el-option v-for="t in FIXED_TIMES_OPTIONS" :key="t" :label="t" :value="t" />
                      </el-select>
                      <el-select
                        v-else
                        v-model="form.frequence"
                        placeholder="Intervalle" style="width:100%"
                      >
                        <el-option v-for="h in INTERVAL_OPTIONS" :key="h" :label="`Toutes les ${h}h`" :value="`Toutes les ${h}h`" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="12">
                  <el-col :span="24">
                    <el-form-item label="Instructions">
                      <RichTextEditor v-model="form.instructions" :rows="2" placeholder="Instructions complémentaires..." />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="12">
                  <el-col :span="24" class="ordonnance-form-card__actions">
                    <el-button type="primary" size="small" @click="onSubmit">
                      {{ editingIndex !== null ? 'Mettre à jour' : 'Ajouter' }}
                    </el-button>
                    <el-button size="small" @click="cancelForm">Annuler</el-button>
                  </el-col>
                </el-row>
              </el-form>
            </el-card>
          </CollapsibleSection>
        </transition>

        <el-empty v-if="!showForm && data.length === 0" description="Aucune prescription de sortie" :image-size="60" />
      </div>

      <!-- Colonne droite : Aperçu prescriptions -->
      <div class="ordonnance-tab__preview-col">
        <div class="ordonnance-tab__preview-header">
          <span class="ordonnance-tab__preview-title">Prescriptions</span>
          <el-tag v-if="data.length > 0" type="success" size="small" effect="plain">{{ data.length }}</el-tag>
        </div>

        <div v-if="data.length > 0" class="ordonnance-tab__cards">
          <div v-for="(rx, idx) in data" :key="rx._key" class="rx-card">
            <div class="rx-card__header">
              <div class="rx-card__title-group">
                <span class="rx-card__medicament">{{ rx.medicament }}</span>
                <span class="rx-card__dosage">{{ rx.dosage }} {{ rx.unite }}</span>
              </div>
              <el-tag v-if="rx.renouvellement" type="warning" size="small" effect="plain" round>
                Renouvellement ×{{ rx.nbRenouvellements }}
              </el-tag>
            </div>
            <div class="rx-card__tags">
              <el-tag size="small" effect="plain" type="info">{{ rx.voie }}</el-tag>
              <el-tag size="small" effect="plain" type="info">{{ rx.duree }} jours</el-tag>
              <el-tag size="small" effect="plain" type="info">{{ frequenceLabel(rx) }}</el-tag>
              <el-tag v-if="rx.formeGalenique" size="small" effect="plain">{{ rx.formeGalenique }}</el-tag>
            </div>
            <div v-if="rx.momentPrises.length > 0" class="rx-card__details">
              <span>{{ rx.momentPrises.join(' · ') }}</span>
            </div>
            <div v-if="!isRichTextEmpty(rx.instructions)" class="rx-card__details rx-card__details--rich" v-html="rx.instructions" />
            <div v-if="!readonly" class="rx-card__actions">
              <el-button size="small" text type="primary" :icon="Edit" @click="editPrescription(idx)">Modifier</el-button>
              <el-button size="small" text type="danger" :icon="Delete" @click="removePrescription(idx)">Supprimer</el-button>
            </div>
          </div>
        </div>

        <el-empty v-else description="Aucune prescription" :image-size="60" />
      </div>
    </div>

    <!-- Summary bar -->
    <div v-if="data.length > 0" class="ordonnance-summary">
      <span>{{ data.length }} médicament(s) prescrit(s)</span>
      <el-tag v-if="renouvellementCount > 0" type="warning" size="small" effect="plain">
        {{ renouvellementCount }} avec renouvellement
      </el-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props -- Commit volontaire dans l'objet réactif partagé data (push/splice) déclenché par validation du formulaire, suivi de l'émission explicite de 'change' */
import { ref, reactive, computed } from 'vue'
import { ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import type { PrescriptionSortie } from '@/types/crh-diabete'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import { isRichTextEmpty } from '@/utils/rich-text'
import {
  MOMENTS_OPTIONS,
  FIXED_TIMES_OPTIONS,
  INTERVAL_OPTIONS,
  FORME_GALENIQUE_OPTIONS,
  CONSIGNES_PRISE_OPTIONS,
} from '@/utils/constants'

const props = defineProps<{
  data: PrescriptionSortie[]
  readonly: boolean
  fieldMeta?: Record<string, string>
}>()

const emit = defineEmits<{ change: [] }>()

const showForm = ref(false)
const editingIndex = ref<number | null>(null)
const formRef = ref<FormInstance>()

const medicaments = [
  'Amoxicilline 500 mg', 'Furosémide 40 mg', 'Metformine 500 mg', 'Ramipril 5 mg',
  'Paracétamol 500 mg', 'Ibuprofène 400 mg', 'Warfarine 5 mg', 'Aspirine 100 mg',
  'Atorvastatine 20 mg', 'Oméprazole 20 mg', 'Levothyrox 75 µg', 'Metoprolol 50 mg',
  'Amlodipine 5 mg', 'Gliclazide 80 mg', 'Insuline Glargine', 'Pantoprazole 40 mg',
]
const UNITES = ['cp', 'UI', 'mg', 'g', 'mL', 'ampoule', 'sachet', 'goutte']
const VOIES = ['VO', 'IV', 'IM', 'SC', 'SL', 'IP', 'Rectale', 'Cutanée']

/**
 * Local form model. `frequence` is an array for the multi-select frequency
 * modes (`moments`, `fixed-times`) but a plain string for the single-select
 * `interval` mode.
 */
interface OrdonnanceForm {
  medicament: string
  dosage: string
  unite: string
  voie: string
  duree: number
  formeGalenique: string
  momentPrises: string[]
  renouvellement: boolean
  nbRenouvellements: number
  frequenceType: string
  frequence: string[] | string
  instructions: string
}

function createForm(): OrdonnanceForm {
  return {
    medicament: '',
    dosage: '',
    unite: '',
    voie: '',
    duree: 7,
    formeGalenique: '',
    momentPrises: [],
    renouvellement: false,
    nbRenouvellements: 1,
    frequenceType: 'moments',
    frequence: [],
    instructions: '',
  }
}

const form = reactive(createForm())

const formRules = computed<FormRules>(() => ({
  medicament: [{ required: true, message: 'Choisissez un médicament', trigger: 'change' }],
  dosage: [{ required: true, message: 'Indiquez la quantité', trigger: 'blur' }],
  unite: [{ required: true, message: 'Sélectionnez l\'unité', trigger: 'change' }],
  voie: [{ required: true, message: 'Sélectionnez la voie', trigger: 'change' }],
  duree: [{ required: true, message: 'Indiquez la durée', trigger: 'blur' }],
  frequence: [{ required: true, message: 'Sélectionnez une fréquence', trigger: 'change' }],
}))

const renouvellementCount = computed(() => props.data.filter(r => r.renouvellement).length)

function openAddForm() {
  Object.assign(form, createForm())
  editingIndex.value = null
  showForm.value = true
}

function editPrescription(idx: number) {
  const rx = props.data[idx]
  Object.assign(form, {
    medicament: rx.medicament,
    dosage: rx.dosage,
    unite: rx.unite,
    voie: rx.voie,
    duree: rx.duree,
    formeGalenique: rx.formeGalenique,
    momentPrises: [...rx.momentPrises],
    renouvellement: rx.renouvellement,
    nbRenouvellements: rx.nbRenouvellements,
    frequenceType: rx.frequenceType,
    // The `interval` el-select is single-mode and binds a plain string, while
    // `moments`/`fixed-times` are multi-selects that bind an array.
    frequence: rx.frequenceType === 'interval'
      ? (rx.frequence[0] ?? '')
      : [...rx.frequence],
    instructions: rx.instructions,
  })
  editingIndex.value = idx
  showForm.value = true
}

async function onSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const prescription: PrescriptionSortie = {
    _key: editingIndex.value !== null ? props.data[editingIndex.value]._key : crypto.randomUUID(),
    medicament: form.medicament,
    dosage: form.dosage,
    unite: form.unite,
    voie: form.voie,
    duree: form.duree,
    formeGalenique: form.formeGalenique,
    momentPrises: [...form.momentPrises],
    renouvellement: form.renouvellement,
    nbRenouvellements: form.nbRenouvellements,
    frequenceType: form.frequenceType,
    // For the `interval` mode `form.frequence` is a single string (single-mode
    // el-select); wrap it in an array instead of spreading it char-by-char.
    frequence: Array.isArray(form.frequence) ? [...form.frequence] : [form.frequence],
    instructions: form.instructions,
  }

  if (editingIndex.value !== null) {
    props.data.splice(editingIndex.value, 1, prescription)
  } else {
    props.data.push(prescription)
  }

  showForm.value = false
  editingIndex.value = null
  Object.assign(form, createForm())
  emit('change')
}

function cancelForm() {
  showForm.value = false
  editingIndex.value = null
}

async function removePrescription(idx: number) {
  try {
    await ElMessageBox.confirm('Supprimer cette prescription ?', 'Confirmation', {
      type: 'warning',
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
    })
  } catch { return }
  props.data.splice(idx, 1)
  emit('change')
}

function frequenceLabel(rx: PrescriptionSortie): string {
  if (rx.frequence instanceof Array) return rx.frequence.join(', ')
  return rx.frequence || '—'
}
</script>

<style scoped>
.ordonnance-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.ordonnance-tab__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: linear-gradient(135deg, var(--cd-primary), #1ABC9C);
  border-radius: 8px 8px 0 0;
  color: white;
  flex-shrink: 0;
}

.ordonnance-tab__header-title {
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ordonnance-tab__body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  flex: 1;
  overflow: auto;
  padding: 20px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-top: none;
  border-radius: 0 0 8px 8px;
}

.ordonnance-tab__form-col {
  display: flex;
  flex-direction: column;
}

.ordonnance-tab__preview-col {
  display: flex;
  flex-direction: column;
}

.ordonnance-tab__preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.ordonnance-tab__preview-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--cd-gray-500);
}

.ordonnance-tab__cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ordonnance-form-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.ordonnance-form-card :deep(.el-card__header) {
  padding: 10px 16px;
  background: var(--cd-gray-50);
  border-bottom: 1px solid var(--el-border-color-light);
}

.ordonnance-form-card__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 4px;
}

.rx-card {
  background: white;
  border: 1px solid var(--el-border-color-lighter);
  border-left: 4px solid var(--el-color-success);
  border-radius: 8px;
  padding: 14px 16px;
  transition: box-shadow 0.2s, transform 0.15s;
}

.rx-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.rx-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.rx-card__title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rx-card__medicament {
  font-size: 14px;
  font-weight: 700;
  color: var(--cd-gray-900);
}

.rx-card__dosage {
  font-size: 13px;
  color: var(--cd-gray-500);
}

.rx-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.rx-card__details {
  font-size: 12px;
  color: var(--cd-gray-500);
  line-height: 1.5;
}

.rx-card__details--italic {
  font-style: italic;
}

.rx-card__details--rich {
  font-style: normal;
  overflow-wrap: anywhere;
}
.rx-card__details--rich :deep(p) {
  margin: 0 0 4px;
}
.rx-card__details--rich :deep(h1),
.rx-card__details--rich :deep(h2),
.rx-card__details--rich :deep(h3) {
  margin: 6px 0 4px;
  font-weight: 700;
}
.rx-card__details--rich :deep(h1) {
  font-size: 14px;
}
.rx-card__details--rich :deep(h2) {
  font-size: 13px;
}
.rx-card__details--rich :deep(h3) {
  font-size: 12px;
}
.rx-card__details--rich :deep(ul),
.rx-card__details--rich :deep(ol) {
  margin: 0 0 4px;
  padding-left: 18px;
}
.rx-card__details--rich :deep(li) {
  margin-bottom: 2px;
}
.rx-card__details--rich :deep(blockquote) {
  border-left: 3px solid #d1d5db;
  margin: 4px 0;
  padding: 2px 8px;
  color: #4b5563;
  font-style: italic;
}
.rx-card__details--rich :deep(pre) {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  padding: 8px;
  font-family: monospace;
  font-size: 11px;
  white-space: pre-wrap;
  margin: 4px 0;
}
.rx-card__details--rich :deep(code) {
  background: #f3f4f6;
  font-family: monospace;
  font-size: 11px;
  padding: 1px 3px;
}
.rx-card__details--rich :deep(hr) {
  border: none;
  border-top: 1px solid #d1d5db;
  margin: 6px 0;
}
.rx-card__details--rich :deep(img) {
  max-width: 100%;
  height: auto;
}
.rx-card__details--rich :deep(img.is-left) {
  float: left;
  margin: 0 12px 6px 0;
  max-width: 45%;
}
.rx-card__details--rich :deep(img.is-right) {
  float: right;
  margin: 0 0 6px 12px;
  max-width: 45%;
}
.rx-card__details--rich :deep(img.is-center) {
  display: block;
  margin: 6px auto;
}
.rx-card__details--rich :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}

.rx-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.ordonnance-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--cd-gray-50);
  border: 1px solid var(--el-border-color-light);
  border-top: none;
  border-radius: 0 0 8px 8px;
  font-size: 12px;
  color: var(--cd-gray-600);
  flex-shrink: 0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
