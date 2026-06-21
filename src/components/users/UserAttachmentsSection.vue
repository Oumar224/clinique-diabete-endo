<template>
  <div class="attachments-section">
    <h3 class="attachments-section__title">Pièces jointes</h3>

    <div class="attachments-section__add">
      <el-input
        v-model="displayName"
        placeholder="Nom du fichier..."
        style="width: 250px; margin-right: 8px;"
        size="small"
      />
      <el-button size="small" @click="triggerFileInput">
        Choisir un fichier
      </el-button>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        style="display: none"
        @change="handleFileChange"
      />
      <span v-if="selectedFile" class="attachments-section__file-name">
        {{ selectedFile.name }}
      </span>
      <el-button
        size="small"
        type="primary"
        :disabled="!displayName || !selectedFile || !fileData"
        :loading="adding"
        @click="handleAdd"
        style="margin-left: 8px;"
      >
        Ajouter
      </el-button>
    </div>

    <div v-if="loading" class="attachments-section__loading">Chargement...</div>

    <div v-if="attachments.length === 0 && !loading" class="attachments-section__empty">
      Aucune pièce jointe.
    </div>

    <div v-for="att in attachments" :key="att.id" class="attachments-section__item">
      <div class="attachments-section__item-info">
        <span class="attachments-section__item-icon">
          <template v-if="att.mimeType?.startsWith('image/')"><el-icon><PictureFilled /></el-icon></template>
          <template v-else-if="att.mimeType?.includes('pdf')"><el-icon><Document /></el-icon></template>
          <template v-else><el-icon><Paperclip /></el-icon></template>
        </span>
        <div>
          <div class="attachments-section__item-name">{{ att.displayName }}</div>
          <div class="attachments-section__item-meta">
            {{ att.fileName }} — {{ formatSize(att.fileSize) }}
          </div>
        </div>
      </div>
      <el-button
        text
        type="danger"
        size="small"
        @click="handleRemove(att.id)"
      >
        <el-icon><Delete /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, PictureFilled, Document, Paperclip } from '@element-plus/icons-vue'
import { useUserAttachments } from '@/composables/useUserAttachments'

const props = defineProps<{
  userId: number
}>()

const {
  attachments,
  loading,
  addAttachment,
  removeAttachment,
  loadAttachments,
} = useUserAttachments()

const displayName = ref('')
const selectedFile = ref<File | null>(null)
const fileData = ref('')
const adding = ref(false)
const fileInputRef = ref<HTMLInputElement | null>()

watch(() => props.userId, (id) => {
  if (id) {
    loadAttachments(id)
  }
}, { immediate: true })

function triggerFileInput() {
  fileInputRef.value?.click()
}

let currentFile: File | null = null

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
  if (!displayName.value || !selectedFile.value || !fileData.value) return

  adding.value = true
  const success = await addAttachment({
    userId: props.userId,
    displayName: displayName.value.trim(),
    fileName: selectedFile.value.name,
    mimeType: selectedFile.value.type || 'application/octet-stream',
    fileSize: selectedFile.value.size,
    fileData: fileData.value,
  })

  if (success) {
    ElMessage.success('Pièce jointe ajoutée')
    displayName.value = ''
    selectedFile.value = null
    fileData.value = ''
    if (fileInputRef.value) fileInputRef.value.value = ''
  } else {
    ElMessage.error("Erreur lors de l'ajout")
  }
  adding.value = false
}

async function handleRemove(id: number) {
  try {
    await ElMessageBox.confirm('Supprimer cette pièce jointe ?', 'Confirmation', {
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      type: 'warning',
    })
    const success = await removeAttachment(id)
    if (success) {
      ElMessage.success('Pièce jointe supprimée')
    }
  } catch {
    // Annulation ou erreur
  }
}

function formatSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
</script>

<style scoped>
.attachments-section {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafafa;
}
.attachments-section__title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px;
  color: #333;
}
.attachments-section__add {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.attachments-section__file-name {
  font-size: 12px;
  color: #666;
  margin-left: 6px;
}
.attachments-section__loading,
.attachments-section__empty {
  font-size: 13px;
  color: #999;
  padding: 12px 0;
  text-align: center;
}
.attachments-section__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}
.attachments-section__item:last-child {
  border-bottom: none;
}
.attachments-section__item-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.attachments-section__item-icon {
  font-size: 20px;
}
.attachments-section__item-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}
.attachments-section__item-meta {
  font-size: 11px;
  color: #999;
}
</style>
