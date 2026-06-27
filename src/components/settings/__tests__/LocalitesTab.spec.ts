// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ─── Mock Electron IPC ──────────────────────────────────────────────────────
const mockInvoke = vi.fn()
vi.stubGlobal('window', {
  electronAPI: {
    invoke: mockInvoke,
    getVersion: vi.fn(),
    autoUpdater: {} as any,
  },
})

// ─── Mock Element Plus ─────────────────────────────────────────────────────
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn(() => Promise.resolve()), alert: vi.fn() },
}))

// ─── Stubs ─────────────────────────────────────────────────────────────────
const EL_STUBS: Record<string, any> = {
  'el-input': { template: '<input class="el-input" />' },
  'el-button': { template: '<button class="el-button"><slot /></button>' },
  'el-radio-group': { template: '<div class="el-radio-group"><slot /></div>' },
  'el-radio-button': { template: '<label class="el-radio-button"><slot /></label>' },
  'el-alert': { template: '<div class="el-alert"><slot /></div>' },
  'el-table': { template: '<div class="el-table"><slot /></div>' },
  'el-table-column': { template: '<div class="el-table-column"><slot :row="{ name: \'Test\', code: \'GN-TEST\', type: \'region\', region: \'Test\' }" /></div>' },
  'el-tag': { template: '<span class="el-tag"><slot /></span>' },
  'el-switch': { template: '<input class="el-switch" type="checkbox" />' },
  'el-empty': { template: '<div class="el-empty"><slot /></div>' },
  'el-pagination': { template: '<div class="el-pagination"><slot /></div>' },
  'el-row': { template: '<div class="el-row"><slot /></div>' },
  'el-divider': { template: '<hr class="el-divider" />' },
  'el-icon': { template: '<i class="el-icon"><slot /></i>' },
}

// ─── Mock tree data ────────────────────────────────────────────────────────
function createTreeData() {
  return [
    {
      id: 1, code: 'GN-CONAKRY', name: 'Conakry', type: 'region',
      parent_id: null, country: 'GN', is_active: true, children: [
        {
          id: 2, code: 'GN-CONAKRY-COM', name: 'Conakry', type: 'prefecture',
          parent_id: 1, country: 'GN', is_active: true, region: 'Conakry', children: [
            {
              id: 3, code: 'GN-CONAKRY-COM-MATAM', name: 'Matam', type: 'commune',
              parent_id: 2, country: 'GN', is_active: true, region: 'Conakry', children: [],
            },
          ],
        },
      ],
    },
    {
      id: 4, code: 'GN-BOKE', name: 'Boké', type: 'region',
      parent_id: null, country: 'GN', is_active: true, children: [
        {
          id: 5, code: 'GN-BOKE-BOKE', name: 'Boké', type: 'prefecture',
          parent_id: 4, country: 'GN', is_active: true, region: 'Boké', children: [],
        },
      ],
    },
  ]
}

function mockTreeData() {
  mockInvoke.mockImplementation((channel: string) => {
    if (channel === 'localites:get-tree') {
      return { success: true, data: createTreeData() }
    }
    if (channel === 'localites:list') {
      return { success: true, data: [] }
    }
    return { success: true, data: null }
  })
}

import LocalitesTab from '../LocalitesTab.vue'
import { useLocalites } from '@/composables/useLocalites'

describe('LocalitesTab', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    mockInvoke.mockResolvedValue({ success: true, data: [] })
    document.body.innerHTML = ''
    // Reset module-level composable state
    const { treeData, localites } = useLocalites()
    treeData.value = []
    localites.value = []
  })

  function createWrapper() {
    return mount(LocalitesTab, {
      global: { stubs: EL_STUBS },
      attachTo: document.body,
    })
  }

  // ─── Loading state ───────────────────────────────────────────────────

  it('loads tree data on mount', async () => {
    mockTreeData()
    const wrapper = createWrapper()

    // Wait for onMounted to finish
    await new Promise(r => setTimeout(r, 100))

    // Should show the table
    expect(wrapper.find('.el-table').exists()).toBe(true)
  })

  it('calls getTree on mount', async () => {
    mockTreeData()
    createWrapper()
    await new Promise(r => setTimeout(r, 100))

    expect(mockInvoke).toHaveBeenCalledWith('localites:get-tree', undefined)
  })

  it('populates treeData after mount', async () => {
    mockTreeData()
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))

    const state = (wrapper.vm as any).$.setupState ?? {}
    expect(state.treeData.length).toBeGreaterThan(0)
    expect(state.treeData[0].name).toBe('Conakry')
  })

  // ─── Import button ───────────────────────────────────────────────────

  it('shows "Importer les localités" button when no data', async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'localites:get-tree') return { success: true, data: [] }
      return { success: true, data: null }
    })
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('Importer les localités de Guinée')
  })

  it('shows "Actualiser" button when data exists', async () => {
    mockTreeData()
    const wrapper = createWrapper()
    await new Promise(r => setTimeout(r, 100))
    expect(wrapper.text()).toContain('Actualiser')
  })
})
