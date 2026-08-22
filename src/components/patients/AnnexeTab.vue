<template>
  <div class="annexe-tab">
    <template v-if="documentId != null">
      <div v-if="canManage" class="annexe-tab__add">
        <el-button size="small" @click="openAddDialog">
          Ajouter une pièce jointe
        </el-button>
      </div>

      <div v-if="loading" class="annexe-tab__loading">Chargement...</div>

      <div v-if="attachments.length === 0 && !loading" class="annexe-tab__empty">
        Aucune pièce jointe.
      </div>

      <div v-for="att in attachments" :key="att.id" class="annexe-tab__item">
        <div class="annexe-tab__item-info">
          <button
            v-if="isImage(att)"
            type="button"
            class="annexe-tab__thumb"
            :title="att.display_name"
            @click="openPreview(att)"
          >
            <img
              v-if="thumbnails.get(att.id)"
              :src="thumbnails.get(att.id)"
              :alt="att.display_name"
              class="annexe-tab__thumb-img"
            />
            <el-icon v-else class="annexe-tab__thumb-placeholder">
              <PictureFilled />
            </el-icon>
          </button>
          <button
            v-else
            type="button"
            class="annexe-tab__item-icon"
            :title="att.display_name"
            @click="openPreview(att)"
          >
            <el-icon>
              <Document v-if="att.mime_type?.includes('pdf')" />
              <Paperclip v-else />
            </el-icon>
          </button>
          <div class="annexe-tab__item-body">
            <div class="annexe-tab__item-name">{{ att.display_name }}</div>
            <div class="annexe-tab__item-meta">{{ mimeLabel(att) }}</div>
            <div
              v-if="!isRichTextEmpty(att.description)"
              class="annexe-tab__item-desc annexe-tab__rich"
              v-html="att.description"
            />
          </div>
        </div>
        <el-button
          v-if="canManage"
          text
          type="danger"
          size="small"
          @click="handleRemove(att.id)"
        >
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </template>
    <div v-else class="annexe-tab__disabled-message">
      Enregistrez d'abord le document
    </div>

    <el-dialog
      v-model="previewOpen"
      :title="previewTitle"
      width="640px"
      :close-on-click-modal="false"
      @closed="flushPreviewDescriptionSave"
    >
      <div class="annexe-tab__preview-body">
        <template v-if="previewIsImage">
          <img
            v-if="previewImgSrc"
            :src="previewImgSrc"
            :alt="previewTitle"
            class="annexe-tab__preview-img"
          />
          <div v-else class="annexe-tab__preview-loading">Chargement de l'image...</div>
        </template>
        <div v-else-if="previewAttachment" class="annexe-tab__preview-file">
          <el-icon class="annexe-tab__preview-file-icon">
            <Document v-if="previewAttachment.mime_type?.includes('pdf')" />
            <Paperclip v-else />
          </el-icon>
          <div class="annexe-tab__preview-file-name">{{ previewAttachment.display_name }}</div>
          <div class="annexe-tab__preview-file-meta">{{ mimeLabel(previewAttachment) }}</div>
        </div>
        <RichTextEditor
          v-if="canManage"
          v-model="previewDescription"
          :readonly="!canManage"
          :rows="4"
          placeholder="Description…"
          @change="savePreviewDescription"
        />
        <div
          v-else-if="!isRichTextEmpty(previewAttachment?.description)"
          class="annexe-tab__preview-desc annexe-tab__rich"
          v-html="previewAttachment?.description"
        />
      </div>
    </el-dialog>

    <el-dialog
      v-model="addOpen"
      title="Ajouter une pièce jointe"
      width="640px"
      :close-on-click-modal="false"
      @closed="resetAddForm"
    >
      <div class="annexe-tab__add-body">
        <div class="annexe-tab__add-file">
          <el-button size="small" @click="triggerAddFileInput">
            Choisir un fichier
          </el-button>
          <input
            ref="addFileInputRef"
            type="file"
            accept="image/*,.pdf"
            style="display: none"
            @change="onAddFileSelected"
          />
          <div v-if="addFile" class="annexe-tab__add-file-info">
            <img
              v-if="isImageFile(addFile)"
              :src="addFileData"
              :alt="addFile.name"
              class="annexe-tab__add-file-thumb"
            />
            <div class="annexe-tab__add-file-meta">
              <div class="annexe-tab__add-file-name">{{ addFile.name }}</div>
              <div class="annexe-tab__add-file-detail">{{ addFileDetail }}</div>
            </div>
          </div>
        </div>
        <el-input v-model="addName" placeholder="Nom de la pièce…" />
        <RichTextEditor v-model="addDescription" :rows="4" placeholder="Description…" />
      </div>
      <template #footer>
        <el-button size="small" @click="closeAddDialog">Annuler</el-button>
        <el-button
          size="small"
          type="primary"
          :loading="adding"
          :disabled="!addFile || !addFileData"
          @click="submitAddAttachment"
        >
          Ajouter
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, PictureFilled, Document, Paperclip } from '@element-plus/icons-vue'
import { useDocumentAttachments, type DocumentAttachment } from '@/composables/useDocumentAttachments'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import { isRichTextEmpty } from '@/utils/rich-text'

const props = defineProps<{
  documentId: string | null
  readonly?: boolean
}>()

const emit = defineEmits<{
  change: []
}>()

const {
  attachments,
  loading,
  loadAttachments,
  addAttachment,
  updateDescription,
  removeAttachment,
  getAttachmentFile,
  reset,
} = useDocumentAttachments()

const canManage = computed(() => props.documentId != null && !props.readonly)

const adding = ref(false)
const thumbnails = ref<Map<number, string>>(new Map())

const previewOpen = ref(false)
const previewId = ref<number | null>(null)
const previewImgSrc = ref('')
const previewDescription = ref('')

const addOpen = ref(false)
const addFileInputRef = ref<HTMLInputElement | null>()
const addFile = ref<File | null>(null)
const addFileData = ref('')
const addName = ref('')
const addDescription = ref('')

const previewAttachment = computed(() => {
  return attachments.value.find(a => a.id === previewId.value) ?? null
})

const previewTitle = computed(() => previewAttachment.value?.display_name ?? '')

const previewIsImage = computed(() => previewAttachment.value != null && isImage(previewAttachment.value))

const addFileDetail = computed(() => {
  const file = addFile.value
  if (!file) return ''
  const type = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream')
  return [type, formatSize(file.size)].filter(Boolean).join(' · ')
})

function isImage(att: DocumentAttachment | null): boolean {
  return att?.mime_type?.startsWith('image/') ?? false
}

function isImageFile(file: File | null): boolean {
  if (!file) return false
  return file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(file.name)
}

function isValidAttachmentFile(file: File): boolean {
  if (file.type === 'application/pdf' || file.type.startsWith('image/')) return true
  return /\.(png|jpe?g|gif|webp|bmp|svg|avif|pdf)$/i.test(file.name)
}

watch(() => props.documentId, async (id) => {
  if (id == null) {
    reset()
    thumbnails.value = new Map()
    return
  }
  await loadAttachments(id, true)
  for (const att of attachments.value) {
    if (isImage(att)) loadThumbnail(att.id)
  }
}, { immediate: true })

async function loadThumbnail(id: number) {
  if (thumbnails.value.has(id)) return
  const data = await getAttachmentFile(id)
  if (data) thumbnails.value.set(id, data)
}

function openAddDialog() {
  addOpen.value = true
}

function closeAddDialog() {
  addOpen.value = false
  resetAddForm()
}

function resetAddForm() {
  addFile.value = null
  addFileData.value = ''
  addName.value = ''
  addDescription.value = ''
}

function triggerAddFileInput() {
  addFileInputRef.value?.click()
}

function onAddFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return

  if (!isValidAttachmentFile(file)) {
    ElMessage.error('Type de fichier non pris en charge (image ou PDF)')
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('Le fichier ne doit pas dépasser 10 Mo')
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    if (addFile.value === file) {
      addFileData.value = reader.result as string
    }
  }
  addFile.value = file
  addFileData.value = ''
  reader.readAsDataURL(file)
}

async function submitAddAttachment() {
  const docId = props.documentId
  const file = addFile.value
  if (docId == null || !file || !addFileData.value) return

  adding.value = true
  const ok = await addAttachment({
    document_id: docId,
    display_name: addName.value.trim() || file.name,
    file_name: file.name,
    mime_type: file.type || 'application/octet-stream',
    file_size: file.size,
    file_data: addFileData.value,
    description: addDescription.value,
  })
  adding.value = false
  if (ok) {
    ElMessage.success('Pièce jointe ajoutée')
    emit('change')
    closeAddDialog()
  } else {
    ElMessage.error("Erreur lors de l'ajout")
  }
}

async function openPreview(att: DocumentAttachment) {
  previewId.value = att.id
  previewDescription.value = att.description ?? ''
  previewImgSrc.value = ''
  if (isImage(att)) {
    const cached = thumbnails.value.get(att.id)
    previewImgSrc.value = cached ?? await getAttachmentFile(att.id) ?? ''
  }
  previewOpen.value = true
}

let previewSaveTimer: ReturnType<typeof setTimeout> | null = null

function savePreviewDescription() {
  if (previewSaveTimer) clearTimeout(previewSaveTimer)
  previewSaveTimer = setTimeout(() => {
    previewSaveTimer = null
    void persistPreviewDescription()
  }, 600)
}

function flushPreviewDescriptionSave() {
  if (previewSaveTimer) {
    clearTimeout(previewSaveTimer)
    previewSaveTimer = null
    void persistPreviewDescription()
  }
}

async function persistPreviewDescription() {
  if (previewId.value == null) return
  const att = attachments.value.find(a => a.id === previewId.value)
  if (!att) return
  const next = previewDescription.value
  if (next === (att.description ?? '')) return
  const ok = await updateDescription(att.id, next)
  if (ok) {
    ElMessage.success('Description enregistrée')
    emit('change')
  }
}

onUnmounted(() => {
  if (previewSaveTimer) {
    clearTimeout(previewSaveTimer)
    previewSaveTimer = null
  }
})

async function handleRemove(id: number) {
  try {
    await ElMessageBox.confirm('Supprimer cette pièce jointe ?', 'Confirmation', {
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      type: 'warning',
    })
    const ok = await removeAttachment(id)
    if (ok) {
      ElMessage.success('Pièce jointe supprimée')
      thumbnails.value.delete(id)
      emit('change')
    }
  } catch {
    // Annulation ou erreur
  }
}

function mimeLabel(att: DocumentAttachment): string {
  return [att.mime_type, formatSize(att.file_size)].filter(Boolean).join(' · ')
}

function formatSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
</script>

<style scoped>
.annexe-tab {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafafa;
}
.annexe-tab__add {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.annexe-tab__loading,
.annexe-tab__empty {
  font-size: 13px;
  color: #999;
  padding: 12px 0;
  text-align: center;
}
.annexe-tab__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}
.annexe-tab__item:last-child {
  border-bottom: none;
}
.annexe-tab__item-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.annexe-tab__item-body {
  min-width: 0;
}
.annexe-tab__item-icon {
  font-size: 20px;
  flex-shrink: 0;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  color: #666;
}
.annexe-tab__thumb {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #fff;
  padding: 0;
  cursor: zoom-in;
  overflow: hidden;
}
.annexe-tab__thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.annexe-tab__thumb-placeholder {
  font-size: 22px;
  color: #c0c4cc;
}
.annexe-tab__item-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.annexe-tab__item-meta {
  font-size: 11px;
  color: #999;
}
.annexe-tab__item-desc {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}
.annexe-tab__disabled-message {
  font-size: 13px;
  color: #999;
  padding: 12px 0;
  text-align: center;
  font-style: italic;
}
.annexe-tab__preview-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.annexe-tab__preview-img {
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
  margin: 0 auto;
  display: block;
  border-radius: 4px;
}
.annexe-tab__preview-loading {
  font-size: 13px;
  color: #999;
  padding: 24px 0;
  text-align: center;
}
.annexe-tab__preview-desc {
  font-size: 13px;
  color: #333;
  margin: 0;
}
.annexe-tab__preview-file {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 0;
  text-align: center;
}
.annexe-tab__preview-file-icon {
  font-size: 40px;
  color: #909399;
}
.annexe-tab__preview-file-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  overflow-wrap: anywhere;
}
.annexe-tab__preview-file-meta {
  font-size: 12px;
  color: #999;
}
.annexe-tab__add-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.annexe-tab__add-file {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.annexe-tab__add-file-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  background: #fff;
  min-width: 0;
}
.annexe-tab__add-file-thumb {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: 4px;
}
.annexe-tab__add-file-meta {
  min-width: 0;
}
.annexe-tab__add-file-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.annexe-tab__add-file-detail {
  font-size: 11px;
  color: #999;
}
.annexe-tab__rich {
  overflow-wrap: anywhere;
}
.annexe-tab__rich :deep(p) {
  margin: 0 0 4px;
}
.annexe-tab__rich :deep(h1),
.annexe-tab__rich :deep(h2),
.annexe-tab__rich :deep(h3) {
  margin: 6px 0 4px;
  font-weight: 700;
}
.annexe-tab__rich :deep(h1) {
  font-size: 14px;
}
.annexe-tab__rich :deep(h2) {
  font-size: 13px;
}
.annexe-tab__rich :deep(h3) {
  font-size: 12px;
}
.annexe-tab__rich :deep(ul),
.annexe-tab__rich :deep(ol) {
  margin: 0 0 4px;
  padding-left: 18px;
}
.annexe-tab__rich :deep(li) {
  margin-bottom: 2px;
}
.annexe-tab__rich :deep(blockquote) {
  border-left: 3px solid #d1d5db;
  margin: 4px 0;
  padding: 2px 8px;
  color: #4b5563;
  font-style: italic;
}
.annexe-tab__rich :deep(pre) {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  padding: 8px;
  font-family: monospace;
  font-size: 11px;
  white-space: pre-wrap;
  margin: 4px 0;
}
.annexe-tab__rich :deep(code) {
  background: #f3f4f6;
  font-family: monospace;
  font-size: 11px;
  padding: 1px 3px;
}
.annexe-tab__rich :deep(hr) {
  border: none;
  border-top: 1px solid #d1d5db;
  margin: 6px 0;
}
.annexe-tab__rich :deep(img) {
  max-width: 100%;
  height: auto;
}
.annexe-tab__rich :deep(img.is-left) {
  float: left;
  margin: 0 12px 6px 0;
  max-width: 45%;
}
.annexe-tab__rich :deep(img.is-right) {
  float: right;
  margin: 0 0 6px 12px;
  max-width: 45%;
}
.annexe-tab__rich :deep(img.is-center) {
  display: block;
  margin: 6px auto;
}
.annexe-tab__rich :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}
</style>
