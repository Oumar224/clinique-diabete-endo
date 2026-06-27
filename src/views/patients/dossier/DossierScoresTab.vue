<template>
  <div class="dossier-section">
    <div class="dossier-section__scores-grid">
      <el-card class="score-card">
        <template #header><strong>Glasgow (Coma)</strong></template>
        <div class="score-card__body">
          <div v-for="item in glasgowItems" :key="item.key" class="score-field">
            <label class="score-field__label">{{ item.label }}</label>
            <el-radio-group v-model="glasgowValues[item.key]" class="score-field__radios">
              <el-radio v-for="opt in item.options" :key="opt.value" :value="opt.value" size="small" border>
                {{ opt.label }}
              </el-radio>
            </el-radio-group>
          </div>
          <div class="score-card__result">
            Score Glasgow: <strong>{{ glasgowScore }}</strong> / 15
            <el-tag :type="glasgowSeverity.type" size="small" style="margin-left:8px">
              {{ glasgowSeverity.label }}
            </el-tag>
          </div>
        </div>
      </el-card>

      <el-card class="score-card">
        <template #header><strong>Autonomie (SL)</strong></template>
        <div class="score-card__body">
          <div v-for="item in autonomieItems" :key="item.key" class="score-field">
            <label class="score-field__label">{{ item.label }}</label>
            <el-radio-group v-model="autonomieValues[item.key]" class="score-field__radios">
              <el-radio v-for="opt in item.options" :key="opt.value" :value="opt.value" size="small" border>
                {{ opt.label }}
              </el-radio>
            </el-radio-group>
          </div>
          <div class="score-card__result">
            Niveau autonomie: <strong>{{ autonomieLevel }}</strong>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { calculateGlasgow, getGlasgowSeverity, calculateAutonomieLevel, type GlasgowValues, type AutonomieValues } from '@/composables/useScoresCliniques'

interface GlasgowOption { value: number; label: string }
interface GlasgowItem { key: keyof GlasgowValues; label: string; options: GlasgowOption[] }

const glasgowItems: GlasgowItem[] = [
  {
    key: 'yeux', label: 'Ouverture des yeux',
    options: [
      { value: 1, label: 'Aucune' }, { value: 2, label: 'À la douleur' },
      { value: 3, label: 'À la voix' }, { value: 4, label: 'Spontanée' },
    ],
  },
  {
    key: 'verbale', label: 'Réponse verbale',
    options: [
      { value: 1, label: 'Aucune' }, { value: 2, label: 'Sons incompréhensibles' },
      { value: 3, label: 'Paroles inappropriées' }, { value: 4, label: 'Confuse' },
      { value: 5, label: 'Orientée' },
    ],
  },
  {
    key: 'motrice', label: 'Réponse motrice',
    options: [
      { value: 1, label: 'Aucune' }, { value: 2, label: 'Extension à la douleur' },
      { value: 3, label: 'Flexion à la douleur' }, { value: 4, label: 'Évitement' },
      { value: 5, label: 'Orientée' }, { value: 6, label: 'Obéit aux ordres' },
    ],
  },
]

const glasgowValues = ref<GlasgowValues>({ yeux: 4, verbale: 5, motrice: 6 })

const glasgowScore = computed(() => calculateGlasgow(glasgowValues.value))
const glasgowSeverity = computed(() => getGlasgowSeverity(glasgowScore.value))

interface AutonomieOption { value: 'A' | 'B' | 'C'; label: string }
interface AutonomieItem { key: keyof AutonomieValues; label: string; options: AutonomieOption[] }

const autonomieItems: AutonomieItem[] = [
  { key: 'alimentation', label: 'Alimentation', options: [{ value: 'A', label: 'Autonome' }, { value: 'B', label: 'Aide partielle' }, { value: 'C', label: 'Dépendant' }] },
  { key: 'hygiene', label: 'Hygiène', options: [{ value: 'A', label: 'Autonome' }, { value: 'B', label: 'Aide partielle' }, { value: 'C', label: 'Dépendant' }] },
  { key: 'habillage', label: 'Habillage', options: [{ value: 'A', label: 'Autonome' }, { value: 'B', label: 'Aide partielle' }, { value: 'C', label: 'Dépendant' }] },
  { key: 'deplacement', label: 'Déplacement', options: [{ value: 'A', label: 'Autonome' }, { value: 'B', label: 'Aide partielle' }, { value: 'C', label: 'Dépendant' }] },
  { key: 'continence', label: 'Continence', options: [{ value: 'A', label: 'Continue' }, { value: 'B', label: 'Intermittente' }, { value: 'C', label: 'Incontinence' }] },
]

const autonomieValues = ref<AutonomieValues>({
  alimentation: 'B', hygiene: 'B', habillage: 'A', deplacement: 'B', continence: 'A',
})

const autonomieLevel = computed(() => calculateAutonomieLevel(autonomieValues.value))
</script>

<style scoped>
.dossier-section__scores-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.score-card__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.score-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.score-field__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--cd-gray-600);
}
.score-field__radios {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.score-card__result {
  margin-top: 12px;
  padding: 12px;
  background: var(--cd-gray-50);
  border-radius: 8px;
  font-size: 14px;
  color: var(--cd-gray-900);
}
</style>
