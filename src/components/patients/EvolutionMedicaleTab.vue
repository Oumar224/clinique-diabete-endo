<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('evenements')"
      title="Événements réglementaires"
      :keys="['infoPatientFamille', 'produitsSanguins', 'bmrBhre']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="Information du patient / famille" data-history-path="evolutionMedicale.infoPatientFamille">
              <el-checkbox v-model="draft.infoPatientFamille">Oui</el-checkbox>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Administration de produits sanguins" data-history-path="evolutionMedicale.produitsSanguins">
              <el-checkbox v-model="draft.produitsSanguins">Oui</el-checkbox>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Porteur / Contact BMR ou BHRe" data-history-path="evolutionMedicale.bmrBhre">
              <el-checkbox v-model="draft.bmrBhre">Oui</el-checkbox>
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Événements réglementaires"
        variant="compact"
        :fields="evenementsPreviewFields"
        @edit="() => openSection('evenements')"
      />
    </div>

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
  </el-form>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import type { EvolutionMedicaleData } from '@/types/crh-diabete'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'
import { htmlToPlainText, isRichTextEmpty } from '@/utils/rich-text'

const FIELD_PREFIX = 'evolutionMedicale'

const props = defineProps<{
  data: EvolutionMedicaleData
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

const evenementsPreviewFields = computed<FormPreviewField[]>(() => {
  const d = props.data
  return [
    { label: 'Information du patient / famille', value: d.infoPatientFamille ? 'Oui' : null, key: `${FIELD_PREFIX}.infoPatientFamille`, updatedAt: metaFor(`${FIELD_PREFIX}.infoPatientFamille`), tracked: !!props.fieldMeta },
    { label: 'Administration de produits sanguins', value: d.produitsSanguins ? 'Oui' : null, key: `${FIELD_PREFIX}.produitsSanguins`, updatedAt: metaFor(`${FIELD_PREFIX}.produitsSanguins`), tracked: !!props.fieldMeta },
    { label: 'Porteur / Contact BMR ou BHRe', value: d.bmrBhre ? 'Oui' : null, key: `${FIELD_PREFIX}.bmrBhre`, updatedAt: metaFor(`${FIELD_PREFIX}.bmrBhre`), tracked: !!props.fieldMeta },
  ]
})

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

.section-preview {
  margin: 8px 0 16px;
}

.el-form-item[data-history-path]:hover {
  cursor: default;
}
</style>
