<template>
  <div class="vital-check cde" v-loading="gridLoading">
    <div v-if="error" class="vital-check__error cde-alert cde-alert--danger">
      <el-alert :title="error" type="error" show-icon :closable="true" @close="error = null" />
    </div>

    <div class="cde-page-toolbar">
      <div class="cde-page-actions">
        <span class="vital-check__range-label">{{ rangeLabel }}</span>
        <el-button :icon="Refresh" :loading="gridLoading" @click="onRefresh">
          Actualiser
        </el-button>
      </div>
    </div>

    <div class="vital-check__grid-wrapper">
      <div class="vital-check__grid" :style="{ gridTemplateColumns: gridColumns }">
        <!-- HEADER ROW -->
        <div class="vital-check__const-header" style="grid-row: 1; grid-column: 1">Constantes</div>
        <div
          v-for="(day, di) in displayDays"
          :key="'d-' + di"
          class="vital-check__date-header"
          :class="{ 'vital-check__date-header--today': day.isToday }"
          :data-date="day.dateKey"
          :style="{ gridRow: 1, gridColumn: `${2 + di * hours.length} / ${2 + (di + 1) * hours.length}` }"
        >
          <div class="vital-check__date-text">
            {{ day.weekday }} <span class="vital-check__date-text-date">{{ day.dateLabel }}</span>
          </div>
          <div class="vital-check__date-hours-row">
            <span
              v-for="hour in hours"
              :key="hour"
              class="vital-check__date-hour"
              :class="{ 'vital-check__date-hour--now': day.isToday && hour === currentHour }"
              @click="openHourDialog(day.dateKey, hour)"
            >
              {{ String(hour).padStart(2, '0') }}:00
            </span>
          </div>
        </div>

        <!-- DATA ROWS: one per constant -->
        <template v-for="(row, ri) in CONSTANTS_ROWS" :key="row.key">
          <!-- Fixed column -->
          <div class="vital-check__const-cell" :style="{ gridRow: ri + 2, gridColumn: 1 }">
            <div class="vital-check__const-name">{{ row.label }}</div>
            <div v-if="row.unit" class="vital-check__const-unit">{{ row.unit }}</div>
          </div>
          <!-- Day × Hour cells -->
          <template v-for="(day, di) in displayDays" :key="'d-' + di">
            <div
              v-for="(h, hi) in hours"
              :key="'h-' + hi"
              class="vital-check__cell"
              :class="{ 'vital-check__cell--now': day.isToday && h === currentHour }"
              :style="{ gridRow: ri + 2, gridColumn: 2 + di * hours.length + hi }"
              :data-row="row.key"
              :data-date="day.dateKey"
              :data-hour="h"
              @click="openHourDialog(day.dateKey, h)"
            >
              <span
                v-if="getValue(day.dateKey, h, row.key) !== null"
                class="vital-check__cell-value"
                :class="{ 'vital-check__value--alert': isAlertValue(row.key, getValue(day.dateKey, h, row.key)) }"
              >
                {{ formatValue(getValue(day.dateKey, h, row.key), row) }}
              </span>
            </div>
          </template>
        </template>
      </div>
    </div>

    <!-- Hour dialog → edit all constants for one (date, hour) -->
    <el-dialog v-model="showHourDialog" :title="hourDialogTitle" width="480px" top="5vh">
      <el-form ref="hourFormRef" :model="hourForm" label-position="top" size="small">
        <el-row :gutter="16">
          <el-col :span="12" v-for="row in CONSTANTS_ROWS" :key="row.key">
            <el-form-item :label="rowLabel(row)">
              <template v-if="row.type === 'number'">
                <el-input-number
                  v-model="hourForm[row.key]"
                  :min="row.min ?? 0"
                  :max="row.max ?? 9999"
                  :step="row.step ?? 1"
                  :precision="row.precision ?? 0"
                  :class="{ 'vital-check__value--alert-dialog': isAlertValue(row.key, hourForm[row.key]) }"
                  style="width:100%"
                  controls-position="right"
                />
              </template>
              <template v-else-if="row.type === 'qualitative'">
                <el-select v-model="hourForm[row.key]" placeholder="—" clearable style="width:100%">
                  <el-option v-for="opt in row.options" :key="opt" :label="opt" :value="opt" />
                </el-select>
              </template>
              <template v-else>
                <el-input v-model="hourForm[row.key]" />
              </template>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="onCancelHour">Annuler</el-button>
        <el-button type="primary" :loading="savingHour" @click="onSaveHour">
          Enregistrer
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive, nextTick, inject, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getVitalSignsItemsList, saveVitalSignsItem, type VitalSignsItemRecord } from '@/composables/useVitalSigns'
import {
  ROLLING_WINDOW_DAYS,
  buildRollingDays,
  startOfLocalDay,
  type RollingDay,
} from '@/utils/rolling-week'

const route = useRoute()

const patientId = computed<number | null>(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) ? id : null
})

/* ── Constants grid definition ── */

interface VitalGridRow {
  key: string
  label: string
  unit: string
  type: 'number' | 'qualitative' | 'text'
  min?: number
  max?: number
  step?: number
  precision?: number
  options?: string[]
}

function rowLabel(row: VitalGridRow): string {
  return row.unit ? `${row.label} (${row.unit})` : row.label
}

const CONSTANTS_ROWS: VitalGridRow[] = [
  { key: 'taSystolique', label: 'TA Systolique', unit: 'mmHg', type: 'number', min: 60, max: 260, step: 2, precision: 0 },
  { key: 'taDiastolique', label: 'TA Diastolique', unit: 'mmHg', type: 'number', min: 30, max: 150, step: 2, precision: 0 },
  { key: 'frequenceCardiaque', label: 'FC', unit: 'bpm', type: 'number', min: 20, max: 250, step: 1, precision: 0 },
  { key: 'temperature', label: 'Température', unit: '°C', type: 'number', min: 34, max: 42, step: 0.1, precision: 1 },
  { key: 'glycemie', label: 'Glycémie', unit: 'g/L', type: 'number', min: 0.1, max: 6, step: 0.1, precision: 2 },
  { key: 'cetonemie', label: 'Cétonémie', unit: 'mmol/l', type: 'number', min: 0, max: 8, step: 0.1, precision: 1 },
  { key: 'glucosurie', label: 'Glucosurie', unit: '', type: 'qualitative', options: ['+', '++', '+++'] },
  { key: 'cetonurie', label: 'Cétonurie', unit: '', type: 'qualitative', options: ['+', '++', '+++'] },
  { key: 'saO2', label: 'SaO₂', unit: '%', type: 'number', min: 50, max: 100, step: 1, precision: 0 },
  { key: 'diurese', label: 'Diurèse', unit: 'ml', type: 'number', min: 0, max: 10000, step: 50, precision: 0 },
  { key: 'poids', label: 'Poids', unit: 'kg', type: 'number', min: 0, max: 500, step: 0.1, precision: 1 },
]

const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]

/* ── Fenêtre glissante de 7 jours (convention « Résultats Bio ») ──
 *
 * Colonnes du jour le plus récent (index 0, aujourd'hui) vers le plus ancien.
 * La grille est toujours rendue, même sans constante : toutes les cellules
 * restent cliquables pour saisir une mesure.
 */

/** Dernier jour (le plus récent) de la fenêtre affichée. */
const windowEnd = ref(startOfLocalDay(new Date()))

const displayDays = computed<RollingDay[]>(() => buildRollingDays(windowEnd.value))

const rangeLabel = computed(() => {
  const newest = displayDays.value[0]
  const oldest = displayDays.value[displayDays.value.length - 1]
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  return `${fmt(newest.fullDate)} — ${fmt(oldest.fullDate)} · ${ROLLING_WINDOW_DAYS} jours`
})

const currentHour = computed(() => {
  const h = new Date().getHours()
  return [...hours].reverse().find(hr => hr <= h) ?? hours[0]
})

/* ── Grid columns ── */

const gridColumns = computed(() => {
  return `200px repeat(${displayDays.value.length * hours.length}, minmax(60px, 1fr))`
})

/* ── Data fetching ── */

const allItems = ref<Record<string, VitalSignsItemRecord>>({})
const gridLoading = ref(false)
const error = ref<string | null>(null)

function getValue(date: string, hour: number, key: string): number | string | null {
  const item = allItems.value[`${date}__${hour}`]
  return item ? (item as any)[key] ?? null : null
}

function formatValue(value: number | string | null, row: VitalGridRow): string {
  if (value == null) return ''
  if (row.type === 'number' && typeof value === 'number') {
    return row.precision != null ? value.toFixed(row.precision) : String(value)
  }
  return String(value)
}

async function fetchDisplayData(pid: number) {
  gridLoading.value = true
  error.value = null
  try {
    // Une seule requête bornée par la fenêtre affichée : [la plus ancienne … aujourd'hui].
    const days = displayDays.value
    const start = days[days.length - 1].dateKey
    const end = days[0].dateKey
    const records = await getVitalSignsItemsList(pid, start, end)
    const map: Record<string, VitalSignsItemRecord> = {}
    for (const r of records) {
      map[`${r.date}__${r.hour}`] = r
    }
    allItems.value = map
  } catch (e) {
    const msg = (e as Error).message
    error.value = msg
  } finally {
    gridLoading.value = false
  }
}

async function onRefresh() {
  if (patientId.value) {
    await fetchDisplayData(patientId.value)
  }
}

function scrollToCurrentTime() {
  nextTick(() => {
    const wrapper = document.querySelector('.vital-check__grid-wrapper')
    if (!wrapper) return
    // Today is always the first column.
    const idx = displayDays.value.findIndex(d => d.isToday)
    if (idx < 0) return
    const hourIdx = hours.indexOf(currentHour.value)
    if (hourIdx < 0) return
    const targetIdx = idx * hours.length + hourIdx
    const target = wrapper.querySelectorAll('.vital-check__date-hour')[targetIdx] as HTMLElement
    target?.scrollIntoView?.({ inline: 'center', block: 'nearest' })
  })
}

watch(patientId, async (pid) => {
  if (pid) {
    await fetchDisplayData(pid)
  } else {
    allItems.value = {}
  }
}, { immediate: true })

watch(gridLoading, (loading) => {
  if (!loading) {
    scrollToCurrentTime()
  }
})

/* ── React to tab activation ── */

const activeTab = inject<Ref<string>>('activeTab', ref(''))

watch(activeTab, (tab) => {
  if (tab === 'vital-check') {
    nextTick(() => scrollToCurrentTime())
  }
})

/* ── Hour dialog state ── */

const showHourDialog = ref(false)
const hourDialogDate = ref('')
const hourDialogHour = ref(6)

const hourDialogTitle = computed(() => {
  const day = displayDays.value.find(d => d.dateKey === hourDialogDate.value)
  const dateLabel = day
    ? `${String(day.fullDate.getDate()).padStart(2, '0')}/${String(day.fullDate.getMonth() + 1).padStart(2, '0')}`
    : hourDialogDate.value
  return `Constantes — ${dateLabel} à ${String(hourDialogHour.value).padStart(2, '0')}h00`
})

function createEmptyForm(): Record<string, any> {
  const form: Record<string, any> = {}
  for (const row of CONSTANTS_ROWS) {
    form[row.key] = null
  }
  return form
}

const hourForm = reactive<Record<string, any>>(createEmptyForm())

function openHourDialog(date: string, hour: number) {
  hourDialogDate.value = date
  hourDialogHour.value = hour

  // Populate form from existing values
  const item = allItems.value[`${date}__${hour}`]
  for (const row of CONSTANTS_ROWS) {
    hourForm[row.key] = item ? (item as any)[row.key] ?? null : null
  }

  showHourDialog.value = true
}

function onCancelHour() {
  hourFormRef.value?.resetFields()
  showHourDialog.value = false
}

/* ── Save hour ── */

const hourFormRef = ref<any>(null)
const savingHour = ref(false)

async function onSaveHour() {
  if (!patientId.value) return

  savingHour.value = true
  try {
    const data: Record<string, any> = {
      date: hourDialogDate.value,
      hour: hourDialogHour.value,
    }
    for (const row of CONSTANTS_ROWS) {
      data[row.key] = hourForm[row.key] ?? null
    }

    const saved = await saveVitalSignsItem(patientId.value, data as any)
    // Full refresh (dates list + range) so a first measurement of the day
    // adds today's column when missing.
    await fetchDisplayData(patientId.value)
    showHourDialog.value = false
    ElMessage.success(`Constantes enregistrées pour ${String(saved.hour).padStart(2, '0')}h00`)
  } catch (e) {
    ElMessage.error(`Erreur: ${(e as Error).message}`)
  } finally {
    savingHour.value = false
  }
}

/* ── Alert thresholds ── */

const ALERT_THRESHOLDS: Record<string, { high?: number; low?: number }> = {
  temperature: { high: 38 },
  glycemie: { high: 1.1 },
  frequenceCardiaque: { high: 120, low: 40 },
  taSystolique: { high: 180, low: 90 },
  taDiastolique: { high: 120, low: 60 },
  cetonemie: { high: 1.5 },
  saO2: { low: 90 },
}

function isAlertValue(key: string, value: number | string | null): boolean {
  if (value == null || value === '') return false
  const threshold = ALERT_THRESHOLDS[key]
  if (!threshold) return false
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (typeof num !== 'number' || isNaN(num)) return false
  if (threshold.high != null && num > threshold.high) return true
  if (threshold.low != null && num < threshold.low) return true
  return false
}

defineExpose({
  fetchDisplayData,
  displayDays,
  allItems,
  getValue,
  isAlertValue,
  hours,
})
</script>

<style scoped>
.vital-check__error {
  margin-bottom: 16px;
}

/* ── Range label ── */
.vital-check__range-label {
  font-size: 12px;
  color: var(--cde-muted);
  white-space: nowrap;
}

/* ── Grid wrapper ── */
.vital-check__grid-wrapper {
  overflow: auto;
  border: 1px solid var(--cd-gray-200);
  border-radius: 8px;
  background: var(--cd-widget-bg);
  max-height: calc(100vh - 260px);
}

.vital-check__grid {
  display: grid;
  background: var(--cd-widget-bg);
  min-width: max-content;
}

/* ── Header cells ── */
.vital-check__const-header {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  text-align: left;
  background: #AEB6BF;
  color: #1C2833;
  border-bottom: 1px solid #95A5A6;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: sticky;
  left: 0;
  top: 0;
  z-index: 4;
}

.vital-check__date-header {
  position: sticky;
  top: 0;
  z-index: 3;
  height: 40px;
  background: var(--cd-gray-100);
  border-bottom: 1px solid var(--cd-gray-200);
  border-right: 1px solid var(--cd-gray-200);
  padding: 0;
  display: flex;
  flex-direction: column;
}

.vital-check__date-header--today {
  background: var(--cd-primary);
  color: white;
}
.vital-check__date-header--today .vital-check__date-text {
  color: white;
}

.vital-check__date-text {
  padding: 6px 12px 2px;
  font-size: 11px;
  font-weight: 600;
  color: #1C2833;
  text-align: left;
  line-height: 1.2;
  white-space: nowrap;
}

.vital-check__date-text-date {
  color: var(--cd-gray-500);
  font-weight: 400;
}

.vital-check__date-header--today .vital-check__date-text-date {
  color: rgba(255, 255, 255, 0.85);
}

.vital-check__date-hours-row {
  display: flex;
  border-top: 1px solid var(--cd-gray-300);
}

.vital-check__date-header--today .vital-check__date-hours-row {
  border-top-color: rgba(255, 255, 255, 0.3);
}

.vital-check__date-hour {
  flex: 1;
  padding: 2px 4px;
  font-size: 10px;
  font-weight: 600;
  text-align: center;
  color: var(--cd-gray-600);
  border-right: 1px solid var(--cd-gray-200);
  cursor: pointer;
  transition: background 0.15s;
}

.vital-check__date-header--today .vital-check__date-hour {
  color: rgba(255, 255, 255, 0.9);
  border-right-color: rgba(255, 255, 255, 0.2);
}

.vital-check__date-hour:last-child {
  border-right: none;
}

.vital-check__date-hour:hover {
  background: var(--cde-hover);
}

.vital-check__date-hour--now {
  background: #A04000;
  color: #F9E79F;
  font-weight: 700;
  border-left: 1px solid #D35400;
  border-right-color: #D35400;
}

/* ── Fixed constant column ── */
.vital-check__const-cell {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #BDC3C7;
  padding: 6px 10px;
  border-right: 1px solid var(--cd-gray-200);
  border-bottom: 1px solid var(--cd-gray-150);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-height: 32px;
  gap: 1px;
}

.vital-check__const-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--cd-gray-900);
  line-height: 1.3;
}

.vital-check__const-unit {
  font-size: 10px;
  font-weight: 500;
  color: var(--cde-muted);
  line-height: 1.2;
}

/* ── Data cells ── */
.vital-check__cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 2px 4px;
  background: #E5E7E9;
  border-right: 1px solid var(--cd-gray-200);
  border-bottom: 1px solid var(--cd-gray-150);
  transition: background 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  cursor: pointer;
}

.vital-check__cell:hover {
  background: #D5D8DC;
  box-shadow: inset 0 0 0 1px var(--cd-primary);
  z-index: 1;
}

.vital-check__cell--now {
  background: var(--cd-primary-lighter);
}

.vital-check__cell--now:hover {
  background: var(--cd-primary-lighter);
}

.vital-check__cell:last-child {
  border-right: none;
}

/* ── Cell value text ── */
.vital-check__cell-value {
  font-size: 11px;
  font-weight: 600;
  color: var(--cd-gray-900);
  text-align: center;
  line-height: 1.2;
  white-space: nowrap;
}

.vital-check__value--alert {
  color: var(--cd-alert-red);
  font-weight: 600;
  background: var(--cd-danger-bg);
  padding: 1px 5px;
  border-radius: 3px;
}

/* ── Dialog alert indicator ── */
.vital-check__value--alert-dialog :deep(.el-input__wrapper) {
  background: var(--cd-danger-bg);
  border-color: var(--cd-alert-red);
  box-shadow: 0 0 0 1px var(--cd-alert-red) inset;
}

.vital-check__value--alert-dialog :deep(.el-input__inner) {
  color: var(--cd-alert-red);
  font-weight: 600;
}
</style>
