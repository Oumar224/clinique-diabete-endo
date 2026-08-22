// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

// ─── Mock ipcInvoke ────────────────────────────────────────────────

const mockIpcInvoke = vi.hoisted(() => vi.fn())

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

// ─── Mock Element Plus ─────────────────────────────────────────────

const { mockConfirm } = vi.hoisted(() => ({
  mockConfirm: vi.fn(),
}))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: mockConfirm },
}))

// ─── Mock @element-plus/icons-vue ──────────────────────────────────

vi.mock('@element-plus/icons-vue', () => ({
  Delete: { name: 'Delete', template: '<span class="icon-delete" />' },
  PictureFilled: { name: 'PictureFilled', template: '<span class="icon-picture" />' },
  Document: { name: 'Document', template: '<span class="icon-document" />' },
  Paperclip: { name: 'Paperclip', template: '<span class="icon-paperclip" />' },
}))

// ─── Mock RichTextEditor (emits change on every input like TipTap) ──

vi.mock('@/components/patients/RichTextEditor.vue', () => ({
  default: {
    name: 'RichTextEditor',
    template: '<input class="rich-editor-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value); $emit(\'change\')" />',
    props: ['modelValue', 'readonly', 'rows', 'placeholder'],
    emits: ['update:modelValue', 'change'],
  },
}))

// ─── EL Stubs ──────────────────────────────────────────────────────

const EL_STUBS: Record<string, any> = {
  'el-button': {
    template: '<button class="el-button" :disabled="disabled" :loading="loading" @click="$emit(\'click\', $event)"><slot /></button>',
    props: ['disabled', 'type', 'size', 'text', 'loading'],
    emits: ['click'],
  },
  'el-dialog': {
    name: 'ElDialog',
    template: '<div class="el-dialog" v-if="modelValue"><div class="el-dialog__body"><slot /></div><div class="el-dialog__footer"><slot name="footer" /></div></div>',
    props: ['modelValue', 'title', 'width', 'closeOnClickModal'],
    emits: ['update:modelValue', 'closed'],
  },
  'el-input': {
    template: '<input class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
  'el-icon': {
    template: '<span class="el-icon"><slot /></span>',
  },
}

// ─── Import component ──────────────────────────────────────────────

import AnnexeTab from '../AnnexeTab.vue'

const IMG_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const DOC_ID = '550e8400-e29b-41d4-a716-446655440000'

function createAttachment(overrides: Partial<{
  id: number
  document_id: string
  display_name: string
  file_name: string
  mime_type: string | null
  file_size: number | null
  description: string | null
  created_at: string
}> = {}) {
  return {
    id: 1,
    document_id: DOC_ID,
    display_name: 'Photo pied.png',
    file_name: 'photo-pied.png',
    mime_type: 'image/png',
    file_size: 1024,
    description: null,
    created_at: '2026-01-01 00:00:00',
    ...overrides,
  }
}

function mockListResponse(attachments: any[]) {
  mockIpcInvoke.mockImplementation((channel: string, params?: any) => {
    if (channel === 'document-attachments:list') return Promise.resolve(attachments)
    if (channel === 'document-attachments:get') {
      return Promise.resolve({ id: 1, file_data: IMG_DATA_URI })
    }
    if (channel === 'document-attachments:update') {
      const current = attachments.find(a => a.id === params?.id)
      return Promise.resolve({ ...current, description: params?.description })
    }
    return Promise.resolve(null)
  })
}

// Synchronous FileReader so addFileData is available right after the change
// event (the add submit button is disabled until both addFile and addFileData
// are set).
function stubFileReader(dataUrl = 'data:image/png;base64,ZmFrZQ==') {
  class FakeFileReader {
    onload: (() => void) | null = null
    result = ''
    readAsDataURL() {
      this.result = dataUrl
      if (this.onload) this.onload()
    }
  }
  vi.stubGlobal('FileReader', FakeFileReader)
}

// The add dialog footer buttons carry no class in production; locate them by
// their label (Annuler / Ajouter).
function addFooterButton(wrapper: any, label: string) {
  return wrapper.findAll('.el-dialog__footer .el-button').find((b: any) => b.text() === label)
}

// Selects the file inside the open add dialog and fires the change event.
async function pickFileInAddDialog(wrapper: any, file: File) {
  const input = wrapper.find('.annexe-tab__add-body input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

describe('AnnexeTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockResolvedValue('confirm')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function createWrapper(props: { documentId?: string | null; readonly?: boolean } = {}) {
    return mount(AnnexeTab, {
      props,
      global: { stubs: EL_STUBS },
    })
  }

  it('shows the disabled message and no list when documentId is null', async () => {
    const wrapper = createWrapper({ documentId: null })

    expect(wrapper.find('.annexe-tab__disabled-message').text()).toBe("Enregistrez d'abord le document")
    expect(wrapper.find('.annexe-tab__item').exists()).toBe(false)
    expect(wrapper.find('.annexe-tab__add').exists()).toBe(false)
    expect(mockIpcInvoke).not.toHaveBeenCalledWith('document-attachments:list', expect.anything())
  })

  it('loads attachments when documentId is a UUID string (B1 contract)', async () => {
    mockListResponse([createAttachment({ id: 1, display_name: 'Photo pied.png' })])

    const wrapper = createWrapper({ documentId: DOC_ID })
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('document-attachments:list', { documentId: DOC_ID })
    expect(wrapper.find('.annexe-tab__disabled-message').exists()).toBe(false)
    expect(wrapper.findAll('.annexe-tab__item')).toHaveLength(1)
    expect(wrapper.find('.annexe-tab__item-name').text()).toBe('Photo pied.png')
  })

  it('loads the attachments via document-attachments:list and displays them', async () => {
    mockListResponse([
      createAttachment({ id: 1, display_name: 'Photo pied.png', description: 'Plaie du pied gauche' }),
      createAttachment({ id: 2, display_name: 'Compte rendu labo.pdf', file_name: 'cr-labo.pdf', mime_type: 'application/pdf', file_size: 2048, description: null }),
    ])

    const wrapper = createWrapper({ documentId: DOC_ID })
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('document-attachments:list', { documentId: DOC_ID })

    const items = wrapper.findAll('.annexe-tab__item')
    expect(items).toHaveLength(2)
    const names = items.map(el => el.find('.annexe-tab__item-name').text())
    expect(names).toContain('Photo pied.png')
    expect(names).toContain('Compte rendu labo.pdf')

    // image attachment → thumbnail fetched via document-attachments:get
    expect(mockIpcInvoke).toHaveBeenCalledWith('document-attachments:get', 1)
    const thumbImg = wrapper.find('.annexe-tab__thumb-img')
    expect(thumbImg.exists()).toBe(true)
    expect(thumbImg.attributes('src')).toBe(IMG_DATA_URI)

    // PDF attachment → Document icon, non-image meta line
    const pdfItem = items.find(el => el.text().includes('Compte rendu labo.pdf'))!
    expect(pdfItem.find('.icon-document').exists()).toBe(true)
    expect(pdfItem.find('.annexe-tab__item-meta').text()).toContain('application/pdf')

    // description rendered on the image item
    const imgItem = items.find(el => el.text().includes('Photo pied.png'))!
    expect(imgItem.find('.annexe-tab__item-desc').text()).toBe('Plaie du pied gauche')
  })

  it('calls document-attachments:get with the raw attachment id (B2 contract)', async () => {
    mockListResponse([createAttachment({ id: 1 })])

    createWrapper({ documentId: DOC_ID })
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('document-attachments:get', 1)
    expect(mockIpcInvoke).not.toHaveBeenCalledWith('document-attachments:get', { id: 1 })
  })

  it('shows the empty state when the document has no attachments', async () => {
    mockListResponse([])

    const wrapper = createWrapper({ documentId: DOC_ID })
    await flushPromises()

    expect(wrapper.find('.annexe-tab__empty').text()).toBe('Aucune pièce jointe.')
    expect(wrapper.find('.annexe-tab__item').exists()).toBe(false)
  })

  it('uploads a selected file via document-attachments:create with the full payload', async () => {
    mockListResponse([])
    const created = createAttachment({ id: 10, display_name: 'Photo du pied', file_name: 'photo.png' })
    mockIpcInvoke.mockImplementation((channel: string) => {
      if (channel === 'document-attachments:list') return Promise.resolve([])
      if (channel === 'document-attachments:create') return Promise.resolve(created)
      return Promise.resolve(null)
    })
    stubFileReader()
    const { ElMessage } = await import('element-plus')

    const wrapper = createWrapper({ documentId: DOC_ID })
    await flushPromises()

    // the add dialog opens from the toolbar button and hosts the file input
    await wrapper.find('.annexe-tab__add .el-button').trigger('click')
    await flushPromises()
    expect(wrapper.find('.el-dialog').exists()).toBe(true)

    const input = wrapper.find('.annexe-tab__add-body input[type="file"]')
    expect(input.attributes('accept')).toBe('image/*,.pdf')
    const file = new File(['content'], 'photo.png', { type: 'image/png' })
    await pickFileInAddDialog(wrapper, file)

    // name + description filled in the dialog form
    await wrapper.find('.annexe-tab__add-body .el-input').setValue('Photo du pied')
    await wrapper.find('.annexe-tab__add-body .rich-editor-input').setValue('<p>Plaie du pied gauche</p>')

    await addFooterButton(wrapper, 'Ajouter').trigger('click')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('document-attachments:create', {
      document_id: DOC_ID,
      display_name: 'Photo du pied',
      file_name: 'photo.png',
      mime_type: 'image/png',
      file_size: 7,
      file_data: 'data:image/png;base64,ZmFrZQ==',
      description: '<p>Plaie du pied gauche</p>',
    })
    expect(ElMessage.success).toHaveBeenCalledWith('Pièce jointe ajoutée')
    // dialog closes on success and the created attachment appears in the list
    expect(wrapper.find('.el-dialog').exists()).toBe(false)
    expect(wrapper.find('.annexe-tab__item-name').text()).toBe('Photo du pied')
  })

  it('disables the Ajouter button until a file is selected', async () => {
    mockListResponse([])
    stubFileReader()

    const wrapper = createWrapper({ documentId: DOC_ID })
    await flushPromises()

    await wrapper.find('.annexe-tab__add .el-button').trigger('click')
    await flushPromises()

    const submit = addFooterButton(wrapper, 'Ajouter')
    expect(submit.attributes('disabled')).toBeDefined()

    const file = new File(['content'], 'photo.png', { type: 'image/png' })
    await pickFileInAddDialog(wrapper, file)

    // selected file info is shown and the submit button becomes enabled
    expect(wrapper.find('.annexe-tab__add-file-info').exists()).toBe(true)
    expect(wrapper.find('.annexe-tab__add-file-name').text()).toBe('photo.png')
    expect(wrapper.find('.annexe-tab__add-file-detail').text()).toContain('image/png')
    expect(addFooterButton(wrapper, 'Ajouter').attributes('disabled')).toBeUndefined()
  })

  it('falls back to the file name as display_name when the name input is empty', async () => {
    mockListResponse([])
    const created = createAttachment({ id: 10, display_name: 'photo.png', file_name: 'photo.png' })
    mockIpcInvoke.mockImplementation((channel: string) => {
      if (channel === 'document-attachments:list') return Promise.resolve([])
      if (channel === 'document-attachments:create') return Promise.resolve(created)
      return Promise.resolve(null)
    })
    stubFileReader()

    const wrapper = createWrapper({ documentId: DOC_ID })
    await flushPromises()

    await wrapper.find('.annexe-tab__add .el-button').trigger('click')
    await flushPromises()

    const file = new File(['content'], 'photo.png', { type: 'image/png' })
    await pickFileInAddDialog(wrapper, file)

    // name left empty → display_name falls back to file.name
    await addFooterButton(wrapper, 'Ajouter').trigger('click')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('document-attachments:create', expect.objectContaining({
      display_name: 'photo.png',
    }))
  })

  it('uses the trimmed entered name as display_name when the name input is filled', async () => {
    mockListResponse([])
    const created = createAttachment({ id: 10, display_name: 'Photo du pied', file_name: 'photo.png' })
    mockIpcInvoke.mockImplementation((channel: string) => {
      if (channel === 'document-attachments:list') return Promise.resolve([])
      if (channel === 'document-attachments:create') return Promise.resolve(created)
      return Promise.resolve(null)
    })
    stubFileReader()

    const wrapper = createWrapper({ documentId: DOC_ID })
    await flushPromises()

    await wrapper.find('.annexe-tab__add .el-button').trigger('click')
    await flushPromises()

    const file = new File(['content'], 'photo.png', { type: 'image/png' })
    await pickFileInAddDialog(wrapper, file)

    await wrapper.find('.annexe-tab__add-body .el-input').setValue('  Photo du pied  ')
    await addFooterButton(wrapper, 'Ajouter').trigger('click')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('document-attachments:create', expect.objectContaining({
      display_name: 'Photo du pied',
    }))
  })

  it('closes the add dialog and resets the form when Annuler is clicked', async () => {
    mockListResponse([])
    stubFileReader()

    const wrapper = createWrapper({ documentId: DOC_ID })
    await flushPromises()

    await wrapper.find('.annexe-tab__add .el-button').trigger('click')
    await flushPromises()

    const file = new File(['content'], 'photo.png', { type: 'image/png' })
    await pickFileInAddDialog(wrapper, file)
    await wrapper.find('.annexe-tab__add-body .el-input').setValue('Photo du pied')

    await addFooterButton(wrapper, 'Annuler').trigger('click')
    await flushPromises()

    expect(wrapper.find('.el-dialog').exists()).toBe(false)
    expect(mockIpcInvoke).not.toHaveBeenCalledWith('document-attachments:create', expect.anything())

    // reopening the dialog shows a reset form
    await wrapper.find('.annexe-tab__add .el-button').trigger('click')
    await flushPromises()
    expect(wrapper.find('.annexe-tab__add-body .el-input').attributes('value')).toBe('')
    expect(wrapper.find('.annexe-tab__add-file-info').exists()).toBe(false)
    expect(addFooterButton(wrapper, 'Ajouter').attributes('disabled')).toBeDefined()
  })

  it('does not call document-attachments:create when the file is over 10 MB', async () => {
    mockListResponse([])
    mockIpcInvoke.mockImplementation((channel: string) => {
      if (channel === 'document-attachments:list') return Promise.resolve([])
      return Promise.resolve(null)
    })
    const { ElMessage } = await import('element-plus')

    const wrapper = createWrapper({ documentId: DOC_ID })
    await flushPromises()

    await wrapper.find('.annexe-tab__add .el-button').trigger('click')
    await flushPromises()

    // image > 10 MB: the type check passes first, the size check then rejects
    const bigFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'huge.png', { type: 'image/png' })
    await pickFileInAddDialog(wrapper, bigFile)

    expect(mockIpcInvoke).not.toHaveBeenCalledWith('document-attachments:create', expect.anything())
    expect(ElMessage.error).toHaveBeenCalledWith('Le fichier ne doit pas dépasser 10 Mo')
    // rejected file is not selected → submit stays disabled
    expect(addFooterButton(wrapper, 'Ajouter').attributes('disabled')).toBeDefined()
  })

  it('rejects an unsupported file type without calling document-attachments:create', async () => {
    mockListResponse([])
    mockIpcInvoke.mockImplementation((channel: string) => {
      if (channel === 'document-attachments:list') return Promise.resolve([])
      return Promise.resolve(null)
    })
    const { ElMessage } = await import('element-plus')

    const wrapper = createWrapper({ documentId: DOC_ID })
    await flushPromises()

    await wrapper.find('.annexe-tab__add .el-button').trigger('click')
    await flushPromises()

    const txtFile = new File(['note'], 'note.txt', { type: 'text/plain' })
    await pickFileInAddDialog(wrapper, txtFile)

    expect(ElMessage.error).toHaveBeenCalledWith('Type de fichier non pris en charge (image ou PDF)')
    expect(mockIpcInvoke).not.toHaveBeenCalledWith('document-attachments:create', expect.anything())
    // rejected file is not selected → submit stays disabled
    expect(addFooterButton(wrapper, 'Ajouter').attributes('disabled')).toBeDefined()
  })

  it('saves the rich description after the debounce delay', async () => {
    mockListResponse([
      createAttachment({ id: 1, description: 'Avant traitement' }),
    ])

    const wrapper = createWrapper({ documentId: DOC_ID })
    await flushPromises()

    await wrapper.find('.annexe-tab__thumb').trigger('click')
    await flushPromises()
    expect(wrapper.find('.el-dialog').exists()).toBe(true)

    await wrapper.find('.rich-editor-input').setValue('<p>Après <strong>traitement</strong> — guérison</p>')
    // debounce (600 ms) not elapsed yet
    expect(mockIpcInvoke).not.toHaveBeenCalledWith('document-attachments:update', expect.anything())

    await new Promise(r => setTimeout(r, 650))
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('document-attachments:update', {
      id: 1,
      description: '<p>Après <strong>traitement</strong> — guérison</p>',
    })
  })

  it('does not call document-attachments:update when the description is unchanged', async () => {
    mockListResponse([
      createAttachment({ id: 1, description: '<p>Avant traitement</p>' }),
    ])

    const wrapper = createWrapper({ documentId: DOC_ID })
    await flushPromises()

    await wrapper.find('.annexe-tab__thumb').trigger('click')
    await flushPromises()

    await wrapper.find('.rich-editor-input').setValue('<p>Avant traitement</p>')
    await new Promise(r => setTimeout(r, 650))
    await flushPromises()

    expect(mockIpcInvoke).not.toHaveBeenCalledWith('document-attachments:update', expect.anything())
  })

  it('flushes the pending description save when the dialog closes', async () => {
    mockListResponse([
      createAttachment({ id: 1, description: 'Avant traitement' }),
    ])

    const wrapper = createWrapper({ documentId: DOC_ID })
    await flushPromises()

    await wrapper.find('.annexe-tab__thumb').trigger('click')
    await flushPromises()

    await wrapper.find('.rich-editor-input').setValue('<p>Après traitement</p>')
    // dialog closes before the 600 ms debounce elapses → pending save is flushed
    await wrapper.findComponent({ name: 'ElDialog' }).vm.$emit('closed')
    await flushPromises()

    expect(mockIpcInvoke).toHaveBeenCalledWith('document-attachments:update', {
      id: 1,
      description: '<p>Après traitement</p>',
    })
  })

  it('deletes an attachment after confirmation via document-attachments:delete', async () => {
    mockListResponse([
      createAttachment({ id: 1 }),
      createAttachment({ id: 2, display_name: 'Autre.pdf', file_name: 'autre.pdf', mime_type: 'application/pdf', description: null }),
    ])

    const wrapper = createWrapper({ documentId: DOC_ID })
    await flushPromises()
    expect(wrapper.findAll('.annexe-tab__item')).toHaveLength(2)

    await wrapper.findAll('.annexe-tab__item')[0].find('.el-button').trigger('click')
    await flushPromises()

    expect(mockConfirm).toHaveBeenCalled()
    expect(mockIpcInvoke).toHaveBeenCalledWith('document-attachments:delete', 1)

    // item removed from the list
    const names = wrapper.findAll('.annexe-tab__item-name').map(el => el.text())
    expect(names).not.toContain('Photo pied.png')
    expect(names).toContain('Autre.pdf')
  })

  it('does not delete when the confirmation is cancelled', async () => {
    mockListResponse([createAttachment({ id: 1 })])
    mockConfirm.mockRejectedValue('cancel')

    const wrapper = createWrapper({ documentId: DOC_ID })
    await flushPromises()

    await wrapper.find('.annexe-tab__item .el-button').trigger('click')
    await flushPromises()

    expect(mockIpcInvoke).not.toHaveBeenCalledWith('document-attachments:delete', expect.anything())
    expect(wrapper.findAll('.annexe-tab__item')).toHaveLength(1)
  })

  it('hides add/delete controls and the editable description when readonly', async () => {
    mockListResponse([
      createAttachment({ id: 1, description: 'Image lue seule' }),
    ])

    const wrapper = createWrapper({ documentId: DOC_ID, readonly: true })
    await flushPromises()

    // list still loads in readonly mode
    expect(wrapper.findAll('.annexe-tab__item')).toHaveLength(1)
    // no add button, no delete button
    expect(wrapper.find('.annexe-tab__add').exists()).toBe(false)
    expect(wrapper.find('.annexe-tab__item .el-button').exists()).toBe(false)

    // preview dialog shows the description as read-only rich text, not an editor
    await wrapper.find('.annexe-tab__thumb').trigger('click')
    await flushPromises()
    expect(wrapper.find('.el-dialog').exists()).toBe(true)
    expect(wrapper.find('.rich-editor-input').exists()).toBe(false)
    expect(wrapper.find('.annexe-tab__preview-desc').text()).toBe('Image lue seule')
    expect(mockIpcInvoke).not.toHaveBeenCalledWith('document-attachments:update', expect.anything())
  })

  it('uses the Paperclip icon for non-image, non-PDF attachments', async () => {
    mockListResponse([
      createAttachment({ id: 1, display_name: 'note.txt', file_name: 'note.txt', mime_type: 'text/plain', description: null }),
    ])

    const wrapper = createWrapper({ documentId: DOC_ID })
    await flushPromises()

    expect(wrapper.find('.annexe-tab__item-icon .icon-paperclip').exists()).toBe(true)
    expect(wrapper.find('.annexe-tab__thumb').exists()).toBe(false)
  })

  it('opens a file preview for non-image attachments without fetching the file', async () => {
    mockListResponse([
      createAttachment({ id: 1, display_name: 'Compte rendu labo.pdf', file_name: 'cr-labo.pdf', mime_type: 'application/pdf', file_size: 2048, description: null }),
    ])

    const wrapper = createWrapper({ documentId: DOC_ID })
    await flushPromises()

    await wrapper.find('.annexe-tab__item-icon').trigger('click')
    await flushPromises()

    expect(wrapper.find('.el-dialog').exists()).toBe(true)
    expect(wrapper.find('.annexe-tab__preview-file').exists()).toBe(true)
    expect(wrapper.find('.annexe-tab__preview-file-name').text()).toBe('Compte rendu labo.pdf')
    expect(wrapper.find('.annexe-tab__preview-file-meta').text()).toContain('application/pdf')
    expect(wrapper.find('.annexe-tab__preview-file-icon .icon-document').exists()).toBe(true)
    // no image and no get call for a non-image attachment
    expect(wrapper.find('.annexe-tab__preview-img').exists()).toBe(false)
    expect(mockIpcInvoke).not.toHaveBeenCalledWith('document-attachments:get', expect.anything())
    // description stays editable when canManage
    expect(wrapper.find('.rich-editor-input').exists()).toBe(true)
  })

  it('emits change after a successful upload', async () => {
    mockIpcInvoke.mockImplementation((channel: string) => {
      if (channel === 'document-attachments:list') return Promise.resolve([])
      if (channel === 'document-attachments:create') {
        return Promise.resolve(createAttachment({ id: 10, display_name: 'photo.png', file_name: 'photo.png' }))
      }
      return Promise.resolve(null)
    })
    stubFileReader()
    const { ElMessage } = await import('element-plus')

    const wrapper = createWrapper({ documentId: DOC_ID })
    await flushPromises()

    await wrapper.find('.annexe-tab__add .el-button').trigger('click')
    await flushPromises()

    const file = new File(['content'], 'photo.png', { type: 'image/png' })
    await pickFileInAddDialog(wrapper, file)
    await nextTick()
    await flushPromises()

    await addFooterButton(wrapper, 'Ajouter').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('change')).toBeTruthy()
    expect(ElMessage.success).toHaveBeenCalledWith('Pièce jointe ajoutée')
    // dialog closes after success
    expect(wrapper.find('.el-dialog').exists()).toBe(false)
  })
})
