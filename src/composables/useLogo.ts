import { ref, computed } from 'vue'
import logoSrc from '@/assets/cde.png'
import { ipcInvoke } from '@/utils/ipc'

const logoUrl = ref<string | null>(null)

export function useLogo() {
  async function loadLogo() {
    try {
      const data = await ipcInvoke<string | null>('identity:get-logo')
      if (data) {
        logoUrl.value = data
        updateFavicon(data)
        return
      }
    } catch {
      // No Electron IPC or no custom logo — fallback to bundled default
    }
    logoUrl.value = null
  }

  function updateFavicon(dataUrl: string) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/png"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      link.type = 'image/png'
      document.head.appendChild(link)
    }
    link.href = dataUrl
  }

  loadLogo()

  return {
    logoUrl: computed(() => logoUrl.value || logoSrc),
    refreshLogo: loadLogo,
  }
}
