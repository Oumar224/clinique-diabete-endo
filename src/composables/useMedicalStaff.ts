import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'
import type { UserDto } from '@/composables/useUsers'

const medicalRoles = new Set(['MEDECIN', 'INFIRMIER'])

export function formatMedecinName(user: UserDto): string {
  const prefix = user.specialties?.[0]?.title_prefix
  const nom = (user.nom || '').toUpperCase()
  const prenom = user.prenom || ''
  return prefix ? `${prefix} ${nom} ${prenom}` : `${nom} ${prenom}`
}

export function useMedicalStaff() {
  const cachedStaff = ref<UserDto[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  function getMedicalStaffCache(): UserDto[] {
    return cachedStaff.value
  }

  async function fetchMedicalStaff(force = false): Promise<UserDto[]> {
    if (cachedStaff.value.length && !force) return cachedStaff.value
    loading.value = true
    error.value = null
    try {
      const all = await ipcInvoke<UserDto[]>('users:list')
      cachedStaff.value = all.filter(u => u.is_active && medicalRoles.has(u.role!))
      return cachedStaff.value
    } catch (e) {
      error.value = (e as Error).message
      return []
    } finally {
      loading.value = false
    }
  }

  function searchMedicalStaff(query: string, limit = 10): UserDto[] {
    if (!cachedStaff.value.length) return []
    const q = query.toLowerCase().trim()
    if (!q) return cachedStaff.value.slice(0, limit)
    return cachedStaff.value
      .filter(u =>
        (u.nom?.toLowerCase().includes(q)) ||
        (u.prenom?.toLowerCase().includes(q)) ||
        (`${u.nom} ${u.prenom}`.toLowerCase().includes(q)) ||
        (`${u.prenom} ${u.nom}`.toLowerCase().includes(q))
      )
      .slice(0, limit)
  }

  return { cachedStaff, loading, error, getMedicalStaffCache, fetchMedicalStaff, searchMedicalStaff }
}
