<template>
  <div class="stay-timeline">
    <h4 class="stay-timeline__title">Mouvements du séjour</h4>

    <div v-if="loading" class="stay-timeline__loading">
      <el-skeleton :rows="3" animated />
    </div>

    <div v-else-if="!movements.length" class="stay-timeline__empty">
      <el-empty description="Aucun mouvement enregistré" :image-size="60" />
    </div>

    <el-timeline v-else>
      <el-timeline-item
        v-for="(mvt, idx) in movements"
        :key="mvt.id ?? idx"
        :timestamp="formatDateTime(mvt.moved_at)"
        :type="movementTypeTag(mvt.movement_type)"
        placement="top"
        size="large"
      >
        <div class="stay-timeline__item">
          <strong>{{ movementLabel(mvt.movement_type) }}</strong>
          <div class="stay-timeline__item-details">
            <template v-if="mvt.from_service_name">
              <span>De: {{ mvt.from_service_name }}</span>
            </template>
            <template v-if="mvt.to_service_name">
              <span v-if="mvt.from_service_name"> → </span>
              <span>{{ mvt.to_service_name }}</span>
            </template>
            <template v-if="mvt.chambre">
              <span> | Ch: {{ mvt.chambre }}{{ mvt.lit ? ` / Lit ${mvt.lit}` : '' }}</span>
            </template>
          </div>
          <div v-if="mvt.notes" class="stay-timeline__item-notes">{{ mvt.notes }}</div>
        </div>
      </el-timeline-item>
    </el-timeline>
  </div>
</template>

<script setup lang="ts">
import type { StayMovementDto } from '@/composables/useStays'

defineProps<{
  movements: StayMovementDto[]
  loading?: boolean
}>()

function formatDateTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function movementLabel(type: string): string {
  const labels: Record<string, string> = {
    admission: 'Admission',
    transfert_chambre: 'Changement de chambre',
    transfert_service: 'Transfert de service',
    sortie: 'Sortie',
  }
  return labels[type] || type
}

function movementTypeTag(type: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    admission: 'danger',
    transfert_chambre: 'warning',
    transfert_service: 'primary',
    sortie: 'info',
  }
  return map[type] || 'info'
}
</script>

<style scoped>
.stay-timeline {
  width: 100%;
}

.stay-timeline__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--cd-gray-900);
  margin: 0 0 12px;
}

.stay-timeline__loading {
  padding: 16px 0;
}

.stay-timeline__empty {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.stay-timeline__item-details {
  font-size: 12px;
  color: var(--cd-gray-500);
  margin-top: 2px;
}

.stay-timeline__item-notes {
  font-size: 11px;
  color: var(--cd-gray-400);
  font-style: italic;
  margin-top: 2px;
}
</style>
