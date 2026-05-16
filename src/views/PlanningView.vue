<template>
  <div class="planning">
    <div class="planning__header">
      <h1 class="planning__title">Planning des rendez-vous</h1>
      <div class="planning__actions">
        <el-button-group>
          <el-button :icon="ArrowLeft" @click="previousWeek" />
          <el-button class="planning__week-label">{{ weekLabel }}</el-button>
          <el-button :icon="ArrowRight" @click="nextWeek" />
        </el-button-group>
        <el-button type="primary" :icon="Plus">Nouveau RDV</el-button>
      </div>
    </div>

    <div class="planning__grid">
      <div class="planning__time-header">Heure</div>
      <div
        v-for="day in weekDays"
        :key="day.date"
        class="planning__day-header"
        :class="{ 'planning__day-header--today': day.isToday }"
      >
        <span class="planning__day-name">{{ day.name }}</span>
        <span class="planning__day-date">{{ day.date }}</span>
      </div>

      <template v-for="hour in hours" :key="hour">
        <div class="planning__time-cell">{{ hour }}:00</div>
        <div
          v-for="day in weekDays"
          :key="`${day.date}-${hour}`"
          class="planning__cell"
          @click="onCellClick(day.date, hour)"
        >
          <div
            v-for="rdv in getAppointments(day.date, hour)"
            :key="rdv.id"
            class="planning__rdv"
            :class="`planning__rdv--${rdv.status}`"
          >
            <span class="planning__rdv-time">{{ rdv.time }}</span>
            <span class="planning__rdv-patient">{{ rdv.patient }}</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowLeft, ArrowRight, Plus } from '@element-plus/icons-vue'

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

const hours = Array.from({ length: 10 }, (_, i) => i + 8) // 8h-17h

const weekLabel = computed(() => {
  const start = weekDays.value[0]
  const end = weekDays.value[6]
  return `${start.date} — ${end.date}`
})

const appointments = ref([
  { id: '1', day: 0, hour: 9, time: '09:00', patient: 'Dupont Marie', status: 'confirmed' },
  { id: '2', day: 0, hour: 10, time: '10:30', patient: 'Diallo Amadou', status: 'pending' },
  { id: '3', day: 2, hour: 14, time: '14:00', patient: 'Martin Sophie', status: 'confirmed' },
  { id: '4', day: 3, hour: 11, time: '11:00', patient: 'Bernard Pierre', status: 'confirmed' },
])

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

function getAppointments(dateStr: string, hour: number) {
  const dayIndex = weekDays.value.findIndex(d => d.date === dateStr)
  return appointments.value.filter(a => a.day === dayIndex && a.hour === hour)
}

function onCellClick(_date: string, _hour: number) {
  // Ouvrir le formulaire de création de RDV
}
</script>

<style scoped>
.planning__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.planning__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--cd-gray-900);
}

.planning__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.planning__week-label {
  min-width: 140px;
  font-weight: 600;
}

.planning__grid {
  display: grid;
  grid-template-columns: 80px repeat(7, 1fr);
  border: 1px solid var(--cd-gray-200);
  border-radius: 8px;
  overflow: hidden;
  background: var(--cd-white);
}

.planning__time-header,
.planning__day-header {
  padding: 12px 8px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  background: var(--cd-gray-100);
  border-bottom: 1px solid var(--cd-gray-200);
}

.planning__day-header--today {
  background: var(--cd-primary);
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
  border-right: 1px solid var(--cd-gray-200);
  border-bottom: 1px solid var(--cd-gray-200);
  text-align: right;
}

.planning__cell {
  min-height: 60px;
  padding: 4px;
  border-right: 1px solid var(--cd-gray-200);
  border-bottom: 1px solid var(--cd-gray-200);
  cursor: pointer;
  transition: background 0.15s;
}

.planning__cell:hover {
  background: var(--cd-gray-100);
}

.planning__rdv {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  margin-bottom: 2px;
  cursor: pointer;
  display: flex;
  gap: 4px;
}

.planning__rdv--confirmed {
  background: #EBF6F5;
  color: var(--cd-primary);
}

.planning__rdv--pending {
  background: #FEF3C7;
  color: #D97706;
}

.planning__rdv--cancelled {
  background: #FEF2F2;
  color: var(--cd-secondary);
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
