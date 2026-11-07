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
  temps_travail?: 'PLEIN' | 'PARTIEL'
  numero_securite_sociale?: string | null
}

export function getUserDisplayName(user: UserDto): string {
  const titlePrefix = user.specialties?.[0]?.title_prefix
  return formatDisplayName(user.nom || '', user.prenom || '', titlePrefix)
}

export function roleColor(role: string) {
  const colors: Record<string, 'primary' | 'warning' | 'success' | 'info' | 'danger'> = {
    MEDECIN: 'primary',
    SECRETAIRE: 'warning',
    PHARMACIEN: 'success',
    COMPTABLE: 'info',
    ADMIN: 'danger',
    INFIRMIER: 'info',
  }
  return colors[role] || 'info'
}

export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    MEDECIN: 'Médecin',
    SECRETAIRE: 'Secrétaire',
    PHARMACIEN: 'Pharmacien',
    COMPTABLE: 'Comptable',
    ADMIN: 'Administrateur',
    INFIRMIER: "Infirmier d'État",
  }
  return labels[role] || role
}

export function useUsers() {
  const users = ref<UserDto[]>([])
  const userFormRef = ref()
  const editUserFormRef = ref()
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadUsers() {
    loading.value = true
    error.value = null
    try {
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
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function createUser(
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

  async function updateUser(
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

  async function deleteUser(id: number) {
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

  async function terminateContract(id: number, motif: string): Promise<boolean> {
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

  async function reactivateContract(id: number): Promise<boolean> {
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

  return { users, userFormRef, editUserFormRef, loading, error, loadUsers, createUser, updateUser, deleteUser, terminateContract, reactivateContract }
}
