<template>
  <el-dialog
    v-model="visible"
    :title="title"
    fullscreen
    class="html-preview-dialog"
    @closed="handleClosed"
  >
    <div class="preview-toolbar">
      <el-button type="primary" :icon="Download" :loading="downloading" @click="downloadPdf">
        Télécharger PDF
      </el-button>
      <el-button
        v-if="docDownloadChannel"
        :icon="Download"
        :loading="downloadingDoc"
        @click="downloadDoc"
      >
        Télécharger DOC
      </el-button>
      <div class="toolbar-spacer" />
      <el-button
        :icon="ZoomOut"
        circle
        title="Zoom arrière"
        :disabled="!htmlContent || zoom <= MIN_ZOOM"
        @click="zoomOut"
      />
      <span class="zoom-value">{{ Math.round(zoom * 100) }}%</span>
      <el-button
        :icon="ZoomIn"
        circle
        title="Zoom avant"
        :disabled="!htmlContent || zoom >= MAX_ZOOM"
        @click="zoomIn"
      />
      <el-button :icon="Printer" :disabled="!htmlContent" @click="printPreview">
        Imprimer
      </el-button>
      <el-button :icon="Close" @click="visible = false">
        Fermer
      </el-button>
    </div>

    <div ref="contentRef" class="preview-content" v-loading="loading">
      <div v-if="htmlContent" class="preview-stage" :style="stageStyle">
        <iframe
          ref="iframeRef"
          :srcdoc="htmlContent"
          class="preview-iframe"
          :style="iframeStyle"
          frameborder="0"
          sandbox="allow-same-origin"
        />
      </div>
      <el-empty v-else description="Aucun document à afficher" />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Download, Printer, Close, ZoomIn, ZoomOut } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = withDefaults(defineProps<{
  title: string
  channel: string
  downloadChannel: string
  docDownloadChannel?: string
  params?: Record<string, any>
  /** Format de page de l'aperçu — doit refléter celui du PDF généré. */
  orientation?: 'portrait' | 'landscape'
}>(), {
  params: () => ({}),
  orientation: 'portrait',
})

const emit = defineEmits<{
  close: []
}>()

const visible = ref(false)
const loading = ref(false)
const downloading = ref(false)
const downloadingDoc = ref(false)
const htmlContent = ref<string | null>(null)
const iframeRef = ref<HTMLIFrameElement | null>(null)
let loadToken = 0

const MIN_ZOOM = 0.5
const MAX_ZOOM = 2
const ZOOM_STEP = 0.25
/**
 * L'aperçu paysage démarre légèrement réduit : en plein écran, une page A4
 * paysage (1123 px) occupait toute la largeur et paraissait étirée. La page
 * conserve sa largeur de rendu (le contenu ne se recompacte pas), seule
 * l'échelle d'affichage est réduite.
 */
const LANDSCAPE_BASE_ZOOM = 0.9
/** Le mode « ajuster à la largeur » ne grossit pas les documents paysage. */
const maxFitZoom = computed(() => (props.orientation === 'landscape' ? 1 : MAX_ZOOM))

/** Dimensions A4 à 96 dpi, dans le sens demandé. */
const pageSize = computed(() => (
  props.orientation === 'landscape'
    ? { width: 1123, height: 794 }
    : { width: 794, height: 1123 }
))

/** Échelle de départ, avant tout ajustement manuel. */
const baseZoom = computed(() => (props.orientation === 'landscape' ? LANDSCAPE_BASE_ZOOM : 1))

const zoom = ref(1)
const manualZoom = ref(false)
const contentRef = ref<HTMLElement | null>(null)

const stageStyle = computed(() => ({
  width: `${pageSize.value.width * zoom.value}px`,
  minHeight: `${pageSize.value.height * zoom.value}px`,
}))

const iframeStyle = computed(() => ({
  width: `${pageSize.value.width}px`,
  height: `${pageSize.value.height}px`,
  transform: `scale(${zoom.value})`,
}))

function zoomIn() {
  manualZoom.value = true
  zoom.value = Math.min(MAX_ZOOM, Math.round((zoom.value + ZOOM_STEP) * 100) / 100)
}

function zoomOut() {
  manualZoom.value = true
  zoom.value = Math.max(MIN_ZOOM, Math.round((zoom.value - ZOOM_STEP) * 100) / 100)
}

onMounted(() => window.addEventListener('resize', onWindowResize))
onBeforeUnmount(() => window.removeEventListener('resize', onWindowResize))

function onWindowResize() {
  if (manualZoom.value) return
  const container = contentRef.value
  if (!container) return
  const avail = container.clientWidth
  if (avail <= 0) return
  zoom.value = Math.max(
    MIN_ZOOM,
    Math.round(Math.min(maxFitZoom.value, avail / pageSize.value.width) * baseZoom.value * 100) / 100,
  )
}

function safeParams(): Record<string, any> {
  return props.params ? JSON.parse(JSON.stringify(props.params)) : {}
}

function open() {
  visible.value = true
  loadPreview()
}

async function loadPreview() {
  if (!window.electronAPI) {
    ElMessage.error('API non disponible')
    return
  }

  const token = ++loadToken
  loading.value = true
  htmlContent.value = null
  manualZoom.value = false
  zoom.value = baseZoom.value
  try {
    const result: any = await window.electronAPI.invoke(props.channel, safeParams())
    if (token !== loadToken) return
    if (result?.success && typeof result.data === 'string') {
      htmlContent.value = result.data
    } else {
      ElMessage.error(result?.message || 'Erreur lors du chargement de l\'aperçu')
    }
  } catch (e: any) {
    if (token !== loadToken) return
    ElMessage.error(e.message || 'Erreur lors du chargement de l\'aperçu')
  } finally {
    if (token === loadToken) loading.value = false
  }
}

async function downloadFile(channel: string) {
  if (!window.electronAPI) return

  try {
    const result: any = await window.electronAPI.invoke(channel, safeParams())
    if (result?.success) {
      ElMessage.success(`Fichier enregistré : ${result.data}`)
    } else {
      ElMessage.error(result?.message || 'Erreur lors du téléchargement')
    }
  } catch (e: any) {
    ElMessage.error(e.message || 'Erreur lors du téléchargement')
  }
}

async function downloadPdf() {
  downloading.value = true
  try {
    await downloadFile(props.downloadChannel)
  } finally {
    downloading.value = false
  }
}

async function downloadDoc() {
  if (!props.docDownloadChannel) return
  downloadingDoc.value = true
  try {
    await downloadFile(props.docDownloadChannel)
  } finally {
    downloadingDoc.value = false
  }
}

function printPreview() {
  if (iframeRef.value?.contentWindow) {
    iframeRef.value.contentWindow.print()
  }
}

function handleClosed() {
  htmlContent.value = null
  manualZoom.value = false
  emit('close')
}

defineExpose({ open })
</script>

<style scoped>
.html-preview-dialog {
  --preview-toolbar-height: 52px;
}

.html-preview-dialog :deep(.el-dialog__body) {
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
  border-bottom: 1px solid var(--cde-border);
  flex-shrink: 0;
}

.toolbar-spacer {
  flex: 1;
}

.zoom-value {
  min-width: 48px;
  text-align: center;
  font-size: 13px;
  color: var(--el-text-color-regular);
  user-select: none;
}

.preview-content {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: var(--cde-surface-tint);
  padding: 24px 0;
}

.preview-stage {
  flex-shrink: 0;
}

.preview-iframe {
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  border: none;
  transform-origin: top center;
}
</style>
