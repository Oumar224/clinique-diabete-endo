<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('journee')"
      title="Journée alimentaire type"
      :keys="['petitDejeuner', 'dejeuner', 'diner', 'grignotage']"
      :model-value="data"
      :readonly="props.readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Petit déjeuner">
              <el-input v-model="draft.petitDejeuner" type="textarea" :rows="2" placeholder="Décrire le petit déjeuner…" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Déjeuner">
              <el-input v-model="draft.dejeuner" type="textarea" :rows="2" placeholder="Décrire le déjeuner…" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Dîner">
              <el-input v-model="draft.diner" type="textarea" :rows="2" placeholder="Décrire le dîner…" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Grignotage">
              <el-input v-model="draft.grignotage" type="textarea" :rows="2" placeholder="Décrire le grignotage…" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Journée alimentaire type"
        variant="compact"
        :hide-header="true"
        :fields="journeePreviewFields"
        @edit="() => openSection('journee')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('comportement')"
      title="Comportement alimentaire"
      :keys="['mangeVite', 'satiate', 'hyperphagie', 'hyperphagieFrequenceSemaine', 'grignotageEmotionnel']"
      :model-value="data"
      :readonly="props.readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="Mangez-vous vite ?">
              <el-radio-group v-model="draft.mangeVite" :disabled="props.readonly">
                <el-radio :value="true">Oui</el-radio>
                <el-radio :value="false">Non</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Ressentez-vous la satiété ?">
              <el-radio-group v-model="draft.satiate" :disabled="props.readonly">
                <el-radio :value="true">Oui</el-radio>
                <el-radio :value="false">Non</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Crises d'hyperphagie ?">
              <el-radio-group v-model="draft.hyperphagie" :disabled="props.readonly">
                <el-radio :value="true">Oui</el-radio>
                <el-radio :value="false">Non</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Grignotage émotionnel ?">
              <el-radio-group v-model="draft.grignotageEmotionnel" :disabled="props.readonly">
                <el-radio :value="true">Oui</el-radio>
                <el-radio :value="false">Non</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="draft.hyperphagie" :gutter="16">
          <el-col :span="6">
            <el-form-item label="Fréquence hyperphagie (fois / semaine)">
              <el-input-number v-model="draft.hyperphagieFrequenceSemaine" :min="0" :max="100" :step="1" :precision="0" controls-position="right" style="width:100%" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Comportement alimentaire"
        variant="compact"
        :hide-header="true"
        :fields="comportementPreviewFields"
        @edit="() => openSection('comportement')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('boissons')"
      title="Boissons"
      :keys="['boissons', 'boissonsQuantite']"
      :model-value="data"
      :readonly="props.readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Boissons (eau, sodas, jus, alcool…)">
              <el-input v-model="draft.boissons" placeholder="Eau, sodas, jus, alcool…" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Quantité (par jour ou par semaine)">
              <el-input v-model="draft.boissonsQuantite" placeholder="Quantité / jour ou semaine" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Boissons"
        variant="compact"
        :hide-header="true"
        :fields="boissonsPreviewFields"
        @edit="() => openSection('boissons')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('complements')"
      title="Compléments nutritionnels"
      :keys="['complementsNutritionnels', 'complementsDetail']"
      :model-value="data"
      :readonly="props.readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Prenez-vous des compléments nutritionnels ?">
              <el-radio-group v-model="draft.complementsNutritionnels" :disabled="props.readonly">
                <el-radio value="non">Non</el-radio>
                <el-radio value="oral">Oral</el-radio>
                <el-radio value="parentéral">Parentéral</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="draft.complementsNutritionnels && draft.complementsNutritionnels !== 'non'" :gutter="16">
          <el-col :span="24">
            <el-form-item label="Détail (nom, posologie, durée de traitement)">
              <el-input v-model="draft.complementsDetail" type="textarea" :rows="2" placeholder="Décrire les compléments (nom, posologie, durée de traitement)…" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Compléments nutritionnels"
        variant="compact"
        :hide-header="true"
        :fields="complementsPreviewFields"
        @edit="() => openSection('complements')"
      />
    </div>

    <CollapsibleSection
      title="Apport quotidien"
      :default-open="true"
    >
      <ApportsTable :lignes="data.apports.lignes" v-model:objectif-jour-kcal="data.apports.objectifJourKcal" :readonly="readonly" @change="emit('change')" />
    </CollapsibleSection>

    <StagedCollapsibleSection
      :ref="setSectionRef('activite')"
      title="Activité physique"
      :keys="['activitePhysique', 'activiteType', 'activiteDureeMin', 'activiteFrequence', 'activiteFrequenceUnite']"
      :model-value="data"
      :readonly="props.readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="Pratiquez-vous une activité physique ?">
              <el-radio-group v-model="draft.activitePhysique" :disabled="props.readonly">
                <el-radio :value="true">Oui</el-radio>
                <el-radio :value="false">Non</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Type d'activité">
              <el-input v-model="draft.activiteType" placeholder="Type d'activité…" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="Durée par séance (min)">
              <el-input-number v-model="draft.activiteDureeMin" :min="0" :max="10000" :step="5" :precision="0" controls-position="right" style="width:100%" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="Fréquence (fois)">
              <el-input-number v-model="draft.activiteFrequence" :min="0" :max="1000" :step="1" :precision="0" controls-position="right" style="width:100%" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="Unité de fréquence">
              <el-select v-model="draft.activiteFrequenceUnite" placeholder="—" clearable style="width:100%" :disabled="props.readonly">
                <el-option label="par jour" value="jour" />
                <el-option label="par semaine" value="semaine" />
                <el-option label="par mois" value="mois" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Activité physique"
        variant="compact"
        :hide-header="true"
        :fields="activitePreviewFields"
        @edit="() => openSection('activite')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { CrcObesiteFormData } from '@/types/crc-obesite'
import FormPreview, { type FormPreviewField } from '@/components/common/FormPreview.vue'
import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import ApportsTable from '@/components/patients/obesite/ApportsTable.vue'

const FIELD_PREFIX = 'comportementAlimentaire'

const props = defineProps<{
  data: CrcObesiteFormData['comportementAlimentaire']
  readonly?: boolean
}>()

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

const journeePreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Petit déjeuner', value: props.data.petitDejeuner || null, key: `${FIELD_PREFIX}.petitDejeuner` },
  { label: 'Déjeuner', value: props.data.dejeuner || null, key: `${FIELD_PREFIX}.dejeuner` },
  { label: 'Dîner', value: props.data.diner || null, key: `${FIELD_PREFIX}.diner` },
  { label: 'Grignotage', value: props.data.grignotage || null, key: `${FIELD_PREFIX}.grignotage` },
])

const comportementPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Mange vite ?', value: props.data.mangeVite ? 'Oui' : null, key: `${FIELD_PREFIX}.mangeVite` },
  { label: 'Satiété ?', value: props.data.satiate ? 'Oui' : null, key: `${FIELD_PREFIX}.satiate` },
  { label: 'Hyperphagie ?', value: props.data.hyperphagie ? 'Oui' : null, key: `${FIELD_PREFIX}.hyperphagie` },
  { label: 'Fréquence hyperphagie', value: props.data.hyperphagie && props.data.hyperphagieFrequenceSemaine != null ? `${props.data.hyperphagieFrequenceSemaine} fois / semaine` : null, key: `${FIELD_PREFIX}.hyperphagieFrequenceSemaine` },
  { label: 'Grignotage émotionnel ?', value: props.data.grignotageEmotionnel ? 'Oui' : null, key: `${FIELD_PREFIX}.grignotageEmotionnel` },
])

const boissonsPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Boissons', value: props.data.boissons || null, key: `${FIELD_PREFIX}.boissons` },
  { label: 'Quantité', value: props.data.boissonsQuantite || null, key: `${FIELD_PREFIX}.boissonsQuantite` },
])

const COMPLEMENTS_LABELS: Record<string, string> = {
  non: 'Non',
  oral: 'Oral',
  parentéral: 'Parentéral',
}

const complementsPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Compléments nutritionnels', value: props.data.complementsNutritionnels ? (COMPLEMENTS_LABELS[props.data.complementsNutritionnels] ?? props.data.complementsNutritionnels) : null, key: `${FIELD_PREFIX}.complementsNutritionnels` },
  { label: 'Détail compléments', value: props.data.complementsDetail || null, key: `${FIELD_PREFIX}.complementsDetail` },
])

const activitePreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Activité physique ?', value: props.data.activitePhysique ? 'Oui' : null, key: `${FIELD_PREFIX}.activitePhysique` },
  { label: "Type d'activité", value: props.data.activiteType || null, key: `${FIELD_PREFIX}.activiteType` },
  { label: 'Durée par séance', value: props.data.activiteDureeMin != null ? `${props.data.activiteDureeMin} min` : null, key: `${FIELD_PREFIX}.activiteDureeMin` },
  { label: 'Fréquence', value: props.data.activiteFrequence != null ? `${props.data.activiteFrequence} fois / ${props.data.activiteFrequenceUnite || '?'}` : null, key: `${FIELD_PREFIX}.activiteFrequence` },
  { label: 'Unité de fréquence', value: props.data.activiteFrequenceUnite || null, key: `${FIELD_PREFIX}.activiteFrequenceUnite` },
])
</script>

<style scoped>
.section-preview {
  margin: 8px 0 16px;
}
</style>
