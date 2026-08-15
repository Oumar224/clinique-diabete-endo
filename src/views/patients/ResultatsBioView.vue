<template>
  <div class="rb" v-loading="loading">
    <div class="rb__header">
      <h1 class="rb__title">Résultats Biologiques</h1>
      <div class="rb__actions">
        <el-input
          v-model="searchQuery"
          placeholder="Rechercher une analyse…"
          clearable
          size="small"
          style="width: 220px"
          class="rb__search"
        />
        <el-select
          v-model="filters.typeId"
          placeholder="Type d'examen"
          clearable
          size="small"
          style="width: 180px"
          @change="onFilterChange"
        >
          <el-option v-for="t in examTypes" :key="t.id" :label="t.label" :value="t.id!" />
        </el-select>
        <el-select
          v-model="filters.examId"
          placeholder="Examen"
          clearable
          size="small"
          style="width: 180px"
          @change="onFilterChange"
        >
          <el-option v-for="e in filteredExams" :key="e.id" :label="e.label" :value="e.id!" />
        </el-select>
        <el-button-group>
          <el-button :icon="ArrowLeft" @click="previousWeek" />
          <el-button class="rb__week-label">{{ weekLabel }}</el-button>
          <el-button :icon="ArrowRight" @click="nextWeek" />
        </el-button-group>
        <el-button :icon="Refresh" :loading="refreshing" @click="loadData">
          Actualiser
        </el-button>
      </div>
    </div>

    <div class="rb__grid-wrapper">
      <div class="rb__grid" :style="{ gridTemplateColumns: gridColumns }">
        <!-- HEADER ROW: explicit grid positioning like plan distribution -->
        <div class="rb__analyses-header" style="grid-row: 1; grid-column: 1">Analyses</div>
        <div class="rb__unites-header" style="grid-row: 1; grid-column: 2">Unités</div>
        <div class="rb__ref-header" style="grid-row: 1; grid-column: 3">Valeur de référence</div>
        <div
          v-for="(day, di) in weekDays"
          :key="'d-' + di"
          class="rb__date-header"
          :class="{ 'rb__date-header--today': day.isToday }"
          :style="{ gridRow: 1, gridColumn: `${4 + di * EXAM_GRID_HOURS.length} / ${4 + (di + 1) * EXAM_GRID_HOURS.length}` }"
        >
          <div class="rb__date-text">{{ day.name }}</div>
          <div class="rb__date-hours-row">
            <span
              v-for="hour in EXAM_GRID_HOURS"
              :key="hour"
              class="rb__date-hour"
              :class="{ 'rb__date-hour--now': day.isToday && hour === currentHour }"
            >
              {{ String(hour).padStart(2, '0') }}:00
            </span>
          </div>
        </div>

        <!-- DATA ROWS grouped by exam -->
        <template v-for="group in filteredMatrixGroups" :key="'g-' + group.examName">
          <!-- Group header row -->
          <div class="rb__group-header">
            <span class="rb__group-exam">{{ group.examName }}</span>
          </div>

          <!-- Parameter rows within this group -->
          <template v-for="row in group.rows" :key="row.parameterId">
            <div class="rb__analyses-cell">
              <span class="rb__analyses-name">{{ row.parameterName }}</span>
            </div>
            <div class="rb__unites-cell">
              <span class="rb__unites-text">{{ row.parameterUnit || '—' }}</span>
            </div>
            <div class="rb__ref-cell">
              <span class="rb__ref-text">{{ formatRefShort(row.referenceValues, row.parameterInputType) || '—' }}</span>
            </div>
            <template v-for="(day, di) in weekDays" :key="`${row.parameterId}-${day.dateKey}`">
              <template v-for="(hour, hi) in EXAM_GRID_HOURS" :key="`${row.parameterId}-${day.dateKey}-${hour}`">
                <template
                  v-for="cell in [cellFor(row, day.dateKey, hour)]"
                  :key="cell?.value ?? 'empty'"
                >
                  <div
                    class="rb__cell"
                    :class="getCellClass(cell)"
                    :style="{ gridColumn: 4 + di * EXAM_GRID_HOURS.length + hi }"
                  >
                    <template v-if="cell?.value">
                      <div class="rb__cell-content">
                        <span class="rb__cell-value">{{ cell?.value }}</span>
                        <template
                          v-for="arrow in [getArrow(cell, row)]"
                          :key="arrow"
                        >
                          <span class="rb__arrow" :class="getArrowClass(arrow)">{{ arrow }}</span>
                        </template>
                      </div>
                    </template>
                    <span v-else class="rb__cell-empty">—</span>
                  </div>
                </template>
              </template>
            </template>
          </template>
        </template>

        <!-- Empty state -->
        <template v-if="!loading && filteredMatrixGroups.length === 0">
          <div class="rb__empty-row">
            {{ searchQuery ? 'Aucun résultat ne correspond à la recherche' : 'Aucun résultat disponible pour cette semaine' }}
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ArrowLeft, ArrowRight, Refresh } from '@element-plus/icons-vue'
import {
  useExamResults,
  EXAM_GRID_HOURS,
  type MatrixRow,
  type MatrixGroup,
} from '@/composables/useExamResults'
import { type ExamTypeDto } from '@/composables/useExamTypes'
import { type ExamParameterReferenceValues } from '@/composables/useExamParameters'
import { usePatientContext } from '@/composables/usePatientContext'
import { ipcInvoke } from '@/utils/ipc'

/* ------------------------------------------------------------------ */
/*  Context & composables                                              */
/* ------------------------------------------------------------------ */

const { activePatient } = usePatientContext()
const { loading, results, fetchByPatient, buildMatrix } = useExamResults()

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

const refreshing = ref(false)
const examTypes = ref<ExamTypeDto[]>([])
const allExams = ref<ExamTypeDto[]>([])

const filters = reactive({
  typeId: null as number | null,
  examId: null as number | null,
})

const matrixGroups = ref<MatrixGroup[]>([])

const searchQuery = ref('')

const currentWeekStart = ref(getWeekStart(new Date()))

/* ------------------------------------------------------------------ */
/*  Week helpers                                                       */
/* ------------------------------------------------------------------ */

function getWeekStart(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function previousWeek() {
  const d = new Date(currentWeekStart.value)
  d.setDate(d.getDate() - 7)
  currentWeekStart.value = d
  loadData()
}

function nextWeek() {
  const d = new Date(currentWeekStart.value)
  d.setDate(d.getDate() + 7)
  currentWeekStart.value = d
  loadData()
}

/* ------------------------------------------------------------------ */
/*  Computed                                                           */
/* ------------------------------------------------------------------ */

const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const currentHour = computed(() => {
  const h = new Date().getHours()
  return [...EXAM_GRID_HOURS].reverse().find(hr => hr <= h) ?? EXAM_GRID_HOURS[0]
})

const weekDays = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart.value)
    d.setDate(d.getDate() + i)
    const dateKey = formatDateKey(d)
    const dateLabel = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`
    d.setHours(0, 0, 0, 0)
    return {
      name: dayNames[i],
      dateKey,
      dateLabel,
      isToday: d.getTime() === today.getTime(),
      fullDate: new Date(d),
    }
  })
})

const weekLabel = computed(() => {
  const start = weekDays.value[0]
  const end = weekDays.value[6]
  return `${start.dateLabel} — ${end.dateLabel}`
})

const weekDateRange = computed(() => {
  const first = weekDays.value[0].dateKey
  const last = weekDays.value[6].dateKey
  return { dateFrom: first, dateTo: last }
})

const gridColumns = computed(() => {
  return `200px 100px 150px repeat(${weekDays.value.length * EXAM_GRID_HOURS.length}, minmax(80px, 1fr))`
})

const filteredExams = computed(() => {
  if (!filters.typeId) return allExams.value
  return allExams.value.filter(
    (e) => e.parent_id === filters.typeId || e.id === filters.typeId,
  )
})

/**
 * Groupes de la matrice filtrés côté client par la recherche libre.
 * Filtre les LIGNES sur `parameterName` (et `examName` du groupe),
 * insensible à la casse ; les groupes devenus vides sont masqués.
 */
const filteredMatrixGroups = computed<MatrixGroup[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return matrixGroups.value
  return matrixGroups.value
    .map((group) => {
      const examName = (group.examName ?? '').toLowerCase()
      return {
        ...group,
        rows: group.rows.filter(
          (row) =>
            row.parameterName.toLowerCase().includes(q) ||
            examName.includes(q),
        ),
      }
    })
    .filter((group) => group.rows.length > 0)
})

/* ------------------------------------------------------------------ */
/*  Data loading                                                       */
/* ------------------------------------------------------------------ */

async function loadData() {
  if (!activePatient.value?.id) return
  refreshing.value = true
  try {
    const patientFilters: Record<string, unknown> = {
      dateFrom: weekDateRange.value.dateFrom,
      dateTo: weekDateRange.value.dateTo,
    }
    if (filters.typeId) patientFilters.typeId = filters.typeId
    if (filters.examId) patientFilters.examId = filters.examId

    await fetchByPatient(activePatient.value.id, patientFilters)

    const { matrixGroups: groups } = buildMatrix(results.value)
    matrixGroups.value = groups
    scrollToCurrentTime()
  } finally {
    refreshing.value = false
  }
}

function onFilterChange() {
  searchQuery.value = ''
  loadData()
}

function scrollToCurrentTime() {
  nextTick(() => {
    requestAnimationFrame(() => {
      const wrapper = document.querySelector('.rb__grid-wrapper')
      if (!wrapper) return
      const dayIdx = weekDays.value.findIndex(d => d.isToday)
      if (dayIdx < 0) return
      const hourIdx = EXAM_GRID_HOURS.indexOf(currentHour.value)
      if (hourIdx < 0) return
      const targetHourEls = wrapper.querySelectorAll('.rb__date-hour')
      const targetIdx = dayIdx * EXAM_GRID_HOURS.length + hourIdx
      const target = targetHourEls[targetIdx] as HTMLElement
      if (target) {
        target.scrollIntoView({ inline: 'center', block: 'nearest' })
      }
    })
  })
}

/* ------------------------------------------------------------------ */
/*  Cell rendering helpers                                             */
/* ------------------------------------------------------------------ */

function formatRefShort(refs: ExamParameterReferenceValues, inputType?: string): string {
  if (!refs) return ''
  if (inputType === 'numeric') {
    const parts: string[] = []
    if (refs.min_h != null && refs.max_h != null)
      parts.push(`H: ${refs.min_h}–${refs.max_h}`)
    if (refs.min_f != null && refs.max_f != null)
      parts.push(`F: ${refs.min_f}–${refs.max_f}`)
    if (parts.length > 0) return parts.join(' / ')
    if (refs.min != null && refs.max != null) return `${refs.min} – ${refs.max}`
  }
  if (inputType === 'select' && Array.isArray(refs.options))
    return refs.options.map((o: { value?: string }) => o.value).join(', ')
  if (inputType === 'boolean' && refs.normal_value) return `Normal: ${refs.normal_value}`
  return ''
}

type MatrixCell = MatrixRow['dates'][string]

/**
 * Cellule d'un créneau (lookup unique, clé `dateKey|hourSlot`) — grille sparse :
 * `undefined` pour les cellules sans valeur.
 */
function cellFor(row: MatrixRow, dateKey: string, hour: number): MatrixCell | undefined {
  return row.dates[`${dateKey}|${hour}`]
}

function getArrow(cell: MatrixCell | undefined, row: MatrixRow): string {
  if (!cell?.value || cell.isNormal === undefined || cell.isNormal === null) return ''
  if (!cell.isNormal) {
    const num = parseFloat(cell.value)
    if (isNaN(num)) return ''
    const refs = row.referenceValues
    if (refs && (refs.min != null || refs.min_h != null)) {
      const low = (refs.min_h ?? refs.min ?? 0) as number
      return num < low ? '↓' : '↑'
    }
    return '↑'
  }
  return ''
}

function getArrowClass(arrow: string): string {
  if (arrow === '↑') return 'rb__arrow--high'
  if (arrow === '↓') return 'rb__arrow--low'
  return ''
}

function getCellClass(cell: MatrixCell | undefined): Record<string, boolean> {
  return {
    'rb__cell--abnormal': cell?.isNormal === false,
    'rb__cell--normal': cell?.isNormal === true,
    'rb__cell--no-data': !cell?.value,
  }
}

/* ------------------------------------------------------------------ */
/*  Lifecycle                                                          */
/* ------------------------------------------------------------------ */

onMounted(async () => {
  try {
    const typesResult = await ipcInvoke<ExamTypeDto[]>(
      'exam-types:list-by-category',
      { category_code: 'laboratoire' },
    )
    examTypes.value = Array.isArray(typesResult) ? typesResult : []
    const allResult = await ipcInvoke<ExamTypeDto[]>(
      'exam-types:list-all-by-category',
      { category_code: 'laboratoire' },
    )
    allExams.value = Array.isArray(allResult) ? allResult : []
  } catch {
    /* silent */
  }
  await loadData()
})
</script>

<style scoped>
/* ================================================================== */
/*  Block                                                              */
/* ================================================================== */

.rb {
  display: flex;
  flex-direction: column;
  gap: 16px;
  /*
   * Hauteur de la ligne d'en-tête de jours : date-text (~21px) + rangée
   * d'heures (~17px) + bordure basse (1px) ≈ 39px, arrondie à 40px.
   * Forcée en `height` sur .rb__date-header (box-sizing: border-box) et
   * réutilisée en `top` sur .rb__group-header : le bandeau épinglé colle
   * exactement sous l'en-tête, sans liseré de contenu qui défile entre les
   * deux au scroll vertical.
   */
  --rb-header-h: 40px;
}

/* ================================================================== */
/*  Header                                                             */
/* ================================================================== */

.rb__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.rb__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--cd-gray-900);
}

.rb__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rb__week-label {
  min-width: 140px;
  font-weight: 600;
}

/* ================================================================== */
/*  Grid wrapper                                                       */
/* ================================================================== */

.rb__grid-wrapper {
  overflow: auto;
  border: 1px solid var(--cd-gray-200);
  border-radius: 8px;
  max-height: calc(100vh - 260px);
}

/* ================================================================== */
/*  Grid                                                               */
/* ================================================================== */

.rb__grid {
  display: grid;
  background: var(--cd-widget-bg);
  min-width: max-content;
}

/* ================================================================== */
/*  Sticky header cells (Analyses, Unités, Valeur de référence)        */
/* ================================================================== */

.rb__analyses-header,
.rb__unites-header,
.rb__ref-header {
  padding: 8px 8px;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  background: #AEB6BF;
  color: #1C2833;
  border-bottom: 1px solid #95A5A6;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.rb__analyses-header {
  position: sticky;
  left: 0;
  top: 0;
  z-index: 4;
  text-align: left;
  padding-left: 12px;
}

.rb__unites-header {
  position: sticky;
  left: 200px;
  top: 0;
  z-index: 4;
}

.rb__ref-header {
  position: sticky;
  left: 300px;
  top: 0;
  z-index: 4;
}

/* ================================================================== */
/*  Date header (day columns) — matches plan-distribution__date-header */
/* ================================================================== */

.rb__date-header {
  position: sticky;
  top: 0;
  z-index: 3;
  height: var(--rb-header-h);
  background: var(--cd-gray-100);
  border-bottom: 1px solid var(--cd-gray-200);
  border-right: 1px solid var(--cd-gray-200);
  padding: 0;
  display: flex;
  flex-direction: column;
}

.rb__date-text {
  padding: 6px 12px 2px;
  font-size: 11px;
  font-weight: 600;
  text-align: left;
  line-height: 1.2;
}

.rb__date-hours-row {
  display: flex;
  border-top: 1px solid var(--cd-gray-300);
}

.rb__date-hour {
  flex: 1;
  padding: 2px 4px;
  font-size: 10px;
  font-weight: 600;
  text-align: center;
  color: var(--cd-gray-600);
  border-right: 1px solid var(--cd-gray-200);
}

.rb__date-hour:last-child {
  border-right: none;
}

.rb__date-hour--now {
  background: #A04000;
  color: #F9E79F;
  font-weight: 700;
  border-left: 1px solid #D35400;
  border-right-color: #D35400;
}

.rb__date-header--today .rb__date-hour--now {
  color: #F9E79F;
  background: #A04000;
  border-right-color: #D35400;
}

.rb__date-header--today {
  background: var(--cd-primary) !important;
  color: white;
}
.rb__date-header--today .rb__date-text {
  color: white;
}
.rb__date-header--today .rb__date-hours-row {
  border-top-color: rgba(255, 255, 255, 0.3);
}
.rb__date-header--today .rb__date-hour {
  color: rgba(255, 255, 255, 0.9);
  border-right-color: rgba(255, 255, 255, 0.2);
}

/* ================================================================== */
/*  Sticky left column cells                                           */
/* ================================================================== */

.rb__analyses-cell,
.rb__unites-cell,
.rb__ref-cell {
  background: #BDC3C7;
  padding: 6px 10px;
  border-right: 1px solid var(--cd-gray-200);
  border-bottom: 1px solid var(--cd-gray-150);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  min-height: 40px;
}

.rb__analyses-cell {
  position: sticky;
  left: 0;
  z-index: 1;
  text-align: left;
}

.rb__unites-cell {
  position: sticky;
  left: 200px;
  z-index: 1;
  text-align: center;
}

.rb__ref-cell {
  position: sticky;
  left: 300px;
  z-index: 1;
  text-align: left;
}

.rb__analyses-name {
  font-size: 12px;
  font-weight: 700;
  color: #1C2833;
  line-height: 1.3;
}

.rb__unites-text {
  font-size: 12px;
  font-weight: 700;
  color: #1C2833;
}

.rb__ref-text {
  font-size: 11px;
  color: #566573;
  line-height: 1.3;
}

/* ================================================================== */
/*  Sticky column shadow                                               */
/* ================================================================== */

.rb__ref-header::after,
.rb__ref-cell::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.15), transparent);
  pointer-events: none;
}

/* ================================================================== */
/*  Data cells — matches plan-distribution__cell exactly               */
/* ================================================================== */

.rb__cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 40px;
  padding: 2px 6px;
  background: #E5E7E9;
  border-right: 1px solid var(--cd-gray-200);
  border-bottom: 1px solid var(--cd-gray-150);
  transition: background 0.2s ease, box-shadow 0.2s ease;
  position: relative;
}

.rb__cell:hover {
  background: #D5D8DC;
  box-shadow: inset 0 0 0 1px var(--cd-primary);
  z-index: 1;
}

/* ================================================================== */
/*  Cell content                                                       */
/* ================================================================== */

/* Cellules confinées dans une colonne-heure étroite (~80px) : contenu sur
 * une seule ligne, valeur tronquée (ellipsis) si nécessaire. */
.rb__cell-content {
  display: flex;
  align-items: baseline;
  gap: 3px;
  flex-wrap: nowrap;
  justify-content: center;
  max-width: 100%;
  overflow: hidden;
}

.rb__cell-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--cd-gray-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.rb__cell-empty {
  color: var(--cd-gray-300);
  font-size: 13px;
  user-select: none;
}

/* ================================================================== */
/*  Cell state modifiers                                               */
/* ================================================================== */

.rb__cell--normal {
  background: #f0fdf4;
}

.rb__cell--normal:hover {
  background: #dcfce7;
  box-shadow: inset 0 0 0 1px var(--cd-primary);
}

.rb__cell--abnormal {
  background: #fef2f2;
}

.rb__cell--abnormal:hover {
  background: #fde2e2;
  box-shadow: inset 0 0 0 1px var(--cd-primary);
}

/* ================================================================== */
/*  Arrow indicators                                                   */
/* ================================================================== */

.rb__arrow {
  font-weight: 700;
  font-size: 13px;
  line-height: 1;
}

.rb__arrow--high {
  color: var(--cd-secondary);
}

.rb__arrow--low {
  color: #2980b9;
}

/* ================================================================== */
/*  Group header (exam row)                                            */
/* ================================================================== */

.rb__group-header {
  grid-column: 1 / -1;
  position: sticky;
  top: var(--rb-header-h);
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: var(--cd-gray-100);
  border-top: 2px solid var(--cd-gray-300);
  border-bottom: 1px solid var(--cd-gray-200);
}

/*
 * Le bandeau est aussi large que la grille (grid-column: 1 / -1) : il ne
 * peut PAS coller horizontalement. C'est le span du nom d'examen qui est
 * épinglé à gauche, aligné sur la colonne sticky « Analyses » au scroll
 * horizontal. Fond identique au bandeau pour se fondre dans l'en-tête ;
 * l'ombre marque la frontière avec les colonnes-jours.
 *
 * Le span est borné à la largeur de la colonne « Analyses » (200px − padding
 * 12px du bandeau = 188px) : un nom long (ex. « Hémogramme complet avec
 * numération des réticulocytes ») est tronqué avec ellipsis au lieu
 * d'occulter les colonnes-jours pendant le scroll horizontal.
 */
.rb__group-exam {
  position: sticky;
  left: 0;
  z-index: 3;
  background: var(--cd-gray-100);
  padding-right: 8px;
  padding-left: 10px;
  max-width: 188px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  box-shadow: 3px 0 3px -3px rgba(0, 0, 0, 0.25);
  font-size: 12px;
  font-weight: 700;
  color: #1C2833;
}

/* ================================================================== */
/*  Empty state                                                        */
/* ================================================================== */

.rb__empty-row {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  color: var(--cd-gray-400);
  font-style: italic;
  font-size: 13px;
}
</style>
