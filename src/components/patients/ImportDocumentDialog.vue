<template>
  <el-dialog
    :model-value="visible"
    title="Importer un document"
    width="560px"
    :close-on-click-modal="false"
    @update:model-value="onDialogUpdate"
    @closed="onClosed"
  >
    <!-- Document Type Selector -->
    <el-form label-position="top" class="import-form">
      <el-form-item label="Type de document" required>
        <el-select
          v-model="selectedTypeId"
          placeholder="Sélectionnez un type de document"
          style="width: 100%"
          :disabled="disabled"
          filterable
        >
          <el-option
            v-for="dt in documentTypes"
            :key="dt.id"
            :label="dt.label"
            :value="dt.id"
          >
            <span class="import-dialog__type-option">
              <span
                class="import-dialog__type-dot"
                :style="{ background: categoryColor(dt.category) }"
              />
              <span class="import-dialog__type-label">{{ dt.label }}</span>
              <span v-if="dt.description" class="import-dialog__type-desc">
                {{ dt.description }}
              </span>
            </span>
          </el-option>
          <el-option
            v-if="documentTypes.length === 0"
            disabled
            label="Aucun type disponible"
            value=""
          />
        </el-select>
      </el-form-item>
    </el-form>

    <!-- Drop Zone -->
    <div
      class="import-dialog__dropzone"
      :class="{
        'import-dialog__dropzone--active': isDragOver,
        'import-dialog__dropzone--has-file': !!selectedFile,
        'import-dialog__dropzone--disabled': disabled,
      }"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
      @click="triggerFileInput"
    >
      <!-- No file selected: show upload prompt -->
      <template v-if="!selectedFile">
        <el-icon class="import-dialog__dropzone-icon" :size="48">
          <UploadFilled />
        </el-icon>
        <p class="import-dialog__dropzone-text">
          Glissez un fichier ici ou cliquez pour sélectionner
        </p>
        <p class="import-dialog__dropzone-hint">
          PDF, images (JPG, PNG, GIF, WebP), documents (DOC, DOCX) — max 20 Mo
        </p>
      </template>

      <!-- File selected: show preview/info -->
      <template v-else>
        <div class="import-dialog__file-info">
          <div class="import-dialog__file-preview">
            <img
              v-if="isImage && previewUrl"
              :src="previewUrl"
              alt="Aperçu"
              class="import-dialog__file-thumbnail"
            />
            <div v-else class="import-dialog__file-icon-wrapper">
              <el-icon
                :size="40"
                :color="selectedFile.type === 'application/pdf' ? 'var(--el-color-danger)' : 'var(--el-color-primary)'"
              >
                <Document />
              </el-icon>
            </div>
          </div>

          <div class="import-dialog__file-details">
            <span class="import-dialog__file-name">{{ selectedFile.name }}</span>
            <span class="import-dialog__file-meta">
              {{ formatFileSize(selectedFile.size) }} · {{ fileExtension.toUpperCase() }}
            </span>
          </div>

          <el-button
            type="danger"
            text
            :icon="Delete"
            circle
            class="import-dialog__file-remove"
            title="Supprimer le fichier"
            @click.stop="removeFile"
          />
        </div>
      </template>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      class="import-dialog__hidden-input"
      :accept="acceptTypes"
      @change="onFileInputChange"
    />

    <template #footer>
      <el-button @click="onCancel" :disabled="importing">Annuler</el-button>
      <el-button
        type="primary"
        :disabled="!canImport || disabled"
        :loading="importing"
        @click="onImport"
      >
        Importer
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { UploadFilled, Document, Delete } from '@element-plus/icons-vue'
import type { ClinicalDocumentTypeDTO } from '@/composables/useClinicalDocuments'

const props = defineProps<{
  visible: boolean
  documentTypes: ClinicalDocumentTypeDTO[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  import: [data: { file: File; documentTypeId: string; title: string }]
}>()

// ─── State ───────────────────────────────────────────────────────────────────

const selectedTypeId = ref<string>('')
const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const isDragOver = ref(false)
const importing = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// ─── Constants ───────────────────────────────────────────────────────────────

const acceptTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',')

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

// ─── Computed ────────────────────────────────────────────────────────────────

const isImage = computed(() => {
  return selectedFile.value ? IMAGE_MIME_TYPES.has(selectedFile.value.type) : false
})

const fileExtension = computed(() => {
  if (!selectedFile.value) return ''
  const name = selectedFile.value.name
  const dotIndex = name.lastIndexOf('.')
  return dotIndex >= 0 ? name.slice(dotIndex + 1) : ''
})

const canImport = computed(() => {
  return !!selectedFile.value && !!selectedTypeId.value
})

// ─── Category color (matches ClinicalDocList.vue) ────────────────────────────

function categoryColor(category?: string): string {
  const colors: Record<string, string> = {
    consultation: 'var(--el-color-primary)',
    lab: 'var(--el-color-success)',
    delivery: 'var(--el-color-danger)',
  }
  return colors[category ?? ''] || 'var(--el-color-info)'
}

// ─── File helpers ────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 o'
  const units = ['o', 'Ko', 'Mo', 'Go']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)
  return `${size} ${units[i]}`
}

function isAcceptedFileType(file: File): boolean {
  // Check by MIME type
  if (acceptTypes.split(',').includes(file.type)) return true
  // Fallback: check by extension for cases where MIME might be missing
  const ext = file.name.split('.').pop()?.toLowerCase()
  const extensionMap: Record<string, string[]> = {
    pdf: ['application/pdf'],
    jpg: ['image/jpeg'],
    jpeg: ['image/jpeg'],
    png: ['image/png'],
    gif: ['image/gif'],
    webp: ['image/webp'],
    doc: ['application/msword'],
    docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  }
  const acceptedMimes = extensionMap[ext ?? '']
  return acceptedMimes ? acceptedMimes.includes(file.type) : false
}

function generatePreview(file: File): void {
  cleanupPreview()
  if (IMAGE_MIME_TYPES.has(file.type)) {
    const url = URL.createObjectURL(file)
    previewUrl.value = url
  } else {
    previewUrl.value = null
  }
}

function cleanupPreview(): void {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
}

// ─── Drag & Drop ─────────────────────────────────────────────────────────────

let dragCounter = 0

function onDragEnter(_e: DragEvent): void {
  if (props.disabled) return
  dragCounter++
  isDragOver.value = true
}

function onDragOver(_e: DragEvent): void {
  if (props.disabled) return
  isDragOver.value = true
}

function onDragLeave(_e: DragEvent): void {
  if (props.disabled) return
  dragCounter--
  if (dragCounter <= 0) {
    dragCounter = 0
    isDragOver.value = false
  }
}

function onDrop(e: DragEvent): void {
  if (props.disabled) return
  isDragOver.value = false
  dragCounter = 0
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    handleFileSelection(files[0])
  }
}

// ─── File selection ──────────────────────────────────────────────────────────

function triggerFileInput(): void {
  if (props.disabled) return
  fileInputRef.value?.click()
}

function onFileInputChange(e: Event): void {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (files && files.length > 0) {
    handleFileSelection(files[0])
  }
  // Reset input so re-selecting the same file triggers change
  input.value = ''
}

function handleFileSelection(file: File): void {
  if (!isAcceptedFileType(file)) {
    // eslint-disable-next-line no-alert
    alert('Type de fichier non accepté. Veuillez choisir un PDF, une image ou un document Word.')
    return
  }
  if (file.size > MAX_FILE_SIZE) {
    alert(`Le fichier est trop volumineux. Taille maximale : ${formatFileSize(MAX_FILE_SIZE)}.`)
    return
  }
  selectedFile.value = file
  generatePreview(file)
}

function removeFile(): void {
  selectedFile.value = null
  cleanupPreview()
}

// ─── Dialog actions ──────────────────────────────────────────────────────────

function onDialogUpdate(val: boolean): void {
  emit('update:visible', val)
}

function onCancel(): void {
  emit('update:visible', false)
}

function onClosed(): void {
  resetState()
}

function resetState(): void {
  selectedTypeId.value = ''
  selectedFile.value = null
  cleanupPreview()
  isDragOver.value = false
  dragCounter = 0
}

function onImport(): void {
  if (!selectedFile.value || !selectedTypeId.value) return
  importing.value = true
  try {
    const selectedType = props.documentTypes.find(dt => dt.id === selectedTypeId.value)
    emit('import', {
      file: selectedFile.value,
      documentTypeId: selectedTypeId.value,
      title: selectedType?.label || selectedFile.value.name,
    })
    emit('update:visible', false)
  } finally {
    importing.value = false
  }
}

// ─── Watch for external visible reset ────────────────────────────────────────

watch(
  () => props.visible,
  (val) => {
    if (val) {
      // Opening — ensure clean state
      resetState()
    }
  },
)
</script>

<style scoped lang="scss">
.import-form {
  margin-bottom: 8px;
}

.import-dialog__type-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.import-dialog__type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.import-dialog__type-label {
  font-weight: 500;
}

.import-dialog__type-desc {
  margin-left: auto;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// ─── Drop Zone ───────────────────────────────────────────────────────────────

.import-dialog__dropzone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  padding: 24px;
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(&--disabled) {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &--active {
    border-color: var(--el-color-primary) !important;
    background: var(--el-color-primary-light-9) !important;
    transform: scale(1.01);
  }

  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.import-dialog__dropzone-icon {
  color: var(--el-color-primary);
  margin-bottom: 8px;
}

.import-dialog__dropzone-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  margin: 0 0 4px;
}

.import-dialog__dropzone-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

// ─── File Info (after selection) ─────────────────────────────────────────────

.import-dialog__file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.import-dialog__file-preview {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-darker, var(--el-fill-color));
  border: 1px solid var(--el-border-color-lighter);
}

.import-dialog__file-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.import-dialog__file-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.import-dialog__file-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.import-dialog__file-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.import-dialog__file-meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.import-dialog__file-remove {
  flex-shrink: 0;
}

// ─── Hidden file input ───────────────────────────────────────────────────────

.import-dialog__hidden-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}
</style>
