<template>
  <div class="encounters-table">
    <div class="cde-section-head encounters-table__head">
      <h2 class="cde-section-title encounters-table__title">
        Contacts du patient
      </h2>
      <div class="cde-toolbar__actions">
        <el-button type="primary" @click="$emit('new-contact')">
          + Nouveau contact
        </el-button>
      </div>
    </div>

    <div class="cde-table-card">
      <el-table
        :data="encounters"
        style="width:100%"
        size="small"
        :row-class-name="tableRowClassName"
        @expand-change="onExpandChange"
        @row-click="onRowClick"
      >
        <el-table-column type="expand" width="32">
          <template #default="{ row }">
            <div class="encounters-table__movements">
              <div v-if="loadingMovements[row.id!]" class="encounters-table__movements-loading">
                <el-skeleton :rows="2" animated />
              </div>
              <div v-else-if="movementsMap[row.id!]?.length" class="encounters-table__timeline">
                <div
                  v-for="(mvt, idx) in movementsMap[row.id!]"
                  :key="mvt.id ?? idx"
                  class="encounters-table__timeline-item"
                  :class="{ 'is-last': idx === movementsMap[row.id!].length - 1 }"
                >
                  <span class="encounters-table__timeline-dot" />
                  <span class="encounters-table__timeline-time">{{ formatTime(mvt.entered_at) }}</span>
                  <span class="encounters-table__timeline-label">{{ mvt.step_label }}</span>
                  <span v-if="mvt.service_name" class="encounters-table__timeline-service">{{ mvt.service_name }}</span>
                </div>
              </div>
              <div v-else class="encounters-table__movements-empty">
                <span class="encounters-table__empty-text">Aucun mouvement enregistré pour ce contact</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="start_date" label="Date" width="140">
          <template #default="{ row }">
            {{ formatDateTime(row.start_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="contact_type" label="Type" width="130">
          <template #default="{ row }">
            <el-tag :type="contactTypeTag(row.contact_type)" size="small" effect="plain">
              {{ contactTypeLabel(row.contact_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="service_name" label="Service" min-width="140" />
        <el-table-column prop="medecin_name" label="Médecin" width="150">
          <template #default="{ row }">
            {{ row.medecin_name || '—' }}
          </template>
        </el-table-column>
        <el-table-column prop="responsable_name" label="Responsable" width="150">
          <template #default="{ row }">
            {{ row.responsable_name || '—' }}
          </template>
        </el-table-column>
        <el-table-column prop="origin" label="Méc. contact" width="140">
          <template #default="{ row }">
            {{ originLabel(row.origin) }}{{ row.origin_precision ? ` (${row.origin_precision})` : '' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="Statut" width="100">
          <template #default="{ row }">
            <span v-if="row.status === 'active'" class="encounters-table__status-active">
              <span class="encounters-table__status-dot" />
              Actif
            </span>
            <el-tag v-else type="info" size="small">Fermé</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="80" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status !== 'closed'" text size="small" @click.stop="emit('edit-contact', row)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-popconfirm
              v-if="row.status !== 'closed'"
              title="Supprimer ce contact ?"
              confirm-button-text="Oui"
              cancel-button-text="Non"
              @confirm="emit('delete-contact', row.id!)"
            >
              <template #reference>
                <el-button text size="small" type="danger" @click.stop>
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
        <template #empty>
          <div class="encounters-table__empty">
            Aucun contact enregistré.
          </div>
        </template>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Edit, Delete } from '@element-plus/icons-vue'
import { ipcInvoke } from '@/utils/ipc'
import { useEncounters } from '@/composables/useEncounters'
import type { EncounterDto, EncounterMovementDto } from '@/composables/useEncounters'

defineProps<{
  encounters: EncounterDto[]
}>()

const emit = defineEmits<{
  'new-contact': []
  'edit-contact': [encounter: EncounterDto]
  'delete-contact': [id: number]
  'view-contact': [encounter: EncounterDto]
}>()
const { getEncounterMovements } = useEncounters()

const movementsMap = reactive<Record<number, EncounterMovementDto[]>>({})
const loadingMovements = reactive<Record<number, boolean>>({})

const originLabelMap = ref<Record<string, string>>({})

onMounted(async () => {
  try {
    const origins = await ipcInvoke<{ value: string; label: string }[]>('contact-origins:list-active')
    const map: Record<string, string> = {}
    for (const o of origins ?? []) {
      map[o.value] = o.label
    }
    originLabelMap.value = map
  } catch {
    originLabelMap.value = {}
  }
})

async function onExpandChange(row: EncounterDto, expanded: boolean) {
  if (!expanded || !row.id) return
  if (movementsMap[row.id]) return
  loadingMovements[row.id] = true
  try {
    const movements = await getEncounterMovements(row.id)
    movementsMap[row.id] = movements
  } catch {
    movementsMap[row.id] = []
  } finally {
    loadingMovements[row.id] = false
  }
}

function onRowClick(row: EncounterDto, _column: unknown, event: Event) {
  const target = event.target as HTMLElement
  if (target.closest('.el-table__expand-icon')) return
  emit('view-contact', row)
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

function originLabel(origin: string): string {
  if (!origin) return '—'
  return originLabelMap.value[origin] || origin
}

function tableRowClassName({ row }: { row: EncounterDto }) {
  if (row.status === 'active') return 'row--active'
  return ''
}
</script>

<style scoped>
.encounters-table {
  width: 100%;
}

.encounters-table__head {
  padding-bottom: 6px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--cde-border);
}

.encounters-table__title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--cd-gray-900);
  background: none;
}

.encounters-table__empty {
  width: 100%;
  padding: 0 10px;
  font-size: 12px;
  line-height: 40px;
  color: var(--cde-muted);
  text-align: left;
}

.encounters-table__movements {
  padding: 4px 0 4px 24px;
}

.encounters-table__movements-loading {
  padding: 8px 0;
}

.encounters-table__timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
}

.encounters-table__timeline::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 8px;
  bottom: 8px;
  width: 1.5px;
  background: var(--cde-border);
}

.encounters-table__timeline-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  position: relative;
}

.encounters-table__timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--cde-accent);
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.encounters-table__timeline-time {
  font-size: 11px;
  color: var(--cd-gray-400);
  min-width: 42px;
  font-family: monospace;
}

.encounters-table__timeline-label {
  font-size: 12px;
  color: var(--cd-gray-900);
  font-weight: 500;
}

.encounters-table__timeline-service {
  font-size: 11px;
  color: var(--cde-muted);
  background: var(--cde-surface-tint);
  padding: 1px 6px;
  border-radius: 4px;
}

.encounters-table__movements-empty {
  padding: 8px 0;
}

.encounters-table__empty-text {
  font-size: 11px;
  color: var(--cd-gray-400);
  font-style: italic;
}

:deep(.el-table__row.row--active) {
  background: var(--cde-accent-tint) !important;
  position: relative;
}

:deep(.el-table__row.row--active:hover > td) {
  background: var(--cde-surface-tint) !important;
}

:deep(.el-table__row.row--active td) {
  border-left: none;
}

:deep(.el-table__row.row--active td:first-child) {
  border-left: 3px solid var(--cde-accent);
}

.encounters-table__status-active {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--cde-accent-strong);
  background: var(--cde-accent-tint);
  padding: 2px 10px;
  border-radius: 4px;
}

.encounters-table__status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--cde-success);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--cde-success) 25%, transparent);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--cde-success) 25%, transparent); }
  50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--cde-success) 8%, transparent); }
}
</style>
