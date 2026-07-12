<template>
  <el-form label-position="top" class="tab-form">
    <el-divider content-position="left">Historique du Diabète</el-divider>
    <el-row :gutter="16">
      <el-col :span="6">
        <el-form-item label="Date du diagnostic">
          <el-date-picker v-model="data.dateDiagnostic" type="month" value-format="YYYY-MM" placeholder="MM/AAAA" style="width:100%" @change="emitChange" />
        </el-form-item>
      </el-col>
      <el-col :span="4">
        <el-form-item label="Durée d'évolution">
          <el-input :model-value="dureeEvolution" disabled />
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider content-position="left">Suivi Pondéral</el-divider>
    <el-row :gutter="16">
      <el-col :span="4">
        <el-form-item label="Poids de forme (kg)">
          <el-input-number v-model="data.poidsForme" :min="0" :max="300" controls-position="right" style="width:100%" @change="emitChange" />
        </el-form-item>
      </el-col>
      <el-col :span="5">
        <el-form-item label="Poids juillet 2024 (kg)">
          <el-input-number v-model="data.poidsJuillet2024" :min="0" :max="300" controls-position="right" style="width:100%" @change="emitChange" />
        </el-form-item>
      </el-col>
      <el-col :span="5">
        <el-form-item label="Poids décembre 2025 (kg)">
          <el-input-number v-model="data.poidsDecembre2025" :min="0" :max="300" controls-position="right" style="width:100%" @change="emitChange" />
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider content-position="left">Dernier Bilan Métabolique</el-divider>
    <el-row :gutter="16">
      <el-col :span="4">
        <el-form-item label="HbA1c (%)">
          <el-input-number v-model="data.hba1c" :min="0" :max="30" :step="0.1" controls-position="right" style="width:100%" @change="emitChange" />
        </el-form-item>
      </el-col>
      <el-col :span="5">
        <el-form-item label="Date de l'examen">
          <el-date-picker v-model="data.hba1cDate" type="date" value-format="YYYY-MM-DD" style="width:100%" @change="emitChange" />
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="16">
      <el-col :span="4">
        <el-form-item label="HDL (mmol/L)">
          <el-input-number v-model="data.hdl" :min="0" :max="10" :step="0.01" controls-position="right" style="width:100%" @change="emitChange" />
        </el-form-item>
      </el-col>
      <el-col :span="4">
        <el-form-item label="LDL (mmol/L)">
          <el-input-number v-model="data.ldl" :min="0" :max="10" :step="0.01" controls-position="right" style="width:100%" @change="emitChange" />
        </el-form-item>
      </el-col>
      <el-col :span="4">
        <el-form-item label="Triglycérides (mmol/L)">
          <el-input-number v-model="data.triglycerides" :min="0" :max="20" :step="0.01" controls-position="right" style="width:100%" @change="emitChange" />
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider content-position="left">Complications Micro &amp; Macro-vasculaires</el-divider>
    <el-row :gutter="16">
      <el-col :span="8">
        <el-form-item label="Ophtalmologique (Rétinopathie)">
          <el-select v-model="data.retinopathie" style="width:100%" @change="emitChange">
            <el-option label="Absente" value="Absente" />
            <el-option label="RDNP minime" value="RDNP minime" />
            <el-option label="Modérée" value="Modérée" />
            <el-option label="Proliférante" value="Proliférante" />
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="16">
      <el-col :span="4">
        <el-form-item label="Créatininémie (µmol/L)">
          <el-input-number v-model="data.creatininemie" :min="0" :max="2000" controls-position="right" style="width:100%" @change="emitChange" />
        </el-form-item>
      </el-col>
      <el-col :span="4">
        <el-form-item label="DFG (mL/min/1.73m²)">
          <el-input :model-value="dfgDisplay" disabled />
        </el-form-item>
      </el-col>
      <el-col :span="4">
        <el-form-item label="Stade IR">
          <el-input :model-value="stadeDisplay" disabled />
        </el-form-item>
      </el-col>
      <el-col :span="4">
        <el-form-item label="Neuropathie symptomatique">
          <el-checkbox v-model="data.neuropathie" @change="emitChange">Oui</el-checkbox>
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="16">
      <el-col :span="4">
        <el-form-item label="Grade podologique">
          <el-select v-model="data.podologiqueGrade" placeholder="0-3" style="width:100%" @change="emitChange">
            <el-option label="0" :value="0" />
            <el-option label="1" :value="1" />
            <el-option label="2" :value="2" />
            <el-option label="3" :value="3" />
          </el-select>
        </el-form-item>
      </el-col>
      <el-col :span="5">
        <el-form-item label="Amputation">
          <el-checkbox v-model="data.amputation" @change="emitChange">Oui</el-checkbox>
        </el-form-item>
        <el-form-item v-if="data.amputation" label="Détail amputation">
          <el-input v-model="data.amputationDetail" type="textarea" :rows="2" placeholder="Amputation Transmétatarsienne gauche le 08/12/2025" @input="emitChange" />
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="16">
      <el-col :span="6">
        <el-form-item label="Insuffisance cardiaque">
          <el-checkbox v-model="data.insuffisanceCardiaque" @change="emitChange">Oui</el-checkbox>
        </el-form-item>
        <el-form-item v-if="data.insuffisanceCardiaque" label="NT-proBNP (pg/mL)">
          <el-input-number v-model="data.ntProBNP" :min="0" controls-position="right" style="width:100%" @change="emitChange" />
        </el-form-item>
      </el-col>
      <el-col :span="6">
        <el-form-item label="AOMI">
          <el-checkbox v-model="data.aomi" @change="emitChange">Oui</el-checkbox>
        </el-form-item>
        <el-form-item v-if="data.aomi" label="Description ischémie critique">
          <el-input v-model="data.ischemicCritique" type="textarea" :rows="2" placeholder="Description de l'ischémie critique..." @input="emitChange" />
        </el-form-item>
      </el-col>
    </el-row>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FicheDiabeteData } from '@/types/crh-diabete'
import { useCrhDiabeteCalculations } from '@/composables/useCrhDiabeteCalculations'

const props = defineProps<{
  data: FicheDiabeteData
  sexe: string | null
  age: number | null
  dateEntree: string
}>()

const emit = defineEmits<{
  change: []
}>()

const { calcDureeDiabete, calcDFG, calcStadeIR } = useCrhDiabeteCalculations()

const dureeEvolution = computed(() => {
  return calcDureeDiabete(props.data.dateDiagnostic, props.dateEntree || undefined) || '—'
})

const dfgValue = computed(() => {
  return calcDFG(props.data.creatininemie, props.age, props.sexe)
})

const dfgDisplay = computed(() => {
  const v = dfgValue.value
  return v != null ? String(v) : '—'
})

const stadeDisplay = computed(() => {
  return calcStadeIR(dfgValue.value)
})

function emitChange() {
  emit('change')
}
</script>
