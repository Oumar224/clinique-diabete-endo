<template>
  <section class="fournisseurs-series">
    <div class="cde-section-head">
      <h2 class="cde-section-title">
        Évolution mensuelle par fournisseur
      </h2>
      <div class="fournisseurs-series__controls">
        <el-select
          v-model="selectedIds"
          multiple
          collapse-tags
          collapse-tags-tooltip
          filterable
          clearable
          :multiple-limit="8"
          :disabled="supplierOptions.length === 0"
          placeholder="Fournisseurs"
          class="fournisseurs-series__select"
          aria-label="Fournisseurs affichés dans les graphiques"
        >
          <el-option
            v-for="supplier in supplierOptions"
            :key="supplier.id"
            :label="supplier.nom"
            :value="supplier.id"
          />
        </el-select>
        <el-button
          :icon="Refresh"
          :loading="loading"
          size="small"
          title="Recharger les séries fournisseurs"
          @click="load"
        >
          Actualiser
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="error"
      class="cde-alert"
      type="warning"
      :closable="false"
      show-icon
      :title="error"
    />

    <div
      v-if="!loading && !hasData"
      class="cde-empty"
    >
      Aucune commande ni vente fournisseur sur cette période.
    </div>

    <div
      v-else
      v-loading="loading"
      class="cde-panels fournisseurs-series__panels"
    >
      <section class="cde-panel">
        <header class="cde-panel__head">
          <h3 class="cde-panel__title">
            Quantités commandées
          </h3>
          <span class="cde-section-meta">unités</span>
        </header>
        <div class="cde-panel__body fournisseurs-series__chart">
          <Bar
            :data="quantitesData"
            :options="quantitesOptions"
            aria-label="Quantités commandées par mois et par fournisseur"
          />
        </div>
      </section>

      <section class="cde-panel">
        <header class="cde-panel__head">
          <h3 class="cde-panel__title">
            Montant des ventes
          </h3>
          <span class="cde-section-meta">GNF</span>
        </header>
        <div class="cde-panel__body fournisseurs-series__chart">
          <Bar
            :data="ventesData"
            :options="ventesOptions"
            aria-label="Montant des ventes par mois et par fournisseur"
          />
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Refresh } from '@element-plus/icons-vue'
import { formatMontant, formatQuantite } from '@/components/comptabilite/format'
import {
  useCommandes,
  type FournisseurSeriePointDto,
  type FournisseursSeriesDto,
} from '@/composables/useCommandes'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps<{
  dateDebut: string
  dateFin: string
}>()

const { loading, error, fetchSeriesFournisseurs } = useCommandes()

const series = ref<FournisseursSeriesDto | null>(null)
const selectedIds = ref<number[]>([])

const PALETTE = [
  '#0F766E',
  '#1D4ED8',
  '#B45309',
  '#7E22CE',
  '#B91C1C',
  '#0E7490',
  '#4D7C0F',
  '#9333EA',
]

const supplierOptions = computed(() => series.value?.fournisseurs ?? [])
const hasData = computed(() => (series.value?.mois.length ?? 0) > 0
  && (supplierOptions.value.length > 0))

const visibleSuppliers = computed(() => {
  const selected = new Set(selectedIds.value)
  return supplierOptions.value.filter((supplier) => selected.has(supplier.id))
})

/** Convertit un mois `YYYY-MM` en libellé court `MM/YYYY`. */
function moisLabel(mois: string): string {
  const [year, month] = mois.split('-')
  if (!year || !month) return mois
  return `${month}/${year}`
}

const labels = computed(() => (series.value?.mois ?? []).map(moisLabel))

/**
 * Construit une série par fournisseur visible.
 *
 * @param rows - Points mensuels du backend.
 * @param valueOf - Extraction de la valeur affichée.
 */
function buildDatasets(
  rows: FournisseurSeriePointDto[],
  valueOf: (point: FournisseurSeriePointDto) => number,
): ChartData<'bar'>['datasets'] {
  const mois = series.value?.mois ?? []
  return visibleSuppliers.value.map((supplier, index) => {
    const byMonth = new Map<string, number>()
    for (const point of rows) {
      if (point.fournisseurId !== supplier.id) continue
      byMonth.set(point.mois, valueOf(point))
    }
    return {
      label: supplier.nom,
      data: mois.map((moisKey) => byMonth.get(moisKey) ?? 0),
      backgroundColor: PALETTE[index % PALETTE.length],
      borderRadius: 2,
      maxBarThickness: 26,
    }
  })
}

const quantitesData = computed<ChartData<'bar'>>(() => ({
  labels: labels.value,
  datasets: buildDatasets(series.value?.commandes ?? [], (point) => point.quantite ?? 0),
}))

const ventesData = computed<ChartData<'bar'>>(() => ({
  labels: labels.value,
  datasets: buildDatasets(series.value?.ventes ?? [], (point) => point.montant ?? 0),
}))

const baseOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      position: 'bottom',
      labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 }, padding: 10 },
    },
    tooltip: {
      padding: 8,
      boxPadding: 4,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 10 } },
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(0, 0, 0, 0.06)' },
      ticks: { precision: 0, font: { size: 10 } },
    },
  },
}

const quantitesOptions = computed<ChartOptions<'bar'>>(() => ({
  ...baseOptions,
  plugins: {
    ...baseOptions.plugins,
    tooltip: {
      ...baseOptions.plugins?.tooltip,
      callbacks: {
        label: (context) => `${context.dataset.label ?? ''} : ${formatQuantite(context.parsed.y)} u.`,
      },
    },
  },
}))

const ventesOptions = computed<ChartOptions<'bar'>>(() => ({
  ...baseOptions,
  plugins: {
    ...baseOptions.plugins,
    tooltip: {
      ...baseOptions.plugins?.tooltip,
      callbacks: {
        label: (context) => `${context.dataset.label ?? ''} : ${formatMontant(context.parsed.y)} GNF`,
      },
    },
  },
}))

interface FournisseurTotaux {
  montant: number
  quantite: number
}

/**
 * Sélectionne par défaut les cinq fournisseurs les plus actifs de la période.
 *
 * Les montants et les quantités sont totalisés séparément (jamais additionnés
 * entre eux : unités et GNF ne sont pas commensurables). Le classement est
 * déterministe : montant décroissant, puis quantité décroissante, puis nom,
 * puis identifiant — un jeu de données identique produit toujours la même
 * sélection, quel que soit l'ordre des points renvoyé par le backend.
 *
 * @param data - Séries fournisseurs de la période.
 * @returns Les identifiants des fournisseurs sélectionnés.
 */
function defaultSelection(data: FournisseursSeriesDto | null): number[] {
  if (!data) return []
  const totals = new Map<number, FournisseurTotaux>()
  for (const point of [...data.commandes, ...data.ventes]) {
    const acc = totals.get(point.fournisseurId) ?? { montant: 0, quantite: 0 }
    acc.montant += point.montant ?? 0
    acc.quantite += point.quantite ?? 0
    totals.set(point.fournisseurId, acc)
  }
  return [...data.fournisseurs]
    .sort((a, b) => {
      const totalA = totals.get(a.id) ?? { montant: 0, quantite: 0 }
      const totalB = totals.get(b.id) ?? { montant: 0, quantite: 0 }
      return totalB.montant - totalA.montant
        || totalB.quantite - totalA.quantite
        || a.nom.localeCompare(b.nom, 'fr')
        || a.id - b.id
    })
    .slice(0, 5)
    .map((supplier) => supplier.id)
}

/** Charge les séries sur la période courante. */
async function load() {
  if (!props.dateDebut || !props.dateFin) return
  const data = await fetchSeriesFournisseurs({
    dateDebut: props.dateDebut,
    dateFin: props.dateFin,
  })
  series.value = data
  const available = new Set((data?.fournisseurs ?? []).map((supplier) => supplier.id))
  const kept = selectedIds.value.filter((id) => available.has(id))
  selectedIds.value = kept.length > 0 ? kept : defaultSelection(data)
}

watch(() => [props.dateDebut, props.dateFin], load)
onMounted(load)
</script>

<style scoped>
.fournisseurs-series {
  margin-top: 8px;
}

.fournisseurs-series__controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.fournisseurs-series__select {
  width: 260px;
  max-width: 100%;
}

.fournisseurs-series__panels {
  margin-top: 8px;
}

.fournisseurs-series__chart {
  height: 270px;
  padding: 4px 2px;
  position: relative;
}
</style>
