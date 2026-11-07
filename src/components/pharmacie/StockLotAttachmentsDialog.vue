<template>
  <el-dialog
    v-model="visible"
    title="Pièces jointes du lot"
    width="640px"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <div
      v-if="lot"
      class="cde-summary-lines lot-attachments__meta"
    >
      <div class="cde-kv">
        <span class="cde-kv__label">Lot</span>
        <span class="cde-kv__value">{{ lot.numeroLot || `#${lot.id}` }}</span>
      </div>
      <div class="cde-kv">
        <span class="cde-kv__label">Réf. BL</span>
        <span class="cde-kv__value">{{ lot.refBl || '—' }}</span>
      </div>
    </div>

    <el-alert
      v-if="error"
      class="cde-alert cde-alert--danger"
      type="error"
      :closable="false"
      show-icon
      :title="error"
    />

    <div class="lot-attachments__toolbar">
      <input
        ref="fileInputRef"
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp"
        class="lot-attachments__input"
        @change="onFileChange"
      >
      <el-button
        size="small"
        :icon="Upload"
        @click="triggerFileInput"
      >
        Choisir un fichier
      </el-button>
      <span
        v-if="selectedFile"
        class="lot-attachments__file"
      >
        {{ selectedFile.name }} ({{ formatSize(selectedFile.size) }})
      </span>
      <el-button
        v-if="selectedFile"
        size="small"
        type="primary"
        :loading="saving"
        @click="upload"
      >
        Ajouter
      </el-button>
    </div>

    <p class="lot-attachments__hint">
      Formats acceptés : PDF, JPEG, PNG, WebP — 10 Mo maximum par fichier.
    </p>

    <el-table
      v-loading="loading"
      :data="attachments"
      size="small"
      style="width: 100%"
      aria-label="Pièces jointes du lot"
    >
      <el-table-column
        label="Fichier"
        min-width="200"
      >
        <template #default="{ row }">
          <span class="lot-attachments__name">{{ row.fileName }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="Type"
        width="130"
      >
        <template #default="{ row }">
          {{ typeLabel(row.fileType) }}
        </template>
      </el-table-column>
      <el-table-column
        label="Taille"
        width="90"
        align="right"
      >
        <template #default="{ row }">
          <span class="cde-num">{{ formatSize(row.fileSize) }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="Ajouté le"
        width="110"
      >
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column
        label="Actions"
        width="150"
        align="right"
      >
        <template #default="{ row }">
          <el-button
            text
            size="small"
            type="primary"
            title="Télécharger la pièce jointe"
            @click="download(row)"
          >
            Télécharger
          </el-button>
          <el-button
            text
            size="small"
            type="danger"
            title="Supprimer la pièce jointe"
            @click="remove(row)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </template>
      </el-table-column>
      <template #empty>
        <div class="cde-empty">
          Aucune pièce jointe pour ce lot.
        </div>
      </template>
    </el-table>

    <template #footer>
      <el-button @click="visible = false">
        Fermer
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Upload } from '@element-plus/icons-vue'
import { formatDate } from '@/utils/date'
import {
  MAX_ATTACHMENT_SIZE,
  readFileAsDataUri,
  useStockLotAttachments,
  validateAttachmentFile,
  type StockLotAttachmentDto,
} from '@/composables/useStockLotAttachments'

/** Lot minimal nécessaire au dialogue. */
export interface AttachmentLotRef {
  id: number
  numeroLot?: string
  refBl?: string
}

const emit = defineEmits<{
  changed: [lotId: number, count: number]
}>()

const {
  attachments,
  loading,
  saving,
  error,
  fetchAttachments,
  downloadAttachment,
  addAttachment,
  removeAttachment,
} = useStockLotAttachments()

const visible = ref(false)
const lot = ref<AttachmentLotRef | null>(null)
const selectedFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

/**
 * Ouvre le dialogue pour un lot.
 *
 * @param target - Lot dont on gère les pièces jointes.
 */
async function open(target: AttachmentLotRef) {
  lot.value = target
  selectedFile.value = null
  visible.value = true
  await load()
}

/** Recharge la liste des pièces jointes du lot courant. */
async function load() {
  if (lot.value == null) return
  await fetchAttachments(lot.value.id)
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

/** Valide et mémorise le fichier sélectionné (lecture différée à l'envoi). */
function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const issue = validateAttachmentFile(file)
  if (issue) {
    ElMessage.error(issue)
    input.value = ''
    selectedFile.value = null
    return
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    ElMessage.error('Le fichier ne doit pas dépasser 10 Mo.')
    input.value = ''
    return
  }
  selectedFile.value = file
}

/** Envoie le fichier sélectionné puis rafraîchit la liste. */
async function upload() {
  if (lot.value == null || selectedFile.value == null) return
  const file = selectedFile.value
  try {
    const fileData = await readFileAsDataUri(file)
    const created = await addAttachment({
      stockLotId: lot.value.id,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileData,
    })
    if (!created) {
      ElMessage.error(error.value || "Ajout de la pièce jointe impossible")
      return
    }
    ElMessage.success('Pièce jointe ajoutée')
    selectedFile.value = null
    if (fileInputRef.value) fileInputRef.value.value = ''
    await load()
    emit('changed', lot.value.id, attachments.value.length)
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

/** Télécharge une pièce jointe via son data URI. */
async function download(row: StockLotAttachmentDto) {
  if (row.id == null || lot.value == null) return
  const full = await downloadAttachment(row.id, lot.value.id)
  if (!full?.fileData) {
    ElMessage.error(error.value || 'Téléchargement impossible')
    return
  }
  const anchor = document.createElement('a')
  anchor.href = full.fileData
  anchor.download = full.fileName || 'piece-jointe'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

/** Supprime une pièce jointe après confirmation. */
async function remove(row: StockLotAttachmentDto) {
  if (row.id == null || lot.value == null) return
  try {
    await ElMessageBox.confirm(
      `Supprimer « ${row.fileName} » ?`,
      'Supprimer la pièce jointe',
      { confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler', type: 'warning' },
    )
  } catch {
    return
  }
  const ok = await removeAttachment(row.id, lot.value.id)
  if (!ok) {
    ElMessage.error(error.value || 'Suppression impossible')
    return
  }
  ElMessage.success('Pièce jointe supprimée')
  await load()
  emit('changed', lot.value.id, attachments.value.length)
}

/**
 * Libellé lisible d'un type MIME de pièce jointe.
 *
 * @param type - Type MIME.
 */
function typeLabel(type: string | undefined): string {
  if (!type) return '—'
  if (type === 'application/pdf') return 'PDF'
  if (type.startsWith('image/')) return type.slice('image/'.length).toUpperCase()
  return type
}

/**
 * Taille lisible en Ko / Mo.
 *
 * @param size - Taille en octets.
 */
function formatSize(size: number | undefined): string {
  if (size == null) return '—'
  if (size < 1024) return `${size} o`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} Ko`
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`
}

function onClosed() {
  lot.value = null
  selectedFile.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

defineExpose({ open })
</script>

<style scoped>
.lot-attachments__meta {
  margin-bottom: 10px;
}

.lot-attachments__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.lot-attachments__input {
  display: none;
}

.lot-attachments__file {
  font-size: 12px;
  color: var(--cde-muted);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lot-attachments__hint {
  margin: 0 0 10px;
  font-size: 11px;
  color: var(--cde-muted);
}

.lot-attachments__name {
  word-break: break-word;
}
</style>
