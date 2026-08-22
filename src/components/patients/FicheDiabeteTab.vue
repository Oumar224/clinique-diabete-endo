<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('historique')"
      title="Historique du Diabète"
      :keys="['dateDiagnostic']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Date du diagnostic" data-history-path="ficheDiabete.dateDiagnostic">
              <el-date-picker v-model="draft.dateDiagnostic" type="month" value-format="YYYY-MM" format="MM/YYYY" placeholder="MM/AAAA" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Durée d'évolution">
              <el-input :model-value="dureeOf(draft.dateDiagnostic)" disabled />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Historique du Diabète"
        variant="compact"
        :fields="historiquePreviewFields"
        @edit="() => openSection('historique')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('ponderal')"
      title="Suivi Pondéral"
      :keys="['poidsForme', 'poidsJuillet2024', 'poidsDecembre2025']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="Poids de forme (kg)" data-history-path="ficheDiabete.poidsForme">
              <el-input-number v-model="draft.poidsForme" :min="0" :max="300" controls-position="right" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Poids juillet 2024 (kg)" data-history-path="ficheDiabete.poidsJuillet2024">
              <el-input-number v-model="draft.poidsJuillet2024" :min="0" :max="300" controls-position="right" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Poids décembre 2025 (kg)" data-history-path="ficheDiabete.poidsDecembre2025">
              <el-input-number v-model="draft.poidsDecembre2025" :min="0" :max="300" controls-position="right" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Suivi Pondéral"
        variant="compact"
        :fields="ponderalPreviewFields"
        @edit="() => openSection('ponderal')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('bilan')"
      title="Dernier Bilan Métabolique"
      :keys="['hba1c', 'hba1cDate', 'hdl', 'ldl', 'triglycerides']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="HbA1c (%)" data-history-path="ficheDiabete.hba1c">
              <el-input-number v-model="draft.hba1c" :min="0" :max="30" :step="0.1" controls-position="right" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Date de l'examen" data-history-path="ficheDiabete.hba1cDate">
              <el-date-picker v-model="draft.hba1cDate" type="date" value-format="YYYY-MM-DD" format="DD/MM/YYYY" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="HDL (mmol/L)" data-history-path="ficheDiabete.hdl">
              <el-input-number v-model="draft.hdl" :min="0" :max="10" :step="0.01" controls-position="right" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="LDL (mmol/L)" data-history-path="ficheDiabete.ldl">
              <el-input-number v-model="draft.ldl" :min="0" :max="10" :step="0.01" controls-position="right" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Triglycérides (mmol/L)" data-history-path="ficheDiabete.triglycerides">
              <el-input-number v-model="draft.triglycerides" :min="0" :max="20" :step="0.01" controls-position="right" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Dernier Bilan Métabolique"
        variant="compact"
        :fields="bilanPreviewFields"
        @edit="() => openSection('bilan')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('complications')"
      title="Complications Micro &amp; Macro-vasculaires"
      :keys="['retinopathie', 'creatininemie', 'neuropathie', 'podologiqueGrade', 'amputation', 'amputationDetail', 'insuffisanceCardiaque', 'ntProBNP', 'aomi', 'ischemicCritique']"
      :model-value="data"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Ophtalmologique (Rétinopathie)" data-history-path="ficheDiabete.retinopathie">
              <el-select v-model="draft.retinopathie" style="width:100%">
                <el-option label="Absente" value="Absente" />
                <el-option label="RDNP minime" value="RDNP minime" />
                <el-option label="Modérée" value="Modérée" />
                <el-option label="Proliférante" value="Proliférante" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="Créatininémie (µmol/L)" data-history-path="ficheDiabete.creatininemie">
              <el-input-number v-model="draft.creatininemie" :min="0" :max="2000" controls-position="right" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="DFG (mL/min/1.73m²)">
              <el-input :model-value="dfgDisplayOf(draft.creatininemie)" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Stade IR">
              <el-input :model-value="stadeOf(dfgValueOf(draft.creatininemie))" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Neuropathie symptomatique" data-history-path="ficheDiabete.neuropathie">
              <el-checkbox v-model="draft.neuropathie">Oui</el-checkbox>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Grade podologique" data-history-path="ficheDiabete.podologiqueGrade">
              <el-select v-model="draft.podologiqueGrade" placeholder="0-3" style="width:100%">
                <el-option label="0" :value="0" />
                <el-option label="1" :value="1" />
                <el-option label="2" :value="2" />
                <el-option label="3" :value="3" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Amputation" data-history-path="ficheDiabete.amputation">
              <el-checkbox v-model="draft.amputation">Oui</el-checkbox>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item v-if="draft.amputation" label="Détail amputation">
              <RichTextEditor v-model="draft.amputationDetail" :rows="2" placeholder="Amputation Transmétatarsienne gauche le 08/12/2025" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Insuffisance cardiaque" data-history-path="ficheDiabete.insuffisanceCardiaque">
              <el-checkbox v-model="draft.insuffisanceCardiaque">Oui</el-checkbox>
            </el-form-item>
            <el-form-item v-if="draft.insuffisanceCardiaque" label="NT-proBNP (pg/mL)" data-history-path="ficheDiabete.ntProBNP">
              <el-input-number v-model="draft.ntProBNP" :min="0" controls-position="right" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="AOMI" data-history-path="ficheDiabete.aomi">
              <el-checkbox v-model="draft.aomi">Oui</el-checkbox>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item v-if="draft.aomi" label="Description ischémie critique">
              <RichTextEditor v-model="draft.ischemicCritique" :rows="2" placeholder="Description de l'ischémie critique..." />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Complications Micro &amp; Macro-vasculaires"
        variant="compact"
        :fields="complicationsPreviewFields"
        @edit="() => openSection('complications')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import type { FicheDiabeteData } from '@/types/crh-diabete'
import { useCrhDiabeteCalculations } from '@/composables/useCrhDiabeteCalculations'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'
import { isRichTextEmpty } from '@/utils/rich-text'
import { formatDate } from '@/utils/date'

const FIELD_PREFIX = 'ficheDiabete'

const props = defineProps<{
  data: FicheDiabeteData
  sexe: string | null
  age: number | null
  dateEntree: string
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

const { calcDureeDiabete, calcDFG, calcStadeIR } = useCrhDiabeteCalculations()

function dureeOf(dateDiagnostic: string): string {
  return calcDureeDiabete(dateDiagnostic, props.dateEntree || undefined) || '—'
}

function dfgValueOf(creatininemie: number | null): number | null {
  return calcDFG(creatininemie, props.age, props.sexe)
}

function dfgDisplayOf(creatininemie: number | null): string {
  const v = dfgValueOf(creatininemie)
  return v != null ? String(v) : '—'
}

function stadeOf(dfg: number | null): string {
  return calcStadeIR(dfg)
}

function formatMonth(ym: string): string {
  const parts = ym.split('-')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return ym
  return `${parts[1]}/${parts[0]}`
}

const historiquePreviewFields = computed<FormPreviewField[]>(() => {
  const d = props.data
  return [
    { label: 'Date du diagnostic', value: formatMonth(d.dateDiagnostic), key: `${FIELD_PREFIX}.dateDiagnostic`, updatedAt: metaFor(`${FIELD_PREFIX}.dateDiagnostic`), tracked: !!props.fieldMeta },
    { label: 'Durée d\'évolution', value: dureeOf(d.dateDiagnostic) !== '—' ? dureeOf(d.dateDiagnostic) : null, key: `${FIELD_PREFIX}.dateDiagnostic`, updatedAt: metaFor(`${FIELD_PREFIX}.dateDiagnostic`), tracked: !!props.fieldMeta },
  ]
})

const ponderalPreviewFields = computed<FormPreviewField[]>(() => {
  const d = props.data
  return [
    { label: 'Poids de forme (kg)', value: d.poidsForme, key: `${FIELD_PREFIX}.poidsForme`, updatedAt: metaFor(`${FIELD_PREFIX}.poidsForme`), tracked: !!props.fieldMeta },
    { label: 'Poids juillet 2024 (kg)', value: d.poidsJuillet2024, key: `${FIELD_PREFIX}.poidsJuillet2024`, updatedAt: metaFor(`${FIELD_PREFIX}.poidsJuillet2024`), tracked: !!props.fieldMeta },
    { label: 'Poids décembre 2025 (kg)', value: d.poidsDecembre2025, key: `${FIELD_PREFIX}.poidsDecembre2025`, updatedAt: metaFor(`${FIELD_PREFIX}.poidsDecembre2025`), tracked: !!props.fieldMeta },
  ]
})

const bilanPreviewFields = computed<FormPreviewField[]>(() => {
  const d = props.data
  return [
    { label: 'HbA1c (%)', value: d.hba1c, key: `${FIELD_PREFIX}.hba1c`, updatedAt: metaFor(`${FIELD_PREFIX}.hba1c`), tracked: !!props.fieldMeta },
    { label: 'Date de l\'examen', value: d.hba1cDate ? formatDate(d.hba1cDate) : '', key: `${FIELD_PREFIX}.hba1cDate`, updatedAt: metaFor(`${FIELD_PREFIX}.hba1cDate`), tracked: !!props.fieldMeta },
    { label: 'HDL (mmol/L)', value: d.hdl, key: `${FIELD_PREFIX}.hdl`, updatedAt: metaFor(`${FIELD_PREFIX}.hdl`), tracked: !!props.fieldMeta },
    { label: 'LDL (mmol/L)', value: d.ldl, key: `${FIELD_PREFIX}.ldl`, updatedAt: metaFor(`${FIELD_PREFIX}.ldl`), tracked: !!props.fieldMeta },
    { label: 'Triglycérides (mmol/L)', value: d.triglycerides, key: `${FIELD_PREFIX}.triglycerides`, updatedAt: metaFor(`${FIELD_PREFIX}.triglycerides`), tracked: !!props.fieldMeta },
  ]
})

const complicationsPreviewFields = computed<FormPreviewField[]>(() => {
  const d = props.data
  const dfg = dfgValueOf(d.creatininemie)
  const stade = stadeOf(dfg)
  return [
    { label: 'Rétinopathie', value: d.retinopathie, key: `${FIELD_PREFIX}.retinopathie`, updatedAt: metaFor(`${FIELD_PREFIX}.retinopathie`), tracked: !!props.fieldMeta },
    { label: 'Créatininémie (µmol/L)', value: d.creatininemie, key: `${FIELD_PREFIX}.creatininemie`, updatedAt: metaFor(`${FIELD_PREFIX}.creatininemie`), tracked: !!props.fieldMeta },
    { label: 'DFG (mL/min/1.73m²)', value: dfg, key: `${FIELD_PREFIX}.creatininemie`, updatedAt: metaFor(`${FIELD_PREFIX}.creatininemie`), tracked: !!props.fieldMeta },
    { label: 'Stade IR', value: stade !== '—' ? stade : null, key: `${FIELD_PREFIX}.creatininemie`, updatedAt: metaFor(`${FIELD_PREFIX}.creatininemie`), tracked: !!props.fieldMeta },
    { label: 'Neuropathie symptomatique', value: d.neuropathie ? 'Oui' : null, key: `${FIELD_PREFIX}.neuropathie`, updatedAt: metaFor(`${FIELD_PREFIX}.neuropathie`), tracked: !!props.fieldMeta },
    { label: 'Grade podologique', value: d.podologiqueGrade, key: `${FIELD_PREFIX}.podologiqueGrade`, updatedAt: metaFor(`${FIELD_PREFIX}.podologiqueGrade`), tracked: !!props.fieldMeta },
    { label: 'Amputation', value: d.amputation ? 'Oui' : null, key: `${FIELD_PREFIX}.amputation`, updatedAt: metaFor(`${FIELD_PREFIX}.amputation`), tracked: !!props.fieldMeta },
    { label: 'Détail amputation', value: isRichTextEmpty(d.amputationDetail) ? undefined : d.amputationDetail, rich: true, key: `${FIELD_PREFIX}.amputationDetail`, updatedAt: metaFor(`${FIELD_PREFIX}.amputationDetail`), tracked: !!props.fieldMeta },
    { label: 'Insuffisance cardiaque', value: d.insuffisanceCardiaque ? 'Oui' : null, key: `${FIELD_PREFIX}.insuffisanceCardiaque`, updatedAt: metaFor(`${FIELD_PREFIX}.insuffisanceCardiaque`), tracked: !!props.fieldMeta },
    { label: 'NT-proBNP (pg/mL)', value: d.ntProBNP, key: `${FIELD_PREFIX}.ntProBNP`, updatedAt: metaFor(`${FIELD_PREFIX}.ntProBNP`), tracked: !!props.fieldMeta },
    { label: 'AOMI', value: d.aomi ? 'Oui' : null, key: `${FIELD_PREFIX}.aomi`, updatedAt: metaFor(`${FIELD_PREFIX}.aomi`), tracked: !!props.fieldMeta },
    { label: 'Ischémie critique', value: isRichTextEmpty(d.ischemicCritique) ? undefined : d.ischemicCritique, rich: true, key: `${FIELD_PREFIX}.ischemicCritique`, updatedAt: metaFor(`${FIELD_PREFIX}.ischemicCritique`), tracked: !!props.fieldMeta },
  ]
})
</script>

<style scoped>
.section-preview {
  margin: 8px 0 16px;
}

.el-form-item[data-history-path]:hover {
  cursor: default;
}
</style>
