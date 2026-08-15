<template>
  <div class="crc-form" @click="onFormCellClick">
    <div class="crc-form__header">
      <div class="crc-form__header-left">
        <div class="crc-form__title-icon">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1.5" y="3.5" width="15" height="11" rx="1.5" stroke="currentColor" stroke-width="1" fill="currentColor" fill-opacity="0.08"/>
            <path d="M5.5 7H12.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
            <path d="M5.5 9.5H10.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="crc-form__title-group">
          <h3 class="crc-form__title">Compte Rendu de Consultation</h3>
          <span class="crc-form__subtitle">CRC Diabète &amp; Endocrinologie</span>
        </div>
        <el-tag :type="statusType" size="small" effect="light">
          {{ statusLabel }}
        </el-tag>
      </div>
      <div class="crc-form__header-actions">
        <el-button text size="small" @click="$emit('close')">
          <template #icon>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
          </template>
          Fermer
        </el-button>
      </div>
    </div>

    <div class="crc-form__contact-bar">
      <div class="crc-form__contact-bar-left">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="5" r="2.5" stroke="currentColor" stroke-width="0.8"/>
          <path d="M2 12.5C2 10.2909 4.23858 8.5 7 8.5C9.76142 8.5 12 10.2909 12 12.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
        </svg>
        <span class="crc-form__contact-label">Patient :</span>
        <span class="crc-form__contact-value">{{ contactDisplay }}</span>
        <el-tag v-if="!contactId" type="danger" size="small" effect="plain">Aucun contact</el-tag>
      </div>
      <div class="crc-form__contact-bar-right">
        <el-tag v-if="patientAge != null" size="small" effect="plain" type="info">
          {{ patientAge }} ans
        </el-tag>
      </div>
    </div>

    <div class="crc-form__badges" v-if="hasActiveBadges">
      <el-alert
        v-if="showAllergyAlert"
        title="Alerte allergie"
        type="error"
        show-icon
        :closable="false"
        class="crc-form__badge-alert"
      />
      <el-alert
        v-if="glasgowIsSevere"
        title="Coma - Alerte réanimation"
        type="error"
        show-icon
        :closable="false"
        class="crc-form__badge-alert crc-form__badge-alert--pulse"
      >
        <template #default>
          Score de Glasgow ≤ 8. Alerte réanimation.
        </template>
      </el-alert>
    </div>

    <el-tabs v-model="activeTab" type="border-card" class="crc-form__tabs">
      <el-tab-pane name="admission">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" stroke-width="0.8"/>
              <path d="M4.5 4.5H9.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M4.5 7H9.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M4.5 9.5H7.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
            <span>Admission</span>
          </span>
        </template>
        <AdmissionTab
          :data="formData.admission"
          :readonly="readonly"
          @change="onFieldChange"
        />
      </el-tab-pane>
      <el-tab-pane name="modeVie">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="4" r="2.5" stroke="currentColor" stroke-width="0.8"/>
              <path d="M2 12C2 9.79086 4.23858 8 7 8C9.76142 8 12 9.79086 12 12" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
            <span>Mode de Vie / ATCD</span>
          </span>
        </template>
        <ModeVieAtcdTab :data="formData.modeVieAtcd" @change="onFieldChange" />
      </el-tab-pane>
      <el-tab-pane name="ficheDiabete">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L9.5 5.5L14 6.5L10.5 10L11.5 14L7 11.5L2.5 14L3.5 10L0 6.5L4.5 5.5L7 1Z" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.08"/>
            </svg>
            <span>Fiche Diabète</span>
          </span>
        </template>
        <FicheDiabeteTab :data="formData.ficheDiabete" :sexe="activePatient?.civilite === 'M' ? 'M' : 'F'" :age="patientAge" :date-entree="formData.admission.dateEntree" @change="onFieldChange" />
      </el-tab-pane>
      <el-tab-pane name="bilanInitial">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3H12" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M2 7H12" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M2 11H12" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <rect x="0.5" y="0.5" width="13" height="13" rx="1.5" stroke="currentColor" stroke-width="0.8"/>
            </svg>
            <span>Bilan Initial</span>
          </span>
        </template>
        <BilanInitialTab :data="formData.bilanInitial" @change="onFieldChange" />
      </el-tab-pane>
      <el-tab-pane name="examens">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="0.8"/>
              <path d="M7 4V7L9 9" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
            <span>Examens Compl.</span>
          </span>
        </template>
        <ExamensComplementairesTab :data="formData.examensComplementaires" :patient-id="activePatient?.id" @change="onFieldChange" />
      </el-tab-pane>
      <el-tab-pane name="evolution">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7L4 4L7 7L10 4L13 7" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M1 10L4 7L7 10L10 7L13 10" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 2"/>
            </svg>
            <span>Évolution</span>
          </span>
        </template>
        <EvolutionMedicaleTab :data="formData.evolutionMedicale" @change="onFieldChange" />
      </el-tab-pane>
      <el-tab-pane name="ordonnance">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.06"/>
              <path d="M5 4.5H9" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M5 6.5H8" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M5 8.5H7" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <circle cx="9.5" cy="10.5" r="2.5" stroke="currentColor" stroke-width="0.8" fill="var(--el-bg-color)"/>
              <path d="M9.5 9.2V11.8" stroke="currentColor" stroke-width="0.7" stroke-linecap="round"/>
              <path d="M8.2 10.5H10.8" stroke="currentColor" stroke-width="0.7" stroke-linecap="round"/>
            </svg>
            <span>Ordonnance</span>
          </span>
        </template>
        <OrdonnanceSortieTab :data="formData.ordonnanceSortie" :readonly="readonly" @change="onFieldChange" />
      </el-tab-pane>
      <el-tab-pane name="sortie">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M10 2L13 5L10 8" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M1 5H10" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M13 9V12C13 12.5523 12.5523 13 12 13H2C1.44772 13 1 12.5523 1 12V3" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
            <span>Sortie</span>
          </span>
        </template>
        <SortieTab :data="formData.sortie" @change="onFieldChange" />
      </el-tab-pane>
    </el-tabs>

    <div class="crc-form__footer">
      <div class="crc-form__footer-left">
        <span class="crc-form__draft-status" v-if="draftStatus">{{ draftStatus }}</span>
      </div>
      <div class="crc-form__footer-right">
        <el-button
          size="default"
          @click="handlePreview"
        >
          <template #icon>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1.5 7C1.5 7 3.5 3.5 7 3.5C10.5 3.5 12.5 7 12.5 7C12.5 7 10.5 10.5 7 10.5C3.5 10.5 1.5 7 1.5 7Z" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>
              <circle cx="7" cy="7" r="1.8" stroke="currentColor" stroke-width="1"/>
            </svg>
          </template>
          Prévisualisation
        </el-button>
        <el-button
          :loading="pdfLoading"
          size="default"
          @click="handleExportPdf"
        >
          <template #icon>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 9.5V11.5C2 12.0523 2.44772 12.5 3 12.5H11C11.5523 12.5 12 12.0523 12 11.5V9.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
              <path d="M7 2V9M7 9L4.5 6.5M7 9L9.5 6.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </template>
          Télécharger PDF
        </el-button>
        <el-button
          :loading="saving"
          :disabled="readonly"
          size="default"
          @click="handleSaveDraft"
        >
          Enregistrer Brouillon
        </el-button>
        <el-button
          v-if="!readonly"
          type="primary"
          :loading="signing"
          :disabled="saving || signing"
          size="default"
          @click="handleSign"
        >
          Signer et Verrouiller
        </el-button>
      </div>
    </div>

    <HtmlPreviewDialog
      ref="previewDialogRef"
      title="Aperçu du compte-rendu de consultation"
      channel="export:crc-diabete-preview"
      download-channel="export:crc-diabete-pdf"
      :params="previewParams"
    />

    <ParameterHistoryDialog
      v-model="historyDialogOpen"
      :title="historyDialogTitle"
      :path="historyDialogPath"
      :loading="historyLoading"
      :entries="historyEntries"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { CrcDiabeteFormData } from '@/types/crc-diabete'
import { createDefaultFormData } from '@/types/crc-diabete'
import { useCrhDiabeteCalculations } from '@/composables/useCrhDiabeteCalculations'
import { usePatientContext } from '@/composables/usePatientContext'
import { useEncounters } from '@/composables/useEncounters'
import { useExport } from '@/composables/useExport'
import { useAuth } from '@/composables/useAuth'
import { usePatients } from '@/composables/usePatients'
import { formatMedecinName } from '@/composables/useMedicalStaff'
import AdmissionTab from './AdmissionTab.vue'
import ModeVieAtcdTab from './ModeVieAtcdTab.vue'
import FicheDiabeteTab from './FicheDiabeteTab.vue'
import BilanInitialTab from './BilanInitialTab.vue'
import ExamensComplementairesTab from './ExamensComplementairesTab.vue'
import EvolutionMedicaleTab from './EvolutionMedicaleTab.vue'
import OrdonnanceSortieTab from './OrdonnanceSortieTab.vue'
import SortieTab from './SortieTab.vue'
import ParameterHistoryDialog from './ParameterHistoryDialog.vue'
import HtmlPreviewDialog from '@/components/common/HtmlPreviewDialog.vue'
import { fetchParameterHistory, type ParameterHistoryEntry } from '@/composables/useParameterHistory'
import { getParameterMeta } from '@/utils/parameter-history'

const props = defineProps<{
  modelValue: Record<string, any>
  readonly: boolean
  contactId: string | null
  contactDisplay: string
  documentId?: string | null
  documentCreatedAt?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
  save: [formData: Record<string, any>]
  sign: []
  close: []
}>()
const { getEncounter } = useEncounters()

const { calcAge, calcGlasgowScore } = useCrhDiabeteCalculations()
const { activePatient } = usePatientContext()
const { exportCrcDiabetePdf } = useExport()
const { user } = useAuth()
const { updatePatient } = usePatients()

const formData = ref<CrcDiabeteFormData>(createDefaultFormData())

onMounted(async () => {
  if (user.value) {
    formData.value.admission.interneIPANom = formatMedecinName(user.value as any)
  }

  if (props.documentCreatedAt) {
    formData.value.admission.dateEntree = props.documentCreatedAt.split('T')[0]
  }

  if (activePatient.value?.medecin_traitant) {
    formData.value.admission.medecinTraitantNom = activePatient.value.medecin_traitant
  }

  if (!props.contactId) return
  try {
    const encounter = await getEncounter(Number(props.contactId))
    if (encounter) {
      if (!formData.value.admission.dateEntree) {
        formData.value.admission.dateEntree = encounter.start_date?.split('T')[0] || ''
      }
      formData.value.admission.serviceAccueil = encounter.service_name || ''
    }
  } catch { /* silent */ }

  // Sync allergies from patient file
  if (activePatient.value?.allergies?.length && formData.value.modeVieAtcd.allergies.length === 0) {
    formData.value.modeVieAtcd.allergies = activePatient.value.allergies.map((a: any) => {
      if (typeof a === 'string') {
        return { libelle: a, type: 'Autre' as const }
      }
      return { libelle: a.libelle || '', type: a.type || 'Autre' as const }
    })
  }
})

// Sync allergies back to patient file
watch(() => formData.value.modeVieAtcd.allergies, async (newAllergies) => {
  if (!activePatient.value || props.readonly) return
  if (!Array.isArray(newAllergies)) return
  const patientAllergies = newAllergies.map((a: any) => ({
    libelle: a.libelle || String(a),
    type: a.type || 'Autre',
  }))
  const current = activePatient.value.allergies || []
  if (JSON.stringify(patientAllergies) !== JSON.stringify(current)) {
    activePatient.value.allergies = patientAllergies as any
    try {
      await updatePatient({ ...activePatient.value, allergies: patientAllergies } as any)
    } catch { /* silent */ }
  }
}, { deep: true })

const activeTab = ref('admission')
const saving = ref(false)
const signing = ref(false)
const pdfLoading = ref(false)
const draftStatus = ref('')
let saveTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.modelValue, (val) => {
  if (val && Object.keys(val).length > 0) {
    mergeFormData(val)
  }
}, { immediate: true, deep: true })

onUnmounted(() => {
  if (saveTimer) clearTimeout(saveTimer)
})

function mergeFormData(val: Record<string, any>) {
  const defaults = createDefaultFormData()
  const keys = Object.keys(defaults) as (keyof CrcDiabeteFormData)[]
  for (const key of keys) {
    if (val[key] && typeof val[key] === 'object') {
      // Préserver les tableaux tels quels (les spread en objet brisent .push())
      if (Array.isArray(defaults[key])) {
        (formData.value as any)[key] = Array.isArray(val[key]) ? val[key] : defaults[key]
      } else {
        (formData.value as any)[key] = { ...defaults[key], ...val[key] }
      }
    }
  }
  // Normalize legacy: allergies/antecedents may be strings from old saved data
  const mv = formData.value.modeVieAtcd
  if (!Array.isArray(mv.allergies)) {
    const legacy = mv.allergies as unknown
    mv.allergies = typeof legacy === 'string' && legacy.trim() !== ''
      ? [{ libelle: legacy, type: 'Autre' }]
      : []
  }
  if (!Array.isArray(mv.antecedents)) {
    const legacy = mv.antecedents as unknown
    mv.antecedents = typeof legacy === 'string' && legacy.trim() !== ''
      ? [{ libelle: legacy, annee: '', type: 'Familiale' }]
      : []
  }
  // Even older drafts stored modeVieAtcd.antecedentsMedicaux as a plain string
  // (pre-`antecedents` rename). Seed `antecedents` when no array content exists
  // (covers drafts that have no `antecedents` key at all).
  if (mv.antecedents.length === 0) {
    const legacyMedicaux = (mv as unknown as Record<string, unknown>).antecedentsMedicaux
    if (typeof legacyMedicaux === 'string' && legacyMedicaux.trim() !== '') {
      mv.antecedents = [{ libelle: legacyMedicaux, annee: '', type: 'Familiale' }]
    }
  }
  // One-shot migration: drop the legacy key so a deliberately emptied
  // `antecedents` array is not re-seeded on every subsequent load.
  delete (mv as Record<string, unknown>).antecedentsMedicaux
  const exams = formData.value.examensComplementaires as Record<string, unknown>
  delete exams.radioPied
  delete exams.ecgRepos
  delete exams.echographieCardiaque
  delete exams.actesInterventionnels
}

function flattenFormData(data: CrcDiabeteFormData): Record<string, any> {
  return JSON.parse(JSON.stringify(data))
}

const patientAge = computed(() => {
  const dateNaissance = activePatient.value?.date_naissance
  return calcAge(dateNaissance || '', formData.value.admission.dateEntree)
})

const statusType = computed(() => {
  return props.readonly ? 'success' : 'warning'
})

const statusLabel = computed(() => {
  return props.readonly ? 'Signé' : 'Brouillon'
})

const showAllergyAlert = computed(() => {
  return formData.value.modeVieAtcd.allergies.length > 0
})

const glasgowScore = computed(() => {
  return calcGlasgowScore(
    formData.value.bilanInitial.glasgow.ouvertureYeux,
    formData.value.bilanInitial.glasgow.reponseVerbale,
    formData.value.bilanInitial.glasgow.reponseMotrice,
  )
})

const glasgowIsSevere = computed(() => {
  return glasgowScore.value != null && glasgowScore.value > 0 && glasgowScore.value <= 8
})

const hasActiveBadges = computed(() => {
  return showAllergyAlert.value || glasgowIsSevere.value
})

const CRC_DOCUMENT_TYPE_CODES = ['CRC_DIABETE']

const historyDialogOpen = ref(false)
const historyDialogTitle = ref('')
const historyDialogPath = ref('')
const historyLoading = ref(false)
const historyEntries = ref<ParameterHistoryEntry[]>([])

async function onFormCellClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  // Ignore clicks inside interactive controls (input, buttons, pickers…)
  if (target.closest('input, textarea, button, select, .el-input, .el-input-number, .el-select, .el-date-editor, .el-radio, .el-checkbox, .el-switch')) return
  const formItem = target.closest('[data-history-path]') as HTMLElement | null
  if (!formItem) return
  const path = formItem.getAttribute('data-history-path')
  if (!path || !getParameterMeta(path)) return
  event.preventDefault()
  historyDialogTitle.value = `Historique — ${getParameterMeta(path)?.label ?? path}`
  historyDialogPath.value = path
  historyDialogOpen.value = true
  historyLoading.value = true
  historyEntries.value = []
  try {
    const entries = await fetchParameterHistory(activePatient.value?.id, CRC_DOCUMENT_TYPE_CODES, path)
    // Discard stale responses if the user clicked another field meanwhile.
    if (historyDialogPath.value !== path) return
    historyEntries.value = entries
  } catch {
    // ipcInvoke already surfaces the toast; don't leave a misleading
    // "Aucun historique pour ce paramètre" state on failure.
    historyDialogOpen.value = false
  } finally {
    if (historyDialogPath.value === path) historyLoading.value = false
  }
}

function onFieldChange() {
  if (saveTimer) clearTimeout(saveTimer)
  draftStatus.value = 'Modifications non enregistrées...'
  saveTimer = setTimeout(() => {
    if (!props.readonly) {
      handleAutoSave()
    }
  }, 5000)
}

function handleAutoSave() {
  draftStatus.value = 'Sauvegarde...'
  emit('save', flattenFormData(formData.value))
  setTimeout(() => { draftStatus.value = 'Brouillon enregistré'; setTimeout(() => { draftStatus.value = '' }, 2000) }, 300)
}

async function handleSaveDraft() {
  saving.value = true
  draftStatus.value = 'Sauvegarde...'
  emit('save', flattenFormData(formData.value))
  setTimeout(() => { draftStatus.value = 'Brouillon enregistré'; saving.value = false; setTimeout(() => { draftStatus.value = '' }, 2000) }, 300)
}

async function handleSign() {
  try {
    await ElMessageBox.confirm(
      'Êtes-vous sûr de vouloir signer et verrouiller ce document ? Cette action est irréversible.',
      'Confirmation de signature',
      { confirmButtonText: 'Signer', cancelButtonText: 'Annuler', type: 'warning' },
    )
  } catch {
    return
  }
  if (saveTimer) clearTimeout(saveTimer)
  signing.value = true
  emit('save', flattenFormData(formData.value))
  await nextTick()
  emit('sign')
  signing.value = false
}

async function handleExportPdf() {
  if (!activePatient.value) {
    ElMessage.warning('Aucun patient actif. Enregistrez d\'abord le document pour générer le PDF')
    return
  }
  await exportCrcDiabetePdf({
    documentId: props.documentId,
    patientId: activePatient.value?.id ?? null,
    contactId: props.contactId,
    formData: flattenFormData(formData.value),
  })
}

const previewDialogRef = ref<InstanceType<typeof HtmlPreviewDialog> | null>(null)

const previewParams = computed(() => ({
  documentId: props.documentId,
  patientId: activePatient.value?.id ?? null,
  contactId: props.contactId,
  formData: flattenFormData(formData.value),
}))

function handlePreview() {
  if (!activePatient.value) {
    ElMessage.warning('Aucun patient actif. Enregistrez d\'abord le document pour prévisualiser le PDF')
    return
  }
  previewDialogRef.value?.open()
}
</script>

<style scoped lang="scss">
.crc-form {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
}

.crc-form__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--cd-white);
  flex-shrink: 0;
}

.crc-form__header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.crc-form__title-icon {
  display: flex;
  align-items: center;
  color: var(--cd-primary);
  opacity: 0.7;
}

.crc-form__title-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.crc-form__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--cd-gray-900);
  margin: 0;
  line-height: 1.2;
}

.crc-form__subtitle {
  font-size: 11px;
  color: var(--cd-gray-400);
  font-weight: 400;
}

.crc-form__header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.crc-form__contact-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background: var(--cd-gray-50);
  border-bottom: 1px solid var(--el-border-color-light);
  font-size: 13px;
  color: var(--cd-gray-500);
  flex-shrink: 0;
}

.crc-form__contact-bar-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.crc-form__contact-bar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.crc-form__contact-label {
  font-weight: 600;
  color: var(--cd-gray-600);
}

.crc-form__contact-value {
  color: var(--cd-gray-900);
  font-weight: 500;
}

.crc-form__badges {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 20px 0;
  flex-shrink: 0;
}

.crc-form__badge-alert {
  margin: 0;

  &:deep(.el-alert__content) {
    gap: 2px;
  }
}

.crc-form__badge-alert--pulse {
  animation: pulse-alert 2s ease-in-out infinite;
}

@keyframes pulse-alert {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.crc-form__tabs {
  flex: 1;
  overflow: auto;
  margin: 8px 16px;
  display: flex;
  flex-direction: column;

  :deep(.el-tabs__content) {
    flex: 1;
    overflow: auto;
    padding: 20px;
  }

  :deep(.el-tabs__header) {
    margin: 0;
  }

  :deep(.el-tabs__nav-wrap) {
    padding: 0;
  }

  :deep(.el-tabs__item) {
    font-size: 12px;
    padding: 0 14px;
    height: 38px;
    line-height: 38px;
  }
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;

  svg {
    flex-shrink: 0;
    opacity: 0.6;
  }
}

.crc-form__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-top: 1px solid var(--el-border-color-light);
  background: var(--cd-white);
  flex-shrink: 0;
}

.crc-form__footer-left {
  flex: 1;
}

.crc-form__draft-status {
  font-size: 12px;
  color: var(--el-color-primary);
  font-style: italic;
}

.crc-form__footer-right {
  display: flex;
  gap: 8px;
}
</style>
