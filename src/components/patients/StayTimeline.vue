<template>
  <div class="stay-timeline">
    <!-- Status badges -->
    <div class="stay-timeline__status-bar">
      <span class="stay-timeline__status-label">Contact :</span>
      <el-tag :type="contactStatus === 'active' ? 'success' : 'info'" size="small" effect="dark">
        {{ contactStatus === 'active' ? 'En cours' : 'Clôturé' }}
      </el-tag>
      <span class="stay-timeline__status-label" style="margin-left:16px">Séjour :</span>
      <el-tag :type="stayStatus === 'en_cours' ? 'success' : 'info'" size="small" effect="dark">
        {{ stayStatus === 'en_cours' ? 'En cours' : 'Clôturé' }}
      </el-tag>
    </div>

    <div v-if="loading" class="stay-timeline__loading">
      <el-skeleton :rows="3" animated />
    </div>

    <div v-else-if="!movements.length" class="stay-timeline__empty">
      <span class="stay-timeline__empty-text">Aucun mouvement enregistré</span>
    </div>

    <div v-else class="stay-timeline__track">
      <div
        v-for="(mvt, idx) in movements"
        :key="mvt.id ?? idx"
        class="stay-timeline__step"
        :class="{
          'stay-timeline__step--current': idx === currentIdx,
          'stay-timeline__step--past': idx < currentIdx,
        }"
      >
        <div class="stay-timeline__step-col">
          <div class="stay-timeline__step-dot" :class="{ 'stay-timeline__step-dot--pulse': idx === currentIdx }" :style="{ backgroundColor: dotColor(mvt, idx) }" />
          <div v-if="idx < movements.length - 1" class="stay-timeline__step-line" />
        </div>
        <div class="stay-timeline__step-content">
          <div class="stay-timeline__step-header">
            <span class="stay-timeline__step-label">{{ stepLabel(mvt) }}</span>
            <span class="stay-timeline__step-time">{{ formatTime(mvt.moved_at) }}</span>
            <el-tag v-if="idx === currentIdx" size="small" type="success" effect="light" class="stay-timeline__step-badge">En cours</el-tag>
          </div>
          <div v-if="mvt.from_service_name || mvt.to_service_name" class="stay-timeline__step-services">
            <template v-if="mvt.from_service_name"><el-tag size="small" type="info" effect="plain">{{ mvt.from_service_name }}</el-tag></template>
            <template v-if="mvt.from_service_name && mvt.to_service_name"><el-icon :size="14"><ArrowRight /></el-icon></template>
            <template v-if="mvt.to_service_name"><el-tag size="small" type="primary" effect="plain">{{ mvt.to_service_name }}</el-tag></template>
          </div>
          <div v-if="mvt.notes" class="stay-timeline__step-notes">{{ mvt.notes }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'
import type { StayMovementDto } from '@/composables/useStays'

const props = defineProps<{
  movements: StayMovementDto[]
  loading?: boolean
  contactStatus?: 'active' | 'closed'
  stayStatus?: 'en_cours' | 'cloture' | 'transfere'
}>()

const currentIdx = computed(() => {
  for (let i = props.movements.length - 1; i >= 0; i--) {
    const m = props.movements[i]
    if (m.movement_type !== 'sortie' && !m.exited_at) return i
  }
  return -1
})

function stepLabel(mvt: StayMovementDto): string {
  const labels: Record<string, string> = {
    admission: 'Admission',
    transfert_chambre: 'Changement chambre',
    transfert_service: 'Transfert service',
    sortie: 'Sortie',
  }
  return labels[mvt.movement_type] || mvt.movement_type
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function dotColor(mvt: StayMovementDto, idx: number): string {
  if (idx === currentIdx.value) return 'var(--el-color-success)'
  const colors: Record<string, string> = {
    admission: 'var(--el-color-danger)',
    transfert_chambre: 'var(--el-color-warning)',
    transfert_service: 'var(--el-color-primary)',
    sortie: 'var(--el-color-info)',
  }
  return colors[mvt.movement_type] || 'var(--el-color-info)'
}
</script>

<style scoped>
.stay-timeline {
  width: 100%;
}

.stay-timeline__status-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.stay-timeline__status-label {
  font-size: 12px;
  color: var(--cd-gray-500, #777);
}

.stay-timeline__loading {
  padding: 12px 0;
}

.stay-timeline__empty {
  display: flex;
  justify-content: center;
  padding: 12px 0;
}

.stay-timeline__empty-text {
  font-size: 13px;
  color: var(--cd-gray-400, #999);
  font-style: italic;
}

.stay-timeline__track {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.stay-timeline__step {
  display: flex;
  gap: 12px;
  opacity: 0.55;
  transition: opacity 0.2s;
}

.stay-timeline__step--current {
  opacity: 1;
}

.stay-timeline__step--past {
  opacity: 0.5;
}

.stay-timeline__step-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 14px;
  flex-shrink: 0;
}

.stay-timeline__step-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  z-index: 1;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px var(--cd-gray-300, #d0d0d0);
}

.stay-timeline__step-dot--pulse {
  animation: pulse-dot 2s ease-in-out infinite;
  box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.3);
}

@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.3); }
  50% { box-shadow: 0 0 0 6px rgba(103, 194, 58, 0.1); }
}

.stay-timeline__step-line {
  width: 2px;
  flex: 1;
  min-height: 16px;
  background: var(--cd-gray-300, #d0d0d0);
  margin: 2px 0;
}

.stay-timeline__step-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 14px;
  min-height: 40px;
}

.stay-timeline__step-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.stay-timeline__step-label {
  font-weight: 600;
  color: var(--cd-gray-900, #1a1a1a);
  font-size: 13px;
}

.stay-timeline__step-time {
  color: var(--cd-gray-400, #999);
  font-size: 11px;
  font-family: monospace;
}

.stay-timeline__step-badge {
  font-size: 10px;
  line-height: 14px;
}

.stay-timeline__step-services {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.stay-timeline__step-notes {
  font-size: 11px;
  color: var(--cd-gray-500, #777);
  font-style: italic;
}
</style>
