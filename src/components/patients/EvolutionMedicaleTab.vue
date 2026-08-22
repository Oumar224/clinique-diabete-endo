<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('journal')"
      title="Journal de l'Évolution"
      :keys="['journalEvolution']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Saisie chronologique">
              <RichTextEditor
                v-model="draft.journalEvolution"
                :rows="8"
                placeholder="Décrivez l'évolution du patient..."
                :timestamp-on-enter="true"
              />
            </el-form-item>
            <div class="journal-hint">
              <el-tag size="small" type="info" effect="plain">Entrée</el-tag>
              <span class="journal-hint__text">pour horodater une nouvelle ligne</span>
            </div>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Journal de l'Évolution"
        variant="compact"
        :fields="journalPreviewFields"
        @edit="() => openSection('journal')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('avis')"
      title="Avis"
      :keys="['avis']"
      :model-value="data"
      :readonly="readonly"
      :badge="avisCount > 0 ? avisCount : undefined"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <div
          v-if="draft.avis.length > 0"
          class="avis-list"
        >
          <div
            v-for="(avis, idx) in draft.avis"
            :key="avis._key"
            class="avis-card"
          >
            <div class="avis-card__header">
              <span class="avis-card__title">Avis #{{ idx + 1 }}</span>
              <el-button
                text
                type="danger"
                size="small"
                class="avis-card__delete"
                :aria-label="`Supprimer Avis #${idx + 1}`"
                :title="`Supprimer Avis #${idx + 1}`"
                @click="removeAvis(draft.avis, avis)"
              >
                <Delete
                  class="avis-card__delete-icon"
                  aria-hidden="true"
                />
              </el-button>
            </div>
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="Date">
                  <el-date-picker
                    v-model="avis.date"
                    type="date"
                    value-format="YYYY-MM-DD"
                    format="DD/MM/YYYY"
                    style="width:100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item
                  label="Spécialité"
                  required
                >
                  <el-select
                    v-model="avis.specialite"
                    filterable
                    allow-create
                    default-first-option
                    placeholder="Sélectionner ou saisir"
                    style="width:100%"
                  >
                    <el-option
                      v-for="s in specialiteOptions"
                      :key="s"
                      :label="s"
                      :value="s"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="Motif">
                  <el-input
                    v-model="avis.motif"
                    placeholder="Motif de l'avis demandé"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </div>
        <el-button
          type="primary"
          text
          size="small"
          :disabled="readonly"
          @click="addAvis(draft.avis)"
        >
          + Ajouter un avis
        </el-button>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Avis"
        variant="compact"
        :fields="avisPreviewFields"
        @edit="() => openSection('avis')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import type { EvolutionAvisItem, EvolutionMedicaleData } from '@/types/crh-diabete'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'
import { htmlToPlainText, isRichTextEmpty } from '@/utils/rich-text'
import { ipcInvoke } from '@/utils/ipc'
import { useSpecialties } from '@/composables/useSpecialties'
import type { ExamRequestDto } from '@/composables/useExamRequests'

const FIELD_PREFIX = 'evolutionMedicale'

const props = defineProps<{
  data: EvolutionMedicaleData
  fieldMeta?: Record<string, string>
  patientId?: number | null
  readonly?: boolean
}>()

const emit = defineEmits<{
  change: []
}>()

// Les drafts antérieurs à l'introduction du champ n'ont pas de clé `avis`.
// La matérialiser en tableau vide permet à la section staged (clone du draft)
// et au pré-remplissage de pousser sans garde.
type MutableEvolutionData = EvolutionMedicaleData & { avis: EvolutionAvisItem[] }
const dataWithAvis = props.data as MutableEvolutionData
dataWithAvis.avis = Array.isArray(props.data.avis) ? props.data.avis : []

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

const journalPreviewFields = computed<FormPreviewField[]>(() =>
  splitJournalHtml(props.data.journalEvolution)
    .map((segment, index): FormPreviewField | null => {
      const match = htmlToPlainText(segment).match(/^\[(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})\]\s*(.*)$/)
      if (match) {
        const value = segment
          .replace(`[${match[1]}]`, '')
          .replace(/(<[^>]+>)\s+/, '$1')
        if (isRichTextEmpty(value)) return null
        return {
          label: match[1],
          value,
          rich: true,
          key: `${FIELD_PREFIX}.journalEvolution`,
          updatedAt: metaFor(`${FIELD_PREFIX}.journalEvolution`),
          tracked: !!props.fieldMeta,
        }
      }
      if (isRichTextEmpty(segment)) return null
      return {
        label: `Entrée #${index + 1}`,
        value: segment,
        rich: true,
        key: `${FIELD_PREFIX}.journalEvolution`,
        updatedAt: metaFor(`${FIELD_PREFIX}.journalEvolution`),
        tracked: !!props.fieldMeta,
      }
    })
    .filter((field): field is FormPreviewField => field !== null),
)

/** Splits journal rich-text into HTML segments without stripping the tags. */
function splitJournalHtml(html: string | null | undefined): string[] {
  if (!html) return []
  return html
    .split(/<\/p>|<br\s*\/?>/i)
    .map(chunk => chunk.trim())
    .filter(Boolean)
}

// ─── Avis ─────────────────────────────────────────────────────────

const { specialties, fetchSpecialties } = useSpecialties()

const avisCount = computed(() => dataWithAvis.avis.length)

const specialiteOptions = computed(() => specialties.value.map(s => s.name))

const avisPreviewFields = computed<FormPreviewField[]>(() =>
  dataWithAvis.avis.map((avis, index) => ({
    label: formatDate(avis.date) || `Avis #${index + 1}`,
    value: [avis.specialite, avis.motif].filter(Boolean).join(' — '),
    key: `${FIELD_PREFIX}.avis`,
    tracked: false,
  })),
)

/** Formate une date ISO (YYYY-MM-DD) en DD/MM/YYYY pour l'affichage. */
function formatDate(date: string): string {
  const [y, m, d] = date.split('-')
  return y && m && d ? `${d}/${m}/${y}` : date
}

function addAvis(list: EvolutionAvisItem[]) {
  list.push({
    _key: crypto.randomUUID(),
    date: '',
    specialite: '',
    motif: '',
  })
}

function removeAvis(list: EvolutionAvisItem[], avis: EvolutionAvisItem) {
  const idx = list.findIndex(a => a._key === avis._key)
  if (idx !== -1) list.splice(idx, 1)
}

const prefillRunning = ref(false)
const autoPrefillDone = ref(false)

/** Pré-remplit les avis depuis les demandes d'examens de type `avis` de l'admission. */
async function loadDefaults() {
  if (props.readonly || !props.patientId || prefillRunning.value) return
  prefillRunning.value = true
  try {
    const requests = (await ipcInvoke<ExamRequestDto[]>('exam-request:list', { patientId: props.patientId })) ?? []
    const candidates: EvolutionAvisItem[] = []
    for (const r of requests) {
      if (r.type !== 'avis' || r.statut === 'annule') continue
      candidates.push({
        _key: crypto.randomUUID(),
        date: r.plannedDate ?? '',
        specialite: r.specialtyName || r.specialite || '',
        motif: r.motif ?? '',
      })
    }
    // Dédup : ignorer les avis déjà présents (avis|spécialité)
    const existing = new Set(dataWithAvis.avis.map(a => `avis|${a.specialite}`))
    const toAdd = candidates.filter(c => !existing.has(`avis|${c.specialite}`))
    if (toAdd.length === 0) return
    dataWithAvis.avis.push(...toAdd)
    emit('change')
  } catch (e) {
    ElMessage.warning((e as Error).message)
  } finally {
    prefillRunning.value = false
  }
}

onMounted(() => {
  if (!props.readonly && props.patientId) {
    void fetchSpecialties(true)
    if (dataWithAvis.avis.length === 0 && !autoPrefillDone.value) {
      autoPrefillDone.value = true
      void loadDefaults()
    }
  }
})
</script>

<style scoped>
.journal-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.journal-hint__text {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.avis-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--el-color-primary-light-9);
}
.avis-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.avis-card__title {
  font-weight: 600;
  font-size: 13px;
}
.avis-card__delete {
  padding: 4px;
}
.avis-card__delete-icon {
  width: 14px;
  height: 14px;
}

.section-preview {
  margin: 8px 0 16px;
}

.el-form-item[data-history-path]:hover {
  cursor: default;
}
</style>
