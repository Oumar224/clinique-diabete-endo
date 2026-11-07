<!-- AntecedentsObesiteTab — CRC Obésité : antécédents & addictions (§ ANTECEDENTS / ALLERGIES / ADDICTIONS).
  Pattern StagedCollapsibleSection/FormPreview calqué sur ModeVieAtcdTab.vue (CRC diabète),
  avec la correction demandée : `readonly` est une vraie prop ici (ModeVieAtcdTab ne
  l'a pas) et est propagée à chaque section et à chaque champ. Les allergies réutilisent
  la forme structurée `AllergieEntry` de `@/types/crc-diabete` (libelle, type) pour que
  la synchro patient/merge fonctionne comme côté diabète ; `antecedents: AntecedentEntry[]`
  est gardé en liste simple pour compatibilité.

  Addictions : `tabac` est `boolean` dans AntecedentsObesiteData (pas un champ texte
  libre) — il est donc saisi en checkbox « Oui », comme `alcool` en switch +
  `alcoolDetail`. `addictionsAutres` couvre le champ « autres » du formulaire papier.
-->
<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('medicaux')"
      title="Antécédents médicaux"
      :keys="['medicaux', 'medicauxAutres']"
      :model-value="data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-form-item label="Antécédents médicaux">
          <el-checkbox-group v-model="draft.medicaux" :disabled="readonly">
            <el-checkbox
              v-for="opt in MEDICAUX_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="Autres (préciser)">
          <el-input v-model="draft.medicauxAutres" :disabled="readonly" placeholder="Autres antécédents médicaux…" />
        </el-form-item>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Antécédents médicaux"
        variant="compact"
        :fields="medicauxPreviewFields"
        @edit="() => openSection('medicaux')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('chirurgicaux')"
      title="Antécédents chirurgicaux"
      :keys="['chirurgicaux']"
      :model-value="data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-form-item label="Antécédents chirurgicaux">
          <el-input
            v-model="draft.chirurgicaux"
            type="textarea"
            :rows="3"
            :disabled="readonly"
            placeholder="Préciser les antécédents chirurgicaux…"
          />
        </el-form-item>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Antécédents chirurgicaux"
        variant="compact"
        :fields="chirurgicauxPreviewFields"
        @edit="() => openSection('chirurgicaux')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('traitements')"
      title="Traitements en cours"
      :keys="['traitements', 'traitementsAutres']"
      :model-value="data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-form-item label="Traitements en cours">
          <el-checkbox-group v-model="draft.traitements" :disabled="readonly">
            <el-checkbox
              v-for="opt in TRAITEMENTS_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="Autres (préciser)">
          <el-input v-model="draft.traitementsAutres" :disabled="readonly" placeholder="Autres traitements…" />
        </el-form-item>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Traitements en cours"
        variant="compact"
        :fields="traitementsPreviewFields"
        @edit="() => openSection('traitements')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('familiaux')"
      title="Antécédents familiaux"
      :keys="['familiaux', 'familiauxAutres']"
      :model-value="data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-form-item label="Antécédents familiaux">
          <el-checkbox-group v-model="draft.familiaux" :disabled="readonly">
            <el-checkbox
              v-for="opt in FAMILIAUX_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="Autres (préciser)">
          <el-input v-model="draft.familiauxAutres" :disabled="readonly" placeholder="Autres antécédents familiaux…" />
        </el-form-item>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Antécédents familiaux"
        variant="compact"
        :fields="familiauxPreviewFields"
        @edit="() => openSection('familiaux')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('allergies')"
      title="Allergies"
      :keys="['allergies']"
      :model-value="data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row v-if="!readonly" :gutter="16" class="inline-entry-form">
          <el-col :span="5">
            <el-select v-model="newAllergie.type" style="width:100%">
              <el-option label="Médicamenteuse" value="Médicamenteuse" />
              <el-option label="Alimentaire" value="Alimentaire" />
              <el-option label="Latex" value="Latex" />
              <el-option label="Piqûre" value="Piqûre" />
              <el-option label="Autre" value="Autre" />
            </el-select>
          </el-col>
          <el-col :span="17">
            <el-input v-model="newAllergie.libelle" placeholder="Libellé de l'allergie" @keyup.enter="addAllergie(draft.allergies)" />
          </el-col>
          <el-col :span="2">
            <el-button type="primary" :icon="Plus" @click="addAllergie(draft.allergies)" :disabled="!newAllergie.libelle.trim()" />
          </el-col>
        </el-row>
        <div v-if="draft.allergies.length > 0" class="entry-list">
          <div
            v-for="(entry, i) in draft.allergies"
            :key="i"
            class="entry-card"
            :style="{ borderLeftColor: allergyTypeColors(entry.type).border }"
          >
            <span
              class="entry-type-badge"
              :style="{
                background: allergyTypeColors(entry.type).bg,
                color: allergyTypeColors(entry.type).text,
              }"
            >{{ entry.type }}</span>
            <span class="entry-libelle">{{ entry.libelle }}</span>
            <button v-if="!readonly" class="entry-delete" @click="removeAllergie(draft.allergies, i)" title="Supprimer">
              <el-icon :size="14"><Delete /></el-icon>
            </button>
          </div>
        </div>
        <div v-else class="entry-empty">Aucune allergie renseignée</div>
        <el-alert
          v-if="draft.allergies.length > 0"
          title="Alerte allergie"
          type="error"
          show-icon
          :closable="false"
        >
          Une allergie a été renseignée. Veuillez vérifier et prendre les précautions nécessaires.
        </el-alert>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Allergies"
        variant="compact"
        :fields="allergiesPreviewFields"
        empty-text="Aucune allergie renseignée"
        @edit="() => openSection('allergies')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('antecedents')"
      title="Antécédents"
      :keys="['antecedents']"
      :model-value="data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row v-if="!readonly" :gutter="16" class="inline-entry-form">
          <el-col :span="3">
            <el-input v-model="newAntecedent.annee" placeholder="Année" maxlength="4" @keyup.enter="addAntecedent(draft.antecedents)" />
          </el-col>
          <el-col :span="5">
            <el-select v-model="newAntecedent.type" style="width:100%">
              <el-option label="Familiale" value="Familiale" />
              <el-option label="Personnelle" value="Personnelle" />
            </el-select>
          </el-col>
          <el-col :span="14">
            <el-input v-model="newAntecedent.libelle" placeholder="Libellé de l'antécédent" @keyup.enter="addAntecedent(draft.antecedents)" />
          </el-col>
          <el-col :span="2">
            <el-button type="primary" :icon="Plus" @click="addAntecedent(draft.antecedents)" :disabled="!newAntecedent.libelle.trim()" />
          </el-col>
        </el-row>
        <div v-if="draft.antecedents.length > 0" class="entry-list">
          <div
            v-for="(entry, i) in draft.antecedents"
            :key="i"
            class="entry-card"
            :style="{ borderLeftColor: antecedentTypeColors(entry.type).border }"
          >
            <span v-if="entry.annee" class="entry-annee">{{ entry.annee }}</span>
            <span
              class="entry-type-badge"
              :style="{
                background: antecedentTypeColors(entry.type).bg,
                color: antecedentTypeColors(entry.type).text,
              }"
            >{{ entry.type }}</span>
            <span class="entry-libelle">{{ entry.libelle }}</span>
            <button v-if="!readonly" class="entry-delete" @click="removeAntecedent(draft.antecedents, i)" title="Supprimer">
              <el-icon :size="14"><Delete /></el-icon>
            </button>
          </div>
        </div>
        <div v-else class="entry-empty">Aucun antécédent renseigné</div>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Antécédents"
        variant="compact"
        :fields="antecedentsPreviewFields"
        empty-text="Aucun antécédent renseigné"
        @edit="() => openSection('antecedents')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('addictions')"
      title="Addictions"
      :keys="['tabac', 'alcool', 'alcoolDetail', 'addictionsAutres']"
      :model-value="data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="Tabac">
              <el-checkbox v-model="draft.tabac" :disabled="readonly">Oui</el-checkbox>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Alcool">
              <el-switch v-model="draft.alcool" :disabled="readonly" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Autres addictions (préciser)">
              <el-input v-model="draft.addictionsAutres" :disabled="readonly" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="draft.alcool" :gutter="16">
          <el-col :span="24">
            <el-form-item label="Détail consommation alcool">
              <el-input v-model="draft.alcoolDetail" type="textarea" :rows="2" :disabled="readonly" placeholder="Détail de la consommation d'alcool…" />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Addictions"
        variant="compact"
        :fields="addictionsPreviewFields"
        @edit="() => openSection('addictions')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Delete, Plus } from '@element-plus/icons-vue'
import type { AllergieEntry, AntecedentEntry } from '@/types/crc-diabete'
import type { CrcObesiteFormData } from '@/types/crc-obesite'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'
import { allergyTypeColors, antecedentTypeColors } from '@/utils/allergy-helpers'

const props = withDefaults(defineProps<{
  data: CrcObesiteFormData['modeVieAtcd']
  readonly?: boolean
}>(), {
  readonly: false,
})

const emit = defineEmits<{
  change: []
}>()

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

const MEDICAUX_OPTIONS = [
  { value: 'diabete', label: 'Diabète' },
  { value: 'hta', label: 'HTA' },
  { value: 'dyslipidemie', label: 'Dyslipidémie' },
  { value: 'apnee_sommeil', label: 'Apnée du sommeil' },
  { value: 'arthrose', label: 'Arthrose' },
  { value: 'thyroide', label: 'Problèmes thyroïdiens' },
  { value: 'sopk', label: 'SOPK' },
  { value: 'cushing', label: 'Cushing' },
  { value: 'steatose_hepatique', label: 'Stéatose hépatique' },
  { value: 'incontinence_urinaire', label: 'Incontinence urinaire' },
  { value: 'depression', label: 'Dépression' },
]
const TRAITEMENTS_OPTIONS = [
  { value: 'corticoides', label: 'Corticoïdes' },
  { value: 'antidepresseurs', label: 'Antidépresseurs' },
  { value: 'neuroleptiques', label: 'Neuroleptiques' },
  { value: 'betabloquants', label: 'Bêtabloquants' },
]
const FAMILIAUX_OPTIONS = [
  { value: 'obesite', label: 'Obésité' },
  { value: 'diabete', label: 'Diabète' },
  { value: 'hta', label: 'HTA' },
  { value: 'cardiopathies', label: 'Cardiopathies' },
]

function labelMap(options: Array<{ value: string; label: string }>): Record<string, string> {
  return Object.fromEntries(options.map(o => [o.value, o.label]))
}
const MEDICAUX_LABELS = labelMap(MEDICAUX_OPTIONS)
const TRAITEMENTS_LABELS = labelMap(TRAITEMENTS_OPTIONS)
const FAMILIAUX_LABELS = labelMap(FAMILIAUX_OPTIONS)

function joinLabels(values: string[], map: Record<string, string>): string {
  if (!values?.length) return ''
  return values.map(v => map[v] ?? v).join(', ')
}

const medicauxPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Antécédents médicaux', value: joinLabels(props.data.medicaux, MEDICAUX_LABELS) },
  { label: 'Autres', value: props.data.medicauxAutres },
])

const chirurgicauxPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Antécédents chirurgicaux', value: props.data.chirurgicaux },
])

const traitementsPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Traitements en cours', value: joinLabels(props.data.traitements, TRAITEMENTS_LABELS) },
  { label: 'Autres', value: props.data.traitementsAutres },
])

const familiauxPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Antécédents familiaux', value: joinLabels(props.data.familiaux, FAMILIAUX_LABELS) },
  { label: 'Autres', value: props.data.familiauxAutres },
])

const allergiesPreviewFields = computed<FormPreviewField[]>(() =>
  (props.data.allergies ?? []).map(a => ({
    label: a.type || 'Allergie',
    value: a.libelle,
  })),
)

function formatAntecedentPreview(a: AntecedentEntry): string {
  return [a.annee, a.libelle].filter(Boolean).join(' ')
}

const antecedentsPreviewFields = computed<FormPreviewField[]>(() =>
  (props.data.antecedents ?? []).map(a => ({
    label: a.type || 'Antécédent',
    value: formatAntecedentPreview(a),
  })),
)

const addictionsPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Tabac', value: props.data.tabac ? 'Oui' : null },
  { label: 'Alcool', value: props.data.alcool ? 'Oui' : null },
  { label: 'Détail alcool', value: props.data.alcoolDetail },
  { label: 'Autres addictions', value: props.data.addictionsAutres },
])

const newAllergie = ref<AllergieEntry>({ libelle: '', type: 'Médicamenteuse' })
const newAntecedent = ref<AntecedentEntry>({ libelle: '', annee: '', type: 'Familiale' })

function addAllergie(list: AllergieEntry[]) {
  const val = newAllergie.value.libelle.trim()
  if (!val) return
  list.push({ ...newAllergie.value, libelle: val })
  newAllergie.value = { libelle: '', type: 'Médicamenteuse' }
}

function removeAllergie(list: AllergieEntry[], index: number) {
  list.splice(index, 1)
}

function addAntecedent(list: AntecedentEntry[]) {
  const val = newAntecedent.value.libelle.trim()
  if (!val) return
  list.push({ libelle: val, annee: newAntecedent.value.annee, type: newAntecedent.value.type })
  newAntecedent.value = { libelle: '', annee: '', type: 'Familiale' }
}

function removeAntecedent(list: AntecedentEntry[], index: number) {
  list.splice(index, 1)
}
</script>

<style scoped>
.inline-entry-form {
  margin-bottom: 12px;
}
.section-preview {
  margin: 8px 0 16px;
}
.entry-list {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.entry-empty {
  padding: 14px 16px;
  text-align: center;
  color: var(--cde-muted);
  font-size: 13px;
  font-style: italic;
  background: var(--cde-surface-tint);
  border: 1px dashed var(--cde-border);
  border-radius: 6px;
  margin-bottom: 20px;
}
.entry-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--cde-surface);
  border: 1px solid var(--cde-border);
  border-left: 3px solid var(--cde-accent);
  border-radius: 6px;
  font-size: 13px;
  transition: background-color 0.2s ease;
}
.entry-card:hover {
  background: var(--cde-surface-tint);
}
.entry-type-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  flex-shrink: 0;
}
.entry-libelle {
  font-weight: 600;
  flex: 1;
  color: var(--cde-header-text);
  font-size: 13px;
  line-height: 1.4;
}
.entry-annee {
  color: var(--cde-muted);
  font-size: 12px;
  font-weight: 600;
  background: var(--cde-surface-tint);
  padding: 2px 10px;
  border-radius: 4px;
  flex-shrink: 0;
}
.entry-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--cde-muted);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.entry-delete:hover {
  background: var(--cde-danger-tint);
  color: var(--cde-danger);
  border-color: color-mix(in srgb, var(--cde-danger) 20%, transparent);
}
</style>
