<template>
  <div class="diagramme cde">
    <div class="diagramme__header cde-page-toolbar">
      <div class="cde-page-actions">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="→"
          start-placeholder="Date début"
          end-placeholder="Date fin"
          value-format="YYYY-MM-DD"
          style="width: 280px"
          @change="onDateRangeChange"
        />
      </div>
    </div>

    <div class="diagramme__body">
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        show-icon
        closable
        class="cde-alert cde-alert--danger"
        @close="error = null"
      />
      <el-alert
        v-if="info"
        :title="info"
        type="info"
        show-icon
        closable
        class="cde-alert"
        @close="info = null"
      />

      <div v-loading="loading" class="diagramme__loading">
        <div class="diagramme__indicators">
          <el-select
            v-model="selectedIndicator"
            placeholder="Choisir un indicateur"
            style="width: 280px"
            @change="onIndicatorChange"
          >
            <el-option
              v-for="ind in INDICATOR_CONFIGS"
              :key="ind.key"
              :label="ind.label"
              :value="ind.key"
            />
          </el-select>
        </div>

        <div class="diagramme__chart-wrapper">
          <Line :data="chartData ?? emptyChartData" :options="chartOptions" />
        </div>

        <div class="diagramme__legend">
          <h4>Légende</h4>
          <div class="diagramme__legend-items">
            <span class="diagramme__legend-item">
              <span class="diagramme__legend-dot diagramme__legend-dot--temp" />
              Température (°C)
            </span>
            <span class="diagramme__legend-item">
              <span class="diagramme__legend-dot diagramme__legend-dot--ta" />
              TA systolique (mmHg)
            </span>
            <span class="diagramme__legend-item">
              <span class="diagramme__legend-dot diagramme__legend-dot--ta-d" />
              TA diastolique (mmHg)
            </span>
            <span class="diagramme__legend-item">
              <span class="diagramme__legend-dot diagramme__legend-dot--fc" />
              FC (bpm)
            </span>
            <span class="diagramme__legend-item">
              <span class="diagramme__legend-dot diagramme__legend-dot--gly" />
              Glycémie (g/L)
            </span>
            <span class="diagramme__legend-item">
              <span class="diagramme__legend-dot diagramme__legend-dot--ceto" />
              Cétonémie (mmol/l)
            </span>
            <span class="diagramme__legend-item">
              <span class="diagramme__legend-dot diagramme__legend-dot--saO2" />
              SaO₂ (%)
            </span>
            <span class="diagramme__legend-item">
              <span class="diagramme__legend-dot diagramme__legend-dot--diurese" />
              Diurèse (ml)
            </span>
            <span class="diagramme__legend-item">
              <span class="diagramme__legend-dot diagramme__legend-dot--poids" />
              Poids (kg)
            </span>
            <span class="diagramme__legend-item">
              <span class="diagramme__legend-dot diagramme__legend-dot--med" /> Médicament validé
            </span>
          </div>
        </div>

        <div class="diagramme__meds">
          <h4>Administrations validées</h4>
          <div class="cde-table-card">
            <div class="cde-table-wrap">
              <el-table
                :data="meds"
                size="small"
                style="width:100%"
                empty-text="Aucune administration validée sur cette période"
              >
                <el-table-column prop="date" label="Date" width="110" sortable />
                <el-table-column prop="heure" label="Heure" width="70" sortable />
                <el-table-column prop="medicament" label="Médicament" min-width="180" sortable />
                <el-table-column prop="dosage" label="Dosage" width="100" />
                <el-table-column prop="voie" label="Voie" width="100" />
                <el-table-column prop="validePar" label="Validé par" width="140" sortable />
                <el-table-column prop="valideA" label="Validé à" width="80" />
              </el-table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject, watch, nextTick, type Ref } from 'vue'
import { useRoute } from 'vue-router'
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
import { getVitalSignsList, getVitalSignsItemsList } from '@/composables/useVitalSigns'
import { getValidesPlanSoins, type ValideRecord } from '@/composables/usePlanSoins'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

interface DataPoint {
  dateLabel: string
  sortKey: string
  temperature: number | null
  taSystolique: number | null
  taDiastolique: number | null
  frequenceCardiaque: number | null
  glycemie: number | null
  cetonemie: number | null
  saO2: number | null
  diurese: number | null
  poids: number | null
}

interface IndicatorConfig {
  key: keyof DataPoint & ('temperature' | 'taSystolique' | 'taDiastolique' | 'frequenceCardiaque' | 'glycemie' | 'cetonemie' | 'saO2' | 'diurese' | 'poids')
  label: string
  unit: string
  yAxisID: 'y' | 'y1'
  color: string
  min?: number
  max?: number
  stepSize?: number
}

const INDICATOR_CONFIGS: IndicatorConfig[] = [
  {
    key: 'temperature',
    label: 'Température (°C)',
    unit: '°C',
    yAxisID: 'y',
    color: '#FF3131',
    min: 35,
    max: 40,
    stepSize: 0.5,
  },
  {
    key: 'taSystolique',
    label: 'TA systolique (mmHg)',
    unit: 'mmHg',
    yAxisID: 'y1',
    color: '#0E7C7B',
    min: 60,
    max: 200,
    stepSize: 20,
  },
  {
    key: 'taDiastolique',
    label: 'TA diastolique (mmHg)',
    unit: 'mmHg',
    yAxisID: 'y1',
    color: '#E67E22',
    min: 30,
    max: 130,
    stepSize: 10,
  },
  {
    key: 'frequenceCardiaque',
    label: 'Fréquence cardiaque (bpm)',
    unit: 'bpm',
    yAxisID: 'y1',
    color: '#8E44AD',
    min: 40,
    max: 160,
    stepSize: 10,
  },
  {
    key: 'glycemie',
    label: 'Glycémie (g/L)',
    unit: 'g/L',
    yAxisID: 'y1',
    color: '#D35400',
    min: 0.3,
    max: 3.0,
    stepSize: 0.3,
  },
  {
    key: 'cetonemie',
    label: 'Cétonémie (mmol/l)',
    unit: 'mmol/l',
    yAxisID: 'y1',
    color: '#C0392B',
    min: 0,
    max: 8,
    stepSize: 1,
  },
  {
    key: 'saO2',
    label: 'SaO₂ (%)',
    unit: '%',
    yAxisID: 'y1',
    color: '#2ECC71',
    min: 70,
    max: 100,
    stepSize: 5,
  },
  {
    key: 'diurese',
    label: 'Diurèse (ml)',
    unit: 'ml',
    yAxisID: 'y1',
    color: '#3498DB',
    min: 0,
    max: 5000,
    stepSize: 500,
  },
  {
    key: 'poids',
    label: 'Poids (kg)',
    unit: 'kg',
    yAxisID: 'y1',
    color: '#F39C12',
    min: 0,
    max: 300,
    stepSize: 10,
  },
]

const route = useRoute()
const patientId = computed<number | null>(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) ? id : null
})
const points = ref<DataPoint[]>([])
const validesData = ref<ValideRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const info = ref<string | null>(null)
const selectedIndicator = ref<string>('temperature')

// Default: today only
const today = new Date().toISOString().slice(0, 10)
const dateRange = ref<[string, string]>([today, today])

function onIndicatorChange() {
  // v-model already handles reactive updates; this hook is available for side effects
}

/* ── Tab activation — re-fetch when tab becomes visible ── */

const activeTab = inject<Ref<string>>('activeTab', ref(''))

// Re-fetch data when the Diagramme tab is activated (handles tab switching
// AND initial load if already active).
watch(activeTab, (tab) => {
  if (tab === 'diagramme' && patientId.value) {
    nextTick(() => fetchData())
  }
})

// Also re-fetch when navigating to a different patient while this tab is active.
watch(patientId, (pid) => {
  if (pid && activeTab.value === 'diagramme') {
    fetchData()
  }
})

// Fallback: fetch if this tab happens to be the initial active one.
onMounted(() => {
  if (activeTab.value === 'diagramme' && patientId.value) {
    fetchData()
  }
})

async function onDateRangeChange() {
  if (dateRange.value) {
    await fetchData(true)
  }
}

async function fetchData(manual = false) {
  if (!patientId.value || !dateRange.value) return
  const [start, end] = dateRange.value
  loading.value = true
  error.value = null
  info.value = null
  try {
    const [vitals, items, valides] = await Promise.all([
      getVitalSignsList(patientId.value, start, end),
      getVitalSignsItemsList(patientId.value, start, end),
      getValidesPlanSoins(patientId.value, start, end),
    ])

    const allPoints: DataPoint[] = []

    for (const v of vitals) {
      allPoints.push({
        dateLabel: v.createdAt
          ? (() => { const d = new Date(v.createdAt); return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) })()
          : v.date,
        sortKey: v.createdAt || v.date + 'T00:00',
        temperature: v.temperature,
        taSystolique: v.taSystolique,
        taDiastolique: v.taDiastolique,
        frequenceCardiaque: v.frequenceCardiaque,
        glycemie: v.glycemie,
        cetonemie: v.cetonemie,
        saO2: v.saO2,
        diurese: v.diurese,
        poids: v.poids,
      })
    }

    for (const item of items) {
      const pad = (n: number) => String(n).padStart(2, '0')
      allPoints.push({
        dateLabel: `${item.date.slice(8, 10)}/${item.date.slice(5, 7)} ${pad(item.hour)}:00`,
        sortKey: `${item.date}T${pad(item.hour)}:00`,
        temperature: item.temperature,
        taSystolique: item.taSystolique,
        taDiastolique: item.taDiastolique,
        frequenceCardiaque: item.frequenceCardiaque,
        glycemie: item.glycemie,
        cetonemie: item.cetonemie,
        saO2: item.saO2,
        diurese: item.diurese,
        poids: item.poids,
      })
    }

    allPoints.sort((a, b) => a.sortKey.localeCompare(b.sortKey))

    if (!manual && start === end && allPoints.length === 0) {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 6)
      const weekAgoStr = weekAgo.toISOString().slice(0, 10)
      dateRange.value = [weekAgoStr, end]

      const [vitalsWide, itemsWide, validesWide] = await Promise.all([
        getVitalSignsList(patientId.value, weekAgoStr, end),
        getVitalSignsItemsList(patientId.value, weekAgoStr, end),
        getValidesPlanSoins(patientId.value, weekAgoStr, end),
      ])

      const widePoints: DataPoint[] = []
      for (const v of vitalsWide) {
        widePoints.push({
          dateLabel: v.createdAt
            ? (() => { const d = new Date(v.createdAt); return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) })()
            : v.date,
          sortKey: v.createdAt || v.date + 'T00:00',
          temperature: v.temperature, taSystolique: v.taSystolique, taDiastolique: v.taDiastolique,
          frequenceCardiaque: v.frequenceCardiaque, glycemie: v.glycemie,
          cetonemie: v.cetonemie, saO2: v.saO2, diurese: v.diurese, poids: v.poids,
        })
      }
      for (const item of itemsWide) {
        const pad = (n: number) => String(n).padStart(2, '0')
        widePoints.push({
          dateLabel: `${item.date.slice(8, 10)}/${item.date.slice(5, 7)} ${pad(item.hour)}:00`,
          sortKey: `${item.date}T${pad(item.hour)}:00`,
          temperature: item.temperature, taSystolique: item.taSystolique, taDiastolique: item.taDiastolique,
          frequenceCardiaque: item.frequenceCardiaque, glycemie: item.glycemie,
          cetonemie: item.cetonemie, saO2: item.saO2, diurese: item.diurese, poids: item.poids,
        })
      }
      widePoints.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      points.value = widePoints
      validesData.value = validesWide
      info.value = "Aucune donnée pour aujourd'hui. Affichage des 7 derniers jours."
    } else {
      points.value = allPoints
      validesData.value = valides
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

const chartData = computed(() => {
  if (points.value.length === 0) return null

  const cfg = INDICATOR_CONFIGS.find(c => c.key === selectedIndicator.value)
  if (!cfg) return null

  const labels: string[] = []
  const values: (number | null)[] = []

  for (const p of points.value) {
    labels.push(p.dateLabel)
    values.push(p[cfg.key] as any ?? null)
  }

  if (values.every(v => v === null)) return null

  return {
    labels,
    datasets: [{
      label: cfg.label,
      data: values,
      borderColor: cfg.color,
      backgroundColor: cfg.color + '18',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 7,
    }],
  }
})

const emptyChartData = {
  labels: [],
  datasets: [{
    label: 'Aucune donnée',
    data: [],
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    fill: true,
    tension: 0.4,
    pointRadius: 0,
  }],
}

const chartOptions = computed(() => {
  const cfg = INDICATOR_CONFIGS.find(c => c.key === selectedIndicator.value)
  const isSingleDay = dateRange.value && dateRange.value[0] === dateRange.value[1]

  const scales: Record<string, any> = {
    x: {
      ticks: { maxRotation: 45, maxTicksLimit: 15 },
      title: {
        display: true,
        text: isSingleDay ? 'Heure' : 'Date',
        font: { weight: 'bold' as const },
      },
    },
  }

  if (cfg) {
    const values = points.value
      .map(v => v[cfg.key])
      .filter((v): v is number => v !== null && !isNaN(v))

    let computedMin: number | undefined
    let computedMax: number | undefined

    if (values.length > 0) {
      const dataMin = Math.min(...values)
      const dataMax = Math.max(...values)
      const range = dataMax - dataMin
      const stepSize = cfg.stepSize ?? 1
      const padding = Math.max(range * 0.1, stepSize)

      computedMin = Math.floor((dataMin - padding) / stepSize) * stepSize
      computedMax = Math.ceil((dataMax + padding) / stepSize) * stepSize

      if (cfg.min !== undefined) computedMin = Math.min(computedMin, cfg.min)
      if (cfg.max !== undefined) computedMax = Math.max(computedMax, cfg.max)
    }

    scales.y = {
      type: 'linear' as const,
      position: 'left' as const,
      min: computedMin ?? cfg.min,
      max: computedMax ?? cfg.max,
      ticks: { stepSize: cfg.stepSize },
      title: { display: true, text: cfg.unit, font: { weight: 'bold' as const } },
    }
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const label = ctx.dataset.label || ''
            return `${label}: ${ctx.parsed.y}`
          },
        },
      },
    },
    scales,
  }
})

const meds = computed(() => {
  return validesData.value.map(v => ({
    id: `${v.date}-${v.heure}-${v.medicament}`,
    date: v.date,
    heure: v.heure,
    medicament: v.medicament,
    dosage: v.dosage,
    voie: v.voie,
    validePar: v.validePar || '—',
    valideA: v.valideA || '—',
  }))
})
</script>

<style scoped>
.diagramme__body {
  background: var(--cde-bg);
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  padding: 12px 14px 14px;
}
.diagramme__loading {
  min-height: 200px;
}
.diagramme__chart-wrapper {
  height: 300px;
  position: relative;
  margin: 8px 0 16px;
}
.diagramme__legend {
  margin-bottom: 18px;
  padding-top: 12px;
  border-top: 1px solid var(--cde-border-soft);
}
.diagramme__legend h4, .diagramme__meds h4 {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--cd-gray-900);
}
.diagramme__legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  align-items: center;
}
.diagramme__legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--cde-muted);
}
.diagramme__legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}
.diagramme__legend-dot--temp {
  background: #FF3131;
}
.diagramme__legend-dot--ta {
  background: var(--cd-primary);
}
.diagramme__legend-dot--ta-d {
  background: #E67E22;
}
.diagramme__legend-dot--fc {
  background: #8E44AD;
}
.diagramme__legend-dot--gly {
  background: #D35400;
}
.diagramme__legend-dot--ceto {
  background: #C0392B;
}
.diagramme__legend-dot--saO2 {
  background: #2ECC71;
}
.diagramme__legend-dot--diurese {
  background: #3498DB;
}
.diagramme__legend-dot--poids {
  background: #F39C12;
}
.diagramme__legend-dot--med {
  background: var(--cd-success);
}
.diagramme__indicators {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
}
</style>
