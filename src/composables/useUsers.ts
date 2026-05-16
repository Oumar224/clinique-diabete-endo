import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { showLoader, hideLoader } from '@/components/utils/AppLoader'

interface ServiceControllerResultType {
  success?: boolean
  data?: any
  message?: string
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
}

export const users = ref<UserDto[]>([])
export const userFormRef = ref()
export const editUserFormRef = ref()

async function invoke(channel: string, params?: any) {
  if (!window.electronAPI) {
    throw new Error('electronAPI not available')
  }
  const result = await window.electronAPI.invoke(channel, params) as ServiceControllerResultType
  if (!result.success) {
    ElMessage({ type: 'error', message: result.message })
    throw new Error(result.message)
  }
  return result
}

export async function loadUsers() {
  const r = await invoke('users:list')
  users.value = r.data as UserDto[]
}

export async function createUser(formRef: FormInstance | undefined, form: UserDto) {
  if (!formRef) return
  await formRef.validate(async (v) => {
    if (!v) return
    const loader = showLoader('Création...')
    try {
      await invoke('users:create', { ...form })
      await loadUsers()
      formRef.resetFields()
      userFormRef.value?.close()
    } finally {
      hideLoader(loader)
    }
  })
}

export async function updateUser(formRef: FormInstance | undefined, form: UserDto) {
  if (!formRef) return
  await formRef.validate(async (v) => {
    if (!v) return
    const loader = showLoader('Mise à jour...')
    try {
      await invoke('users:update', { ...form })
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
        await invoke('users:delete', { id })
        await loadUsers()
      } finally {
        hideLoader(loader)
      }
    })
}

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
