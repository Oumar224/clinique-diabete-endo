import { ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { showLoader, hideLoader } from '@/components/utils/AppLoader'
import { ipcInvoke } from '@/utils/ipc'
import { formatDisplayName } from '@/utils/display-name'

export interface SpecialtyRef {
  id: number
  name: string
  code: string
  title_prefix?: string
}

export interface SiteRef {
  id: number
  name: string
  is_default: boolean
}

export interface ServiceRef {
  id: number
  name: string
}

export interface MedicalUnitRef {
  id: number
  code: string
  name: string
  symbol: string
  category: string
}

export interface UserDto {
  id?: number
  nom?: string
  prenom?: string
  email?: string
  role?: string
  service?: string
  is_active?: boolean
  is_validated?: boolean
  password?: string
  fonction?: string | null
  fonction_id?: number | null
  specialties?: SpecialtyRef[]
  sites?: SiteRef[]
  services?: ServiceRef[]
  medical_units?: MedicalUnitRef[]
  photo?: string | null
  telephone?: string | null
  telephone_country_code?: string
  date_debut_contrat?: string | null
  date_fin_contrat?: string | null
  type_contrat?: 'CDD' | 'CDI'
  statut_contrat?: 'Actif' | 'Expiré' | 'Résilié'
  motif_resiliation?: string | null
}

export const users = ref<UserDto[]>([])
export const userFormRef = ref()
export const editUserFormRef = ref()

export async function loadUsers() {
  const raw = await ipcInvoke<UserDto[]>('users:list')
  users.value = await Promise.all(
    raw.map(async (u) => {
      if (!u.id) return u
      try {
        const rels = await ipcInvoke<{
          specialties: SpecialtyRef[]
          services: ServiceRef[]
          sites: SiteRef[]
          medical_units: MedicalUnitRef[]
          statut_contrat?: 'Actif' | 'Expiré' | 'Résilié'
        }>('users:get-relations', { id: u.id })
        return { ...u, ...rels }
      } catch {
        return u
      }
    })
  )
}

/**
 * Crée un nouvel utilisateur avec ses relations (spécialités, services, sites).
 *
 * @param formRef - Référence du formulaire Element Plus pour la validation.
 * @param form - Données de l'utilisateur incluant les identifiants de relations.
 */
export async function createUser(
  formRef: FormInstance | undefined,
  form: UserDto & { specialty_ids?: number[]; service_ids?: number[]; site_ids?: number[]; medical_unit_ids?: number[]; sendEmail?: boolean }
) {
  if (!formRef) return
  await formRef.validate(async (v) => {
    if (!v) return
    const loader = showLoader('Création...')
    try {
      const { specialty_ids, service_ids, site_ids, medical_unit_ids, fonction_id, password, sendEmail, ...userData } = form
      const result = await ipcInvoke<UserDto>('users:create', { ...userData, password: password || 'changeme', fonction_id, sendEmail })
      if (result?.id) {
        await ipcInvoke('users:sync-relations', {
          id: result.id,
          specialty_ids: specialty_ids || [],
          service_ids: service_ids || [],
          site_ids: site_ids || [],
          medical_unit_ids: medical_unit_ids || [],
        })
      }
      await loadUsers()
      formRef.resetFields()
      userFormRef.value?.close()
    } finally {
      hideLoader(loader)
    }
  })
}

/**
 * Met à jour un utilisateur existant et ses relations.
 *
 * @param formRef - Référence du formulaire Element Plus pour la validation.
 * @param form - Données de l'utilisateur incluant les identifiants de relations.
 */
export async function updateUser(
  formRef: FormInstance | undefined,
  form: UserDto & { specialty_ids?: number[]; service_ids?: number[]; site_ids?: number[]; medical_unit_ids?: number[] }
) {
  if (!formRef) return
  await formRef.validate(async (v) => {
    if (!v) return
    const loader = showLoader('Mise à jour...')
    try {
      const { specialty_ids, service_ids, site_ids, medical_unit_ids, fonction_id, password, ...userData } = form
      const updateData: any = { ...userData, fonction_id, password: password || 'changeme' }
      await ipcInvoke('users:update', updateData)
      if (userData.id) {
        await ipcInvoke('users:sync-relations', {
          id: userData.id,
          specialty_ids: specialty_ids || [],
          service_ids: service_ids || [],
          site_ids: site_ids || [],
          medical_unit_ids: medical_unit_ids || [],
        })
      }
      await loadUsers()
      formRef.resetFields()
      editUserFormRef.value?.close()
    } finally {
      hideLoader(loader)
    }
  })
}

export async function deleteUser(id: number) {
  ElMessageBox.confirm('Supprimer cet utilisateur ?', 'Confirmation', { type: 'warning' })
    .then(async () => {
      const loader = showLoader('Suppression...')
      try {
        await ipcInvoke('users:delete', { id })
        await loadUsers()
      } finally {
        hideLoader(loader)
      }
    })
}

/**
 * Résilie le contrat d'un utilisateur.
 *
 * @param id - Identifiant de l'utilisateur.
 * @param motif - Motif de résiliation (obligatoire).
 * @returns `true` si la résiliation a réussi, `false` sinon.
 */
export async function terminateContract(id: number, motif: string): Promise<boolean> {
  const loader = showLoader('Résiliation...')
  try {
    await ipcInvoke('users:terminate-contract', { id, motif })
    await loadUsers()
    return true
  } catch {
    return false
  } finally {
    hideLoader(loader)
  }
}

/**
 * Réactive le contrat d'un utilisateur précédemment résilié.
 *
 * @param id - Identifiant de l'utilisateur.
 * @returns `true` si la réactivation a réussi, `false` sinon.
 */
export async function reactivateContract(id: number): Promise<boolean> {
  const loader = showLoader('Réactivation...')
  try {
    await ipcInvoke('users:reactivate-contract', { id })
    await loadUsers()
    return true
  } catch {
    return false
  } finally {
    hideLoader(loader)
  }
}

/**
 * Construit le nom complet affiché d'un utilisateur avec son titre.
 *
 * @example
 * getUserDisplayName({ nom: 'Koumara', prenom: 'Oumar', specialties: [{ title_prefix: 'Dr' }] })
 * // => 'Dr KOUMARA Oumar'
 */
export function getUserDisplayName(user: UserDto): string {
  const titlePrefix = user.specialties?.[0]?.title_prefix
  return formatDisplayName(user.nom || '', user.prenom || '', titlePrefix)
}

/**
 * Renvoie la couleur Element Plus associée à un rôle utilisateur.
 */
export function roleColor(role: string) {
  const colors: Record<string, 'primary' | 'warning' | 'success' | 'info' | 'danger'> = {
    MEDECIN: 'primary',
    SECRETAIRE: 'warning',
    PHARMACIEN: 'success',
    COMPTABLE: 'info',
    ADMIN: 'danger',
  }
  return colors[role] || 'info'
}

/**
 * Renvoie le libellé français d'un rôle utilisateur.
 *
 * @example
 * roleLabel('MEDECIN') // => 'Médecin'
 */
export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    MEDECIN: 'Médecin',
    SECRETAIRE: 'Secrétaire',
    PHARMACIEN: 'Pharmacien',
    COMPTABLE: 'Comptable',
    ADMIN: 'Administrateur',
  }
  return labels[role] || role
}
