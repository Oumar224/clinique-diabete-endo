<template>
  <div class="crc-form" :class="{ 'crc-form--fullpage': hideHeader }">
    <div v-if="!hideHeader" class="crc-form__header">
      <div class="crc-form__header-left">
        <div class="crc-form__title-icon">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1.5" y="3.5" width="15" height="11" rx="1.5" stroke="currentColor" stroke-width="1" fill="currentColor" fill-opacity="0.08"/>
            <path d="M5.5 7H12.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
            <path d="M5.5 9.5H10.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="crc-form__title-group">
          <h3 class="crc-form__title">Compte Rendu de Consultation — Obésité</h3>
          <span class="crc-form__subtitle">CRC Obésité</span>
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

    <DossierPatientHeader :contact-display="contactDisplay" :admission="formData.admission" :prominent="hideHeader" />

    <div class="crc-form__badges" v-if="hasActiveBadges">
      <el-alert
        v-if="showAllergyAlert"
        title="Alerte allergie"
        type="error"
        show-icon
        :closable="false"
        class="crc-form__badge-alert"
      />
    </div>

    <el-tabs v-model="activeTab" type="border-card" class="crc-form__tabs">
      <el-tab-pane name="identite">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" stroke-width="0.8"/>
              <path d="M4.5 4.5H9.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M4.5 7H9.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M4.5 9.5H7.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
            <span>Identité</span>
          </span>
        </template>
        <IdentiteObesiteTab
          :data="formData.admission"
          :infos="formData.informationsComplementaires"
          :date-entree="formData.admission.dateEntree"
          :readonly="readonly"
          @change="onFieldChange"
        />
      </el-tab-pane>
      <el-tab-pane name="motif">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="4" r="2.5" stroke="currentColor" stroke-width="0.8"/>
              <path d="M2 12C2 9.79086 4.23858 8 7 8C9.76142 8 12 9.79086 12 12" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
            <span>Motif &amp; profil</span>
          </span>
        </template>
        <MotifProfilObesiteTab :data="formData.motifProfil" :readonly="readonly" @change="onFieldChange" />
      </el-tab-pane>
      <el-tab-pane name="antecedents">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L9.5 5.5L14 6.5L10.5 10L11.5 14L7 11.5L2.5 14L3.5 10L0 6.5L4.5 5.5L7 1Z" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.08"/>
            </svg>
            <span>Antécédents</span>
          </span>
        </template>
        <AntecedentsObesiteTab :data="formData.modeVieAtcd" :readonly="readonly" @change="onFieldChange" />
      </el-tab-pane>
      <el-tab-pane name="parametres">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3H12" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M2 7H12" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M2 11H12" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <rect x="0.5" y="0.5" width="13" height="13" rx="1.5" stroke="currentColor" stroke-width="0.8"/>
            </svg>
            <span>Paramètres</span>
          </span>
        </template>
        <ParametresCliniquesObesiteTab
          :data="formData.bilanInitial"
          :readonly="readonly"
          :patient-id="activePatient?.id != null ? String(activePatient.id) : undefined"
          @change="onFieldChange"
          @open-history="openParameterHistory"
          @open-multi-history="openMultiHistory"
        />
      </el-tab-pane>
      <el-tab-pane name="alimentation">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="0.8"/>
              <path d="M7 4V7L9 9" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
            <span>Alimentation</span>
          </span>
        </template>
        <ComportementAlimentaireObesiteTab :data="formData.comportementAlimentaire" :readonly="readonly" @change="onFieldChange" />
      </el-tab-pane>
      <el-tab-pane name="psy">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7L4 4L7 7L10 4L13 7" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M1 10L4 7L7 10L10 7L13 10" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 2"/>
            </svg>
            <span>Psy / Objectifs</span>
          </span>
        </template>
        <PsySocialObjectifsObesiteTab :data="formData.psySocial" :objectifs="formData.objectifsPonderaux" :readonly="readonly" @change="onFieldChange" />
      </el-tab-pane>
      <el-tab-pane name="conclusion">
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
            <span>Conclusion &amp; Projet</span>
          </span>
        </template>
        <ConclusionProjetObesiteTab
          :data="formData.conclusion"
          :projet="formData.projetTherapeutique"
          :examen-physique="formData.bilanInitial.examenPhysique"
          :readonly="readonly"
          @change="onFieldChange"
        />
      </el-tab-pane>
      <el-tab-pane name="suivi">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M10 2L13 5L10 8" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M1 5H10" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M13 9V12C13 12.5523 12.5523 13 12 13H2C1.44772 13 1 12.5523 1 12V3" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
            <span>Suivi</span>
          </span>
        </template>
        <SuiviObesiteTab
          :data="formData.suivi"
          :vital-signs-history="formData.bilanInitial.vitalSignsHistory"
          :readonly="readonly"
          @change="onFieldChange"
        />
      </el-tab-pane>
      <el-tab-pane name="evolution">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3H12" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M2 7H12" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M2 11H12" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <rect x="0.5" y="0.5" width="13" height="13" rx="1.5" stroke="currentColor" stroke-width="0.8"/>
            </svg>
            <span>Évolution pondérale</span>
          </span>
        </template>
        <EvolutionPonderaleObesiteTab :data="formData.evolutionPonderale" :readonly="readonly" @change="onFieldChange" />
      </el-tab-pane>
      <el-tab-pane name="examens">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="0.8"/>
              <path d="M7 4V7L9 9" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
            <span>Examens compl.</span>
          </span>
        </template>
        <ExamensComplementairesTab :data="formData.examensComplementaires" :patient-id="activePatient?.id ?? null" :readonly="readonly" @change="onFieldChange" />
      </el-tab-pane>
      <el-tab-pane name="ordonnance">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.06"/>
              <path d="M5 4.5H9" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M5 6.5H8" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M5 8.5H7" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
            <span>Ordonnance</span>
          </span>
        </template>
        <OrdonnanceSortieTab
          :data="formData.ordonnanceSortie"
          :readonly="readonly"
          :patient-id="activePatient?.id ?? null"
          :date-entree="formData.admission.dateEntree"
          @change="onFieldChange"
          @generate="onOrdonnanceGenerate"
          @generate-item="onOrdonnanceGenerateItem"
        />
      </el-tab-pane>
      <el-tab-pane name="annexe">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="2" width="11" height="10" rx="1.5" stroke="currentColor" stroke-width="0.8"/>
              <circle cx="4.8" cy="5.2" r="1.2" stroke="currentColor" stroke-width="0.8"/>
              <path d="M2.5 11L5.5 8L7.5 9.5L9.5 7.5L11.5 10" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Annexe</span>
          </span>
        </template>
        <AnnexeTab
          :document-id="annexeDocumentId"
          :readonly="readonly"
          @change="onFieldChange"
        />
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
          {{ resigning ? 'Resigner' : 'Signer' }}
        </el-button>
      </div>
    </div>

    <HtmlPreviewDialog
      ref="previewDialogRef"
      title="Aperçu du compte-rendu de consultation"
      channel="export:crc-obesite-preview"
      download-channel="export:crc-obesite-pdf"
      :params="previewParams"
    />

    <ParameterHistoryDialog
      v-model="historyDialogOpen"
      :title="historyDialogTitle"
      :path="historyDialogPath"
      :loading="historyLoading"
      :entries="historyEntries"
    />

    <ParameterMultiHistoryDialog
      v-model="multiHistoryDialogOpen"
      :title="multiHistoryTitle"
      :series="multiHistorySeries"
      :loading="multiHistoryLoading"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { CrcObesiteFormData } from '@/types/crc-obesite'
import { createDefaultFormData } from '@/types/crc-obesite'
import type { PrescriptionSortie } from '@/types/crc-diabete'
import { usePatientContext } from '@/composables/usePatientContext'
import { useEncounters } from '@/composables/useEncounters'
import { useExport } from '@/composables/useExport'
import { useAuth } from '@/composables/useAuth'
import { usePatients } from '@/composables/usePatients'
import { formatMedecinName } from '@/composables/useMedicalStaff'
import IdentiteObesiteTab from './obesite/IdentiteObesiteTab.vue'
import MotifProfilObesiteTab from './obesite/MotifProfilObesiteTab.vue'
import AntecedentsObesiteTab from './obesite/AntecedentsObesiteTab.vue'
import ParametresCliniquesObesiteTab from './obesite/ParametresCliniquesObesiteTab.vue'
import ComportementAlimentaireObesiteTab from './obesite/ComportementAlimentaireObesiteTab.vue'
import PsySocialObjectifsObesiteTab from './obesite/PsySocialObjectifsObesiteTab.vue'
import ConclusionProjetObesiteTab from './obesite/ConclusionProjetObesiteTab.vue'
import SuiviObesiteTab from './obesite/SuiviObesiteTab.vue'
import EvolutionPonderaleObesiteTab from './obesite/EvolutionPonderaleObesiteTab.vue'
import ExamensComplementairesTab from './ExamensComplementairesTab.vue'
import OrdonnanceSortieTab from './OrdonnanceSortieTab.vue'
import AnnexeTab from './AnnexeTab.vue'
import ParameterHistoryDialog from './ParameterHistoryDialog.vue'
import ParameterMultiHistoryDialog, { type MultiHistorySeries } from './ParameterMultiHistoryDialog.vue'
import HtmlPreviewDialog from '@/components/common/HtmlPreviewDialog.vue'
import DossierPatientHeader from './DossierPatientHeader.vue'
import { fetchParameterHistory, fetchParametersHistory, type ParameterHistoryEntry } from '@/composables/useParameterHistory'
import { getParameterMeta, getFieldValue, PARAMETER_GROUPS, type ParameterGroupKey } from '@/utils/parameter-history'
import { formatDate } from '@/utils/date'
import { useOrdonnanceLibre } from '@/composables/useOrdonnanceLibre'

const props = defineProps<{
  modelValue: Record<string, any>
  readonly: boolean
  contactId: string | null
  contactDisplay: string | null
  documentId?: string | null
  documentCreatedAt?: string | null
  resigning?: boolean
  hideHeader?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
  save: [formData: Record<string, any>]
  sign: []
  close: []
}>()
const { getEncounter } = useEncounters()

const { activePatient } = usePatientContext()
const { exportCrcObesitePdf } = useExport()
const { user } = useAuth()
const { updatePatient } = usePatients()
const { createOrReplaceFromGroup, findCrhGroupOrdonnance } = useOrdonnanceLibre()

const docTypeLabel = 'CRC Obésité'

const annexeDocumentId = computed<string | null>(() => props.documentId || null)

const formData = ref<CrcObesiteFormData>(createDefaultFormData())

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

const activeTab = ref('identite')
const saving = ref(false)
const signing = ref(false)
const pdfLoading = ref(false)
const draftStatus = ref('')
let saveTimer: ReturnType<typeof setTimeout> | null = null

// Payload of the last `save` emit. An incoming `modelValue` snapshot that is
// identical to it is round-trip feedback of our own save — the live form must
// win so a stale echo never regresses an in-flight (staged or direct) edit.
let lastEmittedSnapshot: Record<string, any> | null = null

// Every snapshot this form has emitted via `emit('save')`. An incoming
// `modelValue` that matches ANY of them — not just the latest — is round-trip
// feedback of our own save, so the live form wins even when an older echo
// lands after `lastEmittedSnapshot` was replaced by a newer emission.
const emittedSnapshots = new Set<string>()

function trackEmittedSnapshot(snapshot: Record<string, any>) {
  emittedSnapshots.add(JSON.stringify(snapshot))
  if (emittedSnapshots.size > 20) {
    const oldest = emittedSnapshots.values().next().value
    if (oldest !== undefined) emittedSnapshots.delete(oldest)
  }
}

function isEmittedSection(key: string, incoming: unknown): boolean {
  for (const snap of emittedSnapshots) {
    const emitted = JSON.parse(snap) as Record<string, unknown>
    if (emitted[key] !== undefined && jsonEquals(incoming, emitted[key])) return true
  }
  return false
}

// Content of the last `modelValue` snapshot merged into `formData`. The deep
// props watcher can re-fire on internal `formData` writes (Vue tracks the
// deep reads it performs during traversal). Re-merging from an UNCHANGED
// snapshot is a no-op that only risks wiping newer in-flight edits, so it is
// skipped: the props→formData sync is idempotent.
let lastMergedInput: Record<string, any> | null = null

watch(() => props.modelValue, (val) => {
  if (val && Object.keys(val).length > 0) {
    if (lastMergedInput && jsonEquals(val, lastMergedInput)) return
    mergeFormData(val)
    lastMergedInput = val
  }
}, { immediate: true, deep: true })

onUnmounted(() => {
  if (saveTimer) clearTimeout(saveTimer)
})

function jsonEquals(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function mergeObjectSection(
  key: string,
  incoming: Record<string, any>,
  live: Record<string, any>,
  defaults: Record<string, any>,
): Record<string, any> {
  // Incoming section matches any snapshot we emitted → our own echo, even a
  // stale one → keep the live (possibly newer) section untouched.
  if (isEmittedSection(key, incoming)) return live
  const base = { ...(defaults[key] as Record<string, any>), ...incoming }
  const baseline = lastEmittedSnapshot?.[key]
  if (baseline == null) return base
  const out: Record<string, any> = { ...base }
  for (const [path, liveVal] of Object.entries(live)) {
    const incomingVal = incoming[path]
    // Incoming value is only feedback of our own save (identical to what we
    // last emitted) → keep the live, possibly newer, value.
    if (incomingVal === undefined || jsonEquals(incomingVal, baseline[path])) {
      out[path] = liveVal
    }
  }
  return out
}

function mergeArraySection(key: string, incoming: unknown, live: unknown): unknown {
  if (isEmittedSection(key, incoming)) return live
  if (!Array.isArray(incoming)) return Array.isArray(live) ? live : []
  const baseline = lastEmittedSnapshot?.[key]
  if (Array.isArray(live) && baseline != null && jsonEquals(incoming, baseline)) {
    return live
  }
  return incoming
}

function mergeFormData(val: Record<string, any>) {
  const defaults = createDefaultFormData()
  const keys = Object.keys(defaults) as (keyof CrcObesiteFormData)[]
  for (const key of keys) {
    if (val[key] && typeof val[key] === 'object') {
      // Préserver les tableaux tels quels (les spread en objet brisent .push())
      if (Array.isArray(defaults[key])) {
        (formData.value as any)[key] = mergeArraySection(key as string, val[key], formData.value[key])
      } else {
        (formData.value as any)[key] = mergeObjectSection(
          key as string,
          val[key],
          (formData.value as any)[key] ?? {},
          defaults,
        )
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
}

function flattenFormData(data: CrcObesiteFormData): Record<string, any> {
  return JSON.parse(JSON.stringify(data))
}

const statusType = computed(() => {
  return props.resigning ? 'success' : 'warning'
})

const statusLabel = computed(() => {
  return props.resigning ? 'Signé' : 'Brouillon'
})

const showAllergyAlert = computed(() => {
  return formData.value.modeVieAtcd.allergies.length > 0
})

const hasActiveBadges = computed(() => {
  return showAllergyAlert.value
})

const CRC_DOCUMENT_TYPE_CODES = ['CRC_OBESITE', 'CRC_DIABETE']

const historyDialogOpen = ref(false)
const historyDialogTitle = ref('')
const historyDialogPath = ref('')
const historyLoading = ref(false)
const historyEntries = ref<ParameterHistoryEntry[]>([])

async function openParameterHistory(path: string) {
  if (!path || !getParameterMeta(path)) return
  historyDialogTitle.value = `Historique — ${getParameterMeta(path)?.label ?? path}`
  historyDialogPath.value = path
  historyDialogOpen.value = true
  historyLoading.value = true
  historyEntries.value = []
  try {
    const entries = await fetchParameterHistory(activePatient.value?.id, CRC_DOCUMENT_TYPE_CODES, path)
    // Discard stale responses if the user clicked another field meanwhile.
    if (historyDialogPath.value !== path) return
    historyEntries.value = mergeWithCurrentEntries(path, entries)
  } catch {
    // ipcInvoke already surfaces the toast; don't leave a misleading
    // "Aucun historique pour ce paramètre" state on failure.
    historyDialogOpen.value = false
  } finally {
    if (historyDialogPath.value === path) historyLoading.value = false
  }
}

const MULTI_GROUP_TITLES: Record<ParameterGroupKey, string> = {
  vitals: 'Vitaux',
  glasgow: 'Glasgow',
  douleur: 'Douleur',
  ficheTabac: 'Tabac',
  ficheSubstance: 'Substance',
  traitementMeds: 'Traitement – Médicaments',
  traitementHabituel: 'Traitement habituel',
  surveillance: 'Surveillance glycémique',
}

const multiHistoryDialogOpen = ref(false)
const multiHistoryTitle = ref('')
const multiHistorySeries = ref<MultiHistorySeries[]>([])
const multiHistoryLoading = ref(false)
let multiHistoryRequestId = 0

function extractUnit(label: string): string | undefined {
  const match = label.match(/\(([^)]+)\)\s*$/)
  return match ? match[1].trim() : undefined
}

/** Valeurs du document actuel (non encore sauvegardé) fusionnées avec l'historique archivé. */
function currentEntriesForPath(path: string): ParameterHistoryEntry[] {
  const meta = getParameterMeta(path)
  if (!meta) return []
  const raw = meta.extract
    ? meta.extract(formData.value as unknown as Record<string, any>)
    : getFieldValue(formData.value, path)
  const now = new Date().toISOString()
  if (Array.isArray(raw)) {
    return (raw as Array<{ date: string; value: unknown }>)
      .filter((e) => e && e.value != null && e.value !== '')
      .map((e) => ({
        date: e.date || now,
        documentId: 'current',
        documentLabel: 'Document actuel',
        status: 'draft' as const,
        value: e.value,
      }))
  }
  if (raw == null || raw === '') return []
  return [{ date: now, documentId: 'current', documentLabel: 'Document actuel', status: 'draft' as const, value: raw }]
}

function mergeWithCurrentEntries(path: string, archived: ParameterHistoryEntry[]): ParameterHistoryEntry[] {
  const current = currentEntriesForPath(path)
  if (!current.length) return archived
  const seen = new Set(archived.map((e) => `${e.date}|${String(e.value)}|${e.documentId}`))
  const extra = current.filter((e) => !seen.has(`${e.date}|${String(e.value)}|${e.documentId}`))
  return [...extra, ...archived].sort((a, b) => b.date.localeCompare(a.date))
}

async function openMultiHistory(group: string) {
  if (!(group in PARAMETER_GROUPS)) return
  const key = group as ParameterGroupKey
  const paths = PARAMETER_GROUPS[key]
  const requestId = ++multiHistoryRequestId
  multiHistoryTitle.value = `Historique CRC — ${MULTI_GROUP_TITLES[key]}`
  multiHistorySeries.value = []
  multiHistoryDialogOpen.value = true
  multiHistoryLoading.value = true
  try {
    const byPath = await fetchParametersHistory(activePatient.value?.id, CRC_DOCUMENT_TYPE_CODES, paths)
    if (requestId !== multiHistoryRequestId) return
    multiHistorySeries.value = paths.map((path) => {
      const meta = getParameterMeta(path)
      const label = meta?.label ?? path
      return {
        path,
        label,
        unit: extractUnit(label),
        entries: mergeWithCurrentEntries(path, byPath[path] ?? []),
      }
    })
  } catch {
    if (requestId !== multiHistoryRequestId) return
    multiHistoryDialogOpen.value = false
  } finally {
    if (requestId === multiHistoryRequestId) multiHistoryLoading.value = false
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
  lastEmittedSnapshot = flattenFormData(formData.value)
  trackEmittedSnapshot(lastEmittedSnapshot)
  emit('save', lastEmittedSnapshot)
  setTimeout(() => { draftStatus.value = 'Brouillon enregistré'; setTimeout(() => { draftStatus.value = '' }, 2000) }, 300)
}

async function handleSaveDraft() {
  if (saveTimer) clearTimeout(saveTimer)
  saving.value = true
  draftStatus.value = 'Sauvegarde...'
  lastEmittedSnapshot = flattenFormData(formData.value)
  trackEmittedSnapshot(lastEmittedSnapshot)
  emit('save', lastEmittedSnapshot)
  setTimeout(() => { draftStatus.value = 'Brouillon enregistré'; saving.value = false; setTimeout(() => { draftStatus.value = '' }, 2000) }, 300)
}

async function handleSign() {
  try {
    await ElMessageBox.confirm(
      props.resigning
        ? 'Resigner ce document ? L\'ancienne signature sera écrasée.'
        : 'Êtes-vous sûr de vouloir signer et verrouiller ce document ? Cette action est irréversible.',
      props.resigning ? 'Re-signature' : 'Confirmation de signature',
      { confirmButtonText: props.resigning ? 'Resigner' : 'Signer', cancelButtonText: 'Annuler', type: 'warning' },
    )
  } catch {
    return
  }
  if (saveTimer) clearTimeout(saveTimer)
  signing.value = true
  lastEmittedSnapshot = flattenFormData(formData.value)
  trackEmittedSnapshot(lastEmittedSnapshot)
  emit('save', lastEmittedSnapshot)
  await nextTick()
  emit('sign')
  signing.value = false
}

async function handleExportPdf() {
  if (!activePatient.value) {
    ElMessage.warning('Aucun patient actif. Enregistrez d\'abord le document pour générer le PDF')
    return
  }
  await exportCrcObesitePdf({
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

async function onOrdonnanceGenerate(categorie: 'medicament' | 'soins' | 'examen' | 'avis') {
  const items = (formData.value.ordonnanceSortie ?? []).filter(
    (r: PrescriptionSortie) => (r.categorie ?? 'medicament') === categorie,
  )
  if (items.length === 0) {
    ElMessage.warning('Aucune prescription dans ce groupe')
    return
  }

  const title = `${docTypeLabel} - ${formatDate(new Date())}`
  const sourceDocumentId = String(props.documentId ?? '')
  await doGenerateOrdonnance(categorie, items, sourceDocumentId, title)
}

function ordonnanceItemLabel(rx: PrescriptionSortie): string {
  const cat = rx.categorie ?? 'medicament'
  if (cat === 'avis') return (rx.specialite || rx.examen || 'Avis').replace(/<[^>]*>/g, '').trim()
  if (cat === 'examen') {
    const label = (Array.isArray(rx.examens) && rx.examens.length > 0)
      ? rx.examens.join(', ')
      : (rx.examen || rx.specialite || 'Examen')
    return label.replace(/<[^>]*>/g, '').trim()
  }
  return (rx.medicament || 'Ordonnance').trim()
}

async function onOrdonnanceGenerateItem(
  categorieOrPayload: 'medicament' | 'soins' | 'examen' | 'avis' | { categorie: 'medicament' | 'soins' | 'examen' | 'avis'; key: string },
  keyParam?: string,
) {
  const categorie = (typeof categorieOrPayload === 'object' ? categorieOrPayload.categorie : categorieOrPayload) as 'medicament' | 'soins' | 'examen' | 'avis'
  const key = typeof categorieOrPayload === 'object' ? categorieOrPayload.key : (keyParam ?? '')
  const item = (formData.value.ordonnanceSortie ?? []).find(
    (r: PrescriptionSortie) => r._key === key && (r.categorie ?? 'medicament') === categorie,
  ) ?? (formData.value.ordonnanceSortie ?? []).find((r: PrescriptionSortie) => r._key === key)
  if (!item) {
    ElMessage.warning('Élément introuvable pour la génération')
    return
  }
  const rawLabel = ordonnanceItemLabel(item) || 'Ordonnance'
  const shortLabel = rawLabel.length > 50 ? `${rawLabel.slice(0, 49)}…` : rawLabel
  const title = `${docTypeLabel} - ${shortLabel} - ${formatDate(new Date())}`
  const sourceDocumentId = `${String(props.documentId ?? '')}:${categorie}:${item._key}`
  await doGenerateOrdonnance(categorie, [item], sourceDocumentId, title)
}

async function doGenerateOrdonnance(
  categorie: 'medicament' | 'soins' | 'examen' | 'avis',
  items: PrescriptionSortie[],
  sourceDocumentId: string,
  title: string,
) {
  const contactId = props.contactId ?? ''
  const createdBy = user.value?.id ? String(user.value.id) : ''

  if (!activePatient.value) {
    ElMessage.warning('Aucun patient actif')
    return
  }
  const patientId = activePatient.value.id

  try {
    const existing = await findCrhGroupOrdonnance(patientId, sourceDocumentId, categorie)
    if (existing) {
      try {
        await ElMessageBox.confirm(
          'Une ordonnance existe déjà pour ce groupe (celle-ci sera remplacée). Continuer ?',
          'Remplacer l\'ordonnance',
          { type: 'warning' },
        )
      } catch {
        return
      }
    }

    const res = await createOrReplaceFromGroup({
      patientId,
      contactId,
      serviceId: null,
      siteId: null,
      createdBy,
      title,
      sourceDocumentId,
      categorie,
      items,
    })

    if (res?.replaced) {
      ElMessage.info(`L'ordonnance « ${title} » existante a été remplacée.`)
    } else {
      ElMessage.success(`Ordonnance « ${title} » générée.`)
    }
    ElMessage.success('Retrouvez-la dans le menu Ordonnances du patient (hors document).')
  } catch (e) {
    ElMessage.error((e as Error).message || 'Erreur lors de la génération de l\'ordonnance')
  }
}
</script>

<style scoped lang="scss">
.crc-form {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  overflow: hidden;
  min-width: 0;
}

.crc-form__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--cde-border);
  background: var(--cd-white);
  flex-shrink: 0;
}

.crc-form__header-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  min-width: 0;
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
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  margin: 8px 16px;
  display: flex;
  flex-direction: column;

  :deep(.el-tabs__content) {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 20px;
  }

  :deep(.el-tabs__header) {
    margin: 0;
    flex-shrink: 0;
    max-width: 100%;
    min-width: 0;
  }

  :deep(.el-tabs__nav-wrap) {
    padding: 0;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: var(--el-border-color) transparent;
    flex: 1 1 auto;
    min-width: 0;

    &.is-scrollable {
      padding: 0;
    }

    &::-webkit-scrollbar {
      height: 5px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--el-border-color);
      border-radius: 999px;
    }
  }

  :deep(.el-tabs__nav-scroll) {
    overflow: visible;
  }

  :deep(.el-tabs__nav-prev),
  :deep(.el-tabs__nav-next) {
    display: none;
  }

  :deep(.el-tabs__nav) {
    white-space: nowrap;
    flex-wrap: nowrap;
    transform: none !important;
  }

  :deep(.el-tabs__item) {
    font-size: 12px;
    padding: 0 14px;
    height: 38px;
    line-height: 38px;
    white-space: nowrap;
    flex-shrink: 0;
  }
}

.crc-form--fullpage {
  .crc-form__badges {
    padding: 0;
  }

  .crc-form__tabs {
    margin: 0 0 12px;
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

:deep(.form-preview) {
  padding: 6px 14px 10px;
  margin-top: 6px;
}

:deep(.form-preview__header) {
  display: none;
}

:deep(.form-preview__row) {
  font-size: 14px;
}

:deep(.form-preview__label) {
  font-size: 13px;
}

:deep(.form-preview--compact .form-preview__row) {
  font-size: 13px;
}

:deep(.form-preview--compact .form-preview__label) {
  font-size: 12px;
}

.crc-form__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--cde-border);
  background: var(--cd-white);
  flex-shrink: 0;
}

.crc-form__footer-left {
  flex: 1 1 auto;
  min-width: 0;
}

.crc-form__draft-status {
  font-size: 12px;
  color: var(--el-color-primary);
  font-style: italic;
}

.crc-form__footer-right {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  max-width: 100%;
  gap: 8px;
}

@media (max-width: 1366px) {
  .crc-form__header {
    padding: 10px 14px;
  }

  .crc-form__footer {
    padding: 10px 14px;
  }

  .crc-form__tabs {
    margin: 8px 10px;

    :deep(.el-tabs__item) {
      padding: 0 9px;
      font-size: 11px;
      height: 36px;
      line-height: 36px;
    }

    :deep(.el-tabs__content) {
      padding: 16px;
    }
  }
}

@media (max-width: 1200px) {
  .tab-label svg {
    display: none;
  }

  .crc-form__tabs {
    margin: 6px 8px;

    :deep(.el-tabs__content) {
      padding: 12px;
    }
  }
}
</style>
