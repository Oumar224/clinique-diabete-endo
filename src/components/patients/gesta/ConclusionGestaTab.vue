<!-- ConclusionGestaTab — CRC Diabète gestationnel : synthèse clinique,
  décision thérapeutique, conseils/éducation, commentaires, prochain
  contrôle et suivi prévu. Même pattern que MotifProfilObesiteTab :
  une StagedCollapsibleSection par bloc, `draft` isolé tant que
  `Enregistrer` n'a pas été cliqué, puis `change` émis au `save` ;
  `:disabled="readonly"` partout.
-->
<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('synthese')"
      title="Synthèse clinique"
      :keys="['syntheseClinique']"
      :model-value="props.data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-form-item label="Synthèse clinique">
          <el-input
            v-model="draft.syntheseClinique"
            type="textarea"
            :rows="4"
            :disabled="readonly"
            placeholder="Synthèse clinique…"
          />
        </el-form-item>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Synthèse clinique"
        variant="compact"
        :fields="synthesePreviewFields"
        @edit="() => openSection('synthese')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('decision')"
      title="Décision thérapeutique"
      :keys="['decision', 'decisionAutre']"
      :model-value="props.data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-form-item label="Décision thérapeutique">
          <el-radio-group v-model="draft.decision" :disabled="readonly">
            <el-radio value="maintien">{{ DECISION_LABELS.maintien }}</el-radio>
            <el-radio value="adaptation">{{ DECISION_LABELS.adaptation }}</el-radio>
            <el-radio value="introduction_insuline">{{ DECISION_LABELS.introduction_insuline }}</el-radio>
            <el-radio value="renforcement_mhd">{{ DECISION_LABELS.renforcement_mhd }}</el-radio>
            <el-radio value="autre">{{ DECISION_LABELS.autre }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="draft.decision === 'autre'" label="Autre décision (préciser)">
          <el-input
            v-model="draft.decisionAutre"
            type="textarea"
            :rows="2"
            :disabled="readonly"
            placeholder="Préciser l'autre décision…"
          />
        </el-form-item>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Décision thérapeutique"
        variant="compact"
        :fields="decisionPreviewFields"
        @edit="() => openSection('decision')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('conseils')"
      title="Conseils / éducation"
      :keys="['conseilsNutritionnels', 'activitePhysique', 'educationAutosurveillance']"
      :model-value="props.data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-form-item label="Conseils nutritionnels délivrés">
          <el-switch
            v-model="draft.conseilsNutritionnels"
            active-text="Oui"
            inactive-text="Non"
            :disabled="readonly"
          />
        </el-form-item>
        <el-form-item label="Activité physique adaptée abordée">
          <el-switch
            v-model="draft.activitePhysique"
            active-text="Oui"
            inactive-text="Non"
            :disabled="readonly"
          />
        </el-form-item>
        <el-form-item label="Éducation à l'autosurveillance / aux hypoglycémies">
          <el-switch
            v-model="draft.educationAutosurveillance"
            active-text="Oui"
            inactive-text="Non"
            :disabled="readonly"
          />
        </el-form-item>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Conseils / éducation"
        variant="compact"
        :fields="conseilsPreviewFields"
        @edit="() => openSection('conseils')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('commentaires')"
      title="Commentaires et prochain contrôle"
      :keys="['commentaires', 'prochainControle']"
      :model-value="props.data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-form-item label="Commentaires">
          <el-input
            v-model="draft.commentaires"
            type="textarea"
            :rows="3"
            :disabled="readonly"
            placeholder="Commentaires…"
          />
        </el-form-item>
        <el-form-item label="Prochain contrôle">
          <el-date-picker
            v-model="draft.prochainControle"
            type="date"
            value-format="YYYY-MM-DD"
            format="DD/MM/YYYY"
            style="width: 100%"
            :disabled="readonly"
          />
        </el-form-item>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Commentaires et prochain contrôle"
        variant="compact"
        :fields="commentairesPreviewFields"
        @edit="() => openSection('commentaires')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('suivi')"
      title="Suivi prévu"
      :keys="['suiviPrevu', 'suiviPrevuAutre']"
      :model-value="props.data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-form-item label="Suivi prévu">
          <el-checkbox-group v-model="draft.suiviPrevu" :disabled="readonly">
            <el-checkbox value="diabetologie">{{ SUIVI_LABELS.diabetologie }}</el-checkbox>
            <el-checkbox value="obstetrique">{{ SUIVI_LABELS.obstetrique }}</el-checkbox>
            <el-checkbox value="dietetique">{{ SUIVI_LABELS.dietetique }}</el-checkbox>
            <el-checkbox value="autre">{{ SUIVI_LABELS.autre }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item
          v-if="Array.isArray(draft.suiviPrevu) && draft.suiviPrevu.includes('autre')"
          label="Autre suivi (préciser)"
        >
          <el-input
            v-model="draft.suiviPrevuAutre"
            type="textarea"
            :rows="2"
            :disabled="readonly"
            placeholder="Préciser l'autre suivi…"
          />
        </el-form-item>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Suivi prévu"
        variant="compact"
        :fields="suiviPreviewFields"
        @edit="() => openSection('suivi')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { CrcGestaFormData } from '@/types/crc-gesta'
import { DECISION_LABELS, SUIVI_LABELS } from '@/types/crc-gesta'
import { formatDate } from '@/utils/date'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'

const props = withDefaults(defineProps<{
  data: CrcGestaFormData['conclusion']
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

const synthesePreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Synthèse clinique', value: props.data.syntheseClinique },
])

const decisionPreviewFields = computed<FormPreviewField[]>(() => {
  const fields: FormPreviewField[] = [
    {
      label: 'Décision thérapeutique',
      value: props.data.decision
        ? (DECISION_LABELS[props.data.decision as keyof typeof DECISION_LABELS] ?? props.data.decision)
        : '',
    },
  ]
  if (props.data.decisionAutre?.trim()) {
    fields.push({ label: 'Autre décision', value: props.data.decisionAutre })
  }
  return fields
})

function ouiNon(value: boolean): string {
  return value ? 'Oui' : ''
}

const conseilsPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Conseils nutritionnels', value: ouiNon(props.data.conseilsNutritionnels) },
  { label: 'Activité physique', value: ouiNon(props.data.activitePhysique) },
  { label: 'Éducation autosurveillance / hypoglycémies', value: ouiNon(props.data.educationAutosurveillance) },
])

const commentairesPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Commentaires', value: props.data.commentaires },
  {
    label: 'Prochain contrôle',
    value: props.data.prochainControle ? formatDate(props.data.prochainControle) : '',
  },
])

const suiviPreviewFields = computed<FormPreviewField[]>(() => {
  const fields: FormPreviewField[] = [
    {
      label: 'Suivi prévu',
      value: props.data.suiviPrevu?.length
        ? props.data.suiviPrevu.map(s => SUIVI_LABELS[s] ?? s).join(', ')
        : '',
    },
  ]
  if (props.data.suiviPrevuAutre?.trim()) {
    fields.push({ label: 'Autre suivi', value: props.data.suiviPrevuAutre })
  }
  return fields
})
</script>

<style scoped>
.section-preview {
  margin: 8px 0 16px;
}
</style>
