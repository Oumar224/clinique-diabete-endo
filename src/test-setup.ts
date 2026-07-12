import { vi } from 'vitest'

// Mock electronAPI globally
vi.stubGlobal('electronAPI', {
  invoke: vi.fn().mockResolvedValue({ success: true, data: null }),
})
