<template>
  <el-form label-position="top" class="tab-form">
    <el-divider content-position="left">Identité &amp; Identitovigilance</el-divider>
    <el-row :gutter="16">
      <el-col :span="8">
        <el-form-item label="Nom">
          <el-input v-model="data.nom" :disabled="readonly" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="Prénom">
          <el-input v-model="data.prenom" :disabled="readonly" />
        </el-form-item>
      </el-col>
      <el-col :span="4">
        <el-form-item label="Sexe">
          <el-input v-model="data.sexe" :disabled="readonly" />
        </el-form-item>
      </el-col>
      <el-col :span="4">
        <el-form-item label="Date de naissance">
          <el-date-picker v-model="data.dateNaissance" type="date" value-format="YYYY-MM-DD" style="width:100%" :disabled="readonly" />
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="16">
      <el-col :span="4">
        <el-form-item label="Âge">
          <el-input :model-value="ageDisplay" disabled />
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider content-position="left">Identifiants Majeurs</el-divider>
    <el-row :gutter="16">
      <el-col :span="6">
        <el-form-item label="N° IPP">
          <el-input :model-value="data.ipp || '—'" disabled />
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider content-position="left">Détails du Séjour</el-divider>
    <el-row :gutter="16">
      <el-col :span="6">
        <el-form-item label="Date d'entrée">
          <el-date-picker v-model="data.dateEntree" type="date" value-format="YYYY-MM-DD" style="width:100%" :disabled="readonly" />
        </el-form-item>
      </el-col>
      <el-col :span="10">
        <el-form-item label="Service d'accueil">
          <el-input :model-value="data.serviceAccueil" :disabled="readonly" />
        </el-form-item>
      </el-col>
    </el-row>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AdmissionData } from '@/types/crh-diabete'
import { useCrhDiabeteCalculations } from '@/composables/useCrhDiabeteCalculations'

const props = defineProps<{
  data: AdmissionData
  readonly: boolean
}>()

const { calcAge } = useCrhDiabeteCalculations()

const ageDisplay = computed(() => {
  const age = calcAge(props.data.dateNaissance, props.data.dateEntree)
  if (age == null) return '—'
  return `${age} ans`
})
</script>
