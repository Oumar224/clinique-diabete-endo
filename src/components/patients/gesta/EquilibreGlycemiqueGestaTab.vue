<!-- EquilibreGlycemiqueGestaTab — CRC Diabète gestationnel : autosurveillance glycémique,
  équilibre du diabète (hypo/hyper, HbA1c, observance).
  Même pattern que MotifProfilObesiteTab : une StagedCollapsibleSection par
  bloc, `draft` isolé tant que `Enregistrer` n'a pas été cliqué, puis `change`
  émis au `save`.
-->
<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('autosurveillance')"
      title="Autosurveillance glycémique"
      :keys="['autosurveillance', 'lignes']"
      :model-value="data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-form-item label="Autosurveillance glycémique">
          <el-switch
            v-model="draft.autosurveillance"
            active-text="Oui"
            inactive-text="Non"
            :disabled="readonly"
          />
        </el-form-item>

        <div v-if="draft.autosurveillance" class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>Paramètre</th>
                <th>Résultat (g/L)</th>
                <th>Cible</th>
                <th>Tendance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Glycémie à jeun</td>
                <td>
                  <el-input-number
                    v-model="draft.lignes.gaj.resultat"
                    :min="0"
                    :step="0.01"
                    :precision="2"
                    controls-position="right"
                    :disabled="readonly"
                  />
                </td>
                <td>{{ cibleLabel(CIBLES_GLYCEMIQUES.gaj) }}</td>
                <td>
                  <el-select
                    v-model="draft.lignes.gaj.tendance"
                    placeholder="—"
                    clearable
                    style="width:100%"
                    :disabled="readonly"
                  >
                    <el-option label="Normal" value="normal" />
                    <el-option label="Hypoglycémie" value="hypo" />
                    <el-option label="Hyperglycémie" value="hyper" />
                  </el-select>
                </td>
              </tr>
              <tr>
                <td>Glycémie en post prandial à 1h</td>
                <td>
                  <el-input-number
                    v-model="draft.lignes.pp1h.resultat"
                    :min="0"
                    :step="0.01"
                    :precision="2"
                    controls-position="right"
                    :disabled="readonly"
                  />
                </td>
                <td>{{ cibleLabel(CIBLES_GLYCEMIQUES.pp1h) }}</td>
                <td>
                  <el-select
                    v-model="draft.lignes.pp1h.tendance"
                    placeholder="—"
                    clearable
                    style="width:100%"
                    :disabled="readonly"
                  >
                    <el-option label="Normal" value="normal" />
                    <el-option label="Hypoglycémie" value="hypo" />
                    <el-option label="Hyperglycémie" value="hyper" />
                  </el-select>
                </td>
              </tr>
              <tr>
                <td>Glycémie en post prandial à 2h</td>
                <td>
                  <el-input-number
                    v-model="draft.lignes.pp2h.resultat"
                    :min="0"
                    :step="0.01"
                    :precision="2"
                    controls-position="right"
                    :disabled="readonly"
                  />
                </td>
                <td>{{ cibleLabel(CIBLES_GLYCEMIQUES.pp2h) }}</td>
                <td>
                  <el-select
                    v-model="draft.lignes.pp2h.tendance"
                    placeholder="—"
                    clearable
                    style="width:100%"
                    :disabled="readonly"
                  >
                    <el-option label="Normal" value="normal" />
                    <el-option label="Hypoglycémie" value="hypo" />
                    <el-option label="Hyperglycémie" value="hyper" />
                  </el-select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Autosurveillance glycémique"
        variant="compact"
        :fields="autosurveillancePreviewFields"
        @edit="() => openSection('autosurveillance')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('equilibre')"
      title="Équilibre du diabète"
      :keys="['hypoglycemies', 'hyperglycemies', 'hba1c', 'equilibre', 'observance']"
      :model-value="data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="Hypoglycémies">
              <el-switch
                v-model="draft.hypoglycemies"
                active-text="Oui"
                inactive-text="Non"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Hyperglycémies">
              <el-switch
                v-model="draft.hyperglycemies"
                active-text="Oui"
                inactive-text="Non"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="HbA1c (%)">
              <el-input-number
                v-model="draft.hba1c"
                :min="0"
                :step="0.1"
                :precision="1"
                controls-position="right"
                style="width:100%"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="Équilibre glycémique">
          <el-radio-group v-model="draft.equilibre" :disabled="readonly">
            <el-radio value="satisfaisant">Satisfaisant</el-radio>
            <el-radio value="insuffisant">Insuffisant</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="Observance / difficultés particulières">
          <el-input
            v-model="draft.observance"
            type="textarea"
            :rows="3"
            :disabled="readonly"
            placeholder="Observance / difficultés particulières…"
          />
        </el-form-item>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Équilibre du diabète"
        variant="compact"
        :fields="equilibrePreviewFields"
        @edit="() => openSection('equilibre')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { CrcGestaFormData, TendanceGlycemique } from '@/types/crc-gesta'
import { TENDANCE_LABELS } from '@/types/crc-gesta'
import { CIBLES_GLYCEMIQUES } from '@/utils/gesta-protocol'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'

const props = withDefaults(defineProps<{
  data: CrcGestaFormData['equilibreGlycemique']
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

function cibleLabel(cible: number): string {
  return `< ${String(cible).replace('.', ',')} g/L`
}

function fmtNum(value: number | null, unit: string): string | null {
  return value == null ? null : `${value} ${unit}`
}

function tendanceLabel(tendance: TendanceGlycemique): string {
  if (!tendance) return '—'
  return TENDANCE_LABELS[tendance as keyof typeof TENDANCE_LABELS] ?? tendance
}

const autosurveillancePreviewFields = computed<FormPreviewField[]>(() => {
  const d = props.data
  const fields: FormPreviewField[] = [
    { label: 'Autosurveillance glycémique', value: d.autosurveillance ? 'Oui' : 'Non' },
  ]
  if (d.autosurveillance) {
    fields.push(
      { label: 'Glycémie à jeun', value: fmtNum(d.lignes.gaj.resultat, 'g/L') },
      { label: 'Tendance (jeun)', value: d.lignes.gaj.tendance ? tendanceLabel(d.lignes.gaj.tendance) : '' },
      { label: 'Glycémie PP à 1h', value: fmtNum(d.lignes.pp1h.resultat, 'g/L') },
      { label: 'Tendance (PP 1h)', value: d.lignes.pp1h.tendance ? tendanceLabel(d.lignes.pp1h.tendance) : '' },
      { label: 'Glycémie PP à 2h', value: fmtNum(d.lignes.pp2h.resultat, 'g/L') },
      { label: 'Tendance (PP 2h)', value: d.lignes.pp2h.tendance ? tendanceLabel(d.lignes.pp2h.tendance) : '' },
    )
  }
  return fields
})

const equilibrePreviewFields = computed<FormPreviewField[]>(() => {
  const d = props.data
  return [
    { label: 'Hypoglycémies', value: d.hypoglycemies ? 'Oui' : 'Non' },
    { label: 'Hyperglycémies', value: d.hyperglycemies ? 'Oui' : 'Non' },
    { label: 'HbA1c', value: fmtNum(d.hba1c, '%') },
    {
      label: 'Équilibre glycémique',
      value: d.equilibre === 'satisfaisant'
        ? 'Satisfaisant'
        : d.equilibre === 'insuffisant'
          ? 'Insuffisant'
          : '',
    },
    { label: 'Observance / difficultés particulières', value: d.observance },
  ]
})
</script>

<style scoped>
.section-preview {
  margin: 8px 0 16px;
}
.history-table-wrap {
  margin-bottom: 16px;
  overflow-x: auto;
}
.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background: var(--cde-surface);
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  overflow: hidden;
}
.history-table thead th {
  background: var(--cde-header-bg);
  color: var(--cde-header-text);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.3px;
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--cde-border);
}
.history-table tbody td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--cde-border-soft);
  color: var(--cde-muted);
}
.history-table tbody tr:last-child td {
  border-bottom: none;
}
.history-table td .el-input-number,
.history-table td .el-select {
  width: 100%;
}
</style>
