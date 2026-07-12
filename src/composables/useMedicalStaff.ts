import { ipcInvoke } from '@/utils/ipc'
import type { UserDto } from '@/composables/useUsers'

const medicalRoles = new Set(['MEDECIN', 'INFIRMIER'])

let cachedStaff: UserDto[] | null = null

export function getMedicalStaffCache(): UserDto[] {
  return cachedStaff ?? []
}

export async function fetchMedicalStaff(force = false): Promise<UserDto[]> {
  if (cachedStaff && !force) return cachedStaff
  const all = await ipcInvoke<UserDto[]>('users:list')
  cachedStaff = all.filter(u => u.is_active && medicalRoles.has(u.role!))
  return cachedStaff
}

export function searchMedicalStaff(query: string, limit = 10): UserDto[] {
  if (!cachedStaff) return []
  const q = query.toLowerCase().trim()
  if (!q) return cachedStaff.slice(0, limit)
  return cachedStaff
    .filter(u =>
      (u.nom?.toLowerCase().includes(q)) ||
      (u.prenom?.toLowerCase().includes(q)) ||
      (`${u.nom} ${u.prenom}`.toLowerCase().includes(q)) ||
      (`${u.prenom} ${u.nom}`.toLowerCase().includes(q))
    )
    .slice(0, limit)
}

export function formatMedecinName(user: UserDto): string {
  const prefix = user.specialties?.[0]?.title_prefix
  const nom = (user.nom || '').toUpperCase()
  const prenom = user.prenom || ''
  return prefix ? `${prefix} ${nom} ${prenom}` : `${nom} ${prenom}`
}
