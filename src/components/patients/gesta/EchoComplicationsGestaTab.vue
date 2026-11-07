<!-- EchoComplicationsGestaTab — CRC Diabète gestationnel : conclusion dernière
  échographie obstétricale + complications / signes d'alerte.
  Même pattern que MotifProfilObesiteTab / MotifDiagnosticGestaTab : une
  StagedCollapsibleSection par bloc, `draft` isolé tant que `Enregistrer`
  n'a pas été cliqué, puis `change` émis au `save`. Les mutations sont faites
  directement sur le draft (dont la cohérence aucun/signes) et commitées
  via la section ; `:disabled="readonly"` partout.
-->
<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('echo')"
      title="Conclusion dernière échographie obstétricale"
      :keys="['trimestre', 'conclusion']"
      :model-value="props.echo"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-form-item label="Trimestre de la dernière échographie">
          <el-radio-group v-model="draft.trimestre" :disabled="readonly">
            <el-radio value="T1">{{ TRIMESTRE_LABELS.T1 }}</el-radio>
            <el-radio value="T2">{{ TRIMESTRE_LABELS.T2 }}</el-radio>
            <el-radio value="T3">{{ TRIMESTRE_LABELS.T3 }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="Conclusion de l'échographie">
          <el-input
            v-model="draft.conclusion"
            type="textarea"
            :rows="3"
            :disabled="readonly"
            placeholder="Conclusion de la dernière échographie obstétricale…"
          />
        </el-form-item>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Conclusion dernière échographie obstétricale"
        variant="compact"
        :fields="echoPreviewFields"
        @edit="() => openSection('echo')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('complications')"
      title="Complications / signes d'alerte"
      :keys="['aucun', 'signes', 'autreDetail']"
      :model-value="props.complications"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-form-item label="Statut">
          <el-checkbox
            v-model="draft.aucun"
            :disabled="readonly"
            @change="(value: boolean | string | number) => onAucunChange(draft, value)"
          >
            Aucun
          </el-checkbox>
        </el-form-item>
        <el-form-item label="Signes d'alerte">
          <el-checkbox-group
            v-model="draft.signes"
            :disabled="readonly"
            @change="() => onSignesChange(draft)"
          >
            <el-checkbox value="hta_preeclampsie">{{ SIGNE_LABELS.hta_preeclampsie }}</el-checkbox>
            <el-checkbox value="autre">{{ SIGNE_LABELS.autre }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item
          v-if="Array.isArray(draft.signes) && draft.signes.includes('autre')"
          label="Autre signe (préciser)"
        >
          <el-input
            v-model="draft.autreDetail"
            type="textarea"
            :rows="2"
            :disabled="readonly"
            placeholder="Préciser l'autre signe d'alerte…"
          />
        </el-form-item>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Complications / signes d'alerte"
        variant="compact"
        :fields="complicationsPreviewFields"
        empty-text="Aucune complication renseignée"
        @edit="() => openSection('complications')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { CrcGestaFormData } from '@/types/crc-gesta'
import { TRIMESTRE_LABELS } from '@/types/crc-gesta'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'

const props = withDefaults(defineProps<{
  echo: CrcGestaFormData['echoObstetricale']
  complications: CrcGestaFormData['complications']
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

const SIGNE_LABELS: Record<string, string> = {
  hta_preeclampsie: 'HTA / suspicion de prééclampsie',
  autre: 'Autre',
}

const echoPreviewFields = computed<FormPreviewField[]>(() => [
  {
    label: 'Trimestre',
    value: props.echo.trimestre
      ? (TRIMESTRE_LABELS[props.echo.trimestre as keyof typeof TRIMESTRE_LABELS] ?? props.echo.trimestre)
      : '',
  },
  { label: 'Conclusion', value: props.echo.conclusion },
])

const complicationsPreviewFields = computed<FormPreviewField[]>(() => {
  const c = props.complications
  const fields: FormPreviewField[] = []
  if (c.aucun) {
    fields.push({ label: 'Complications', value: 'Aucune' })
  }
  if (c.signes?.length) {
    fields.push({
      label: 'Signes d\'alerte',
      value: c.signes.map(s => SIGNE_LABELS[s] ?? s).join(', '),
    })
  }
  if (c.autreDetail?.trim()) {
    fields.push({ label: 'Autre (préciser)', value: c.autreDetail })
  }
  return fields
})

// Cohérence « Aucun » / signes : mutation en place du draft (commitée via
// le Staged au save, qui émet `change`). Si `aucun` est coché, les signes
// sont décochés ; si un signe est coché, `aucun` est décoché.
function onAucunChange(draft: Record<string, unknown>, value: boolean | string | number) {
  if (value === true || value === 'true') {
    draft.signes = []
    draft.autreDetail = ''
  }
}

function onSignesChange(draft: Record<string, unknown>) {
  const signes = draft.signes as unknown[] | undefined
  if (Array.isArray(signes) && signes.length > 0) {
    draft.aucun = false
  }
}
</script>

<style scoped>
.section-preview {
  margin: 8px 0 16px;
}
</style>
