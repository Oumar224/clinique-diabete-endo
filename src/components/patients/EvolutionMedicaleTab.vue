<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('journal')"
      title="Journal de l'Évolution"
      :keys="['journalEvolution']"
      :model-value="data"
      :readonly="readonly"
      :hide-footer="true"
      :pending="hasJournalPendingContent"
      @save="onJournalSectionSave"
      @cancel="onJournalSectionCancel"
    >
      <template #default="{ draft }">
        <div
          v-for="journal in [activeJournalOf(draft)]"
          :key="journal._key"
          class="journal-card"
          :data-entry-key="journal._key"
          :class="{ 'journal-card--flash': journal._key === highlightedJournalKey }"
        >
          <div class="journal-card__header">
            <span class="journal-card__title">{{ activeEditingKey ? 'Modifier l\'entrée' : 'Nouvelle entrée' }}</span>
          </div>
          <el-row :gutter="16">
            <el-col :span="24">
              <el-form-item label="Saisie chronologique">
                <RichTextEditor
                  v-model="journal.content"
                  :readonly="readonly"
                  :rows="8"
                  placeholder="Décrivez l'évolution du patient..."
                />
              </el-form-item>
            </el-col>
          </el-row>
          <div class="journal-card__actions">
            <el-button
              size="small"
              :disabled="readonly"
              @click="cancelJournal"
            >
              Annuler
            </el-button>
            <el-button
              type="primary"
              size="small"
              :disabled="readonly"
              @click="saveJournalEntry(draft)"
            >
              Enregistrer
            </el-button>
          </div>
        </div>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Journal de l'Évolution"
        variant="compact"
        :fields="journalPreviewFields"
        empty-text="Aucune entrée de journal"
        :deletable="true"
        @edit="onJournalEdit"
        @delete="deleteJournalPreview"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('avis')"
      title="Avis"
      :keys="['avis', 'avisDateFrom', 'avisDateTo']"
      :model-value="data"
      :readonly="readonly"
      :badge="avisCount > 0 ? avisCount : undefined"
      :pending="hasAvisPendingContent"
      @save="onAvisSectionSave"
      @cancel="onAvisSectionCancel"
    >
      <template #default="{ draft }">
        <div
          v-if="!readonly && patientId"
          class="avis-recap"
        >
          <el-row
            :gutter="16"
            align="middle"
          >
            <el-col :span="14">
              <el-form-item label="Plage de dates">
                <el-date-picker
                  :model-value="avisRangeValue(draft)"
                  type="daterange"
                  value-format="YYYY-MM-DD"
                  format="DD/MM/YYYY"
                  start-placeholder="Date début"
                  end-placeholder="Date fin"
                  style="width:100%"
                  :disabled="prefillRunning"
                  @update:model-value="setAvisRange(draft, $event)"
                />
              </el-form-item>
            </el-col>
            <el-col :span="10">
              <el-button
                type="primary"
                :loading="prefillRunning"
                :disabled="!avisRangeValue(draft) || !patientId"
                @click="fetchAvis(draft)"
              >
                Récupérer les avis
              </el-button>
            </el-col>
          </el-row>
        </div>
        <div
          v-for="avis in [activeAvisOf(draft)]"
          :key="avis._key"
          class="avis-card"
        >
          <div class="avis-card__header">
            <span class="avis-card__title">{{ activeAvisKey ? 'Modifier l\'avis' : 'Nouvel avis' }}</span>
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
                <RichTextEditor
                  v-model="avis.motif"
                  :readonly="readonly"
                  :rows="2"
                  placeholder="Motif (formattage)..."
                />
              </el-form-item>
            </el-col>
          </el-row>
          <div class="avis-card__actions">
            <el-button
              size="small"
              :disabled="readonly"
              @click="cancelAvis"
            >
              Annuler
            </el-button>
            <el-button
              type="primary"
              size="small"
              :disabled="readonly"
              @click="saveAvisEntry(draft)"
            >
              Enregistrer
            </el-button>
          </div>
        </div>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Avis"
        variant="compact"
        :fields="avisPreviewFields"
        :deletable="true"
        @edit="onAvisEdit"
        @delete="deleteAvisPreview"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, nextTick, reactive, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { EvolutionAvisItem, EvolutionMedicaleData, EvolutionJournalEntry } from '@/types/crh-diabete'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'
import { htmlToPlainText, isRichTextEmpty } from '@/utils/rich-text'
import { ipcInvoke } from '@/utils/ipc'
import { useAuth } from '@/composables/useAuth'
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
dataWithAvis.avisDateFrom = typeof props.data.avisDateFrom === 'string' ? props.data.avisDateFrom : ''
dataWithAvis.avisDateTo = typeof props.data.avisDateTo === 'string' ? props.data.avisDateTo : ''

// Rétro-compatibilité : les anciens dossiers stockent `journalEvolution` comme
// une chaîne riche segmentée (avec des timestamps `[dd/mm/yyyy hh:mm]`). On la
// normalise une fois en tableau d'entrées pour que le draft staged et l'aperçu
// utilisent le même tableau.
dataWithAvis.journalEvolution = normalizeJournal(dataWithAvis.journalEvolution)

/**
 * Normalise une valeur `journalEvolution` (nouveau modèle : tableau d'entrées,
 * ou ancien modèle : chaîne riche segmentée) en un tableau d'entrées STABLE.
 * N'opère aucune mutation sur l'API publique.
 *
 * @param value - La valeur brute stockée dans le dossier.
 * @returns Un tableau d'entrées, chacune portant une `_key` unique.
 */
function normalizeJournal(value: EvolutionJournalEntry[] | string | undefined | null): EvolutionJournalEntry[] {
  if (Array.isArray(value)) {
    return value.map(e => (e && e._key ? e : {
      _key: crypto.randomUUID(),
      content: e?.content ?? '',
      date: e?.date ?? '',
      heure: e?.heure ?? '',
      user: e?.user ?? '',
    }))
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/<\/p>|<br\s*\/?>/i)
      .map(chunk => chunk.trim())
      .filter(Boolean)
      .map((segment) => {
        const match = htmlToPlainText(segment).match(/^\[(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})\]\s*(.*)$/)
        let content = segment
        let date = ''
        let heure = ''
        if (match) {
          date = `${match[1].slice(6, 10)}-${match[1].slice(3, 5)}-${match[1].slice(0, 2)}`
          heure = `${match[1].slice(11, 13)}:${match[1].slice(14, 16)}`
          content = segment
            .replace(`[${match[1]}]`, '')
            .replace(/(<[^>]+>)\s+/, '$1')
        }
        return {
          _key: crypto.randomUUID(),
          content,
          date,
          heure,
          user: '',
        }
      })
  }
  return []
}

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

const { user } = useAuth()

/** Renvoie l'entrée active du journal : la brouillon local en mode création, sinon l'entrée du draft en cours d'édition. */
function activeJournalOf(draft: Record<string, unknown>): EvolutionJournalEntry {
  if (activeEditingKey.value === null) return creating
  const list = (draft.journalEvolution ?? []) as EvolutionJournalEntry[]
  const found = list.find(e => e._key === activeEditingKey.value)
  return found ?? creating
}

const activeEditingKey = ref<string | null>(null)

const creating = reactive<EvolutionJournalEntry>({
  _key: crypto.randomUUID(),
  content: '',
  date: '',
  heure: '',
  user: '',
})

function resetCreating() {
  creating._key = crypto.randomUUID()
  creating.content = ''
  creating.date = ''
  creating.heure = ''
  creating.user = ''
}

const hasJournalPendingContent = computed(() =>
  activeEditingKey.value === null && !isRichTextEmpty(creating.content),
)

const highlightedJournalKey = ref('')
let journalHighlightTimer: number | undefined

/** Réouvre la section Journal sur l'entrée éditée (via le bouton Modifier de l'aperçu externe). */
function onJournalEdit(key: string) {
  const entryKey = key.split('.').pop() ?? ''
  highlightedJournalKey.value = entryKey
  activeEditingKey.value = entryKey || null
  resetCreating()
  void openSection('journal').then(() => {
    if (!entryKey) return
    const card = document.querySelector(`.journal-card[data-entry-key="${entryKey}"]`)
    card?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  })
  if (journalHighlightTimer) window.clearTimeout(journalHighlightTimer)
  journalHighlightTimer = window.setTimeout(() => {
    highlightedJournalKey.value = ''
  }, 2000)
}

onUnmounted(() => {
  if (journalHighlightTimer) window.clearTimeout(journalHighlightTimer)
})

/** Supprime une entrée du journal depuis l'aperçu externe. */
function removeJournalEntry(list: EvolutionJournalEntry[], key: string) {
  const idx = list.findIndex(e => e._key === key)
  if (idx !== -1) list.splice(idx, 1)
}

function deleteJournalPreview(key: string) {
  const entryKey = key.split('.').pop() ?? ''
  removeJournalEntry(props.data.journalEvolution, entryKey)
  if (activeEditingKey.value === entryKey) {
    activeEditingKey.value = null
    resetCreating()
  }
  if (sectionRefs.value.journal?.isOpen()) sectionRefs.value.journal.removeFromDraft('journalEvolution', entryKey)
  emit('change')
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function nowStamp(): { date: string; heure: string } {
  const now = new Date()
  return {
    date: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`,
    heure: `${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
  }
}

/** Auteur affiché « Prénom Nom » (ex. `Mamadou Diallo`) depuis l'utilisateur connecté. */
function currentAuthor(): string {
  const u = user.value
  return u ? `${u.prenom} ${u.nom}` : ''
}

/** Commit de l'entrée : en mode création on l'ajoute au journal avec date/heure/auteur auto ; en édition on conserve les métadonnées d'origine. */
function saveJournalEntry(draft: Record<string, unknown>) {
  if (activeEditingKey.value === null) {
    const { date, heure } = nowStamp()
    const entry: EvolutionJournalEntry = {
      ...creating,
      date,
      heure,
      user: currentAuthor(),
    }
    ;(draft.journalEvolution as EvolutionJournalEntry[]).push(entry)
  }
  sectionRefs.value.journal?.save()
}

function cancelJournal() {
  if (activeEditingKey.value === null) {
    resetCreating()
  } else {
    activeEditingKey.value = null
    sectionRefs.value.journal?.syncDraft()
  }
}

function onJournalSectionSave() {
  activeEditingKey.value = null
  resetCreating()
  emit('change')
}

function onJournalSectionCancel() {
  activeEditingKey.value = null
  resetCreating()
}

const journalPreviewFields = computed<FormPreviewField[]>(() =>
  [...props.data.journalEvolution]
    .sort((a, b) => {
      if (a.date && b.date) return b.date.localeCompare(a.date) || b.heure.localeCompare(a.heure)
      if (a.date) return -1
      if (b.date) return 1
      return 0
    })
    .map((entry, index) => {
      const stampLabel = [entry.date ? formatDate(entry.date) : '', entry.heure].filter(Boolean).join(' ')
      const label = [stampLabel, entry.user].filter(Boolean).join(' · ') || `Entrée #${index + 1}`
      const value = isRichTextEmpty(entry.content) ? undefined : entry.content
      if (value === undefined) return null
      return {
        label,
        value,
        rich: true,
        key: `${FIELD_PREFIX}.journalEvolution.${entry._key}`,
        updatedAt: metaFor(`${FIELD_PREFIX}.journalEvolution`),
        tracked: !!props.fieldMeta,
      } as FormPreviewField
    })
    .filter((field): field is FormPreviewField => field !== null),
)

// ─── Avis ─────────────────────────────────────────────────────────

const { specialties, fetchSpecialties } = useSpecialties()

const avisCount = computed(() => dataWithAvis.avis.length)

const specialiteOptions = computed(() => specialties.value.map(s => s.name))

const activeAvisKey = ref<string | null>(null)

const creatingAvis = reactive<EvolutionAvisItem>({
  _key: crypto.randomUUID(),
  date: '',
  specialite: '',
  motif: '',
})

function resetCreatingAvis() {
  creatingAvis._key = crypto.randomUUID()
  creatingAvis.date = ''
  creatingAvis.specialite = ''
  creatingAvis.motif = ''
}

function activeAvisOf(draft: Record<string, unknown>): EvolutionAvisItem {
  if (activeAvisKey.value === null) return creatingAvis
  const list = (draft.avis ?? []) as EvolutionAvisItem[]
  const found = list.find(a => a._key === activeAvisKey.value)
  return found ?? creatingAvis
}

const hasAvisPendingContent = computed(() =>
  activeAvisKey.value === null &&
  (creatingAvis.date !== '' || creatingAvis.specialite !== '' || !isRichTextEmpty(creatingAvis.motif)),
)

function onAvisEdit(key: string) {
  const avisKey = key.split('.').pop() ?? ''
  activeAvisKey.value = avisKey || null
  resetCreatingAvis()
  void openSection('avis')
}

function saveAvisEntry(draft: Record<string, unknown>) {
  if (activeAvisKey.value === null) {
    const entry: EvolutionAvisItem = { ...creatingAvis }
    ;(draft.avis as EvolutionAvisItem[]).push(entry)
  }
  sectionRefs.value.avis?.save()
}

function cancelAvis() {
  if (activeAvisKey.value === null) {
    resetCreatingAvis()
  } else {
    activeAvisKey.value = null
    sectionRefs.value.avis?.syncDraft()
  }
}

function onAvisSectionSave() {
  activeAvisKey.value = null
  resetCreatingAvis()
  emit('change')
}

function onAvisSectionCancel() {
  activeAvisKey.value = null
  resetCreatingAvis()
}

function deleteAvisPreview(key: string) {
  const avisKey = key.split('.').pop() ?? ''
  const idx = dataWithAvis.avis.findIndex(a => a._key === avisKey)
  if (idx !== -1) dataWithAvis.avis.splice(idx, 1)
  if (activeAvisKey.value === avisKey) {
    activeAvisKey.value = null
    resetCreatingAvis()
  }
  if (sectionRefs.value.avis?.isOpen()) sectionRefs.value.avis.removeFromDraft('avis', avisKey)
  emit('change')
}

const avisPreviewFields = computed<FormPreviewField[]>(() => {
  const rows: FormPreviewField[] = []
  if (dataWithAvis.avisDateFrom && dataWithAvis.avisDateTo) {
    rows.push({
      label: 'Plage de dates',
      value: `${formatDate(dataWithAvis.avisDateFrom)} → ${formatDate(dataWithAvis.avisDateTo)}`,
      rich: false,
      key: `${FIELD_PREFIX}.avis`,
      updatedAt: metaFor(`${FIELD_PREFIX}.avis`),
      tracked: !!props.fieldMeta,
    })
  }
  rows.push(...dataWithAvis.avis
    .map((avis, index) => {
      const base = [formatDate(avis.date), avis.specialite].filter(Boolean).join(' — ') || `Avis #${index + 1}`
      const hasMotif = !isRichTextEmpty(avis.motif)
      const value = hasMotif ? avis.motif : (avis.specialite || undefined)
      if (value === undefined) return null
      return {
        label: hasMotif ? `Motif — ${base}` : base,
        value,
        rich: hasMotif,
        key: `${FIELD_PREFIX}.avis.${avis._key}`,
        updatedAt: metaFor(`${FIELD_PREFIX}.avis`),
        tracked: !!props.fieldMeta,
      } as FormPreviewField
    })
    .filter((f): f is FormPreviewField => f !== null))
  return rows
})

/** Formate une date ISO (YYYY-MM-DD) en DD/MM/YYYY pour l'affichage. */
function formatDate(date: string): string {
  const [y, m, d] = date.split('-')
  return y && m && d ? `${d}/${m}/${y}` : date
}

const prefillRunning = ref(false)
const autoPrefillDone = ref(false)

/** Renvoie la plage de dates récupérée (dateFrom/dateTo) si elle est complète. */
function avisRangeValue(draft: Record<string, unknown>): [string, string] | null {
  const dateFrom = typeof draft.avisDateFrom === 'string' ? draft.avisDateFrom : (dataWithAvis.avisDateFrom ?? '')
  const dateTo = typeof draft.avisDateTo === 'string' ? draft.avisDateTo : (dataWithAvis.avisDateTo ?? '')
  return dateFrom && dateTo ? [dateFrom, dateTo] : null
}

/** Enregistre la plage de dates choisie dans le draft et dans les données commitées. */
function setAvisRange(draft: Record<string, unknown>, value: [string, string] | string | null) {
  if (Array.isArray(value)) {
    draft.avisDateFrom = value[0] ?? ''
    draft.avisDateTo = value[1] ?? ''
  } else if (typeof value === 'string' && value.includes('→')) {
    const parts = value.split('→').map(s => s.trim())
    draft.avisDateFrom = parts[0] ?? ''
    draft.avisDateTo = parts[1] ?? ''
  } else if (typeof value === 'string') {
    draft.avisDateFrom = value
  }
}

/**
 * Construit les candidats avis depuis les demandes d'examens de type `avis`,
 * filtrés par la plage de dates (si fournie) sur leur date planifiée.
 */
async function buildAvisCandidates(range: [string, string] | null): Promise<EvolutionAvisItem[]> {
  const requests = (await ipcInvoke<ExamRequestDto[]>('exam-request:list', { patientId: props.patientId })) ?? []
  const candidates: EvolutionAvisItem[] = []
  for (const r of requests) {
    if (r.type !== 'avis' || r.statut === 'annule') continue
    if (range) {
      const planned = r.plannedDate ?? ''
      if (planned && (planned < range[0] || planned > range[1])) continue
    }
    candidates.push({
      _key: crypto.randomUUID(),
      date: r.plannedDate ?? '',
      specialite: r.specialtyName || r.specialite || '',
      motif: r.motif ?? '',
    })
  }
  return candidates
}

/** Récupère (bouton du formulaire) : ajoute les avis au draft. Le commit se fait via le footer « Enregistrer » de la section. */
async function fetchAvis(draft: Record<string, unknown>) {
  if (props.readonly || !props.patientId || prefillRunning.value) return
  prefillRunning.value = true
  try {
    const range = avisRangeValue(draft) ?? null
    const candidates = await buildAvisCandidates(range)
    const list = (draft.avis ?? []) as EvolutionAvisItem[]
    const existing = new Set(list.map(a => `avis|${a.specialite}`))
    const toAdd = candidates.filter(c => !existing.has(`avis|${c.specialite}`))
    if (toAdd.length === 0) {
      ElMessage.info('Aucun nouvel avis à récupérer dans cette plage')
      return
    }
    list.push(...toAdd)
  } catch (e) {
    ElMessage.warning((e as Error).message)
  } finally {
    prefillRunning.value = false
  }
}

/** Pré-remplit au montage : ajoute les avis directement dans les données commitées. */
async function prefillAvis() {
  if (props.readonly || !props.patientId || prefillRunning.value) return
  prefillRunning.value = true
  try {
    const range = avisRangeValue({ ...dataWithAvis }) ?? null
    const candidates = await buildAvisCandidates(range)
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
      void prefillAvis()
    }
  }
})
</script>

<style scoped>
.journal-card {
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  padding: 14px;
  margin-bottom: 12px;
  background: var(--cde-surface);
  border-left: 3px solid var(--cde-accent);
}
.journal-card--flash {
  box-shadow: 0 0 0 2px var(--cde-accent);
}
.journal-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--cde-border-soft);
}
.journal-card__title {
  font-weight: 600;
  font-size: 13px;
  color: var(--cde-header-text);
}
.journal-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--cde-border-soft);
}

.avis-card {
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--cde-surface);
  border-left: 3px solid var(--cde-warning);
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
.avis-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--cde-border-soft);
}

.section-preview {
  margin: 8px 0 16px;
}
</style>
