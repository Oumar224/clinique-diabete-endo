import { ref, onMounted, onBeforeUnmount } from 'vue'

export type ConnectionStatus = 'online' | 'offline' | 'syncing'

const status = ref<ConnectionStatus>('online')
const lastSyncTime = ref<number | null>(null)
const syncProgress = ref<{ entityType: string; processed: number; total: number } | null>(null)
const pendingChanges = ref(0)

export function useSyncStatus() {
  let cleanupEntityChanged: (() => void) | null = null
  let cleanupSyncProgress: (() => void) | null = null

  function handleOnline() {
    if (status.value === 'offline') {
      status.value = 'syncing'
    } else {
      status.value = 'online'
    }
  }

  function handleOffline() {
    status.value = 'offline'
    pendingChanges.value++
  }

  onMounted(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    status.value = navigator.onLine ? 'online' : 'offline'

    if (window.electronAPI) {
      cleanupEntityChanged = window.electronAPI.onEntityChanged?.((event) => {
        if (event.source === 'remote') {
          lastSyncTime.value = event.timestamp
        }
      }) ?? null

      cleanupSyncProgress = window.electronAPI.onSyncProgress?.((event) => {
        if (event.phase === 'started') {
          status.value = 'syncing'
          syncProgress.value = { entityType: event.entityType, processed: 0, total: event.total }
        } else if (event.phase === 'completed') {
          status.value = 'online'
          lastSyncTime.value = event.timestamp
          syncProgress.value = null
          pendingChanges.value = 0
        } else if (event.phase === 'error') {
          status.value = 'offline'
          syncProgress.value = null
        }
      }) ?? null
    }
  })

  onBeforeUnmount(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    cleanupEntityChanged?.()
    cleanupSyncProgress?.()
  })

  return { status, lastSyncTime, syncProgress, pendingChanges }
}
