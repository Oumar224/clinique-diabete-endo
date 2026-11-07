<template>
  <div class="rdv-view cde">
    <PatientPageToolbar>
      <template #sub>
        Historique, statuts et planification (dates au format JJ/MM/AAAA).
      </template>
      <el-radio-group
        v-model="viewMode"
        size="small"
        aria-label="Mode d'affichage"
      >
        <el-radio-button value="calendar">Calendrier</el-radio-button>
        <el-radio-button value="table">Tableau</el-radio-button>
      </el-radio-group>
      <el-radio-group
        v-model="filterMode"
        size="small"
        aria-label="Période affichée"
      >
        <el-radio-button value="today">Aujourd'hui</el-radio-button>
        <el-radio-button value="week">Cette semaine</el-radio-button>
        <el-radio-button value="all">Tous</el-radio-button>
      </el-radio-group>
      <el-button
        type="primary"
        size="small"
        :icon="Plus"
        @click="openCreate"
      >
        Planifier
      </el-button>
    </PatientPageToolbar>

    <div v-if="loading" class="rdv-view__loading">
      <el-skeleton :rows="4" animated />
    </div>

    <div v-else-if="error" class="rdv-view__error">
      <el-alert
        :title="error"
        type="error"
        show-icon
        :closable="false"
        class="cde-alert cde-alert--danger"
      />
      <el-button size="small" style="margin-top:12px" @click="loadAppointments">Réessayer</el-button>
    </div>

    <!-- Calendar View -->
    <div v-else-if="viewMode === 'calendar'" class="rdv-view__calendar">
      <div class="cde-toolbar">
        <div class="cde-filters">
          <span class="cde-toolbar__meta">Semaine du {{ weekLabel }}</span>
        </div>
        <div class="cde-toolbar__actions">
          <el-button-group>
            <el-button size="small" :icon="ArrowLeft" aria-label="Semaine précédente" @click="previousWeek" />
            <el-button size="small" @click="goToToday">Aujourd'hui</el-button>
            <el-button size="small" :icon="ArrowRight" aria-label="Semaine suivante" @click="nextWeek" />
          </el-button-group>
        </div>
      </div>

      <div class="cde-table-card rdv-calendar__frame">
        <div class="rdv-calendar__grid">
          <div class="rdv-calendar__time-header">Heure</div>
          <div
            v-for="day in weekDays"
            :key="day.isoDate"
            class="rdv-calendar__day-header"
            :class="{ 'rdv-calendar__day-header--today': day.isToday }"
            :data-day="day.isoDate"
          >
            <span class="rdv-calendar__day-name">{{ day.name }}</span>
            <span class="rdv-calendar__day-date">{{ day.date }}</span>
          </div>

          <template v-for="hour in hours" :key="hour">
            <div class="rdv-calendar__time-cell">{{ hour }}:00</div>
            <div
              v-for="day in weekDays"
              :key="`${day.isoDate}-${hour}`"
              class="rdv-calendar__cell"
              :class="{ 'rdv-calendar__cell--dragover': dragOverKey === `${day.isoDate}-${hour}` }"
              :data-slot="`${day.isoDate}-${hour}`"
              @click="onCellClick(day, hour)"
              @dragover.prevent="onCellDragOver(day, hour)"
              @dragleave="onCellDragLeave"
              @drop.prevent="onCellDrop(day, hour)"
            >
              <div
                v-for="rdv in getAppointmentsBySlot(day, hour)"
                :key="rdv.id"
                class="rdv-calendar__rdv"
                :class="[
                  `rdv-calendar__rdv--${rdv.status}`,
                  { 'rdv-calendar__rdv--past': isPastAppointment(rdv.date, rdv.time) },
                ]"
                :data-rdv-id="rdv.id"
                draggable="true"
                :title="`${rdv.time} — ${rdv.motif || 'RDV'} (glisser pour déplacer)`"
                @dragstart="onChipDragStart($event, rdv)"
                @dragend="onChipDragEnd"
                @click.stop="openEdit(rdv)"
              >
                <span class="rdv-calendar__rdv-time">{{ rdv.time }}</span>
                <span class="rdv-calendar__rdv-type">{{ rdv.motif || 'RDV' }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Table View -->
    <div v-else class="cde-table-wrap">
      <el-table
        :data="filteredAppointments"
        style="width:100%"
        size="small"
        aria-label="Rendez-vous du patient"
        @row-dblclick="openEdit"
      >
        <el-table-column prop="date" label="Date" width="110" />
        <el-table-column prop="time" label="Heure" width="80" />
        <el-table-column prop="motif" label="Motif" min-width="140" show-overflow-tooltip />
        <el-table-column label="Service" width="130">
          <template #default="{ row }">{{ row.service_name || '—' }}</template>
        </el-table-column>
        <el-table-column label="Unité de soins" width="120">
          <template #default="{ row }">{{ row.care_unit_name || '—' }}</template>
        </el-table-column>
        <el-table-column label="Médecin" width="140">
          <template #default="{ row }">{{ row.medecin_name || '—' }}</template>
        </el-table-column>
        <el-table-column label="Statut" width="120">
          <template #default="{ row }">
            <span :class="rdvBadgeClass(row.status)">
              {{ statutLabel(row.status) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Statut rapide" width="220">
          <template #default="{ row }">
            <el-button-group size="small">
              <el-button
                text
                :type="row.status === 'confirmed' ? 'primary' : ''"
                :disabled="row.status === 'confirmed'"
                @click="quickStatus(row, 'confirmed')"
              >
                Confirmer
              </el-button>
              <el-button
                text
                :type="row.status === 'done' ? 'success' : ''"
                :disabled="row.status === 'done'"
                @click="quickStatus(row, 'done')"
              >
                Effectué
              </el-button>
              <el-button
                text
                :type="row.status === 'cancelled' ? 'danger' : ''"
                :disabled="row.status === 'cancelled'"
                @click="quickStatus(row, 'cancelled')"
              >
                Annuler
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="100" align="right">
          <template #default="{ row }">
            <el-tooltip content="Modifier le rendez-vous" placement="top">
              <el-button
                size="small"
                text
                :icon="Edit"
                aria-label="Modifier"
                @click="openEdit(row)"
              />
            </el-tooltip>
            <el-tooltip content="Supprimer le rendez-vous" placement="top">
              <el-button
                size="small"
                text
                type="danger"
                :icon="Delete"
                aria-label="Supprimer"
                @click="handleDelete(row)"
              />
            </el-tooltip>
          </template>
        </el-table-column>
        <template #empty>
          <div class="cde-empty">Aucun rendez-vous pour ce filtre.</div>
        </template>
      </el-table>
    </div>

    <AppointmentFormDialog
      v-model:visible="formDialogVisible"
      :patient-id="patientId"
      :patient-name="patientName"
      :appointment="selectedAppointment"
      :initial-date="prefill.date"
      :initial-time="prefill.time"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowLeft, ArrowRight, Edit, Delete } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
import {
  listAppointmentsByPatient,
  deleteAppointment,
  updateAppointment,
  updateAppointmentStatus,
  toISODate,
  type AppointmentDto,
} from '@/composables/useAppointments'
import { usePatientContext } from '@/composables/usePatientContext'
import { usePastSlots } from '@/composables/usePastSlots'
import AppointmentFormDialog from '@/components/patients/AppointmentFormDialog.vue'
import PatientPageToolbar from '@/components/patients/PatientPageToolbar.vue'

const { isPastAppointment } = usePastSlots()

const route = useRoute()
const { activePatient } = usePatientContext()

const patientId = computed(() => Number(route.params.id) || activePatient.value?.id || 0)
const patientName = computed(() => {
  const p = activePatient.value
  return p ? `${p.prenom} ${p.nom}` : ''
})

type ViewMode = 'calendar' | 'table'
type FilterMode = 'today' | 'week' | 'all'
interface DayInfo { name: string; date: string; isoDate: string; isToday: boolean; fullDate: Date }

const viewMode = ref<ViewMode>('calendar')
const filterMode = ref<FilterMode>('all')
const loading = ref(true)
const error = ref('')
const appointments = ref<AppointmentDto[]>([])
const formDialogVisible = ref(false)
const selectedAppointment = ref<AppointmentDto | null>(null)
const prefill = ref<{ date: string; time: string }>({ date: '', time: '' })

// ─── Drag & Drop (HTML5 natif) ───
const draggedId = ref<number | null>(null)
const dragOverKey = ref('')

function onChipDragStart(e: DragEvent, rdv: AppointmentDto) {
  if (rdv.id == null) return
  draggedId.value = rdv.id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(rdv.id))
  }
}

function onChipDragEnd() {
  draggedId.value = null
  dragOverKey.value = ''
}

function onCellDragOver(day: DayInfo, hour: number) {
  dragOverKey.value = `${day.isoDate}-${hour}`
}

function onCellDragLeave() {
  dragOverKey.value = ''
}

async function onCellDrop(day: DayInfo, hour: number) {
  const id = draggedId.value
  dragOverKey.value = ''
  draggedId.value = null
  if (id == null) return
  const time = `${String(hour).padStart(2, '0')}:00`
  try {
    await updateAppointment(id, { date: day.isoDate, time })
    ElMessage.success(`RDV déplacé au ${day.isoDate} à ${time}`)
    await loadAppointments()
  } catch (e) {
    ElMessage.error(`Déplacement impossible: ${(e as Error).message}`)
  }
}

const todayStr = computed(() => toISODate(new Date()))

const filteredAppointments = computed(() => {
  if (filterMode.value === 'all') return appointments.value
  if (filterMode.value === 'today') {
    return appointments.value.filter(a => a.date === todayStr.value)
  }
  // week: filter by current week
  const weekStart = getWeekStart(new Date())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  return appointments.value.filter(a => {
    if (!a.date) return false
    const d = new Date(a.date + 'T00:00:00')
    return d >= weekStart && d < weekEnd
  })
})

// Calendar state
const currentWeekStart = ref(getWeekStart(new Date()))

const weekDays = computed<DayInfo[]>(() => {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart.value)
    d.setDate(d.getDate() + i)
    const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
    const iso = toISODate(d)
    d.setHours(0, 0, 0, 0)
    return {
      name: days[i] ?? '',
      date: dateStr,
      isoDate: iso,
      isToday: d.getTime() === today.getTime(),
      fullDate: new Date(d),
    }
  })
})

const hours = Array.from({ length: 10 }, (_, i) => i + 8)

const weekLabel = computed(() => {
  const start = weekDays.value[0]!
  const end = weekDays.value[6]!
  return `${start.date} — ${end.date}`
})

function getWeekStart(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function previousWeek() {
  const d = new Date(currentWeekStart.value)
  d.setDate(d.getDate() - 7)
  currentWeekStart.value = d
}

function nextWeek() {
  const d = new Date(currentWeekStart.value)
  d.setDate(d.getDate() + 7)
  currentWeekStart.value = d
}

function goToToday() {
  currentWeekStart.value = getWeekStart(new Date())
}

function getAppointmentsBySlot(day: DayInfo, hour: number) {
  return filteredAppointments.value.filter(a => {
    if (!a.date) return false
    if (a.date !== day.isoDate) return false
    const aHour = parseInt(a.time?.split(':')[0] || '0', 10)
    return aHour === hour
  })
}

function onCellClick(day: DayInfo, hour: number) {
  selectedAppointment.value = null
  prefill.value = { date: day.isoDate, time: `${String(hour).padStart(2, '0')}:00` }
  formDialogVisible.value = true
}

function openCreate() {
  selectedAppointment.value = null
  prefill.value = { date: '', time: '' }
  formDialogVisible.value = true
}

function openEdit(rdv: AppointmentDto) {
  selectedAppointment.value = rdv
  formDialogVisible.value = true
}

async function quickStatus(rdv: AppointmentDto, status: NonNullable<AppointmentDto['status']>) {
  if (rdv.id == null) return
  try {
    await updateAppointmentStatus(rdv.id, status)
    ElMessage.success(`Statut → ${statutLabel(status)}`)
    await loadAppointments()
  } catch (e) {
    ElMessage.error(`Statut impossible: ${(e as Error).message}`)
  }
}

async function handleDelete(rdv: AppointmentDto) {
  if (!rdv.id) return
  try {
    await ElMessageBox.confirm(
      'Supprimer ce rendez-vous ?',
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' },
    )
    await deleteAppointment(rdv.id)
    ElMessage.success('Rendez-vous supprimé')
    await loadAppointments()
  } catch {
    // cancelled
  }
}

function onSaved() {
  loadAppointments()
}

async function loadAppointments() {
  const pid = patientId.value
  if (!pid) {
    loading.value = false
    error.value = 'Patient non identifié'
    return
  }
  loading.value = true
  error.value = ''
  try {
    appointments.value = await listAppointmentsByPatient(pid)
  } catch (e) {
    error.value = `Erreur: ${(e as Error).message}`
    appointments.value = []
  } finally {
    loading.value = false
  }
}

/** Classe de badge CDE correspondant au statut d'un rendez-vous. */
function rdvBadgeClass(s?: string): string {
  switch (s) {
    case 'confirmed': return 'cde-badge cde-badge--info'
    case 'cancelled': return 'cde-badge cde-badge--danger'
    case 'pending': return 'cde-badge cde-badge--warning'
    case 'done': return 'cde-badge cde-badge--success'
    default: return 'cde-badge cde-badge--muted'
  }
}

function statutLabel(s?: string): string {
  switch (s) {
    case 'confirmed': return 'Confirmé'
    case 'cancelled': return 'Annulé'
    case 'pending': return 'En attente'
    case 'done': return 'Effectué'
    default: return s || '—'
  }
}

onMounted(() => {
  loadAppointments()
})
</script>

<style scoped>
.rdv-view__loading {
  padding: 16px 0;
}

.rdv-view__error {
  padding: 8px 0;
}

.rdv-calendar__frame {
  overflow-x: auto;
}

/* Calendar grid */
.rdv-calendar__grid {
  display: grid;
  grid-template-columns: 72px repeat(7, minmax(0, 1fr));
  min-width: 720px;
  background: var(--cd-card-bg);
}

.rdv-calendar__time-header,
.rdv-calendar__day-header {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 7px 8px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  color: var(--cde-muted);
  background: var(--cd-gray-50);
  border-bottom: 1px solid var(--cd-border);
}

.rdv-calendar__day-header--today {
  color: var(--cd-primary-dark);
  background: var(--cd-gray-100);
  box-shadow: inset 0 -2px 0 var(--cd-primary);
}

.rdv-calendar__day-header--today .rdv-calendar__day-date {
  color: var(--cd-gray-900);
}

.rdv-calendar__day-name {
  display: block;
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.rdv-calendar__day-date {
  display: block;
  margin-top: 1px;
  font-size: 13px;
  font-weight: 600;
  color: var(--cd-gray-900);
}

.rdv-calendar__time-cell {
  padding: 8px;
  font-size: 11px;
  color: var(--cde-muted);
  text-align: right;
  background: var(--cd-gray-50);
  border-right: 1px solid var(--cd-border);
  border-bottom: 1px solid var(--cd-border);
}

.rdv-calendar__cell {
  min-height: 56px;
  padding: 3px;
  border-right: 1px solid var(--cd-border);
  border-bottom: 1px solid var(--cd-border);
  cursor: pointer;
}

.rdv-calendar__cell:hover {
  background: var(--cd-gray-50);
}

.rdv-calendar__cell--dragover {
  background: var(--cd-gray-100);
  outline: 2px dashed var(--cd-primary);
  outline-offset: -2px;
}

.rdv-calendar__rdv {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  margin-bottom: 3px;
  padding: 2px 7px;
  font-size: 11.5px;
  color: var(--cd-gray-900);
  background: var(--cd-card-bg);
  border: 1px solid var(--cd-border);
  border-left: 3px solid var(--cd-gray-400);
  border-radius: 3px;
  cursor: grab;
}

.rdv-calendar__rdv:active {
  cursor: grabbing;
}

.rdv-calendar__rdv--confirmed {
  border-left-color: var(--cd-primary);
}

.rdv-calendar__rdv--cancelled {
  border-left-color: var(--cd-alert-red);
}

.rdv-calendar__rdv--pending {
  border-left-color: var(--cd-warning);
}

.rdv-calendar__rdv--done {
  border-left-color: var(--cd-success);
}

.rdv-calendar__rdv--past {
  color: var(--cde-danger);
  background: var(--cde-danger-tint);
  border-color: color-mix(in srgb, var(--cde-danger) 30%, transparent);
  border-left-color: var(--cde-danger);
}

.rdv-calendar__rdv--past .rdv-calendar__rdv-time {
  color: var(--cde-danger);
}

.rdv-calendar__rdv-time {
  flex-shrink: 0;
  font-weight: 600;
  color: var(--cde-muted);
}

.rdv-calendar__rdv-type {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
