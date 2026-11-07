<template>
  <div class="planning">
    <div class="planning__header">
      <div>
        <h1 class="planning__title">Planning des rendez-vous</h1>
        <p class="planning__subtitle">Glissez-déposez un RDV pour le déplacer. Cliquez sur une case libre pour créer.</p>
      </div>
      <div class="planning__actions">
        <el-button-group>
          <el-button :icon="ArrowLeft" aria-label="Semaine précédente" @click="previousWeek" />
          <el-button class="planning__week-label">{{ weekLabel }}</el-button>
          <el-button :icon="ArrowRight" aria-label="Semaine suivante" @click="nextWeek" />
        </el-button-group>
        <el-button @click="goToToday">Aujourd'hui</el-button>
        <el-select
          v-model="selectedPlanningPatientId"
          filterable
          clearable
          placeholder="Patient pour nouveau RDV…"
          aria-label="Patient pour nouveau rendez-vous"
          style="width: min(240px, 100%)"
        >
          <el-option
            v-for="p in patients"
            :key="p.id"
            :label="`${p.prenom} ${p.nom}`"
            :value="p.id"
          />
        </el-select>
        <el-button type="primary" :icon="Plus" @click="openCreate">Nouveau RDV</el-button>
      </div>
    </div>

    <div v-if="loading" class="planning__loading">
      <el-skeleton :rows="4" animated />
    </div>
    <div v-else-if="error" class="planning__error">
      <el-alert :title="error" type="error" show-icon :closable="false" />
      <el-button size="small" style="margin-top:12px" @click="loadWeek">Réessayer</el-button>
    </div>

    <div v-else class="cde-table-card">
    <div class="planning__grid">
      <div class="planning__time-header">Heure</div>
      <div
        v-for="day in weekDays"
        :key="day.isoDate"
        class="planning__day-header"
        :class="{ 'planning__day-header--today': day.isToday }"
        :data-day="day.isoDate"
      >
        <span class="planning__day-name">{{ day.name }}</span>
        <span class="planning__day-date">{{ day.date }}</span>
      </div>

      <template v-for="hour in hours" :key="hour">
        <div class="planning__time-cell">{{ hour }}:00</div>
        <div
          v-for="day in weekDays"
          :key="`${day.isoDate}-${hour}`"
          class="planning__cell"
          :class="{ 'planning__cell--dragover': dragOverKey === `${day.isoDate}-${hour}` }"
          :data-slot="`${day.isoDate}-${hour}`"
          @click="onCellClick(day, hour)"
          @dragover.prevent="onCellDragOver(day, hour)"
          @dragleave="onCellDragLeave"
          @drop.prevent="onCellDrop(day, hour)"
        >
          <div
            v-for="rdv in getAppointments(day.isoDate, hour)"
            :key="rdv.id"
            class="planning__rdv"
            :class="[
              `planning__rdv--${rdv.status}`,
              { 'planning__rdv--past': isPastAppointment(rdv.date, rdv.time) },
            ]"
            :data-rdv-id="rdv.id"
            draggable="true"
            @dragstart="onChipDragStart($event, rdv)"
            @dragend="onChipDragEnd"
            @click.stop="openEdit(rdv)"
            :title="`${rdv.time} — ${patientLabel(rdv)} (glisser pour déplacer)`"
          >
            <span class="planning__rdv-time">{{ rdv.time }}</span>
            <span class="planning__rdv-patient">{{ patientLabel(rdv) }}</span>
          </div>
        </div>
      </template>
    </div>
    </div>

    <AppointmentFormDialog
      v-model:visible="formVisible"
      :patient-id="selectedPlanningPatientId || 0"
      :patient-name="selectedPlanningPatientName"
      :appointment="selectedAppointment"
      :initial-date="prefill.date"
      :initial-time="prefill.time"
      editable-patient
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, Plus } from '@element-plus/icons-vue'
import { listAppointments, updateAppointment, toISODate, type AppointmentDto } from '@/composables/useAppointments'
import { usePatients } from '@/composables/usePatients'
import { usePastSlots } from '@/composables/usePastSlots'
import AppointmentFormDialog from '@/components/patients/AppointmentFormDialog.vue'

interface DayInfo { name: string; date: string; isoDate: string; isToday: boolean; fullDate: Date }

const { isPastAppointment } = usePastSlots()

const currentWeekStart = ref(getWeekStart(new Date()))
const appointments = ref<AppointmentDto[]>([])
const loading = ref(true)
const error = ref('')
const formVisible = ref(false)
const selectedAppointment = ref<AppointmentDto | null>(null)
const prefill = ref<{ date: string; time: string }>({ date: '', time: '' })
const selectedPlanningPatientId = ref<number | null>(null)

const { patients, fetchPatients } = usePatients()

const selectedPlanningPatientName = computed(() => {
  const p = patients.value.find(x => x.id === selectedPlanningPatientId.value)
  return p ? `${p.prenom} ${p.nom}` : ''
})

const patientNameById = computed(() => {
  const m = new Map<number, string>()
  for (const p of patients.value) m.set(p.id, `${p.prenom} ${p.nom}`)
  return m
})

function patientLabel(rdv: AppointmentDto): string {
  if (rdv.patient_id != null && patientNameById.value.has(rdv.patient_id)) {
    return patientNameById.value.get(rdv.patient_id) ?? `Patient #${rdv.patient_id}`
  }
  return (rdv as unknown as { patient?: string }).patient ?? (rdv.motif || `Patient #${rdv.patient_id ?? '?'}`)
}

// ─── Drag & Drop natif ───
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
    await loadWeek()
  } catch (e) {
    ElMessage.error(`Déplacement impossible: ${(e as Error).message}`)
  }
}

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

const hours = Array.from({ length: 10 }, (_, i) => i + 8) // 8h-17h

const weekLabel = computed(() => {
  const start = weekDays.value[0]!
  const end = weekDays.value[6]!
  return `${start.date} — ${end.date}`
})

const weekIsoSet = computed(() => new Set(weekDays.value.map(d => d.isoDate)))

const weekAppointments = computed(() =>
  appointments.value.filter(a => a.date != null && weekIsoSet.value.has(a.date)),
)

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

function getAppointments(isoDate: string, hour: number) {
  return weekAppointments.value.filter(a => {
    if (a.date !== isoDate) return false
    const aHour = parseInt(a.time?.split(':')[0] || '0', 10)
    return aHour === hour
  })
}

function onCellClick(day: DayInfo, hour: number) {
  selectedAppointment.value = null
  prefill.value = { date: day.isoDate, time: `${String(hour).padStart(2, '0')}:00` }
  formVisible.value = true
}

function openCreate() {
  if (!selectedPlanningPatientId.value) {
    ElMessage.warning('Sélectionnez un patient pour créer un RDV (ou choisissez-le dans le dialogue).')
  }
  selectedAppointment.value = null
  prefill.value = { date: '', time: '' }
  formVisible.value = true
}

function openEdit(rdv: AppointmentDto) {
  selectedAppointment.value = rdv
  if (rdv.patient_id) selectedPlanningPatientId.value = rdv.patient_id
  formVisible.value = true
}

function onSaved() {
  loadWeek()
}

async function loadWeek() {
  loading.value = true
  error.value = ''
  try {
    // list() sans filtre → listJoined côté service, puis filtre semaine côté UI
    appointments.value = await listAppointments()
  } catch (e) {
    error.value = `Erreur: ${(e as Error).message}`
    appointments.value = []
  } finally {
    loading.value = false
  }
}

watch(currentWeekStart, () => {
  // Les données sont déjà chargées (toute période) ; le computed weekAppointments refiltre.
})

onMounted(async () => {
  try { await fetchPatients() } catch { /* silencieux */ }
  await loadWeek()
})
</script>

<style scoped>
.planning__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--cd-space-6);
  flex-wrap: wrap;
  gap: 12px;
}

.planning__title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--cd-gray-900);
}

.planning__subtitle {
  font-size: 13px;
  color: var(--cd-gray-400);
  margin-top: 2px;
}

.planning__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.planning__week-label {
  min-width: 140px;
  font-weight: 600;
}

.planning__loading,
.planning__error {
  padding: 16px 0;
}

.planning__grid {
  display: grid;
  grid-template-columns: 80px repeat(7, minmax(0, 1fr));
  min-width: 720px;
  border: 1px solid var(--cd-border);
  border-radius: var(--cd-radius-md);
  background: var(--cd-card-bg);
  box-shadow: var(--cd-shadow-sm);
}

.cde-table-card > .planning__grid {
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.planning__time-header,
.planning__day-header {
  padding: 12px 8px;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  background: var(--cd-gray-100);
  border-bottom: 1px solid var(--cd-border);
  position: sticky;
  top: 0;
  z-index: 2;
}

.planning__day-header--today {
  background: var(--cd-primary);
  color: white;
}

.planning__day-header--today .planning__day-date {
  color: white;
}

.planning__day-name {
  display: block;
  text-transform: uppercase;
  font-size: 11px;
}

.planning__day-date {
  display: block;
  font-size: 16px;
  margin-top: 2px;
}

.planning__time-cell {
  padding: 8px;
  font-size: 12px;
  color: var(--cd-gray-400);
  border-right: 1px solid var(--cd-border);
  border-bottom: 1px solid var(--cd-border);
  text-align: right;
  background: var(--cd-gray-50);
}

.planning__cell {
  min-height: 64px;
  padding: 4px;
  border-right: 1px solid var(--cd-border);
  border-bottom: 1px solid var(--cd-border);
  cursor: pointer;
  transition: background 0.15s;
}

.planning__cell:hover,
.planning__cell:focus-visible {
  background: var(--cd-primary-lighter);
}

.planning__cell--dragover {
  background: var(--cd-info-bg);
  outline: 2px dashed var(--cd-primary);
  outline-offset: -2px;
}

.planning__rdv {
  padding: 4px 8px;
  border-radius: var(--cd-radius-sm);
  font-size: 12px;
  margin-bottom: 4px;
  cursor: grab;
  display: flex;
  gap: 6px;
  border: 1px solid transparent;
  min-height: 32px;
  align-items: center;
}

.planning__rdv:active {
  cursor: grabbing;
}

.planning__rdv--confirmed {
  background: var(--cd-primary-lighter);
  color: var(--cd-primary-dark);
  border-color: var(--cd-primary);
}

.planning__rdv--pending {
  background: var(--cd-warning-bg);
  color: var(--cd-warning);
  border-color: var(--cd-accent-gold);
}

.planning__rdv--cancelled {
  background: var(--cd-danger-bg);
  color: var(--cd-secondary);
  border-color: var(--cd-secondary-light);
}

.planning__rdv--done {
  background: var(--cd-success-bg);
  color: var(--cd-success);
  border-color: var(--cd-success);
}

.planning__rdv--past {
  background: var(--cde-danger-tint);
  color: var(--cde-danger);
  border-color: color-mix(in srgb, var(--cde-danger) 35%, transparent);
  border-left: 3px solid var(--cde-danger);
}

.planning__rdv--past .planning__rdv-time {
  color: var(--cde-danger);
}

.planning__rdv-time {
  font-weight: 600;
}

.planning__rdv-patient {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
