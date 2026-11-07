<script setup lang="ts">
import { computed } from 'vue'
import { useSyncStatus } from '@/composables/useSyncStatus'
import { useSidebar } from '@/composables/useSidebar'

const { status, syncProgress, pendingChanges } = useSyncStatus()
const { isCollapsed } = useSidebar()

const statusLabel = computed(() => {
  if (status.value === 'syncing') return 'Synchronisation...'
  if (status.value === 'offline') return `Hors ligne (${pendingChanges.value})`
  return 'En ligne'
})

const progressPercent = computed(() => {
  if (!syncProgress.value || syncProgress.value.total === 0) return 0
  return Math.round((syncProgress.value.processed / syncProgress.value.total) * 100)
})
</script>

<template>
  <div class="sync-status" :class="`sync-status--${status}`">
    <span class="sync-status__dot" />
    <template v-if="!isCollapsed">
      <span class="sync-status__label">{{ statusLabel }}</span>
      <div v-if="status === 'syncing' && syncProgress" class="sync-status__progress">
        <el-progress
          :percentage="progressPercent"
          :stroke-width="3"
          :show-text="false"
          :style="{ '--el-color-primary': status === 'syncing' ? 'var(--cd-accent-orange)' : undefined }"
        />
        <span class="sync-status__detail">
          {{ syncProgress.processed }}/{{ syncProgress.total }} {{ syncProgress.entityType }}
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.sync-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 11px;
  color: var(--cd-sidebar-item);
  flex-shrink: 0;
  min-height: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  background: var(--cd-sidebar-header-bg);
}

.sync-status--collapsed {
  justify-content: center;
  padding: 4px;
}

.sync-status__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sync-status--online .sync-status__dot {
  background: var(--cde-success);
}

.sync-status--offline .sync-status__dot {
  background: var(--cde-danger);
}

.sync-status--syncing .sync-status__dot {
  background: var(--cd-accent-orange);
  animation: sync-status-pulse 1.2s ease-in-out infinite;
}

@keyframes sync-status-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.sync-status__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
  color: var(--cd-sidebar-header-text);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.sync-status__progress {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sync-status__detail {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
