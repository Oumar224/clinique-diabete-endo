<template>
  <div class="diagramme">
    <h3 class="diagramme__title">Diagramme de synthèse — 24h</h3>

    <el-card>
      <div class="diagramme__chart-wrapper">
        <Line v-if="chartData" :data="chartData" :options="chartOptions" />
        <el-empty v-else description="Impossible de générer le graphique" :image-size="60" />
      </div>

      <el-divider />

      <div class="diagramme__legend">
        <h4>Légende</h4>
        <div class="diagramme__legend-items">
          <span class="diagramme__legend-item">
            <span class="diagramme__legend-dot diagramme__legend-dot--temp" />
            Température (°C)
          </span>
          <span class="diagramme__legend-item">
            <el-tag size="small" type="success">💊</el-tag>            Médicament validé
          </span>
        </div>
      </div>

      <div class="diagramme__meds">
        <h4>Administrations validées (24h)</h4>
        <el-timeline>
          <el-timeline-item
            v-for="m in meds"
            :key="m.id"
            :timestamp="m.heure"
            type="success"
            size="normal"
          >
            <strong>{{ m.medicament }}</strong>
            <span style="font-size:13px;color:var(--cd-gray-600);margin-left:8px">par {{ m.soignant }}</span>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

interface MedAdmin {
  id: number
  medicament: string
  heure: string
  soignant: string
}

const meds = ref<MedAdmin[]>([
  { id: 1, medicament: 'Furosémide', heure: '08:15', soignant: 'IDE Diallo' },
  { id: 2, medicament: 'Metformine', heure: '08:15', soignant: 'IDE Diallo' },
  { id: 3, medicament: 'Furosémide', heure: '18:10', soignant: 'IDE Diallo' },
])

const chartData = computed(() => {
  // Generate 24 data points (one per hour)
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}h`)
  // Mock temperature curve over 24h
  const temps = [
    37.1, 37.0, 36.9, 36.8, 36.8, 36.9,
    37.0, 37.2, 37.5, 37.8, 38.0, 38.1,
    38.0, 37.9, 37.7, 37.6, 37.5, 37.4,
    37.3, 37.2, 37.1, 37.0, 37.0, 37.1,
  ]

  return {
    labels: hours,
    datasets: [
      {
        label: 'Température (°C)',
        data: temps,
        borderColor: '#FF3131',
        backgroundColor: 'rgba(255, 49, 49, 0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `${ctx.parsed.y} °C`,
      },
    },
  },
  scales: {
    y: {
      min: 36,
      max: 39,
      ticks: { stepSize: 0.5 },
      title: { display: true, text: '°C', font: { weight: 'bold' as const } },
    },
    x: {
      ticks: { maxRotation: 45 },
    },
  },
}
</script>

<style scoped>
.diagramme__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--cd-gray-900);
  margin-bottom: 16px;
}
.diagramme__chart-wrapper {
  height: 300px;
  position: relative;
}
.diagramme__legend {
  margin-bottom: 16px;
}
.diagramme__legend h4, .diagramme__meds h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--cd-gray-900);
}
.diagramme__legend-items {
  display: flex;
  gap: 24px;
  align-items: center;
}
.diagramme__legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--cd-gray-600);
}
.diagramme__legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.diagramme__legend-dot--temp {
  background: #FF3131;
}
</style>
