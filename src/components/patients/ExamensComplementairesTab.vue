<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('imagerie')"
      title="Imagerie / Test"
      :keys="['imagerieTests']"
      :model-value="data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <div
          v-for="(exam, idx) in sortedImagerieTests(draft.imagerieTests)"
          :key="exam._key"
          class="examen-card"
          :data-exam-key="exam._key"
          :class="{ 'examen-card--flash': exam._key === highlightedExamKey }"
        >
          <div class="examen-card__header">
            <span class="examen-card__title">Examen #{{ idx + 1 }}</span>
            <el-button
              text
              type="danger"
              size="small"
              :aria-label="`Supprimer examen #${idx + 1}`"
              @click="removeExamen(draft.imagerieTests, exam)"
            >
              <template #icon>
                <el-icon><Delete /></el-icon>
              </template>
            </el-button>
          </div>
          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item label="Date de l'examen">
                <el-date-picker v-model="exam.date" type="date" value-format="YYYY-MM-DD" format="DD/MM/YYYY" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="Type d'examen">
                <el-select v-model="exam.type" placeholder="Sélectionner" style="width:100%">
                  <el-option v-for="t in EXAMEN_TYPES" :key="t" :label="t" :value="t" />
                  <el-option label="Autre (libre)" value="__autre__" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="10" v-if="exam.type === '__autre__'">
              <el-form-item label="Précisez le type">
                <el-input v-model="exam.typeLibre" placeholder="Type d'examen..." />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="24">
              <el-form-item label="Résultat / Conclusion">
                <RichTextEditor v-model="exam.resultat" :rows="2" placeholder="Résultat et conclusion de l'examen..." />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
        <el-button type="primary" text size="small" @click="addExamen(draft.imagerieTests)" class="add-btn">
          <template #icon>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2V12M2 7H12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
          </template>
          Ajouter un examen
        </el-button>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Imagerie / Test"
        variant="compact"
        :fields="imagerieTestsPreviewFields"
        empty-text="Aucun examen renseigné"
        @edit="onImagerieEdit"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('bio')"
      title="Résultat Bio"
      :keys="['bilanBio']"
      :model-value="data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="14">
            <el-form-item label="Plage de dates">
              <el-date-picker
                :model-value="rangeValue(draft.bilanBio)"
                type="daterange"
                value-format="YYYY-MM-DD"
                format="DD/MM/YYYY"
                start-placeholder="Date début"
                end-placeholder="Date fin"
                style="width:100%"
                :disabled="bioLoading"
                @update:model-value="setRange(draft.bilanBio, $event)"
              />
            </el-form-item>
          </el-col>
          <el-col :span="10">
            <div class="bio-actions">
              <el-button type="primary" :loading="bioLoading" :disabled="!rangeValue(draft.bilanBio) || !patientId" @click="fetchBio(draft.bilanBio)">
                Récupérer les résultats
              </el-button>
              <el-button text type="danger" size="small" :disabled="!draft.bilanBio.results.length" @click="clearBio(draft.bilanBio)">
                Effacer
              </el-button>
            </div>
          </el-col>
        </el-row>
        <BioMatrixTable
          :groups="bioMatrixGroups(draft.bilanBio.results)"
          :deletable="true"
          max-height="420px"
          empty-text="Aucun résultat récupéré — choisissez une plage de dates puis cliquez sur « Récupérer les résultats »."
          @delete="row => onBioMatrixDelete(draft.bilanBio.results, row)"
        />
        <p class="bio-hint">La plage de dates et les résultats récupérés sont enregistrés dans le compte-rendu et dans le PDF.</p>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Résultat Bio"
        variant="compact"
        :fields="bilanBioPreviewFields"
        empty-text="Aucun résultat bio récupéré"
        @edit="() => openSection('bio')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import type { ExamensComplementairesData } from '@/types/crh-diabete'
import { useExamResults, type MatrixGroup, type MatrixRow } from '@/composables/useExamResults'
import type { ExamenImagerie, BilanBioResult } from '@/types/crh-diabete'
import type { ExamRequestDto } from '@/composables/useExamRequests'
import { ipcInvoke } from '@/utils/ipc'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'
import BioMatrixTable from '@/components/patients/BioMatrixTable.vue'
import { isRichTextEmpty } from '@/utils/rich-text'
import { formatDate } from '@/utils/date'

const FIELD_PREFIX = 'examensComplementaires'

const props = withDefaults(defineProps<{
  data: ExamensComplementairesData
  patientId?: number | null
  fieldMeta?: Record<string, string>
  readonly?: boolean
}>(), {
  readonly: false,
})

const emit = defineEmits<{
  change: []
}>()

function metaFor(key: string): string | null {
  return props.fieldMeta?.[key] ?? null
}

const sectionRefs = ref<Record<string, InstanceType<typeof StagedCollapsibleSection> | null>>({})

function setSectionRef(key: string) {
  return (el: unknown) => {
    sectionRefs.value[key] = el as InstanceType<typeof StagedCollapsibleSection> | null
  }
}

async function openSection(key: string) {
  const section = sectionRefs.value[key]
  if (section && typeof section.open === 'function') {
    section.open()
  }
  await nextTick()
  sectionRefs.value[key]?.$el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

const EXAMEN_TYPES = [
  'Radiographie du pied',
  'ECG de repos',
  'Échographie cardiaque',
  'Échographie abdominale',
  'Doppler',
  'Scanner',
  'IRM',
  'Holter',
] as const

const { fetchByPatient, results: bioResults, loading: bioLoading, buildMatrix } = useExamResults()

const imagerieTestsPreviewFields = computed<FormPreviewField[]>(() =>
  sortedImagerieTests(props.data.imagerieTests).map(exam => ({
    label: [exam.date ? formatDate(exam.date) : '', effectiveExamenType(exam)].filter(Boolean).join(' · ') || 'Examen',
    value: isRichTextEmpty(exam.resultat) ? undefined : exam.resultat,
    rich: true,
    key: `${FIELD_PREFIX}.imagerieTests.${exam._key}`,
    updatedAt: metaFor(`${FIELD_PREFIX}.imagerieTests`),
    tracked: !!props.fieldMeta,
  })),
)

const bilanBioPreviewFields = computed<FormPreviewField[]>(() => {
  const r = props.data.bilanBio
  if (!r.results.length) return []
  return [
    { label: 'Plage de dates', value: r.dateFrom && r.dateTo ? `${formatDate(r.dateFrom)} → ${formatDate(r.dateTo)}` : null, key: `${FIELD_PREFIX}.bilanBio.dateFrom`, updatedAt: metaFor(`${FIELD_PREFIX}.bilanBio.dateFrom`), tracked: !!props.fieldMeta },
    { label: 'Paramètres récupérés', value: `${r.results.length} résultat(s)`, key: `${FIELD_PREFIX}.bilanBio.results`, updatedAt: metaFor(`${FIELD_PREFIX}.bilanBio.results`), tracked: !!props.fieldMeta },
    { label: 'Résultats', value: bioPreviewTableHtml(r.results), rich: true, key: `${FIELD_PREFIX}.bilanBio.results`, updatedAt: metaFor(`${FIELD_PREFIX}.bilanBio.results`), tracked: !!props.fieldMeta },
  ]
})

const highlightedExamKey = ref('')
let highlightTimer: number | undefined

function onImagerieEdit(key: string) {
  const examKey = key.split('.').pop() ?? ''
  highlightedExamKey.value = examKey
  void openSection('imagerie').then(() => {
    if (!examKey) return
    const card = document.querySelector(`.examen-card[data-exam-key="${examKey}"]`)
    card?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  })
  if (highlightTimer) window.clearTimeout(highlightTimer)
  highlightTimer = window.setTimeout(() => {
    highlightedExamKey.value = ''
  }, 2000)
}

onUnmounted(() => {
  if (highlightTimer) window.clearTimeout(highlightTimer)
})

function effectiveExamenType(exam: ExamenImagerie): string {
  return exam.type === '__autre__' ? exam.typeLibre : exam.type
}

function sortedImagerieTests(list: ExamenImagerie[]): ExamenImagerie[] {
  return [...list].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return b.date.localeCompare(a.date)
  })
}

function addExamen(list: ExamenImagerie[]) {
  list.push({
    _key: crypto.randomUUID(),
    date: '',
    type: '',
    typeLibre: '',
    resultat: '',
  })
}

function removeExamen(list: ExamenImagerie[], exam: ExamenImagerie) {
  const idx = list.findIndex(e => e._key === exam._key)
  if (idx !== -1) list.splice(idx, 1)
}

function rangeValue(bilanBio: { dateFrom: string; dateTo: string }): [string, string] | null {
  return bilanBio.dateFrom && bilanBio.dateTo ? [bilanBio.dateFrom, bilanBio.dateTo] : null
}

function setRange(bilanBio: { dateFrom: string; dateTo: string }, value: [string, string] | string | null) {
  if (Array.isArray(value)) {
    bilanBio.dateFrom = value[0] ?? ''
    bilanBio.dateTo = value[1] ?? ''
  } else if (typeof value === 'string' && value.includes('→')) {
    const parts = value.split('→').map(s => s.trim())
    bilanBio.dateFrom = parts[0] ?? ''
    bilanBio.dateTo = parts[1] ?? ''
  } else if (typeof value === 'string') {
    bilanBio.dateFrom = value
  }
}

async function fetchBio(bilanBio: { dateFrom: string; dateTo: string; results: BilanBioResult[] }) {
  const range = rangeValue(bilanBio)
  if (!range || !props.patientId) return
  await fetchByPatient(props.patientId, { dateFrom: range[0], dateTo: range[1] })
  bilanBio.dateFrom = range[0]
  bilanBio.dateTo = range[1]
  bilanBio.results = (bioResults.value as BilanBioResult[]).slice()
}

function clearBio(bilanBio: { dateFrom: string; dateTo: string; results: BilanBioResult[] }) {
  bilanBio.dateFrom = ''
  bilanBio.dateTo = ''
  bilanBio.results = []
}

function bioMatrixGroups(results: BilanBioResult[]): MatrixGroup[] {
  return buildMatrix(results).matrixGroups
}

function onBioMatrixDelete(results: BilanBioResult[], row: MatrixRow) {
  removeBioByParameter(results, row.parameterId)
}

function removeBioByParameter(results: BilanBioResult[], parameterId: number) {
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i].parameterId === parameterId) results.splice(i, 1)
  }
}

function bioGroupsOf(results: BilanBioResult[]): { examName: string; results: BilanBioResult[] }[] {
  const groups = new Map<string, { examName: string; results: BilanBioResult[] }>()
  for (const r of results) {
    const examName = r.examName?.trim() || 'Examen non précisé'
    let group = groups.get(examName)
    if (!group) {
      group = { examName, results: [] }
      groups.set(examName, group)
    }
    group.results.push(r)
  }
  return [...groups.values()]
    .sort((a, b) => a.examName.localeCompare(b.examName, 'fr', { sensitivity: 'base' }))
    .map(group => ({
      examName: group.examName,
      results: group.results
        .slice()
        .sort((a, b) =>
          (a.parameterName ?? '').localeCompare(b.parameterName ?? '', 'fr', { sensitivity: 'base' }),
        ),
    }))
}

function bioDate(r: BilanBioResult): string {
  const date = r.requestDate || r.filledAt?.slice(0, 10) || ''
  return date ? formatDate(date) : ''
}

function bioPreviewTableHtml(results: BilanBioResult[]): string {
  const groups = bioGroupsOf(results)
  const parts: string[] = []
  for (const group of groups) {
    const dates = Array.from(new Set(group.results.map(r => bioDate(r)).filter(Boolean))).sort()
    if (!dates.length) continue
    const paramNames = Array.from(new Set(group.results.map(r => r.parameterName || 'Paramètre')))
    const rowsHtml = paramNames.map(name => {
      const cellsHtml = dates.map(date => {
        const matching = group.results.filter(r => (r.parameterName || 'Paramètre') === name && bioDate(r) === date)
        const text = matching.map(v => [v.value, v.parameterUnit].filter(Boolean).join(' ')).filter(Boolean).join(' / ')
        const abnormal = matching.some(v => v.isNormal === false)
        return `<td style="${BIO_PREVIEW_STYLE.td}${abnormal ? `;${BIO_PREVIEW_STYLE.tdAbnormal}` : ''}">${escapeHtml(text)}</td>`
      }).join('')
      return `<tr><td style="${BIO_PREVIEW_STYLE.tdName}">${escapeHtml(name)}</td>${cellsHtml}</tr>`
    }).join('')
    const headersHtml = dates.map(d => `<th style="${BIO_PREVIEW_STYLE.th}">${escapeHtml(d)}</th>`).join('')
    parts.push(
      `<div style="${BIO_PREVIEW_STYLE.group}">${escapeHtml(group.examName)}</div>` +
      `<table style="${BIO_PREVIEW_STYLE.table}"><thead><tr><th style="${BIO_PREVIEW_STYLE.th}">Paramètre</th>${headersHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`,
    )
  }
  return parts.join('')
}

const BIO_PREVIEW_STYLE = {
  th: 'border:1px solid #e4e7ed;padding:4px 8px;font-size:12px;font-weight:600;background:#f5f7fa;text-align:left;white-space:nowrap',
  td: 'border:1px solid #e4e7ed;padding:4px 8px;font-size:12px;text-align:left',
  tdName: 'border:1px solid #e4e7ed;padding:4px 8px;font-size:12px;font-weight:600;text-align:left;white-space:nowrap',
  tdAbnormal: 'color:#f56c6c;font-weight:700',
  group: 'font-size:12px;font-weight:600;color:#1a5276;margin:8px 0 2px',
  table: 'border-collapse:collapse;width:100%;margin-bottom:4px',
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const imageriePrefillRunning = ref(false)

/** Pré-remplit les examens d'imagerie réalisés depuis les demandes du patient. */
async function prefillImagerie() {
  if (props.readonly || !props.patientId || props.data.imagerieTests.length > 0 || imageriePrefillRunning.value) return
  imageriePrefillRunning.value = true
  try {
    const requests = (await ipcInvoke<ExamRequestDto[]>('exam-request:list', { patientId: props.patientId })) ?? []
    const knownTypes = EXAMEN_TYPES as readonly string[]
    const prefilled: ExamenImagerie[] = requests
      .filter(r => r.type === 'imagerie' && r.statut === 'realise')
      .map(r => {
        const known = knownTypes.includes(r.examenLabel ?? '')
        return {
          _key: crypto.randomUUID(),
          date: r.plannedDate ?? '',
          type: known ? (r.examenLabel ?? '') : '__autre__',
          typeLibre: known ? '' : (r.examenLabel ?? ''),
          resultat: '',
        }
      })
    if (prefilled.length === 0) return
    // eslint-disable-next-line vue/no-mutating-props -- pré-remplissage volontaire de l'objet réactif partagé pour déclencher l'autosave parent
    props.data.imagerieTests.push(...prefilled)
    emit('change')
  } catch (e) {
    ElMessage.warning((e as Error).message)
  } finally {
    imageriePrefillRunning.value = false
  }
}

onMounted(() => {
  void prefillImagerie()
})
</script>

<style scoped lang="scss">
.examen-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  background: var(--el-color-primary-light-9);
  transition: box-shadow 0.15s ease;

  &:hover {
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  }
}

.examen-card--flash {
  box-shadow: 0 0 0 2px var(--el-color-primary);
}

.examen-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.examen-card__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.bio-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 30px;
}

.bio-hint {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.add-btn {
  margin-top: 4px;
}

.section-preview {
  margin: 8px 0 16px;
}
</style>