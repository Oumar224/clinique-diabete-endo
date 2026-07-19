<template>
  <el-dialog
    v-model="visible"
    title="Aperçu de l'ordonnance"
    fullscreen
    class="ordonnance-preview-dialog"
    @opened="loadPreview"
    @closed="handleClosed"
  >
    <div class="preview-toolbar">
      <el-button type="primary" :icon="Download" :loading="downloading" @click="downloadPdf">
        Télécharger PDF
      </el-button>
      <el-button :icon="Printer" @click="printPreview">
        Imprimer
      </el-button>
      <el-button :icon="Close" @click="visible = false">
        Fermer
      </el-button>
    </div>

    <div class="preview-content" v-loading="loading">
      <iframe
        v-if="htmlContent"
        ref="iframeRef"
        :srcdoc="htmlContent"
        class="preview-iframe"
        frameborder="0"
      />
      <el-empty v-else description="Aucune ordonnance à afficher" />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Download, Printer, Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  patientId: number
  prescriptionIds?: number[]
}>()

const emit = defineEmits<{
  close: []
}>()

const visible = ref(false)
const loading = ref(false)
const downloading = ref(false)
const htmlContent = ref<string | null>(null)
const iframeRef = ref<HTMLIFrameElement | null>(null)

function open() {
  visible.value = true
}

async function loadPreview() {
  if (!window.electronAPI) {
    ElMessage.error('API non disponible')
    return
  }

  loading.value = true
  try {
    const result: any = await window.electronAPI.invoke('export:prescription-preview', {
      patientId: props.patientId,
      prescriptionIds: props.prescriptionIds,
    })
    if (result?.success) {
      htmlContent.value = result.data as string
    } else {
      ElMessage.error(result?.message || 'Erreur lors du chargement de l\'aperçu')
    }
  } catch (e: any) {
    ElMessage.error(e.message || 'Erreur lors du chargement de l\'aperçu')
  } finally {
    loading.value = false
  }
}

async function downloadPdf() {
  if (!window.electronAPI) return

  downloading.value = true
  try {
    const result: any = await window.electronAPI.invoke('export:prescription-pdf', {
      patientId: props.patientId,
      prescriptionIds: props.prescriptionIds,
    })
    if (result?.success) {
      ElMessage.success(`Fichier enregistré : ${result.data}`)
    } else {
      ElMessage.error(result?.message || 'Erreur lors du téléchargement')
    }
  } catch (e: any) {
    ElMessage.error(e.message || 'Erreur lors du téléchargement du PDF')
  } finally {
    downloading.value = false
  }
}

function printPreview() {
  if (iframeRef.value?.contentWindow) {
    iframeRef.value.contentWindow.print()
  }
}

function handleClosed() {
  htmlContent.value = null
  emit('close')
}

defineExpose({ open })
</script>

<style scoped>
.ordonnance-preview-dialog {
  --preview-toolbar-height: 52px;
}

.ordonnance-preview-dialog :deep(.el-dialog__body) {
  padding: 0;
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--preview-toolbar-height) - 110px);
  overflow: hidden;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}

.preview-content {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: var(--el-fill-color-light);
}

.preview-iframe {
  width: 100%;
  height: 100%;
  background: #ffffff;
}
</style>
