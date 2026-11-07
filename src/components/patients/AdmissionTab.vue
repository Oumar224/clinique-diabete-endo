<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('sejour')"
      title="Détails du Séjour"
      :keys="['dateEntree', 'serviceAccueil']"
      :model-value="data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="Date d'entrée">
              <el-date-picker
                v-model="draft.dateEntree"
                type="date"
                value-format="YYYY-MM-DD"
                format="DD/MM/YYYY"
                style="width: 100%"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Service d'accueil">
              <el-input :model-value="draft.serviceAccueil" :disabled="true" />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Détails du Séjour"
        variant="compact"
        :fields="sejourPreviewFields"
        @edit="() => openSection('sejour')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('motif')"
      title="Motif d'hospitalisation"
      :keys="['motifHospitalisation']"
      :model-value="data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <RichTextEditor
          v-model="draft.motifHospitalisation"
          :readonly="readonly"
          :rows="6"
          placeholder="Saisissez le motif d'hospitalisation..."
        />
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Motif d'hospitalisation"
        variant="compact"
        :fields="motifPreviewFields"
        @edit="() => openSection('motif')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('medecin')"
      title="Médecin référent &amp; Responsable"
      :keys="['medecinTraitantNom', 'interneIPANom']"
      :model-value="data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Médecin référent">
              <el-select
                v-model="draft.medecinTraitantNom"
                filterable
                clearable
                placeholder="Choisir un médecin"
                style="width:100%"
                :disabled="readonly"
              >
                <el-option
                  v-for="doc in doctors"
                  :key="doc.id"
                  :label="formatDocLabel(doc)"
                  :value="formatDocLabel(doc)"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Responsable">
              <el-input :model-value="draft.interneIPANom || '—'" disabled />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Médecin référent &amp; Responsable"
        variant="compact"
        :fields="medecinPreviewFields"
        @edit="() => openSection('medecin')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import type { AdmissionData } from '@/types/crh-diabete'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'
import { ipcInvoke } from '@/utils/ipc'
import { isRichTextEmpty } from '@/utils/rich-text'
import { formatDate } from '@/utils/date'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'

interface DoctorOption {
  id: number
  nom: string
  prenom: string
}

const FIELD_PREFIX = 'admission'

const props = defineProps<{
  data: AdmissionData
  readonly: boolean
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

const doctors = ref<DoctorOption[]>([])

const sejourPreviewFields = computed<FormPreviewField[]>(() => [
  { label: "Date d'entrée", value: props.data.dateEntree ? formatDate(props.data.dateEntree) : '', key: `${FIELD_PREFIX}.dateEntree`, updatedAt: metaFor(`${FIELD_PREFIX}.dateEntree`), tracked: !!props.fieldMeta },
  { label: "Service d'accueil", value: props.data.serviceAccueil, key: `${FIELD_PREFIX}.serviceAccueil`, updatedAt: metaFor(`${FIELD_PREFIX}.serviceAccueil`), tracked: !!props.fieldMeta },
])

const motifPreviewFields = computed<FormPreviewField[]>(() => [
  {
    label: "Motif d'hospitalisation",
    value: isRichTextEmpty(props.data.motifHospitalisation) ? undefined : props.data.motifHospitalisation,
    rich: true,
    key: `${FIELD_PREFIX}.motifHospitalisation`,
    updatedAt: metaFor(`${FIELD_PREFIX}.motifHospitalisation`),
    tracked: !!props.fieldMeta,
  },
])

const medecinPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Médecin référent', value: props.data.medecinTraitantNom, key: `${FIELD_PREFIX}.medecinTraitantNom`, updatedAt: metaFor(`${FIELD_PREFIX}.medecinTraitantNom`), tracked: !!props.fieldMeta },
  { label: 'Responsable', value: props.data.interneIPANom, key: `${FIELD_PREFIX}.interneIPANom`, updatedAt: metaFor(`${FIELD_PREFIX}.interneIPANom`), tracked: !!props.fieldMeta },
])

function formatDocLabel(doc: DoctorOption): string {
  return `${doc.prenom} ${doc.nom}`
}

onMounted(async () => {
  try {
    doctors.value = await ipcInvoke<DoctorOption[]>('doctors:list-by-site', {})
  } catch {
    doctors.value = []
  }
})
</script>

<style scoped>
.section-preview {
  margin: 8px 0 16px;
}
</style>
