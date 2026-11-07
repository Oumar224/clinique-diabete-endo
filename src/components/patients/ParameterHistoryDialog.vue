<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="720px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div
      v-loading="loading"
      class="parameter-history-dialog__body"
    >
      <div
        v-if="!loading && isNumericField"
        class="parameter-history-dialog__toggle"
        role="group"
        aria-label="Sélecteur de vue"
      >
        <button
          type="button"
          class="parameter-history-dialog__toggle-btn"
          :class="{ 'is-active': viewMode === 'table' }"
          :aria-pressed="viewMode === 'table'"
          title="Vue tableau"
          @click="viewMode = 'table'"
        >
          <Tickets />
          <span>Tableau</span>
        </button>
        <button
          type="button"
          class="parameter-history-dialog__toggle-btn"
          :class="{ 'is-active': viewMode === 'chart' }"
          :aria-pressed="viewMode === 'chart'"
          title="Vue courbe"
          @click="viewMode = 'chart'"
        >
          <TrendCharts />
          <span>Courbe</span>
        </button>
      </div>

      <el-table
        v-if="!loading && viewMode === 'table'"
        :data="entries"
        size="small"
      >
        <el-table-column
          label="Date"
          width="160"
        >
          <template #default="{ row }">
            <span class="parameter-history-dialog__date">{{ formatDate(row.date) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="documentLabel"
          label="Document"
          min-width="170"
          show-overflow-tooltip
        />
        <el-table-column
          label="Valeur"
          min-width="140"
        >
          <template #default="{ row }">
            <span class="parameter-history-dialog__value">{{ displayValue(row.value) }}</span>
          </template>
        </el-table-column>
      </el-table>

      <div
        v-else-if="!loading && viewMode === 'chart'"
        class="parameter-history-dialog__chart-view"
      >
        <el-empty
          v-if="chartPoints.length === 0"
          description="Aucune donnée numérique à tracer"
          :image-size="72"
        />
        <div
          v-else
          class="parameter-history-dialog__chart"
        >
          <Line
            :data="chartData"
            :options="chartOptions"
          />
        </div>
      </div>

      <el-empty
        v-if="!loading && !entries.length"
        description="Aucun historique pour ce paramètre"
        :image-size="72"
      />
    </div>
    <template #footer>
      <el-button
        size="small"
        @click="emit('update:modelValue', false)"
      >
        Fermer
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js'
import { Tickets, TrendCharts } from '@element-plus/icons-vue'
import type { ParameterHistoryEntry } from '@/composables/useParameterHistory'
import { formatValue } from '@/utils/parameter-history'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

const props = defineProps<{
  modelValue: boolean
  title: string
  path: string
  loading: boolean
  entries: ParameterHistoryEntry[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

type ViewMode = 'table' | 'chart'

const viewMode = ref<ViewMode>('table')

/** True when the field holds at least one numeric value, i.e. it is a
 * quantitative parameter that a line chart would make sense for. */
const isNumericField = computed(() =>
  props.entries.some((entry) => typeof entry.value === 'number' && !Number.isNaN(entry.value)),
)

interface ChartPoint {
  /** Sortable ISO date (chronological ordering for the curve). */
  date: string
  /** Human-readable label displayed on the x-axis. */
  label: string
  value: number
}

/** Numeric entries only, ordered oldest → newest (left to right). */
const chartPoints = computed<ChartPoint[]>(() =>
  props.entries
    .filter((entry) => typeof entry.value === 'number' && !Number.isNaN(entry.value))
    .map((entry) => ({
      date: entry.date,
      label: formatDate(entry.date),
      value: entry.value as number,
    }))
    .sort((a, b) => a.date.localeCompare(b.date)),
)

const chartData = computed(() => ({
  labels: chartPoints.value.map((point) => point.label),
  datasets: [
    {
      label: props.title.replace(/^Historique\s*[—–-]\s*/, ''),
      data: chartPoints.value.map((point) => point.value),
      borderColor: '#1A5276',
      backgroundColor: '#1A5276',
      fill: false,
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true },
  },
  scales: {
    x: {
      ticks: { maxRotation: 45, maxTicksLimit: 15 },
    },
    y: {
      beginAtZero: true,
    },
  },
}

// Reset the view whenever the field (path) changes so a different parameter
// never opens on a stale curve. Switching to a non-numeric field also forces
// the table back (a curve is meaningless without numbers).
watch(
  () => props.path,
  () => {
    viewMode.value = 'table'
  },
)

watch(isNumericField, (numeric) => {
  if (!numeric) viewMode.value = 'table'
})

function formatDate(isoStr: string): string {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr
  return (
    d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  )
}

function displayValue(value: unknown): string {
  return formatValue(props.path, value)
}
</script>

<style scoped lang="scss">
.parameter-history-dialog__body {
  min-height: 140px;
}

.parameter-history-dialog__date {
  font-weight: 600;
  color: var(--cd-primary);
  white-space: nowrap;
}

.parameter-history-dialog__value {
  font-weight: 500;
  color: var(--cd-gray-800);
}

.parameter-history-dialog__toggle {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  margin: 0 0 12px auto;
  background: var(--cd-gray-100);
  border-radius: 8px;
}

.parameter-history-dialog__toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--cde-muted);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    color: var(--cde-muted);
  }

  &.is-active {
    background: var(--cde-surface);
    color: var(--cde-accent-strong);
    border: 1px solid var(--cde-border);
  }
}

.parameter-history-dialog__chart-view {
  min-height: 140px;
}

.parameter-history-dialog__chart {
  height: 260px;
  position: relative;
}
</style>
