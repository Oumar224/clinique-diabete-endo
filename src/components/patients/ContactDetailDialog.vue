<template>
  <el-dialog
    v-model="dialogVisible"
    width="720px"
    top="5vh"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <template #header>
      <div class="detail-header">
        <el-icon :size="20"><FirstAidKit /></el-icon>
        <span>Détail du contact médical</span>
        <template v-if="encounter">
          <el-tag :type="statusTagType" size="small" effect="plain">
            {{ encounter.status === 'active' ? 'Actif' : 'Fermé' }}
          </el-tag>
          <el-tag :type="contactTypeTag(encounter.contact_type)" size="small">
            {{ contactTypeLabel(encounter.contact_type) }}
          </el-tag>
        </template>
      </div>
    </template>

    <div v-if="encounter" class="detail-body">
      <!-- Summary header block -->
      <div class="detail-summary">
        <div class="detail-summary__cell">
          <span class="detail-summary__label">Début</span>
          <span class="detail-summary__value">{{ formatDateTime(encounter.start_date) }}</span>
        </div>
        <div class="detail-summary__cell">
          <span class="detail-summary__label">Fin</span>
          <span class="detail-summary__value">{{ encounter.end_date ? formatDateTime(encounter.end_date) : '—' }}</span>
        </div>
        <div class="detail-summary__cell">
          <span class="detail-summary__label">Service</span>
          <span class="detail-summary__value">{{ encounter.service_name || '—' }}</span>
        </div>
        <div class="detail-summary__cell">
          <span class="detail-summary__label">Médecin</span>
          <span class="detail-summary__value">{{ encounter.medecin_name || '—' }}</span>
        </div>
        <div class="detail-summary__cell">
          <span class="detail-summary__label">Responsable</span>
          <span class="detail-summary__value">{{ encounter.responsable_name || '—' }}</span>
        </div>
        <div class="detail-summary__cell">
          <span class="detail-summary__label">Unité de soins</span>
          <span class="detail-summary__value">{{ encounter.care_unit_name || '—' }}</span>
        </div>
      </div>

      <!-- Detailed descriptions -->
      <el-descriptions :column="2" border class="detail-descriptions">
        <el-descriptions-item label="Date de début">
          {{ formatDateTime(encounter.start_date) }}
        </el-descriptions-item>
        <el-descriptions-item label="Date de fin">
          {{ encounter.end_date ? formatDateTime(encounter.end_date) : '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="Type de contact">
          <el-tag :type="contactTypeTag(encounter.contact_type)" size="small">
            {{ contactTypeLabel(encounter.contact_type) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Type de cas">
          {{ caseTypeLabel(encounter.case_type) }}
        </el-descriptions-item>
        <el-descriptions-item label="Nouveau cas">
          {{ encounter.is_new_case ? 'Premier passage pour ce motif' : 'Non' }}
        </el-descriptions-item>
        <el-descriptions-item v-if="encounter.contact_type === 'hospitalisation'" label="Type d'hospitalisation">
          {{ stayTypeLabel(encounter.stay_type) }}
        </el-descriptions-item>
        <el-descriptions-item label="Statut">
          <el-tag :type="statusTagType" size="small">
            {{ encounter.status === 'active' ? 'Actif' : 'Fermé' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Service">
          {{ encounter.service_name || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="Médecin">
          {{ encounter.medecin_name || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="Responsable">
          {{ encounter.responsable_name || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="Unité de soins">
          {{ encounter.care_unit_name || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="Origine">
          {{ originLabel(encounter.origin) }}{{ encounter.origin_precision ? ` (${encounter.origin_precision})` : '' }}
        </el-descriptions-item>
        <el-descriptions-item label="Zone de situation">
          {{ zoneLabel(encounter.zone_situation) }}{{ encounter.zone_precision ? ` (${encounter.zone_precision})` : '' }}
        </el-descriptions-item>
        <el-descriptions-item label="Prise en charge">
          {{ priseEnChargeLabel(encounter.prise_en_charge) }}{{ encounter.prise_en_charge_precision ? ` (${encounter.prise_en_charge_precision})` : '' }}
        </el-descriptions-item>
        <el-descriptions-item label="Sinistre / assurance">
          {{ encounter.sinistre_info || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="Notes" :span="2">
          <span v-if="!isRichTextEmpty(encounter.notes)" class="detail-notes" v-html="encounter.notes" />
          <span v-else>—</span>
        </el-descriptions-item>
        <el-descriptions-item label="Créé par">
          {{ encounter.created_by ?? '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="Créé le">
          {{ encounter.created_at ? formatDateTime(encounter.created_at) : '—' }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- Documents cliniques -->
      <div class="detail-stat-block">
        <el-icon :size="18"><Files /></el-icon>
        <div class="detail-stat-block__body">
          <span class="detail-stat-block__label">Documents cliniques</span>
          <span class="detail-stat-block__value">
            <el-skeleton v-if="loadingDocs" :rows="1" animated class="detail-stat-block__skeleton" />
            <template v-else>
              {{ docCount }} document{{ docCount > 1 ? 's' : '' }}
            </template>
          </span>
        </div>
      </div>

      <!-- Mouvements timeline -->
      <div class="detail-movements">
        <div class="detail-movements__header">
          <el-icon :size="16"><Notebook /></el-icon>
          <span>Mouvements</span>
        </div>
        <div v-if="loadingMovements" class="detail-movements__loading">
          <el-skeleton :rows="2" animated />
        </div>
        <div v-else-if="movements.length" class="detail-movements__timeline">
          <div
            v-for="(mvt, idx) in movements"
            :key="mvt.id ?? idx"
            class="detail-movements__timeline-item"
            :class="{ 'is-last': idx === movements.length - 1 }"
          >
            <span class="detail-movements__dot" />
            <span class="detail-movements__time">{{ formatTime(mvt.entered_at) }}</span>
            <span class="detail-movements__label">{{ mvt.step_label }}</span>
            <span v-if="mvt.service_name" class="detail-movements__service">{{ mvt.service_name }}</span>
          </div>
        </div>
        <div v-else class="detail-movements__empty">
          Aucun mouvement enregistré pour ce contact
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">Fermer</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { FirstAidKit, Files, Notebook } from '@element-plus/icons-vue'
import { ipcInvoke } from '@/utils/ipc'
import { useEncounters } from '@/composables/useEncounters'
import type { EncounterDto, EncounterMovementDto } from '@/composables/useEncounters'
import { isRichTextEmpty } from '@/utils/rich-text'
import { CASE_TYPE_OPTIONS, PRISE_EN_CHARGE_OPTIONS, STAY_TYPE_OPTIONS } from '@/composables/useContactFormLogic'

const { getEncounterMovements } = useEncounters()

const dialogVisible = ref(false)
const encounter = ref<EncounterDto | null>(null)
const docCount = ref(0)
const loadingDocs = ref(false)
const movements = ref<EncounterMovementDto[]>([])
const loadingMovements = ref(false)
const originLabelMap = ref<Record<string, string>>({})

const statusTagType = computed(() =>
  encounter.value?.status === 'active' ? 'success' : 'info'
)

const priseEnChargeLabels: Record<string, string> = Object.fromEntries(
  PRISE_EN_CHARGE_OPTIONS.map(o => [o.value, o.label])
)

const caseTypeLabels: Record<string, string> = Object.fromEntries(
  CASE_TYPE_OPTIONS.map(o => [o.value, o.label])
)

const stayTypeLabels: Record<string, string> = Object.fromEntries(
  STAY_TYPE_OPTIONS.map(o => [o.value, o.label])
)

function open(data: EncounterDto) {
  encounter.value = data
  docCount.value = 0
  movements.value = []
  dialogVisible.value = true
  loadOriginLabels()
  loadDocuments(data.id)
  loadMovements(data.id)
}

async function loadOriginLabels() {
  if (Object.keys(originLabelMap.value).length) return
  try {
    const origins = await ipcInvoke<{ value: string; label: string }[]>('contact-origins:list-active')
    const map: Record<string, string> = {}
    for (const o of origins ?? []) map[o.value] = o.label
    originLabelMap.value = map
  } catch {
    originLabelMap.value = {}
  }
}

async function loadDocuments(id?: number) {
  if (!id) return
  loadingDocs.value = true
  try {
    docCount.value = await ipcInvoke<number>('clinical-documents:count', { contactId: String(id) })
  } catch {
    docCount.value = 0
  } finally {
    loadingDocs.value = false
  }
}

async function loadMovements(id?: number) {
  if (!id) return
  loadingMovements.value = true
  try {
    movements.value = await getEncounterMovements(id)
  } catch {
    movements.value = []
  } finally {
    loadingMovements.value = false
  }
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function contactTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    consultation: 'Consultation',
    hospitalisation: 'Hospitalisation',
    urgence: 'Urgence',
    soin_externe: 'Soin externe',
    autre: 'Autre',
  }
  return labels[type] || type
}

function contactTypeTag(type: string): 'primary' | 'danger' | 'warning' | 'info' {
  const map: Record<string, 'primary' | 'danger' | 'warning' | 'info'> = {
    consultation: 'primary',
    hospitalisation: 'warning',
    urgence: 'danger',
    soin_externe: 'warning',
  }
  return map[type] || 'info'
}

function caseTypeLabel(value?: string | null): string {
  if (!value) return '—'
  return caseTypeLabels[value] || value
}

function stayTypeLabel(value?: string | null): string {
  if (!value) return '—'
  return stayTypeLabels[value] || value
}

function originLabel(origin: string): string {
  if (!origin) return '—'
  return originLabelMap.value[origin] || origin
}

function zoneLabel(zone: string): string {
  if (!zone) return '—'
  return priseEnChargeLabels[zone] || zone
}

function priseEnChargeLabel(value: string): string {
  if (!value) return '—'
  return priseEnChargeLabels[value] || value
}

defineExpose({ open })
</script>

<style scoped>
.detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--cde-accent-strong);
  font-size: 17px;
  font-weight: 600;
}

.detail-header :deep(.el-tag) {
  margin-left: 2px;
}

.detail-body {
  padding: 0 4px;
}

.detail-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 16px;
  margin-bottom: 16px;
  background: var(--cd-widget-bg);
  border-radius: 12px;
  border: 1px solid var(--cd-border);
  min-width: 0;
  max-width: 100%;
}
@media (max-width: 900px) {
  .detail-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .detail-summary { grid-template-columns: minmax(0, 1fr); }
}

.detail-summary__cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.detail-summary__label {
  font-size: 11px;
  font-weight: 600;
  color: var(--cd-gray-400);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.detail-summary__value {
  font-size: 13px;
  font-weight: 600;
  color: var(--cd-gray-900);
  overflow-wrap: break-word;
}

:deep(.detail-descriptions .el-descriptions__label) {
  font-weight: 600;
  color: var(--cde-header-text);
  background: var(--cde-header-bg);
  width: 130px;
}

:deep(.detail-descriptions .el-descriptions__content) {
  color: var(--cde-header-text);
}

.detail-notes {
  display: block;
  font-size: 13px;
  line-height: 1.5;
  max-height: 160px;
  overflow-y: auto;
  white-space: pre-wrap;
}

.detail-stat-block {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 14px 16px;
  background: var(--cd-widget-bg);
  border-radius: 10px;
  border: 1px solid var(--cd-border);
  color: var(--cd-primary);
}

.detail-stat-block__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-stat-block__label {
  font-size: 11px;
  font-weight: 600;
  color: var(--cd-gray-400);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.detail-stat-block__value {
  font-size: 15px;
  font-weight: 700;
  color: var(--cd-gray-900);
}

.detail-stat-block__skeleton {
  width: 120px;
}

.detail-movements {
  margin-top: 16px;
}

.detail-movements__header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--cd-primary);
  margin-bottom: 10px;
}

.detail-movements__loading {
  padding: 8px 0;
}

.detail-movements__timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  padding-left: 4px;
}

.detail-movements__timeline::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 8px;
  bottom: 8px;
  width: 1.5px;
  background: var(--cde-border);
}

.detail-movements__timeline-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  position: relative;
}

.detail-movements__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--cde-accent-strong);
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.detail-movements__time {
  font-size: 11px;
  color: var(--cd-gray-400);
  min-width: 42px;
  font-family: monospace;
}

.detail-movements__label {
  font-size: 12px;
  color: var(--cd-gray-900);
  font-weight: 500;
}

.detail-movements__service {
  font-size: 11px;
  color: var(--cd-gray-400);
  background: var(--cd-gray-100);
  padding: 1px 6px;
  border-radius: 4px;
}

.detail-movements__empty {
  padding: 8px 0;
  font-size: 11px;
  color: var(--cd-gray-400);
  font-style: italic;
}
</style>
