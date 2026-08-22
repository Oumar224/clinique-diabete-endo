<template>
  <div class="bio-matrix" :class="{ 'bio-matrix--deletable': deletable }">
    <div class="rb__grid-wrapper" :style="wrapperStyle">
      <div class="rb__grid" :style="{ gridTemplateColumns: gridColumns }">
        <!-- HEADER ROW -->
        <div class="rb__analyses-header" style="grid-row: 1; grid-column: 1">Analyses</div>
        <div class="rb__unites-header" style="grid-row: 1; grid-column: 2">Unités</div>
        <div v-if="deletable" class="rb__delete-header" style="grid-row: 1; grid-column: 3">Supprimer</div>
        <div class="rb__ref-header" :style="{ gridRow: 1, gridColumn: deletable ? 4 : 3 }">Valeur de référence</div>

        <template v-if="weekMode">
          <div
            v-for="(day, di) in dateColumns"
            :key="'d-' + di"
            class="rb__date-header"
            :class="{ 'rb__date-header--today': day.isToday }"
            :style="{ gridRow: 1, gridColumn: `${leftCols + 1 + di * hourSlots.length} / ${leftCols + 1 + (di + 1) * hourSlots.length}` }"
          >
            <div class="rb__date-text">{{ day.name }} <span class="rb__date-text-date">{{ day.dateLabel }}</span></div>
            <div class="rb__date-hours-row">
              <span
                v-for="hour in hourSlots"
                :key="hour"
                class="rb__date-hour"
                :class="{ 'rb__date-hour--now': day.isToday && hour === currentHour }"
              >
                {{ String(hour).padStart(2, '0') }}:00
              </span>
            </div>
          </div>
        </template>
        <div
          v-else
          v-for="(col, si) in slotColumns"
          :key="'s-' + si"
          class="rb__date-header"
          :class="{ 'rb__date-header--today': col.isToday }"
          :style="{ gridRow: 1, gridColumn: col.gridColumn }"
        >
          <div class="rb__date-text">{{ col.name }} <span class="rb__date-text-date">{{ col.hourLabel }}</span></div>
        </div>

        <!-- DATA ROWS grouped by exam -->
        <template v-for="group in groups" :key="'g-' + group.examName">
          <div class="rb__group-header">
            <span class="rb__group-exam">{{ group.examName }}</span>
          </div>

          <template v-for="row in group.rows" :key="row.parameterId">
            <div class="rb__analyses-cell">
              <span class="rb__analyses-name">{{ row.parameterName }}</span>
            </div>
            <div class="rb__unites-cell">
              <span class="rb__unites-text">{{ row.parameterUnit || '—' }}</span>
            </div>
            <div v-if="deletable" class="rb__delete-cell">
              <el-button
                size="small"
                type="danger"
                :aria-label="`Supprimer ${row.parameterName || 'résultat'}`"
                @click="emit('delete', row)"
              >
                <template #icon>
                  <el-icon><Delete /></el-icon>
                </template>
              </el-button>
            </div>
            <div class="rb__ref-cell">
              <span class="rb__ref-text">{{ formatRefShort(row.referenceValues, row.parameterInputType) || '—' }}</span>
            </div>
            <template v-for="col in slotColumns" :key="`${row.parameterId}-${col.slotKey}`">
              <template v-for="parts in [cellParts(row, col.slotKey)]" :key="parts.value ?? 'empty'">
                <div class="rb__cell" :class="getCellClass(parts.cell)" :style="{ gridColumn: col.gridColumn }">
                  <template v-if="parts.value">
                    <div class="rb__cell-content">
                      <span class="rb__cell-value">{{ parts.value }}</span>
                      <span v-if="parts.arrow" class="rb__arrow" :class="parts.arrowClass">{{ parts.arrow }}</span>
                    </div>
                  </template>
                  <span v-else class="rb__cell-empty">—</span>
                </div>
              </template>
            </template>
          </template>
        </template>

        <!-- Empty state -->
        <template v-if="showEmpty">
          <div class="rb__empty-row">{{ emptyText }}</div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import type { MatrixGroup, MatrixRow } from '@/composables/useExamResults'
import type { ExamParameterReferenceValues } from '@/composables/useExamParameters'

export interface BioMatrixDateColumn {
  key: string
  name: string
  dateLabel: string
  isToday: boolean
}

const props = withDefaults(defineProps<{
  groups: MatrixGroup[]
  deletable?: boolean
  emptyText?: string
  maxHeight?: string
  dateColumns?: BioMatrixDateColumn[]
  hourSlots?: number[]
}>(), {
  deletable: false,
  emptyText: 'Aucun résultat disponible',
  maxHeight: undefined,
  dateColumns: undefined,
  hourSlots: undefined,
})

const emit = defineEmits<{ delete: [row: MatrixRow] }>()

const weekMode = computed(() => !!props.dateColumns?.length && !!props.hourSlots?.length)
const leftCols = computed(() => (props.deletable ? 4 : 3))

interface SlotColumn {
  slotKey: string
  gridColumn: number
  name: string
  hourLabel: string
  isToday: boolean
}

const slotColumns = computed<SlotColumn[]>(() => {
  if (weekMode.value) {
    const cols: SlotColumn[] = []
    props.dateColumns!.forEach((day, di) => {
      props.hourSlots!.forEach((hour, hi) => {
        cols.push({
          slotKey: `${day.key}|${hour}`,
          gridColumn: leftCols.value + 1 + di * props.hourSlots!.length + hi,
          name: day.name,
          hourLabel: `${String(hour).padStart(2, '0')}:00`,
          isToday: day.isToday,
        })
      })
    })
    return cols
  }
  const seen = new Set<string>()
  const slots: SlotColumn[] = []
  for (const g of props.groups) {
    for (const row of g.rows) {
      for (const key of Object.keys(row.dates)) {
        if (seen.has(key)) continue
        seen.add(key)
        const sep = key.indexOf('|')
        const dateKey = sep === -1 ? key : key.slice(0, sep)
        const hour = sep === -1 ? 0 : Number(key.slice(sep + 1))
        slots.push({
          slotKey: key,
          gridColumn: leftCols.value + 1 + slots.length,
          name: formatDayLabel(dateKey),
          hourLabel: `${String(hour).padStart(2, '0')}:00`,
          isToday: dateKey === todayKey(),
        })
      }
    }
  }
  return slots.sort((a, b) => {
    const [ad, ah] = a.slotKey.split('|')
    const [bd, bh] = b.slotKey.split('|')
    const d = ad.localeCompare(bd)
    return d !== 0 ? d : Number(ah) - Number(bh)
  })
})

const gridColumns = computed(() => {
  const base = props.deletable ? '200px 100px 80px 150px' : '200px 100px 150px'
  return `${base} repeat(${slotColumns.value.length}, minmax(80px, 1fr))`
})

const showEmpty = computed(() => props.groups.length === 0 && props.emptyText !== '')

const wrapperStyle = computed(() => (props.maxHeight ? { maxHeight: props.maxHeight } : undefined))

const currentHour = computed(() => {
  if (!props.hourSlots?.length) return 0
  const h = new Date().getHours()
  return [...props.hourSlots].reverse().find(hr => hr <= h) ?? props.hourSlots[0]
})

function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-')
  return y && m && d ? `${d}/${m}/${y}` : dateKey
}

function todayKey(): string {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

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

function cellParts(row: MatrixRow, slotKey: string): { cell: MatrixCell; value: string; arrow: string; arrowClass: string } {
  const cell = row.dates[slotKey]
  const arrow = getArrow(cell, row)
  return {
    cell,
    value: cell?.value ?? '',
    arrow,
    arrowClass: arrow === '↑' ? 'rb__arrow--high' : arrow === '↓' ? 'rb__arrow--low' : '',
  }
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

function getCellClass(cell: MatrixCell | undefined): Record<string, boolean> {
  return {
    'rb__cell--abnormal': cell?.isNormal === false,
    'rb__cell--normal': cell?.isNormal === true,
    'rb__cell--no-data': !cell?.value,
  }
}
</script>

<style scoped>
/* ================================================================== */
/*  Block                                                              */
/* ================================================================== */

.bio-matrix {
  /*
   * Hauteur de la ligne d'en-tête de jours : date-text (~21px, jour + date
   * dd/MM sur la même ligne, white-space: nowrap) + rangée d'heures (~17px)
   * + bordure basse (1px) ≈ 39px, arrondie à 40px.
   * Forcée en `height` sur .rb__date-header (box-sizing: border-box) et
   * réutilisée en `top` sur .rb__group-header : le bandeau épinglé colle
   * exactement sous l'en-tête, sans liseré de contenu qui défile entre les
   * deux au scroll vertical.
   */
  --rb-header-h: 40px;
  --rb-col-ref: 300px;
}

.bio-matrix--deletable {
  --rb-col-ref: 380px;
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
/*  Sticky header cells (Analyses, Unités, Supprimer, Référence)       */
/* ================================================================== */

.rb__analyses-header,
.rb__unites-header,
.rb__delete-header,
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

.rb__delete-header {
  position: sticky;
  left: 300px;
  top: 0;
  z-index: 4;
}

.rb__ref-header {
  position: sticky;
  left: var(--rb-col-ref);
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
  white-space: nowrap;
}

.rb__date-text-date {
  color: var(--cd-gray-500);
  font-weight: 400;
}

.rb__date-header--today .rb__date-text-date {
  color: rgba(255, 255, 255, 0.85);
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
.rb__delete-cell,
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

.rb__delete-cell {
  position: sticky;
  left: 300px;
  z-index: 1;
  text-align: center;
  justify-content: center;
}

.rb__ref-cell {
  position: sticky;
  left: var(--rb-col-ref);
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