<template>
  <el-form label-position="top" class="tab-form">
    <el-divider content-position="left">Imagerie Standard</el-divider>
    <el-row :gutter="16">
      <el-col :span="12">
        <el-form-item label="Radiographie du pied">
          <el-input v-model="data.radioPied" type="textarea" :rows="2" placeholder="Déformation 5ème rayon, pas de stigmate d'ostéite..." @input="emitChange" />
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider content-position="left">Axe Cardiologique</el-divider>
    <el-row :gutter="16">
      <el-col :span="12">
        <el-form-item label="ECG de repos">
          <el-input v-model="data.ecgRepos" type="textarea" :rows="2" placeholder="RSR à 84 bpm, HVG, Anomalie étendue du segment ST..." @input="emitChange" />
        </el-form-item>
      </el-col>
    </el-row>

    <div class="subsection-card">
      <div class="subsection-card__header">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1C4.134 1 1 4.134 1 8C1 11.866 4.134 15 8 15C11.866 15 15 11.866 15 8C15 4.134 11.866 1 8 1Z" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.08"/>
          <path d="M5 8H11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
          <path d="M8 5V11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
        </svg>
        <span>Échographie cardiaque</span>
      </div>
      <el-row :gutter="16">
        <el-col :span="4">
          <el-form-item label="FEVG (%)">
            <el-input-number v-model="data.echographieCardiaque.fevg" :min="0" :max="100" controls-position="right" style="width:100%" @change="emitChange" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="Hypokinésie">
            <el-input v-model="data.echographieCardiaque.hypokinesie" placeholder="Description des troubles de la cinétique..." @input="emitChange" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="Autres constatations">
            <el-input v-model="data.echographieCardiaque.autre" placeholder="Valvulopathie, péricarde, etc..." @input="emitChange" />
          </el-form-item>
        </el-col>
      </el-row>
    </div>

    <el-divider content-position="left">Actes de Radiologie Interventionnelle / Chirurgie</el-divider>
    <div v-for="(acte, idx) in data.actesInterventionnels" :key="acte._key" class="acte-card">
      <div class="acte-card__header">
        <span class="acte-card__title">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3L11 11M7 3V11" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
          </svg>
          Acte #{{ idx + 1 }}
        </span>
        <el-button text type="danger" size="small" @click="removeActe(idx)">
          <template #icon>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 3H10M4.5 3V2C4.5 1.72386 4.72386 1.5 5 1.5H7C7.27614 1.5 7.5 1.72386 7.5 2V3M3 3H9L8.5 10.5H3.5L3 3Z" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </template>
          Supprimer
        </el-button>
      </div>
      <el-row :gutter="16">
        <el-col :span="6">
          <el-form-item label="Date de l'acte">
            <el-date-picker v-model="acte.date" type="date" value-format="YYYY-MM-DD" style="width:100%" @change="emitChange" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="Type d'acte">
            <el-select v-model="acte.type" placeholder="Sélectionner" style="width:100%" @change="emitChange">
              <el-option label="Angiographie" value="Angiographie" />
              <el-option label="Angioplastie" value="Angioplastie" />
              <el-option label="Stent" value="Stent" />
              <el-option label="Autre" value="Autre" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="Opérateur">
            <el-input v-model="acte.operateur" placeholder="Dr KECHABTIA" @input="emitChange" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="Compte-rendu opératoire">
            <el-input v-model="acte.compteRendu" type="textarea" :rows="2" placeholder="Détail de la recanalisation fémorale, ballons utilisés, succès technique..." @input="emitChange" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item label="Conclusion de l'acte">
            <el-input v-model="acte.conclusion" type="textarea" :rows="2" placeholder="Résultat et suites..." @input="emitChange" />
          </el-form-item>
        </el-col>
      </el-row>
    </div>
    <el-button type="primary" text size="small" @click="addActe" class="add-btn">
      <template #icon>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2V12M2 7H12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
      </template>
      Ajouter un acte
    </el-button>
  </el-form>
</template>

<script setup lang="ts">
import type { ExamensComplementairesData } from '@/types/crh-diabete'

const props = defineProps<{
  data: ExamensComplementairesData
}>()

const emit = defineEmits<{
  change: []
}>()

function addActe() {
  props.data.actesInterventionnels.push({
    _key: crypto.randomUUID(),
    date: '',
    type: '',
    operateur: '',
    compteRendu: '',
    conclusion: '',
  })
  emit('change')
}

function removeActe(idx: number) {
  props.data.actesInterventionnels.splice(idx, 1)
  emit('change')
}

function emitChange() {
  emit('change')
}
</script>

<style scoped lang="scss">
.subsection-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 16px;
  margin: 8px 0 16px;
  background: var(--el-color-primary-light-9);
}

.subsection-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.acte-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  background: var(--el-color-warning-light-9);
  transition: box-shadow 0.15s ease;

  &:hover {
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  }
}

.acte-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.acte-card__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.add-btn {
  margin-top: 4px;
}
</style>
