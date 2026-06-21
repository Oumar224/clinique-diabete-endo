import {ref} from 'vue'
import {ipcInvoke} from '@/utils/ipc'

export interface LocaliteDto {
  id?: number
  code: string
  name: string
  type: 'region' | 'prefecture' | 'commune' | 'sous_prefecture'
  parent_id?: number | null
  country: string
  region?: string
  is_active: boolean
  children?: LocaliteDto[]
}

export function useLocalites() {
  const localites = ref<LocaliteDto[]>([])
  const treeData = ref<LocaliteDto[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  async function fetchLocalites(activeOnly = false): Promise<void> {
    loading.value = true
    error.value = null
    try {
      localites.value = await ipcInvoke<LocaliteDto[]>('localites:list', { activeOnly })
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function getTree(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      treeData.value = await ipcInvoke<LocaliteDto[]>('localites:get-tree')
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function importLocalites(): Promise<number> {
    error.value = null
    try {
      return await ipcInvoke<number>('localites:import')
    } catch (e: any) {
      error.value = e?.message || "Erreur lors de l'importation des localités"
      throw e
    }
  }

  async function toggleLocalite(id: number, isActive: boolean): Promise<LocaliteDto | null> {
    try {
      const updated = await ipcInvoke<LocaliteDto>('localites:toggle', { id, is_active: isActive })
      // Update in flat list
      const idx = localites.value.findIndex(l => l.id === id)
      if (idx !== -1) localites.value[idx] = updated
      // Update in tree recursively
      updateTreeItem(treeData.value, id, updated)
      return updated
    } catch {
      return null
    }
  }

  function updateTreeItem(nodes: LocaliteDto[], id: number, updated: LocaliteDto): boolean {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) {
        nodes[i] = { ...nodes[i], ...updated }
        return true
      }
      if (nodes[i].children && updateTreeItem(nodes[i].children!, id, updated)) {
        return true
      }
    }
    return false
  }

  async function getLocaliteByCode(code: string): Promise<LocaliteDto | null> {
    try {
      return await ipcInvoke<LocaliteDto | null>('localites:get-by-code', { code })
    } catch {
      return null
    }
  }

  async function searchLocalites(query: string): Promise<LocaliteDto[]> {
    try {
      return await ipcInvoke<LocaliteDto[]>('localites:search', { query })
    } catch {
      return []
    }
  }

  async function importLocalitesData(data: string, country: string): Promise<number> {
    error.value = null
    try {
      const count = await ipcInvoke<number>('localites:import-data', { data, country })
      return count
    } catch (e: any) {
      const msg = e?.message || "Erreur lors de l'importation personnalisée"
      error.value = msg
      throw e
    }
  }

  return {
    localites,
    treeData,
    loading,
    error,
    fetchLocalites,
    getTree,
    importLocalites,
    importLocalitesData,
    toggleLocalite,
    getLocaliteByCode,
    searchLocalites,
  }
}
