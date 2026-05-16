import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance } from 'element-plus'

export interface User {
  id: number
  nom: string
  prenom: string
  email: string
  role: 'MEDECIN' | 'SECRETAIRE' | 'PHARMACIEN' | 'COMPTABLE' | 'ADMIN'
  service: string
  is_active?: boolean
  is_validated?: boolean
}

const user = ref<User | null>(null)
const token = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const mustChangePassword = ref(false)
export const validatePasswordFormRef = ref()

export function useAuth() {
  const router = useRouter()

  const isAuthenticated = computed(() => !!user.value && !!token.value)

  async function login(email: string, password: string, rememberMe = false): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.invoke('auth:login', { email, password, rememberMe }) as {
          success: boolean
          data: { token?: string; user: User; mustChangePassword?: boolean }
          message: string
        }
        if (!result.success) throw new Error(result.message)
        token.value = result.data.token || null
        user.value = result.data.user
        mustChangePassword.value = !!result.data.mustChangePassword

        if (token.value) localStorage.setItem('cde_token', token.value)
        if (result.data.mustChangePassword) {
          router.push('/validate-password')
        } else {
          router.push('/app')
        }
      } else {
        user.value = {
          id: 1, nom: 'admin', prenom: 'admin',
          email, role: 'ADMIN', service: 'Direction',
          is_active: true, is_validated: true,
        }
        token.value = 'mock-token'
        localStorage.setItem('cde_token', 'mock-token')
        router.push('/app')
      }
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    } finally {
      loading.value = false
    }
  }

  async function validatePasswordForm(formRef: FormInstance | undefined, form: { oldPassword: string; newPassword: string }) {
    if (!formRef) return
    const valid = await formRef.validate().catch(() => false)
    if (!valid) return
    const success = await validatePassword(form.oldPassword, form.newPassword)
    if (success) {
      formRef.resetFields()
    }
  }

  async function validatePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      if (window.electronAPI && user.value) {
        const result = await window.electronAPI.invoke('auth:validate-password', {
          userId: user.value.id,
          oldPassword,
          newPassword,
        }) as { success: boolean; data: User; message: string }
        if (!result.success) throw new Error(result.message)
        user.value = result.data
        user.value.is_validated = true
        mustChangePassword.value = false
        router.push('/app')
        return true
      }
      return false
    } catch (e) {
      error.value = (e as Error).message
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
    token.value = null
    mustChangePassword.value = false
    localStorage.removeItem('cde_token')
    router.push('/')
  }

  async function restoreSession(): Promise<boolean> {
    const savedToken = localStorage.getItem('cde_token')
    if (!savedToken) return false

    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.invoke('session:validate', { token: savedToken }) as {
          success: boolean
          data: User | null
        }
        if (result.success && result.data) {
          user.value = result.data
          token.value = savedToken
          mustChangePassword.value = result.data.is_validated !== true
          return true
        }
      } catch {
        localStorage.removeItem('cde_token')
      }
    }
    return false
  }

  async function refreshActivity(): Promise<void> {
    if (!token.value || !window.electronAPI) return
    try {
      await window.electronAPI.invoke('session:update-activity', { token: token.value })
    } catch {
    }
  }

  return {
    user, token, loading, error, mustChangePassword,
    isAuthenticated, login, logout, restoreSession, validatePassword, validatePasswordForm, refreshActivity,
  }
}
