<!-- MotifDiagnosticGestaTab — CRC Diabète gestationnel : type de consultation,
  plaintes du jour, diagnostic du diabète.
  Même pattern que MotifProfilObesiteTab / AdmissionTab : une
  StagedCollapsibleSection par bloc, `draft` isolé tant que `Enregistrer`
  n'a pas été cliqué, puis `change` émis au `save`. Les mutations sont
  volontairement faites directement sur le draft (templates Staged) et
  commitées via la section ; les boutons add/remove sont masqués si
  `readonly`.
-->
<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('type')"
      title="Type de consultation"
      :keys="['typeConsultation']"
      :model-value="motif"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-form-item label="Type de consultation">
          <el-radio-group v-model="draft.typeConsultation" :disabled="readonly">
            <el-radio value="initiale">{{ TYPE_CONSULTATION_LABELS.initiale }}</el-radio>
            <el-radio value="suivi">{{ TYPE_CONSULTATION_LABELS.suivi }}</el-radio>
            <el-radio value="post_partum">{{ TYPE_CONSULTATION_LABELS.post_partum }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Type de consultation"
        variant="compact"
        :fields="typePreviewFields"
        @edit="() => openSection('type')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('plaintes')"
      title="Plaintes du jour"
      :keys="['plaintes']"
      :model-value="motif"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-form-item label="Plaintes du jour">
          <el-input
            v-model="draft.plaintes"
            type="textarea"
            :rows="3"
            :disabled="readonly"
            placeholder="Plaintes du jour…"
          />
        </el-form-item>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Plaintes du jour"
        variant="compact"
        :fields="plaintesPreviewFields"
        @edit="() => openSection('plaintes')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('diagnostic')"
      title="Diagnostic du diabète"
      :keys="['dateDiagnostic', 'termeSaDiagnostic', 'termeJoursDiagnostic', 'modeDiagnostic', 'glycemieJeun', 'glycemiePost1h', 'glycemiePost2h', 'diagnosticRetenu']"
      :model-value="diagnostic"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="Date du diagnostic">
              <el-date-picker
                v-model="draft.dateDiagnostic"
                type="date"
                value-format="YYYY-MM-DD"
                format="DD/MM/YYYY"
                style="width: 100%"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Terme au diagnostic (SA)">
              <el-input-number
                v-model="draft.termeSaDiagnostic"
                :min="0"
                :precision="0"
                controls-position="right"
                style="width:100%"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Terme au diagnostic (jours)">
              <el-input-number
                v-model="draft.termeJoursDiagnostic"
                :min="0"
                :max="6"
                :precision="0"
                controls-position="right"
                style="width:100%"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="Mode de diagnostic">
          <el-checkbox-group v-model="draft.modeDiagnostic" :disabled="readonly">
            <el-checkbox value="gaj">{{ MODE_DIAGNOSTIC_LABELS.gaj }}</el-checkbox>
            <el-checkbox value="pp">{{ MODE_DIAGNOSTIC_LABELS.pp }}</el-checkbox>
            <el-checkbox value="hgpo75">{{ MODE_DIAGNOSTIC_LABELS.hgpo75 }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="Glycémie à jeun (g/L)">
              <el-input-number
                v-model="draft.glycemieJeun"
                :min="0"
                :step="0.01"
                :precision="2"
                controls-position="right"
                style="width:100%"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Glycémie PP à 1 heure (g/L)">
              <el-input-number
                v-model="draft.glycemiePost1h"
                :min="0"
                :step="0.01"
                :precision="2"
                controls-position="right"
                style="width:100%"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Glycémie PP à 2 heures (g/L)">
              <el-input-number
                v-model="draft.glycemiePost2h"
                :min="0"
                :step="0.01"
                :precision="2"
                controls-position="right"
                style="width:100%"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="Diagnostic retenu">
          <el-radio-group v-model="draft.diagnosticRetenu" :disabled="readonly">
            <el-radio value="diabete_grossesse">{{ DIAGNOSTIC_RETENU_LABELS.diabete_grossesse }}</el-radio>
            <el-radio value="diabete_gestationnel">{{ DIAGNOSTIC_RETENU_LABELS.diabete_gestationnel }}</el-radio>
            <el-radio value="suspicion_manifeste">{{ DIAGNOSTIC_RETENU_LABELS.suspicion_manifeste }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Diagnostic du diabète"
        variant="compact"
        :fields="diagnosticPreviewFields"
        @edit="() => openSection('diagnostic')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { CrcGestaFormData } from '@/types/crc-gesta'
import {
  TYPE_CONSULTATION_LABELS,
  MODE_DIAGNOSTIC_LABELS,
  DIAGNOSTIC_RETENU_LABELS,
} from '@/types/crc-gesta'
import { formatDate } from '@/utils/date'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'

const props = withDefaults(defineProps<{
  motif: CrcGestaFormData['motifConsultation']
  diagnostic: CrcGestaFormData['diagnosticDiabete']
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

function fmtNum(value: number | null, unit: string): string | null {
  return value == null ? null : `${value} ${unit}`
}

const typePreviewFields = computed<FormPreviewField[]>(() => [
  {
    label: 'Type de consultation',
    value: props.motif.typeConsultation
      ? (TYPE_CONSULTATION_LABELS[props.motif.typeConsultation as keyof typeof TYPE_CONSULTATION_LABELS] ?? props.motif.typeConsultation)
      : '',
  },
])

const plaintesPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Plaintes du jour', value: props.motif.plaintes },
])

const diagnosticPreviewFields = computed<FormPreviewField[]>(() => {
  const d = props.diagnostic
  const terme = d.termeSaDiagnostic != null
    ? `${d.termeSaDiagnostic} SA${d.termeJoursDiagnostic ? ` + ${d.termeJoursDiagnostic} j` : ''}`
    : ''
  return [
    { label: 'Date du diagnostic', value: d.dateDiagnostic ? formatDate(d.dateDiagnostic) : '' },
    { label: 'Terme au diagnostic', value: terme },
    {
      label: 'Mode de diagnostic',
      value: d.modeDiagnostic?.length
        ? d.modeDiagnostic.map(m => MODE_DIAGNOSTIC_LABELS[m] ?? m).join(', ')
        : '',
    },
    { label: 'Glycémie à jeun', value: fmtNum(d.glycemieJeun, 'g/L') },
    { label: 'Glycémie PP à 1 heure', value: fmtNum(d.glycemiePost1h, 'g/L') },
    { label: 'Glycémie PP à 2 heures', value: fmtNum(d.glycemiePost2h, 'g/L') },
    {
      label: 'Diagnostic retenu',
      value: d.diagnosticRetenu
        ? (DIAGNOSTIC_RETENU_LABELS[d.diagnosticRetenu as keyof typeof DIAGNOSTIC_RETENU_LABELS] ?? d.diagnosticRetenu)
        : '',
    },
  ]
})
</script>

<style scoped>
.section-preview {
  margin: 8px 0 16px;
}
</style>
