// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockIpcInvoke = vi.hoisted(() => vi.fn())
vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

import { useEmailConfig } from '../useEmailConfig'
import type { EmailConfig } from '../useEmailConfig'

const mockConfig: EmailConfig = {
  smtp_host: 'smtp.example.com',
  smtp_port: 587,
  smtp_user: 'user@example.com',
  sender_email: 'noreply@clinic.com',
  sender_name: 'Clinique Diabète',
  is_configured: true,
}

describe('useEmailConfig', () => {
  beforeEach(() => {
    mockIpcInvoke.mockReset()
    mockIpcInvoke.mockResolvedValue(null)
  })

  describe('loadConfig', () => {
    it('appelle email:get-config et met à jour emailConfig', async () => {
      mockIpcInvoke.mockResolvedValue(mockConfig)
      const { loadConfig, emailConfig } = useEmailConfig()

      await loadConfig()

      expect(mockIpcInvoke).toHaveBeenCalledWith('email:get-config')
      expect(emailConfig.value).toEqual(mockConfig)
    })

    it('met emailConfig à null si l\'API retourne null', async () => {
      mockIpcInvoke.mockResolvedValue(null)
      const { loadConfig, emailConfig } = useEmailConfig()

      await loadConfig()

      expect(emailConfig.value).toBeNull()
    })

    it('set error en cas d\'erreur', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur réseau'))
      const { loadConfig, error } = useEmailConfig()

      await loadConfig()

      expect(error.value).toBe('Erreur réseau')
    })

    it('sets loading true during load and false after', async () => {
      mockIpcInvoke.mockResolvedValue(mockConfig)
      const { loadConfig, loading } = useEmailConfig()

      const promise = loadConfig()
      expect(loading.value).toBe(true)
      await promise
      expect(loading.value).toBe(false)
    })
  })

  describe('saveConfig', () => {
    it('appelle email:save-config puis recharge la config', async () => {
      mockIpcInvoke
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(mockConfig)

      const { saveConfig, emailConfig } = useEmailConfig()

      await saveConfig({ ...mockConfig, smtp_pass: 'secret' })

      expect(mockIpcInvoke).toHaveBeenNthCalledWith(1, 'email:save-config', { ...mockConfig, smtp_pass: 'secret' })
      expect(mockIpcInvoke).toHaveBeenNthCalledWith(2, 'email:get-config')
      expect(emailConfig.value).toEqual(mockConfig)
    })

    it('set error en cas d\'erreur', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur sauvegarde'))
      const { saveConfig, error } = useEmailConfig()

      await saveConfig({ ...mockConfig, smtp_pass: 'secret' })

      expect(error.value).toBe('Erreur sauvegarde')
    })

    it('sets saving true during save and false after', async () => {
      mockIpcInvoke.mockResolvedValue(undefined)
      const { saveConfig, saving } = useEmailConfig()

      const promise = saveConfig({ ...mockConfig, smtp_pass: 'secret' })
      expect(saving.value).toBe(true)
      await promise
      expect(saving.value).toBe(false)
    })
  })

  describe('testEmail', () => {
    it('appelle email:send-test', async () => {
      mockIpcInvoke.mockResolvedValue(undefined)
      const { testEmail } = useEmailConfig()

      await testEmail()

      expect(mockIpcInvoke).toHaveBeenCalledWith('email:send-test')
    })

    it('set error en cas d\'erreur', async () => {
      mockIpcInvoke.mockRejectedValue(new Error('Erreur envoi'))
      const { testEmail, error } = useEmailConfig()

      await testEmail()

      expect(error.value).toBe('Erreur envoi')
    })

    it('sets testing true during test and false after', async () => {
      mockIpcInvoke.mockResolvedValue(undefined)
      const { testEmail, testing } = useEmailConfig()

      const promise = testEmail()
      expect(testing.value).toBe(true)
      await promise
      expect(testing.value).toBe(false)
    })
  })
})
