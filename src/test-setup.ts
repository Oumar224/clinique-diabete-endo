import { setActivePinia, createPinia } from 'pinia'
import { vi } from 'vitest'

// Set up Pinia for all tests
setActivePinia(createPinia())

// Mock electronAPI globally
vi.stubGlobal('electronAPI', {
  invoke: vi.fn().mockResolvedValue({ success: true, data: null }),
})
