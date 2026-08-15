// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import SyncProgressDialog from '../SyncProgressDialog.vue'

// ---------------------------------------------------------------------------
// Mock useSyncStatus – provides reactive status & syncProgress
// ---------------------------------------------------------------------------
const mockStatus = ref<'online' | 'offline' | 'syncing'>('online')
const mockSyncProgress = ref<{ entityType: string; processed: number; total: number } | null>(null)

vi.mock('@/composables/useSyncStatus', () => ({
  useSyncStatus: () => ({
    status: mockStatus,
    syncProgress: mockSyncProgress,
  }),
}))

// ---------------------------------------------------------------------------
// Mock window.electronAPI
// ---------------------------------------------------------------------------
const mockInvoke = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  mockStatus.value = 'online'
  mockSyncProgress.value = null
  vi.stubGlobal('electronAPI', { invoke: mockInvoke })
  mockInvoke.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mountDialog() {
  return mount(SyncProgressDialog, {
    global: {
      stubs: {
        'el-dialog': {
          template: `<div v-if="modelValue" class="el-dialog-stub"><slot /><slot name="footer" /></div>`,
          props: ['modelValue', 'title', 'width', 'closeOnClickModal', 'closeOnPressEscape', 'showClose', 'center'],
        },
        'el-progress': {
          template: '<div class="el-progress" :data-percentage="percentage" />',
          props: ['percentage', 'strokeWidth'],
        },
        'el-button': {
          template: '<button class="el-button-stub" @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('SyncProgressDialog', () => {
  it('renders nothing when status is online (initial)', () => {
    const wrapper = mountDialog()
    expect(wrapper.find('.sync-progress-dialog__body').exists()).toBe(false)
  })

  it('renders nothing when status is offline', async () => {
    mockStatus.value = 'offline'
    const wrapper = mountDialog()
    await nextTick()
    expect(wrapper.find('.sync-progress-dialog__body').exists()).toBe(false)
  })

  it('becomes visible on offline→syncing transition', async () => {
    const wrapper = mountDialog()
    await nextTick()
    expect(wrapper.find('.sync-progress-dialog__body').exists()).toBe(false)

    mockStatus.value = 'offline'
    await nextTick()
    expect(wrapper.find('.sync-progress-dialog__body').exists()).toBe(false)

    mockStatus.value = 'syncing'
    await nextTick()
    expect(wrapper.find('.sync-progress-dialog__body').exists()).toBe(true)
  })

  it('hides when status goes to online', async () => {
    const wrapper = mountDialog()

    mockStatus.value = 'offline'
    await nextTick()

    mockStatus.value = 'syncing'
    await nextTick()
    expect(wrapper.find('.sync-progress-dialog__body').exists()).toBe(true)

    mockStatus.value = 'online'
    await nextTick()
    expect(wrapper.find('.sync-progress-dialog__body').exists()).toBe(false)
  })

  it('hides when status goes from syncing to offline', async () => {
    const wrapper = mountDialog()

    mockStatus.value = 'offline'
    await nextTick()

    mockStatus.value = 'syncing'
    await nextTick()
    expect(wrapper.find('.sync-progress-dialog__body').exists()).toBe(true)

    mockStatus.value = 'offline'
    await nextTick()
    expect(wrapper.find('.sync-progress-dialog__body').exists()).toBe(false)
  })

  it('computes progress percentage correctly', async () => {
    const wrapper = mountDialog()

    mockStatus.value = 'offline'
    await nextTick()

    mockSyncProgress.value = { entityType: 'Patient', processed: 25, total: 100 }
    mockStatus.value = 'syncing'
    await nextTick()

    const progressBar = wrapper.find('.el-progress')
    expect(progressBar.exists()).toBe(true)
    expect(progressBar.attributes('data-percentage')).toBe('25')
  })

  it('returns 0% when total is 0', async () => {
    const wrapper = mountDialog()

    mockStatus.value = 'offline'
    await nextTick()

    mockSyncProgress.value = { entityType: 'Patient', processed: 0, total: 0 }
    mockStatus.value = 'syncing'
    await nextTick()

    const progressBar = wrapper.find('.el-progress')
    expect(progressBar.attributes('data-percentage')).toBe('0')
  })

  it('rounds percentage correctly', async () => {
    const wrapper = mountDialog()

    mockStatus.value = 'offline'
    await nextTick()

    mockSyncProgress.value = { entityType: 'Patient', processed: 1, total: 3 }
    mockStatus.value = 'syncing'
    await nextTick()

    const progressBar = wrapper.find('.el-progress')
    expect(progressBar.attributes('data-percentage')).toBe('33')
  })

  it('shows detail text with entity info', async () => {
    const wrapper = mountDialog()

    mockStatus.value = 'offline'
    await nextTick()

    mockSyncProgress.value = { entityType: 'Patient', processed: 10, total: 50 }
    mockStatus.value = 'syncing'
    await nextTick()

    const detail = wrapper.find('.sync-progress-dialog__detail')
    expect(detail.exists()).toBe(true)
    expect(detail.text()).toBe('10 / 50 — Patient')
  })

  it('does not show progress bar when syncProgress is null', async () => {
    const wrapper = mountDialog()

    mockStatus.value = 'offline'
    await nextTick()

    mockStatus.value = 'syncing'
    await nextTick()

    expect(wrapper.find('.el-progress').exists()).toBe(false)
    expect(wrapper.find('.sync-progress-dialog__detail').exists()).toBe(false)
  })

  it('cancel button hides dialog and calls electronAPI sync:stop', async () => {
    const wrapper = mountDialog()

    mockStatus.value = 'offline'
    await nextTick()

    mockStatus.value = 'syncing'
    await nextTick()
    expect(wrapper.find('.sync-progress-dialog__body').exists()).toBe(true)

    await wrapper.find('.el-button-stub').trigger('click')
    await nextTick()

    expect(mockInvoke).toHaveBeenCalledWith('sync:stop')
    expect(wrapper.find('.sync-progress-dialog__body').exists()).toBe(false)
  })

  it('cancel button swallows invoke errors', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('channel closed'))

    const wrapper = mountDialog()

    mockStatus.value = 'offline'
    await nextTick()

    mockStatus.value = 'syncing'
    await nextTick()

    await wrapper.find('.el-button-stub').trigger('click')
    await nextTick()

    expect(mockInvoke).toHaveBeenCalledWith('sync:stop')
    expect(wrapper.find('.sync-progress-dialog__body').exists()).toBe(false)
  })

  it('cancel button works when electronAPI is undefined', async () => {
    vi.stubGlobal('electronAPI', undefined)

    const wrapper = mountDialog()

    mockStatus.value = 'offline'
    await nextTick()

    mockStatus.value = 'syncing'
    await nextTick()

    await wrapper.find('.el-button-stub').trigger('click')
    await nextTick()

    expect(wrapper.find('.sync-progress-dialog__body').exists()).toBe(false)
  })

  it('shows the correct title', async () => {
    const wrapper = mountDialog()

    mockStatus.value = 'offline'
    await nextTick()

    mockStatus.value = 'syncing'
    await nextTick()

    const dialog = wrapper.find('.el-dialog-stub')
    expect(dialog.exists()).toBe(true)
  })

  it('dialog is configured as non-closeable', async () => {
    let capturedProps: Record<string, any> = {}

    const ElDialogStub = {
      template: `<div class="el-dialog-stub"><slot /><slot name="footer" /></div>`,
      props: ['modelValue', 'title', 'width', 'closeOnClickModal', 'closeOnPressEscape', 'showClose', 'center'],
      created(this: any) {
        capturedProps = { ...this.$props }
      },
    }

    mount(SyncProgressDialog, {
      global: {
        stubs: {
          'el-dialog': ElDialogStub,
          'el-progress': {
            template: '<div class="el-progress" />',
            props: ['percentage', 'strokeWidth'],
          },
          'el-button': {
            template: '<button class="el-button-stub" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    expect(capturedProps.title).toBe('Synchronisation')
    expect(capturedProps.closeOnClickModal).toBe(false)
    expect(capturedProps.closeOnPressEscape).toBe(false)
    expect(capturedProps.showClose).toBe(false)
    expect(capturedProps.center != null).toBe(true)
  })

  it('hides on online→offline→syncing→online cycle', async () => {
    const wrapper = mountDialog()

    mockStatus.value = 'offline'
    await nextTick()

    mockStatus.value = 'syncing'
    await nextTick()
    expect(wrapper.find('.sync-progress-dialog__body').exists()).toBe(true)

    mockStatus.value = 'online'
    await nextTick()
    expect(wrapper.find('.sync-progress-dialog__body').exists()).toBe(false)

    // Start another sync cycle
    mockStatus.value = 'offline'
    await nextTick()

    mockStatus.value = 'syncing'
    await nextTick()
    expect(wrapper.find('.sync-progress-dialog__body').exists()).toBe(true)
  })
})
