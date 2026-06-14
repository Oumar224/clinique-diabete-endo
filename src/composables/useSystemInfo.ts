import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ipcInvoke } from '@/utils/ipc'

export interface AppInfoDto {
  app_version: string
  electron_version: string
  node_version: string
  sqlite_version: string
  platform: string
  platform_arch: string
}

export interface DbStatsDto {
  db_size_bytes: number
  db_size_human: string
  record_counts: Record<string, number>
}

export interface BackupResultDto {
  file_path: string
  date: string
  size_bytes: number
}

export interface RestoreResultDto {
  needs_restart: boolean
  safety_backup: string | null
}

export interface SystemInfoState {
  app?: AppInfoDto
  stats?: DbStatsDto
  lastBackup?: string
}

const systemInfo = ref<SystemInfoState>({})
const backingUp = ref(false)
const restoring = ref(false)

export function useSystemInfo() {
  async function fetchInfo(): Promise<void> {
    try {
      const [app, stats] = await Promise.all([
        ipcInvoke<AppInfoDto>('system:info'),
        ipcInvoke<DbStatsDto>('system:db-stats'),
      ])
      systemInfo.value = { app, stats }
    } catch {
      ElMessage({ type: 'error', message: 'Impossible de charger les informations système' })
    }
  }

  async function triggerBackup(path?: string): Promise<BackupResultDto | null> {
    backingUp.value = true
    try {
      const result = await ipcInvoke<BackupResultDto>('system:backup', { targetPath: path })
      ElMessage({ type: 'success', message: `Sauvegarde effectuée : ${result.file_path}` })
      systemInfo.value.lastBackup = result.date
      return result
    } catch {
      return null
    } finally {
      backingUp.value = false
    }
  }

  async function triggerRestore(filePath: string): Promise<RestoreResultDto | null> {
    restoring.value = true
    try {
      const result = await ipcInvoke<RestoreResultDto>('system:restore', { filePath })
      ElMessage({ type: 'success', message: 'Base de données restaurée. Redémarrage...' })
      if (result.needs_restart) {
        await window.electronAPI?.invoke('app:restart')
      }
      return result
    } catch {
      return null
    } finally {
      restoring.value = false
    }
  }

  return {
    systemInfo,
    backingUp,
    restoring,
    fetchInfo,
    triggerBackup,
    triggerRestore,
  }
}
