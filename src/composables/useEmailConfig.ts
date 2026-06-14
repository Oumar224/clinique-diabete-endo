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

export const emailConfig = ref<EmailConfig | null>(null)
export const loading = ref(false)
export const testing = ref(false)
export const saving = ref(false)

export async function loadConfig() {
  loading.value = true
  try {
    emailConfig.value = await ipcInvoke<EmailConfig>('email:get-config')
  } finally {
    loading.value = false
  }
}

export async function saveConfig(data: EmailConfig & { smtp_pass: string }) {
  saving.value = true
  try {
    await ipcInvoke('email:save-config', data)
    await loadConfig()
    ElMessage.success('Configuration email enregistrée')
  } finally {
    saving.value = false
  }
}

export async function testEmail() {
  testing.value = true
  try {
    await ipcInvoke('email:send-test')
    ElMessage.success('Email de test envoyé avec succès')
  } catch {
    // L'erreur est déjà affichée par ipcInvoke
  } finally {
    testing.value = false
  }
}
