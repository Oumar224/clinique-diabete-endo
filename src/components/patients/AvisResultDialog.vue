<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="760px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-form label-position="top">
      <el-form-item label="Compte-rendu">
        <RichTextEditor v-model="resultat" :rows="6" placeholder="Rédiger le compte-rendu..." />
      </el-form-item>
    </el-form>

    <div class="avis-result__attachments">
      <div class="avis-result__attachments-header">
        <span class="avis-result__attachments-title">Pièces jointes</span>
        <div class="avis-result__attachments-add">
          <el-button size="small" @click="triggerFileInput">Choisir un fichier</el-button>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            style="display: none"
            @change="handleFileChange"
          />
          <span v-if="selectedFile" class="avis-result__file-name">{{ selectedFile.name }}</span>
          <el-button
            size="small"
            type="primary"
            :disabled="!selectedFile || !fileData"
            :loading="adding"
            @click="handleAdd"
            style="margin-left: 8px;"
          >
            Ajouter
          </el-button>
        </div>
      </div>
      <div v-if="attachmentsLoading" class="avis-result__status">Chargement...</div>
      <div v-else-if="attachments.length === 0" class="avis-result__status">Aucune pièce jointe.</div>
      <div v-for="att in attachments" :key="att.id" class="avis-result__attachment">
        <div class="avis-result__attachment-info">
          <span class="avis-result__attachment-icon"><el-icon><Paperclip /></el-icon></span>
          <div>
            <div class="avis-result__attachment-name">{{ att.displayName }}</div>
            <div class="avis-result__attachment-meta">{{ att.fileName }} — {{ formatSize(att.fileSize) }}</div>
          </div>
        </div>
        <el-button text type="danger" size="small" @click="handleRemove(att)">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">Annuler</el-button>
      <el-button type="primary" :loading="saving" @click="onSave">Enregistrer</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Paperclip } from '@element-plus/icons-vue'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import { useExamRequests, type ExamRequestAttachmentDto } from '@/composables/useExamRequests'

const props = defineProps<{
  visible: boolean
  examRequestId: number | null
  title: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'realized': []
}>()

const { realize, listAttachments, createAttachment, deleteAttachment } = useExamRequests()

const resultat = ref('')
const saving = ref(false)
const attachments = ref<ExamRequestAttachmentDto[]>([])
const attachmentsLoading = ref(false)
const selectedFile = ref<File | null>(null)
const fileData = ref('')
const adding = ref(false)
const fileInputRef = ref<HTMLInputElement | null>()
let currentFile: File | null = null

watch(() => props.visible, async (v) => {
  if (v && props.examRequestId != null) {
    resultat.value = ''
    selectedFile.value = null
    fileData.value = ''
    await loadAttachments()
  }
})

async function loadAttachments() {
  if (props.examRequestId == null) return
  attachmentsLoading.value = true
  attachments.value = await listAttachments(props.examRequestId)
  attachmentsLoading.value = false
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('Le fichier ne doit pas dépasser 10 Mo')
    target.value = ''
    selectedFile.value = null
    fileData.value = ''
    return
  }

  selectedFile.value = file
  currentFile = file
  const reader = new FileReader()
  reader.onload = () => {
    if (currentFile === file) {
      fileData.value = reader.result as string
    }
  }
  reader.readAsDataURL(file)
}

async function handleAdd() {
  if (props.examRequestId == null || !selectedFile.value || !fileData.value) return

  adding.value = true
  const created = await createAttachment({
    examRequestId: props.examRequestId,
    displayName: selectedFile.value.name,
    fileName: selectedFile.value.name,
    mimeType: selectedFile.value.type || 'application/octet-stream',
    fileSize: selectedFile.value.size,
    fileData: fileData.value,
  })

  if (created) {
    ElMessage.success('Pièce jointe ajoutée')
    selectedFile.value = null
    fileData.value = ''
    if (fileInputRef.value) fileInputRef.value.value = ''
    await loadAttachments()
  } else {
    ElMessage.error("Erreur lors de l'ajout")
  }
  adding.value = false
}

async function handleRemove(att: ExamRequestAttachmentDto) {
  if (att.id == null) return
  try {
    await ElMessageBox.confirm('Supprimer cette pièce jointe ?', 'Confirmation', {
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      type: 'warning',
    })
    const ok = await deleteAttachment(att.id)
    if (ok) {
      ElMessage.success('Pièce jointe supprimée')
      await loadAttachments()
    }
  } catch {
    // Annulation ou erreur
  }
}

async function onSave() {
  if (props.examRequestId == null) return
  saving.value = true
  const ok = await realize(props.examRequestId, resultat.value || undefined)
  saving.value = false
  if (ok) {
    ElMessage.success('Examen réalisé')
    emit('realized')
    emit('update:visible', false)
  } else {
    ElMessage.error("Erreur lors de l'enregistrement")
  }
}

function formatSize(bytes: number | null | undefined): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
</script>

<style scoped>
.avis-result__attachments {
  margin-top: 8px;
  padding: 12px;
  border: 1px solid var(--cd-gray-200, #e4e7ed);
  border-radius: 8px;
  background: #fafafa;
}
.avis-result__attachments-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.avis-result__attachments-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--cd-gray-700, #333);
}
.avis-result__attachments-add {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.avis-result__file-name {
  font-size: 12px;
  color: #666;
}
.avis-result__status {
  font-size: 12px;
  color: #999;
  padding: 8px 0;
  text-align: center;
}
.avis-result__attachment {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #eee;
}
.avis-result__attachment:last-child {
  border-bottom: none;
}
.avis-result__attachment-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.avis-result__attachment-icon {
  font-size: 18px;
  color: var(--cd-gray-500, #95a5a6);
}
.avis-result__attachment-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}
.avis-result__attachment-meta {
  font-size: 11px;
  color: #999;
}
</style>