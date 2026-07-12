<template>
  <el-form label-position="top" class="tab-form">
    <el-divider content-position="left">Motif &amp; Histoire</el-divider>
    <el-row :gutter="16">
      <el-col :span="16">
        <el-form-item label="Motif d'hospitalisation">
          <el-input v-model="data.motifHospitalisation" type="textarea" :rows="3" placeholder="Prise en charge d'une plaie pied gauche sur terrain de déséquilibre de diabète de type 2..." @input="emitChange" />
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="16">
      <el-col :span="16">
        <el-form-item label="Histoire récente de la maladie">
          <el-input v-model="data.histoireRecent" type="textarea" :rows="5" placeholder="Patient transféré des urgences pour douleur insomniante avec plaie pied gauche, sous ADO, glycémie à 22.3 mmol/l..." @input="emitChange" />
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider content-position="left">Examen Neurologique Initial (Score de Glasgow)</el-divider>
    <el-row :gutter="16">
      <el-col :span="6">
        <el-form-item label="Ouverture des yeux">
          <el-radio-group v-model="data.glasgow.ouvertureYeux" @change="emitChange">
            <el-radio :value="0">Non évalué</el-radio>
            <el-radio :value="1">Aucune (1)</el-radio>
            <el-radio :value="2">À la douleur (2)</el-radio>
            <el-radio :value="3">À la demande (3)</el-radio>
            <el-radio :value="4">Spontanée (4)</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-col>
      <el-col :span="7">
        <el-form-item label="Réponse verbale">
          <el-radio-group v-model="data.glasgow.reponseVerbale" @change="emitChange">
            <el-radio :value="0">Non évalué</el-radio>
            <el-radio :value="1">Aucune (1)</el-radio>
            <el-radio :value="2">Incompréhensible (2)</el-radio>
            <el-radio :value="3">Inappropriée (3)</el-radio>
            <el-radio :value="4">Confuse (4)</el-radio>
            <el-radio :value="5">Orientée (5)</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-col>
      <el-col :span="7">
        <el-form-item label="Réponse motrice">
          <el-radio-group v-model="data.glasgow.reponseMotrice" @change="emitChange">
            <el-radio :value="0">Non évalué</el-radio>
            <el-radio :value="1">Aucune (1)</el-radio>
            <el-radio :value="2">Extension (2)</el-radio>
            <el-radio :value="3">Flexion (3)</el-radio>
            <el-radio :value="4">Évitement (4)</el-radio>
            <el-radio :value="5">Localise (5)</el-radio>
            <el-radio :value="6">Obéit aux ordres (6)</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-col>
      <el-col :span="4">
        <div class="glasgow-result">
          <div class="glasgow-result__score">
            <span class="glasgow-result__label">Score Glasgow</span>
            <span class="glasgow-result__value">{{ glasgowScore != null ? glasgowScore + ' / 15' : '— / 15' }}</span>
          </div>
          <el-tag :type="glasgowInterpretationType" effect="dark" class="glasgow-result__tag">
            {{ glasgowLabel }}
          </el-tag>
        </div>
      </el-col>
    </el-row>

    <el-divider content-position="left">Examen Physique &amp; Constantes</el-divider>
    <el-row :gutter="16">
      <el-col :span="4">
        <el-form-item label="TA Systolique (mmHg)">
          <el-input-number v-model="data.examenPhysique.taSystolique" :min="0" :max="300" controls-position="right" style="width:100%" @change="emitChange" />
        </el-form-item>
      </el-col>
      <el-col :span="4">
        <el-form-item label="TA Diastolique (mmHg)">
          <el-input-number v-model="data.examenPhysique.taDiastolique" :min="0" :max="200" controls-position="right" style="width:100%" @change="emitChange" />
        </el-form-item>
      </el-col>
      <el-col :span="4">
        <el-form-item label="Fréquence cardiaque (bpm)">
          <el-input-number v-model="data.examenPhysique.frequenceCardiaque" :min="0" :max="300" controls-position="right" style="width:100%" @change="emitChange" />
        </el-form-item>
      </el-col>
      <el-col :span="4">
        <el-form-item label="Température (°C)">
          <el-input-number v-model="data.examenPhysique.temperature" :min="32" :max="42" :step="0.1" controls-position="right" style="width:100%" @change="emitChange" />
        </el-form-item>
      </el-col>
      <el-col :span="4">
        <el-form-item label="Glycémie (mmol/L)">
          <el-input-number v-model="data.examenPhysique.glycemie" :min="0" :max="50" :step="0.1" controls-position="right" style="width:100%" @change="emitChange" />
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="16">
      <el-col :span="12">
        <el-form-item label="Description de la plaie">
          <el-input v-model="data.examenPhysique.descriptionPlaie" type="textarea" :rows="2" placeholder="Description de la plaie du pied..." @input="emitChange" />
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider content-position="left">Conclusion à l'Entrée</el-divider>
    <el-row :gutter="16">
      <el-col :span="16">
        <el-form-item label="Synthèse clinique">
          <el-input v-model="data.conclusionEntree" type="textarea" :rows="3" placeholder="Synthèse clinique à l'admission..." @input="emitChange" />
        </el-form-item>
      </el-col>
    </el-row>
  </el-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BilanInitialData } from '@/types/crh-diabete'
import { useCrhDiabeteCalculations } from '@/composables/useCrhDiabeteCalculations'

const props = defineProps<{
  data: BilanInitialData
}>()

const emit = defineEmits<{
  change: []
}>()

const { calcGlasgowScore, glasgowInterpretation } = useCrhDiabeteCalculations()

const glasgowScore = computed(() => {
  return calcGlasgowScore(
    props.data.glasgow.ouvertureYeux,
    props.data.glasgow.reponseVerbale,
    props.data.glasgow.reponseMotrice,
  )
})

const glasgowInterpretationType = computed(() => {
  return glasgowInterpretation(glasgowScore.value).type
})

const glasgowLabel = computed(() => {
  return glasgowInterpretation(glasgowScore.value).label
})

function emitChange() {
  emit('change')
}
</script>

<style scoped lang="scss">
.glasgow-result {
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.glasgow-result__score {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.glasgow-result__label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.glasgow-result__value {
  font-size: 22px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}

.glasgow-result__tag {
  font-size: 11px;
}
</style>
