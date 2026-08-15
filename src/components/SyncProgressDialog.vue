<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSyncStatus } from '@/composables/useSyncStatus'

const { status, syncProgress } = useSyncStatus()

const visible = ref(false)
const previousStatus = ref(status.value)

const progressPercent = computed(() => {
  if (!syncProgress.value || syncProgress.value.total === 0) return 0
  return Math.round((syncProgress.value.processed / syncProgress.value.total) * 100)
})

const detailText = computed(() => {
  if (!syncProgress.value) return ''
  return `${syncProgress.value.processed} / ${syncProgress.value.total} — ${syncProgress.value.entityType}`
})

watch(status, (newStatus, oldStatus) => {
  if (oldStatus === 'offline' && newStatus === 'syncing') {
    visible.value = true
  } else if (newStatus === 'online') {
    visible.value = false
  } else if (newStatus === 'offline' && oldStatus === 'syncing') {
    visible.value = false
  }
  previousStatus.value = newStatus
})

async function onCancel() {
  visible.value = false
  try {
    await window.electronAPI?.invoke('sync:stop')
  } catch { /* ignore */ }
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="Synchronisation"
    width="380px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    center
    class="sync-progress-dialog"
  >
    <div class="sync-progress-dialog__body">
      <div class="sync-progress-dialog__icon">
        <svg class="sync-progress-dialog__spinner" width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="17" stroke="var(--cd-gray-200)" stroke-width="3" />
          <path
            d="M20 3A17 17 0 0 1 37 20"
            stroke="var(--cd-accent-orange)"
            stroke-width="3"
            stroke-linecap="round"
          />
        </svg>
      </div>
      <p class="sync-progress-dialog__message">
        Synchronisation des données avec le serveur...
      </p>
      <el-progress
        v-if="syncProgress"
        :percentage="progressPercent"
        :stroke-width="6"
        class="sync-progress-dialog__bar"
      />
      <p v-if="syncProgress" class="sync-progress-dialog__detail">
        {{ detailText }}
      </p>
    </div>
    <template #footer>
      <el-button @click="onCancel">Annuler</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.sync-progress-dialog__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
}

.sync-progress-dialog__icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.sync-progress-dialog__spinner {
  animation: sync-progress-spin 1s linear infinite;
}

@keyframes sync-progress-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.sync-progress-dialog__message {
  font-size: 13px;
  font-weight: 600;
  color: var(--cd-gray-900);
  text-align: center;
}

.sync-progress-dialog__bar {
  width: 100%;
}

.sync-progress-dialog__detail {
  font-size: 11px;
  color: var(--cd-gray-500);
}
</style>
