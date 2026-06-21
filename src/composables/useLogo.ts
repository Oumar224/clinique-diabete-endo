import { ref, computed } from 'vue'
import logoSrc from '@/assets/cde.png'

const logoUrl = ref<string | null>(null)
const loaded = ref(false)

export function useLogo() {
  async function loadLogo() {
    if (loaded.value) return
    loaded.value = true
    if (!window.electronAPI) return
    try {
      const result = await window.electronAPI.invoke('identity:get-logo') as any
      if (result?.success && result.data) {
        logoUrl.value = result.data
        updateFavicon(result.data)
      }
    } catch {
      // fallback silencieux vers le logo par défaut
    }
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
  }
}
