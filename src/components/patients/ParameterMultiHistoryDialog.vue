<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="1100px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div
      v-loading="loading"
      class="multi-history-dialog__body"
    >
      <div class="multi-history-dialog__toolbar">
        <el-segmented
          v-model="viewMode"
          :options="viewOptions"
          size="small"
          aria-label="Mode d'affichage"
        />
      </div>

      <!-- ── Mode Tableau : un onglet par paramètre ─────────────────── -->
      <template v-if="!loading && viewMode === 'table'">
        <el-tabs
          v-if="series.length"
          v-model="activeTab"
          type="border-card"
          class="multi-history-dialog__tabs"
        >
          <el-tab-pane
            v-for="s in series"
            :key="s.path"
            :name="s.path"
            :label="`${s.label} (${s.entries.length})`"
          >
            <el-table
              :data="s.entries"
              size="small"
            >
              <el-table-column
                label="Date"
                width="170"
              >
                <template #default="{ row }">
                  <span class="multi-history-dialog__date">{{ formatDate(row.date) }}</span>
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
                  <span class="multi-history-dialog__value">{{ displayValue(s.path, row.value) }}</span>
                </template>
              </el-table-column>
            </el-table>
            <el-empty
              v-if="!s.entries.length"
              description="Aucun historique pour ce paramètre"
              :image-size="64"
            />
          </el-tab-pane>
        </el-tabs>
        <el-empty
          v-else
          description="Aucun paramètre dans ce groupe"
          :image-size="72"
        />
      </template>

      <!-- ── Mode Courbes séparées (défaut) ──────────────────────────── -->
      <template v-else-if="!loading && viewMode === 'separate'">
        <div
          v-if="series.length"
          class="multi-history-dialog__grid"
        >
          <div
            v-for="s in series"
            :key="s.path"
            class="multi-history-dialog__card"
          >
            <div class="multi-history-dialog__card-title">
              {{ s.label }}
              <span
                v-if="s.unit"
                class="multi-history-dialog__card-unit"
              >({{ s.unit }})</span>
            </div>
            <div
              v-if="numericPoints(s).length"
              class="multi-history-dialog__chart"
            >
              <Line
                :data="separateChartData(s)"
                :options="separateChartOptions(s)"
              />
            </div>
            <div
              v-else
              class="multi-history-dialog__note"
            >
              <el-icon><InfoFilled /></el-icon>
              <span>Courbe non applicable — valeurs non numériques (ex. +/++/+++)</span>
            </div>
          </div>
        </div>
        <el-empty
          v-else
          description="Aucun paramètre dans ce groupe"
          :image-size="72"
        />
      </template>

      <!-- ── Mode Combiné ───────────────────────────────────────────── -->
      <template v-else-if="!loading && viewMode === 'combined'">
        <el-alert
          v-if="combinedWarning"
          :title="combinedWarning"
          type="warning"
          show-icon
          :closable="false"
          class="multi-history-dialog__warning"
        />
        <el-empty
          v-if="!combinedSeries.length"
          description="Aucune donnée numérique à combiner"
          :image-size="72"
        />
        <div
          v-else
          class="multi-history-dialog__chart multi-history-dialog__chart--combined"
        >
          <Line
            :data="combinedChartData"
            :options="combinedChartOptions"
          />
        </div>
      </template>
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
  Legend,
  Filler,
} from 'chart.js'
import { InfoFilled } from '@element-plus/icons-vue'
import type { ParameterHistoryEntry } from '@/composables/useParameterHistory'
import { formatValue } from '@/utils/parameter-history'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export interface MultiHistorySeries {
  path: string
  label: string
  unit?: string
  entries: ParameterHistoryEntry[]
}

const props = defineProps<{
  modelValue: boolean
  title: string
  series: MultiHistorySeries[]
  loading: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

type ViewMode = 'table' | 'separate' | 'combined'

const viewOptions = [
  { label: 'Tableau', value: 'table' },
  { label: 'Courbes séparées', value: 'separate' },
  { label: 'Combiné', value: 'combined' },
]

/** Défaut : courbes séparées (lecture clinique la plus directe). */
const viewMode = ref<ViewMode>('separate')
const activeTab = ref<string>('')

watch(
  () => props.series,
  (next) => {
    if (next.length && !next.some((s) => s.path === activeTab.value)) {
      activeTab.value = next[0].path
    }
  },
  { immediate: true },
)

// Réinitialise la vue à l'ouverture pour ne jamais rouvrir sur un état stale.
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      viewMode.value = 'separate'
      if (props.series.length) activeTab.value = props.series[0].path
    }
  },
)

interface ChartPoint {
  date: string
  label: string
  value: number
}

const CHART_COLORS = [
  '#1A5276',
  '#C0392B',
  '#229954',
  '#8E44AD',
  '#D68910',
  '#117A65',
  '#2E86C1',
  '#CA6F1E',
  '#7D3C98',
  '#1E8449',
  '#B03A2E',
  '#2874A6',
  '#616A6B',
]

const CATEGORICAL_PATHS = ['cetonurie', 'glucosurie']

function isCategoricalPath(path: string): boolean {
  return CATEGORICAL_PATHS.some((frag) => path.includes(frag))
}

function numericPoints(s: MultiHistorySeries): ChartPoint[] {
  return s.entries
    .filter((e) => typeof e.value === 'number' && !Number.isNaN(e.value))
    .map((e) => ({ date: e.date, label: formatDate(e.date), value: e.value as number }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Séries traçables : numériques et non catégorielles. */
const plottableSeries = computed(() =>
  props.series.filter((s) => !isCategoricalPath(s.path) && numericPoints(s).length > 0),
)

function separateChartData(s: MultiHistorySeries) {
  const points = numericPoints(s)
  const color = CHART_COLORS[props.series.indexOf(s) % CHART_COLORS.length]
  return {
    labels: points.map((p) => p.label),
    datasets: [
      {
        label: s.label,
        data: points.map((p) => p.value),
        borderColor: color,
        backgroundColor: color,
        fill: false,
        tension: 0.3,
        spanGaps: true,
        stepped: s.path.includes('glasgow') ? ('middle' as const) : false,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  }
}

function separateChartOptions(s: MultiHistorySeries) {
  const noZeroPaths = ['temperature', 'saO2', 'glasgow', 'scoreDouleur']
  const beginAtZero = !noZeroPaths.some((frag) => s.path.includes(frag))
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      x: { ticks: { maxRotation: 45, maxTicksLimit: 10 } },
      y: { beginAtZero },
    },
  }
}

// ── Vue combinée : familles homogènes uniquement ────────────────────────
// Au-delà de 4 séries numériques, ou en cas d'unités mixtes, on restreint
// à une famille homogène : TA Syst + TA Diast + FC, sinon Glasgow.

const TA_FAMILY_FRAGS = ['taSystolique', 'taDiastolique', 'frequenceCardiaque']

function distinctUnits(list: MultiHistorySeries[]): string[] {
  return [...new Set(list.map((s) => s.unit ?? '').filter(Boolean))]
}

const combinedSeries = computed<MultiHistorySeries[]>(() => {
  const plottable = plottableSeries.value
  if (plottable.length <= 4 && distinctUnits(plottable).length <= 1) return plottable
  const taFamily = plottable.filter((s) => TA_FAMILY_FRAGS.some((f) => s.path.includes(f)))
  if (taFamily.length >= 2) return taFamily
  const glasgowFamily = plottable.filter((s) => s.path.includes('glasgow'))
  if (glasgowFamily.length >= 2) return glasgowFamily
  return plottable.slice(0, 4)
})

const combinedWarning = computed<string | null>(() => {
  const plottable = plottableSeries.value
  if (!plottable.length) return null
  if (combinedSeries.value.length === plottable.length && distinctUnits(plottable).length <= 1) return null
  if (combinedSeries.value.some((s) => TA_FAMILY_FRAGS.some((f) => s.path.includes(f)))) {
    return 'Unités mixtes ou trop de courbes : vue combinée restreinte à la famille TA (Syst + Diast + FC).'
  }
  if (combinedSeries.value.some((s) => s.path.includes('glasgow'))) {
    return 'Unités mixtes ou trop de courbes : vue combinée restreinte à la famille Glasgow.'
  }
  return 'Trop de courbes : vue combinée limitée aux 4 premières séries numériques.'
})

const combinedChartData = computed(() => {
  const sortedDates = new Set<string>()
  for (const s of combinedSeries.value) {
    for (const p of numericPoints(s)) sortedDates.add(p.date)
  }
  const ordered = [...sortedDates].sort((a, b) => a.localeCompare(b))
  const units = distinctUnits(combinedSeries.value)
  const datasets = combinedSeries.value.map((s, i) => {
    const byDate = new Map(numericPoints(s).map((p) => [p.date, p.value]))
    const color = CHART_COLORS[i % CHART_COLORS.length]
    // Second unité éventuelle → axe secondaire y1.
    const yAxisID = units.length === 2 && (s.unit ?? '') === units[1] ? 'y1' : 'y'
    return {
      label: s.unit ? `${s.label} (${s.unit})` : s.label,
      data: ordered.map((d) => byDate.get(d) ?? null),
      borderColor: color,
      backgroundColor: color,
      fill: false,
      tension: 0.3,
      spanGaps: true,
      stepped: s.path.includes('glasgow') ? ('middle' as const) : false,
      pointRadius: 3,
      pointHoverRadius: 5,
      yAxisID,
    }
  })
  return {
    labels: ordered.map((d) => formatDate(d)),
    datasets,
  }
})

const combinedChartOptions = computed((): any => {
  const units = distinctUnits(combinedSeries.value)
  const allGlasgow = combinedSeries.value.length > 0 && combinedSeries.value.every((s) => s.path.includes('glasgow'))
  const hasNoZeroFrag = combinedSeries.value.some((s) =>
    ['temperature', 'saO2', 'glasgow', 'scoreDouleur'].some((frag) => s.path.includes(frag)),
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scales: Record<string, any> = {
    x: { ticks: { maxRotation: 45, maxTicksLimit: 12 } },
    y: {
      type: 'linear' as const,
      display: true,
      position: 'left' as const,
      beginAtZero: allGlasgow || !hasNoZeroFrag ? false : true,
      title: units[0] ? { display: true, text: units[0] } : undefined,
    },
  }
  if (units.length === 2) {
    scales.y1 = {
      type: 'linear' as const,
      display: true,
      position: 'right' as const,
      beginAtZero: false,
      grid: { drawOnChartArea: false },
      title: { display: true, text: units[1] },
    }
  }
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' as const }, tooltip: { enabled: true } },
    scales,
  }
})

function formatDate(isoStr: string): string {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr
  return (
    d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  )
}

function displayValue(path: string, value: unknown): string {
  return formatValue(path, value)
}
</script>

<style scoped lang="scss">
.multi-history-dialog__body {
  min-height: 200px;
}

.multi-history-dialog__toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.multi-history-dialog__tabs {
  :deep(.el-tabs__content) {
    padding: 12px;
  }
}

.multi-history-dialog__date {
  font-weight: 600;
  color: var(--cd-primary);
  white-space: nowrap;
}

.multi-history-dialog__value {
  font-weight: 500;
  color: var(--cd-gray-800);
}

.multi-history-dialog__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  max-height: 60vh;
  overflow-y: auto;
}

@media (max-width: 900px) {
  .multi-history-dialog__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.multi-history-dialog__card {
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  padding: 10px 12px;
  background: var(--cde-surface);
}

.multi-history-dialog__card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--cde-header-text);
  margin-bottom: 8px;
}

.multi-history-dialog__card-unit {
  font-weight: 400;
  color: var(--cd-gray-400);
}

.multi-history-dialog__chart {
  height: 240px;
  position: relative;
}

.multi-history-dialog__chart--combined {
  height: 260px;
}

.multi-history-dialog__note {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-style: italic;
  color: var(--cd-gray-400);
  padding: 24px 8px;
}

.multi-history-dialog__warning {
  margin-bottom: 12px;
}
</style>
