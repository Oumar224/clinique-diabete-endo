<template>
  <div class="patient-context-toolbar">
    <div class="patient-context-toolbar__left">
      <slot />
    </div>
    <div class="patient-context-toolbar__right">
      <el-button v-if="showPdf" size="small" :loading="pdfLoading" @click="exportPdf">
        <el-icon><Document /></el-icon> Profil PDF
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  patientId: number | undefined
  showPdf?: boolean
}>()

const pdfLoading = ref(false)

async function exportPdf() {
  if (!props.patientId) return
  pdfLoading.value = true
  try {
    const api = (window as any).electronAPI
    if (!api) { ElMessage.warning('Export disponible uniquement dans l\'application desktop'); return }
    const result = await api.invoke('export:patient-profile-pdf', { patientId: props.patientId })
    if (result?.success) ElMessage.success(`Fichier enregistr\u00e9 : ${result.data}`)
    else if (result?.message) ElMessage.error(result.message)
  } catch (e: any) {
    if (e.message !== 'Enregistrement annul\u00e9') ElMessage.error(e.message || 'Erreur PDF')
  } finally {
    pdfLoading.value = false
  }
}

</script>

<style scoped>
.patient-context-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0;
}

.patient-context-toolbar__left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.patient-context-toolbar__right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
</style>
