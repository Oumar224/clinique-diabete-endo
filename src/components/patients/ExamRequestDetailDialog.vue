<template>
  <el-dialog
    :model-value="visible"
    title="Détail de la demande"
    width="760px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div v-if="request">
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="Type">{{ typeLabel(request.type) }}</el-descriptions-item>
        <el-descriptions-item label="Statut">{{ statutLabel(request.statut) }}</el-descriptions-item>
        <el-descriptions-item label="Demande">{{ formatDateTime(request.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="Prescripteur">{{ request.prescripteurNom || '—' }}</el-descriptions-item>
        <el-descriptions-item label="Examen(s)" :span="2">{{ examLabel }}</el-descriptions-item>
        <el-descriptions-item label="Planifié">{{ formatPlanned }}</el-descriptions-item>
        <el-descriptions-item label="Réalisation">{{ formatRealization }}</el-descriptions-item>
        <el-descriptions-item label="Motif" :span="2">
          <div v-if="request.motif" class="exam-detail__motif" v-html="request.motif"></div>
          <span v-else>—</span>
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="request.type === 'laboratoire'" class="exam-detail__section">
        <h4 class="exam-detail__section-title">Résultats</h4>
        <div v-loading="resultsLoading">
          <el-table :data="results" size="small" empty-text="Aucun résultat enregistré">
            <el-table-column prop="parameterName" label="Paramètre" min-width="160" />
            <el-table-column prop="value" label="Valeur" min-width="120" />
            <el-table-column prop="parameterUnit" label="Unité" width="90">
              <template #default="{ row }">{{ row.parameterUnit || '—' }}</template>
            </el-table-column>
            <el-table-column label="Normal" width="90">
              <template #default="{ row }">
                <el-tag v-if="row.isNormal === true" type="success" size="small">Oui</el-tag>
                <el-tag v-else-if="row.isNormal === false" type="danger" size="small">Non</el-tag>
                <span v-else>—</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <template v-else>
        <div v-if="request.resultat" class="exam-detail__section">
          <h4 class="exam-detail__section-title">Compte-rendu</h4>
          <div class="exam-detail__resultat" v-html="request.resultat"></div>
        </div>
        <div class="exam-detail__section">
          <h4 class="exam-detail__section-title">Pièces jointes</h4>
          <div v-if="attachmentsLoading" class="exam-detail__status">Chargement...</div>
          <div v-else-if="attachments.length === 0" class="exam-detail__status">Aucune pièce jointe.</div>
          <div v-for="att in attachments" :key="att.id" class="exam-detail__attachment">
            <span class="exam-detail__attachment-icon"><el-icon><Paperclip /></el-icon></span>
            <div class="exam-detail__attachment-info">
              <div class="exam-detail__attachment-name">{{ att.displayName }}</div>
              <div class="exam-detail__attachment-meta">{{ att.fileName }} — {{ formatSize(att.fileSize) }}</div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">Fermer</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Paperclip } from '@element-plus/icons-vue'
import { useExamResults } from '@/composables/useExamResults'
import { useExamRequests, type ExamRequestDto, type ExamRequestAttachmentDto } from '@/composables/useExamRequests'
import { formatDate, formatDateTime } from '@/utils/date'

const props = defineProps<{
  visible: boolean
  request: ExamRequestDto | null
}>()

defineEmits<{
  'update:visible': [value: boolean]
}>()

const { results, loading: resultsLoading, fetchByRequest } = useExamResults()
const { listAttachments } = useExamRequests()

const attachments = ref<ExamRequestAttachmentDto[]>([])
const attachmentsLoading = ref(false)

watch(() => props.visible, async (v) => {
  if (!v || !props.request?.id) return
  attachments.value = []
  if (props.request.type === 'laboratoire') {
    await fetchByRequest(props.request.id)
  } else {
    attachmentsLoading.value = true
    attachments.value = await listAttachments(props.request.id)
    attachmentsLoading.value = false
  }
})

function typeLabel(type: string): string {
  const map: Record<string, string> = { imagerie: 'Imagerie', laboratoire: 'Laboratoire', avis: 'Avis spécialisé' }
  return map[type] || type
}

function statutLabel(statut: string): string {
  const map: Record<string, string> = {
    en_attente: 'En attente',
    en_cours: 'En cours',
    realise: 'Réalisé',
    annule: 'Annulé',
  }
  return map[statut] || statut
}

const examLabel = computed(() => {
  const row = props.request
  if (!row) return '—'
  if (row.type === 'avis') return row.specialtyName || row.specialite || 'Avis spécialisé'
  if (row.examenLabel) return row.examenLabel
  if (row.examIds && row.examIds.length > 0) return `Analyses (${row.examIds.length})`
  if (row.examenId != null) return String(row.examenId)
  return '—'
})

const formatPlanned = computed(() => {
  if (!props.request?.plannedDate) return '—'
  const base = formatDate(props.request.plannedDate)
  if (props.request.plannedHour != null) return `${base} ${String(props.request.plannedHour).padStart(2, '0')}:00`
  return base
})

const formatRealization = computed(() => {
  return formatDateTime(props.request?.realizedAt ?? props.request?.validatedAt)
})

function formatSize(bytes: number | null | undefined): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
</script>

<style scoped>
.exam-detail__motif,
.exam-detail__resultat {
  font-size: 13px;
  line-height: 1.6;
  color: var(--cde-header-text);
  word-break: break-word;
}
.exam-detail__motif :deep(img),
.exam-detail__resultat :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}
.exam-detail__section {
  margin-top: 16px;
}
.exam-detail__section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--cde-header-text);
  margin: 0 0 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--cde-border);
}
.exam-detail__status {
  font-size: 12px;
  color: var(--cde-muted);
  padding: 8px 0;
  text-align: center;
}
.exam-detail__attachment {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--cde-border-soft);
}
.exam-detail__attachment:last-child {
  border-bottom: none;
}
.exam-detail__attachment-icon {
  font-size: 18px;
  color: var(--cde-muted);
}
.exam-detail__attachment-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--cde-header-text);
}
.exam-detail__attachment-meta {
  font-size: 11px;
  color: var(--cde-muted);
}
</style>