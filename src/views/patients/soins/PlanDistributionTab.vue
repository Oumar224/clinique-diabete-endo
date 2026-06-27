<template>
  <div class="plan-distribution" v-loading="loading">
    <div v-if="error" class="plan-distribution__error">
      <el-alert :title="error" type="error" show-icon :closable="true" @close="error = null" />
    </div>

    <div v-if="insulinBlocked" class="plan-distribution__insulin-block">
      <el-alert
        title="⚠️ Veuillez saisir la glycémie dans l'onglet Vital Check avant d'administrer l'insuline"
        type="warning"
        show-icon
        :closable="false"
      />
    </div>

    <div class="plan-distribution__grid">
      <el-card v-for="bloc in blocs" :key="bloc.heure" class="plan-bloc">
        <template #header>
          <div class="plan-bloc__header">
            <el-tag type="primary" effect="plain" class="plan-bloc__time">
              <el-icon :size="14"><Clock /></el-icon>
              {{ bloc.heure }}
            </el-tag>
            <span class="plan-bloc__count">{{ bloc.soins.length }} médicament(s)</span>
          </div>
        </template>

        <div v-for="soin in bloc.soins" :key="soin.id" class="plan-card" :class="`plan-card--${soin.statut}`">
          <div class="plan-card__left">
            <el-tag
              :type="voieColor(soin.voie).type"
              size="small"
              class="plan-card__voie-tag"
            >
              {{ soin.voie }}
            </el-tag>
          </div>

          <div class="plan-card__center">
            <span class="plan-card__name">{{ soin.medicament }}</span>
            <span class="plan-card__dosage">{{ soin.dosage }}</span>
          </div>

          <div class="plan-card__right">
            <div v-if="soin.statut === 'suspendu'" class="plan-card__suspendu">
              <el-tag type="danger" size="small" effect="plain">⛔ Suspendu</el-tag>
            </div>

            <div v-else-if="soin.statut === 'valide'" class="plan-card__fait">
              <el-tag type="success" size="small">✅ {{ soin.validePar }} {{ soin.valideA }}</el-tag>
            </div>

            <div v-else class="plan-card__actions">
              <el-button
                type="success"
                size="small"
                :disabled="isInsulin(soin.medicament) && insulinBlocked"
                @click="onValider(soin)"
                aria-label="Valider administration"
              >
                Valider
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="onSuspendre(soin)"
                aria-label="Suspendre administration"
              >
                Suspendre
              </el-button>
            </div>
          </div>
        </div>

        <el-empty v-if="bloc.soins.length === 0" description="Aucun soin" :image-size="40" />
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Clock } from '@element-plus/icons-vue'
import { usePlanSoins, isInsulin, voieColor } from '@/composables/usePlanSoins'
import type { SoinItem } from '@/types/soins'

const route = useRoute()

/** Derive patient ID from route params. */
const patientId = computed<number | null>(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) ? id : null
})

const { blocs, loading, error, insulinBlocked, valider, suspendre } = usePlanSoins(patientId)

function onValider(soin: SoinItem) {
  valider(soin)
}

function onSuspendre(soin: SoinItem) {
  suspendre(soin)
}
</script>

<style scoped>
.plan-distribution__error {
  margin-bottom: 16px;
}
.plan-distribution__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
.plan-distribution__insulin-block {
  margin-bottom: 16px;
}
.plan-bloc__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.plan-bloc__time {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
}
.plan-bloc__count {
  font-size: 12px;
  color: var(--cd-gray-400);
}
.plan-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--cd-gray-100);
}
.plan-card:last-child {
  border-bottom: none;
}
.plan-card--suspendu {
  opacity: 0.6;
}
.plan-card__left {
  flex-shrink: 0;
}
.plan-card__voie-tag {
  font-weight: 700;
  min-width: 32px;
  text-align: center;
}
.plan-card__center {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.plan-card__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--cd-gray-900);
}
.plan-card__dosage {
  font-size: 12px;
  color: var(--cd-gray-500);
}
.plan-card__right {
  flex-shrink: 0;
}
.plan-card__actions {
  display: flex;
  gap: 4px;
}
</style>
