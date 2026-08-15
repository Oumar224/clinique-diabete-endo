<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('imagerie')"
      title="Imagerie / Test"
      :keys="['imagerieTests']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <div v-for="(exam, idx) in draft.imagerieTests" :key="exam._key" class="examen-card">
          <div class="examen-card__header">
            <span class="examen-card__title">Examen #{{ idx + 1 }}</span>
            <el-button
              text
              type="danger"
              size="small"
              :aria-label="`Supprimer examen #${idx + 1}`"
              @click="removeExamen(draft.imagerieTests, idx)"
            >
              <template #icon>
                <el-icon><Delete /></el-icon>
              </template>
            </el-button>
          </div>
          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item label="Date de l'examen">
                <el-date-picker v-model="exam.date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
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
        @edit="() => openSection('imagerie')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('bio')"
      title="Résultat Bio"
      :keys="['bilanBio']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="10">
            <el-form-item label="Plage de dates">
              <el-date-picker
                :model-value="rangeValue(draft.bilanBio)"
                type="daterange"
                value-format="YYYY-MM-DD"
                start-placeholder="Date début"
                end-placeholder="Date fin"
                style="width:100%"
                :disabled="bioLoading"
                @update:model-value="setRange(draft.bilanBio, $event)"
              />
            </el-form-item>
          </el-col>
          <el-col :span="14">
            <el-form-item label=" ">
              <el-button type="primary" :loading="bioLoading" :disabled="!rangeValue(draft.bilanBio) || !patientId" @click="fetchBio(draft.bilanBio)">
                Récupérer les résultats
              </el-button>
              <el-button text type="danger" size="small" :disabled="!draft.bilanBio.results.length" @click="clearBio(draft.bilanBio)">
                Effacer
              </el-button>
            </el-form-item>
          </el-col>
        </el-row>
        <div class="bio-table-wrap">
          <table class="bio-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Paramètre</th>
                <th>Valeur</th>
                <th>Unité</th>
                <th>Références</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!draft.bilanBio.results.length">
                <td colspan="6" class="bio-table__empty">Aucun résultat récupéré — choisissez une plage de dates puis cliquez sur « Récupérer les résultats ».</td>
              </tr>
              <template v-for="group in bioGroupsOf(draft.bilanBio.results)" :key="group.examName">
                <tr class="bio-table__group-row">
                  <td colspan="6" class="bio-table__group">{{ group.examName }}</td>
                </tr>
                <tr v-for="r in group.results" :key="r.id ?? r.parameterId ?? r.parameterName ?? r.requestDate ?? draft.bilanBio.results.indexOf(r)">
                  <td>{{ bioDate(r) }}</td>
                  <td>{{ r.parameterName }}</td>
                  <td :class="{ 'bio-table__abnormal': r.isNormal === false }">{{ r.value }}</td>
                  <td>{{ r.parameterUnit }}</td>
                  <td>{{ formatReferenceValues(r.parameterReferenceValues) }}</td>
                  <td class="bio-table__actions">
                    <el-button size="small" type="danger" :aria-label="`Supprimer ${r.parameterName ?? 'résultat'}`" @click="removeBio(draft.bilanBio.results, draft.bilanBio.results.indexOf(r))">
                      <template #icon>
                        <el-icon><Delete /></el-icon>
                      </template>
                    </el-button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
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
import { computed, ref, nextTick } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import type { ExamensComplementairesData } from '@/types/crh-diabete'
import { useExamResults } from '@/composables/useExamResults'
import type { ExamenImagerie, BilanBioResult } from '@/types/crh-diabete'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'
import { isRichTextEmpty } from '@/utils/rich-text'

const FIELD_PREFIX = 'examensComplementaires'

const props = defineProps<{
  data: ExamensComplementairesData
  patientId?: number | null
  fieldMeta?: Record<string, string>
}>()

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

const { fetchByPatient, results: bioResults, loading: bioLoading } = useExamResults()

const imagerieTestsPreviewFields = computed<FormPreviewField[]>(() =>
  props.data.imagerieTests.map(exam => ({
    label: [exam.date, effectiveExamenType(exam)].filter(Boolean).join(' · ') || 'Examen',
    value: isRichTextEmpty(exam.resultat) ? undefined : exam.resultat,
    rich: true,
    key: `${FIELD_PREFIX}.imagerieTests`,
    updatedAt: metaFor(`${FIELD_PREFIX}.imagerieTests`),
    tracked: !!props.fieldMeta,
  })),
)

const bilanBioPreviewFields = computed<FormPreviewField[]>(() => {
  const r = props.data.bilanBio
  if (!r.results.length) return []
  return [
    { label: 'Plage de dates', value: r.dateFrom && r.dateTo ? `${r.dateFrom} → ${r.dateTo}` : null, key: `${FIELD_PREFIX}.bilanBio.dateFrom`, updatedAt: metaFor(`${FIELD_PREFIX}.bilanBio.dateFrom`), tracked: !!props.fieldMeta },
    { label: 'Paramètres récupérés', value: `${r.results.length} résultat(s)`, key: `${FIELD_PREFIX}.bilanBio.results`, updatedAt: metaFor(`${FIELD_PREFIX}.bilanBio.results`), tracked: !!props.fieldMeta },
    ...r.results.slice(0, 6).map(res => ({
      label: res.parameterName || 'Paramètre',
      value: [res.value, res.parameterUnit].filter(Boolean).join(' '),
      key: `${FIELD_PREFIX}.bilanBio.results`,
      updatedAt: metaFor(`${FIELD_PREFIX}.bilanBio.results`),
      tracked: !!props.fieldMeta,
    })),
  ]
})

function effectiveExamenType(exam: ExamenImagerie): string {
  return exam.type === '__autre__' ? exam.typeLibre : exam.type
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

function removeExamen(list: ExamenImagerie[], idx: number) {
  list.splice(idx, 1)
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

function removeBio(results: BilanBioResult[], idx: number) {
  results.splice(idx, 1)
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
  return r.requestDate || r.filledAt?.slice(0, 10) || ''
}

function formatReferenceValues(ref: Record<string, unknown> | null | undefined): string {
  if (!ref || typeof ref !== 'object') return ''
  const r = ref as {
    min?: number
    max?: number
    min_h?: number
    max_h?: number
    min_f?: number
    max_f?: number
    options?: unknown
    normal_value?: unknown
  }
  if (Array.isArray(r.options)) return (r.options as string[]).join(' / ')
  if (r.min != null && r.max != null) return `${r.min} – ${r.max}`
  if (r.min_h != null && r.max_h != null) return `H: ${r.min_h} – ${r.max_h}`
  if (r.min_f != null && r.max_f != null) return `F: ${r.min_f} – ${r.max_f}`
  if (r.normal_value != null) return String(r.normal_value)
  return ''
}
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

.bio-table-wrap {
  overflow-x: auto;
  margin: 8px 0;
}

.bio-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th,
  td {
    border: 1px solid var(--el-border-color-lighter);
    padding: 6px 8px;
    text-align: left;
  }

  th {
    background: var(--el-fill-color-light);
    font-weight: 600;
  }
}

.bio-table__empty {
  color: var(--el-text-color-secondary);
  font-style: italic;
  text-align: center;
  padding: 12px;
}

.bio-table__abnormal {
  font-weight: 600;
  color: var(--el-color-danger);
}

.bio-table__group-row td {
  background: var(--el-color-primary-light-9);
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.bio-table__actions {
  text-align: right;
  white-space: nowrap;
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
