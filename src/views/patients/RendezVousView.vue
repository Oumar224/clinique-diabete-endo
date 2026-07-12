<template>
  <div class="rdv-view">
    <div class="rdv-view__header">
      <h3 class="rdv-view__title">Rendez-vous du patient</h3>
      <div class="rdv-view__toolbar">
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="calendar">Calendrier</el-radio-button>
          <el-radio-button value="table">Tableau</el-radio-button>
        </el-radio-group>
        <el-button-group size="small">
          <el-button :type="filterMode === 'today' ? 'primary' : ''" @click="filterMode = 'today'">Aujourd'hui</el-button>
          <el-button :type="filterMode === 'week' ? 'primary' : ''" @click="filterMode = 'week'">Cette semaine</el-button>
          <el-button :type="filterMode === 'all' ? 'primary' : ''" @click="filterMode = 'all'">Tous</el-button>
        </el-button-group>
        <el-button type="primary" size="small" :icon="Plus" @click="openCreate">Planifier</el-button>
      </div>
    </div>

    <div v-if="loading" class="rdv-view__loading">
      <el-skeleton :rows="4" animated />
    </div>

    <div v-else-if="error" class="rdv-view__error">
      <el-alert :title="error" type="error" show-icon :closable="false" />
      <el-button size="small" style="margin-top:12px" @click="loadAppointments">Réessayer</el-button>
    </div>

    <!-- Calendar View -->
    <div v-else-if="viewMode === 'calendar'" class="rdv-view__calendar">
      <div class="rdv-calendar__nav">
        <el-button-group>
          <el-button size="small" :icon="ArrowLeft" @click="previousWeek" />
          <el-button size="small" class="rdv-calendar__week-label">{{ weekLabel }}</el-button>
          <el-button size="small" :icon="ArrowRight" @click="nextWeek" />
          <el-button size="small" @click="goToToday">Aujourd'hui</el-button>
        </el-button-group>
      </div>

      <div class="rdv-calendar__grid">
        <div class="rdv-calendar__time-header">Heure</div>
        <div
          v-for="day in weekDays"
          :key="day.date"
          class="rdv-calendar__day-header"
          :class="{ 'rdv-calendar__day-header--today': day.isToday }"
        >
          <span class="rdv-calendar__day-name">{{ day.name }}</span>
          <span class="rdv-calendar__day-date">{{ day.date }}</span>
        </div>

        <template v-for="hour in hours" :key="hour">
          <div class="rdv-calendar__time-cell">{{ hour }}:00</div>
          <div
            v-for="day in weekDays"
            :key="`${day.date}-${hour}`"
            class="rdv-calendar__cell"
            @click="onCellClick(day, hour)"
          >
            <div
              v-for="rdv in getAppointmentsBySlot(day, hour)"
              :key="rdv.id"
              class="rdv-calendar__rdv"
              :class="`rdv-calendar__rdv--${rdv.status}`"
              @click.stop="openEdit(rdv)"
            >
              <span class="rdv-calendar__rdv-time">{{ rdv.time }}</span>
              <span class="rdv-calendar__rdv-type">{{ rdv.motif || 'RDV' }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Table View -->
    <div v-else class="rdv-view__table">
      <el-table :data="filteredAppointments" style="width:100%" size="small" border @row-dblclick="openEdit">
        <el-table-column prop="date" label="Date" width="110" />
        <el-table-column prop="time" label="Heure" width="80" />
        <el-table-column prop="motif" label="Motif" min-width="140" />
        <el-table-column label="Service" width="130">
          <template #default="{ row }">{{ row.service_name || '—' }}</template>
        </el-table-column>
        <el-table-column label="Unité de soins" width="120">
          <template #default="{ row }">{{ row.care_unit_name || '—' }}</template>
        </el-table-column>
        <el-table-column label="Médecin" width="140">
          <template #default="{ row }">{{ row.medecin_name || '—' }}</template>
        </el-table-column>
        <el-table-column label="Statut" width="100">
          <template #default="{ row }">
            <el-tag :type="rdvStatutType(row.status)" size="small">
              {{ statutLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="100" align="center">
          <template #default="{ row }">
            <el-button size="small" circle :icon="Edit" @click="openEdit(row)" />
            <el-button size="small" circle type="danger" :icon="Delete" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <AppointmentFormDialog
      v-model:visible="formDialogVisible"
      :patient-id="patientId"
      :patient-name="patientName"
      :appointment="selectedAppointment"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowLeft, ArrowRight, Edit, Delete } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
import { listAppointmentsByPatient, deleteAppointment, type AppointmentDto } from '@/composables/useAppointments'
import { usePatientContext } from '@/composables/usePatientContext'
import AppointmentFormDialog from '@/components/patients/AppointmentFormDialog.vue'

const route = useRoute()
const { activePatient } = usePatientContext()

const patientId = computed(() => Number(route.params.id) || activePatient.value?.id || 0)
const patientName = computed(() => {
  const p = activePatient.value
  return p ? `${p.prenom} ${p.nom}` : ''
})

type ViewMode = 'calendar' | 'table'
type FilterMode = 'today' | 'week' | 'all'

const viewMode = ref<ViewMode>('calendar')
const filterMode = ref<FilterMode>('all')
const loading = ref(true)
const error = ref('')
const appointments = ref<AppointmentDto[]>([])
const formDialogVisible = ref(false)
const selectedAppointment = ref<AppointmentDto | null>(null)

const todayStr = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
})

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

const weekDays = computed(() => {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart.value)
    d.setDate(d.getDate() + i)
    const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
    d.setHours(0, 0, 0, 0)
    return {
      name: days[i],
      date: dateStr,
      isToday: d.getTime() === today.getTime(),
      fullDate: new Date(d),
    }
  })
})

const hours = Array.from({ length: 10 }, (_, i) => i + 8)

const weekLabel = computed(() => {
  const start = weekDays.value[0]
  const end = weekDays.value[6]
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

function getAppointmentsBySlot(day: { date: string; fullDate: Date }, hour: number) {
  const dayStart = new Date(day.fullDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  return filteredAppointments.value.filter(a => {
    if (!a.date) return false
    const aDate = new Date(a.date + 'T00:00:00')
    const aHour = parseInt(a.time?.split(':')[0] || '0')
    return aDate >= dayStart && aDate < dayEnd && aHour === hour
  })
}

function onCellClick(_day: { fullDate: Date }, _hour: number) {
  selectedAppointment.value = null
  formDialogVisible.value = true
}

function openCreate() {
  selectedAppointment.value = null
  formDialogVisible.value = true
}

function openEdit(rdv: AppointmentDto) {
  selectedAppointment.value = rdv
  formDialogVisible.value = true
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

function rdvStatutType(s?: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  switch (s) {
    case 'confirmed': return 'primary'
    case 'cancelled': return 'danger'
    case 'pending': return 'warning'
    case 'done': return 'success'
    default: return 'info'
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
.rdv-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.rdv-view__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--cd-gray-900);
  margin: 0;
}

.rdv-view__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.rdv-view__loading {
  padding: 24px 0;
}

.rdv-view__error {
  padding: 12px 0;
}

/* Calendar navigation */
.rdv-calendar__nav {
  margin-bottom: 16px;
}

.rdv-calendar__week-label {
  min-width: 140px;
  font-weight: 600;
}

/* Calendar grid */
.rdv-calendar__grid {
  display: grid;
  grid-template-columns: 80px repeat(7, 1fr);
  border: 1px solid var(--cd-gray-200);
  border-radius: 8px;
  overflow: hidden;
  background: var(--cd-widget-bg);
}

.rdv-calendar__time-header,
.rdv-calendar__day-header {
  padding: 10px 8px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  background: var(--cd-gray-100);
  border-bottom: 1px solid var(--cd-gray-200);
}

.rdv-calendar__day-header--today {
  background: var(--cd-primary);
  color: white;
}

.rdv-calendar__day-name {
  display: block;
  text-transform: uppercase;
  font-size: 11px;
}

.rdv-calendar__day-date {
  display: block;
  font-size: 15px;
  margin-top: 2px;
}

.rdv-calendar__time-cell {
  padding: 8px;
  font-size: 12px;
  color: var(--cd-gray-400);
  border-right: 1px solid var(--cd-gray-200);
  border-bottom: 1px solid var(--cd-gray-200);
  text-align: right;
}

.rdv-calendar__cell {
  min-height: 60px;
  padding: 4px;
  border-right: 1px solid var(--cd-gray-200);
  border-bottom: 1px solid var(--cd-gray-200);
  cursor: pointer;
  transition: background 0.15s;
}

.rdv-calendar__cell:hover {
  background: var(--cd-gray-100);
}

.rdv-calendar__rdv {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  margin-bottom: 2px;
  cursor: pointer;
  display: flex;
  gap: 4px;
}

.rdv-calendar__rdv--confirmed {
  background: #EBF6F5;
  color: var(--cd-primary);
}

.rdv-calendar__rdv--cancelled {
  background: #FEF2F2;
  color: var(--cd-secondary);
}

.rdv-calendar__rdv--pending {
  background: #FEF3C7;
  color: #D97706;
}

.rdv-calendar__rdv--done {
  background: #E8F5E9;
  color: #2E7D32;
}

.rdv-calendar__rdv-time {
  font-weight: 600;
  flex-shrink: 0;
}

.rdv-calendar__rdv-type {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
