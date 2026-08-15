import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'
import { ElMessage } from 'element-plus'

export interface EmailConfig {
  smtp_host: string
  smtp_port: number
  smtp_user: string
  sender_email: string
  sender_name: string
  is_configured: boolean
}

export function useEmailConfig() {
  const emailConfig = ref<EmailConfig | null>(null)
  const loading = ref(false)
  const testing = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function loadConfig() {
    loading.value = true
    error.value = null
    try {
      emailConfig.value = await ipcInvoke<EmailConfig>('email:get-config')
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function saveConfig(data: EmailConfig & { smtp_pass: string }) {
    saving.value = true
    error.value = null
    try {
      await ipcInvoke('email:save-config', data)
      await loadConfig()
      ElMessage.success('Configuration email enregistrée')
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      saving.value = false
    }
  }

  async function testEmail() {
    testing.value = true
    error.value = null
    try {
      await ipcInvoke('email:send-test')
      ElMessage.success('Email de test envoyé avec succès')
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      testing.value = false
    }
  }

  return { emailConfig, loading, testing, saving, error, loadConfig, saveConfig, testEmail }
}
