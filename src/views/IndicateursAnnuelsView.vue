<template>
  <div class="indicateurs cde">
    <header class="cde-page-head ia-head">
      <div class="ia-head__text">
        <h1 class="cde-page-title">
          Indicateur
        </h1>
      </div>

      <div class="cde-head-actions">
        <span class="cde-field-label">Période</span>
        <div class="ia-range">
          <el-date-picker
            v-model="fromYear"
            class="ia-year-picker"
            type="year"
            value-format="YYYY"
            :clearable="false"
            placeholder="De"
            aria-label="Année de début"
            @change="applyRange"
          />
          <span
            class="ia-range-sep"
            aria-hidden="true"
          >→</span>
          <el-date-picker
            v-model="toYear"
            class="ia-year-picker"
            type="year"
            value-format="YYYY"
            :clearable="false"
            placeholder="À"
            aria-label="Année de fin"
            @change="applyRange"
          />
        </div>
        <el-button
          data-test="refresh"
          size="small"
          :loading="loading"
          @click="applyRange"
        >
          Actualiser
        </el-button>
        <el-button
          data-test="export"
          size="small"
          type="primary"
          :loading="exportingIndicateurs"
          @click="onExport"
        >
          Exporter Excel
        </el-button>
      </div>
    </header>

    <section
      class="cde-summary ia-summary"
      aria-label="Indicateurs cumulés de la période"
    >
      <div class="cde-summary__item">
        <span class="cde-summary__label">Cas suivis</span>
        <span class="cde-summary__value ia-kpi__value">{{ casSuivis == null ? '—' : formatCount(casSuivis) }}</span>
        <span class="cde-summary__sub">Diabète / endocrinologie</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Total activités</span>
        <span class="cde-summary__value ia-kpi__value">{{ totalActivites == null ? '—' : formatCount(totalActivites) }}</span>
        <span class="cde-summary__sub">Cumul sur la période</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Moyenne / an</span>
        <span class="cde-summary__value ia-kpi__value">{{ moyenneActivites == null ? '—' : formatCount(moyenneActivites) }}</span>
        <span class="cde-summary__sub">Activités par année renseignée</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Nouveaux cas cumulés</span>
        <span class="cde-summary__value ia-kpi__value">{{ nouveauxCasCumules == null ? '—' : formatCount(nouveauxCasCumules) }}</span>
        <span class="cde-summary__sub">Diabète, thyroïde / endocrino et autres</span>
      </div>
    </section>

    <div
      v-if="error"
      class="ia-error"
      role="alert"
    >
      <span>{{ error }}</span>
      <button
        type="button"
        class="ia-error__retry"
        @click="applyRange"
      >
        Réessayer
      </button>
    </div>

    <div
      class="ia-status"
      role="status"
      aria-live="polite"
    >
      <p
        v-if="loading"
        class="ia-status__note"
      >
        Chargement des indicateurs…
      </p>
      <p
        v-else-if="!error && !hasData"
        class="ia-status__note ia-status__note--empty"
      >
        Aucune donnée pour cette période — le tableau reste disponible pour la saisie.
      </p>
      <p
        v-else-if="!error"
        class="ia-status__meta"
      >
        {{ periodLabel }} · {{ lignes.length }} année{{ lignes.length > 1 ? 's' : '' }}
      </p>
    </div>

    <div class="cde-table-card ia-card">
      <div
        class="ia-scroll"
        role="region"
        aria-label="Indicateurs par année"
        tabindex="0"
      >
        <table class="ia-table">
          <!-- Une seule table + un seul colgroup : en-tête, corps, totaux et
               moyenne partagent exactement les mêmes largeurs de colonnes. -->
          <colgroup>
            <col class="ia-col-year">
            <col
              v-for="metric in METRICS"
              :key="`col-${metric.key}`"
              :class="metric.group === 'suivi' ? 'ia-col-suivi' : 'ia-col-metric'"
            >
          </colgroup>
          <thead>
            <tr class="ia-head-group">
              <th
                rowspan="2"
                scope="col"
                class="ia-th ia-col-year"
              >
                Année
              </th>
              <th
                :colspan="SUIVI_METRICS.length"
                scope="colgroup"
                class="ia-th ia-group ia-group--suivi"
              >
                Suivi
                <span class="ia-group__unit">cas</span>
              </th>
              <th
                :colspan="ACTIVITE_METRICS.length"
                scope="colgroup"
                class="ia-th ia-group"
              >
                Activité
                <span class="ia-group__unit">cas</span>
              </th>
            </tr>
            <tr class="ia-head-metrics">
              <th
                v-for="metric in SUIVI_METRICS"
                :key="`h-${metric.key}`"
                scope="col"
                class="ia-th ia-th--metric ia-th--suivi"
                :title="metric.label"
              >
                {{ metric.shortLabel }}
              </th>
              <th
                v-for="metric in ACTIVITE_METRICS"
                :key="`h-${metric.key}`"
                scope="col"
                class="ia-th ia-th--metric"
                :class="{ 'ia-th--derived': metric.derived }"
                :title="metric.label"
              >
                {{ metric.shortLabel }}
              </th>
            </tr>
          </thead>

          <tbody>
            <template
              v-for="row in lignes"
              :key="row.annee"
            >
              <tr
                class="ia-year-row"
                :class="{ 'ia-year-row--expanded': isExpanded(row.annee) }"
              >
                <th
                  scope="row"
                  class="ia-td ia-col-year ia-year-cell"
                >
                  <button
                    type="button"
                    class="ia-expand"
                    :data-test="`expand-${row.annee}`"
                    :aria-expanded="isExpanded(row.annee) ? 'true' : 'false'"
                    :aria-controls="detailId(row.annee)"
                    :aria-label="`Afficher le détail mensuel de ${row.annee}`"
                    :title="`Détail mensuel ${row.annee}`"
                    @click="toggleDetail(row.annee)"
                  >
                    <span
                      class="ia-chevron"
                      aria-hidden="true"
                    />
                    <span>{{ row.annee }}</span>
                  </button>
                </th>
                <td
                  v-for="metric in METRICS"
                  :key="`${row.annee}-${metric.key}`"
                  :class="cellClasses(row, metric.key)"
                  :data-annee="row.annee"
                  :data-metric="metric.key"
                  :tabindex="canEdit(metric.key) ? 0 : undefined"
                  :title="`${metric.label} · ${row.annee}`"
                  @click="startEdit(row, metric.key)"
                  @keydown.enter.prevent="startEdit(row, metric.key)"
                >
                  <div
                    v-if="isEditing(row.annee, metric.key)"
                    class="ia-edit"
                  >
                    <input
                      :ref="setEditorRef"
                      v-model="editValue"
                      class="ia-input"
                      type="number"
                      min="0"
                      step="1"
                      inputmode="numeric"
                      :aria-label="`Valeur ${metric.label} pour ${row.annee}`"
                      @click.stop
                      @keydown.enter.prevent="commitEdit(row, metric.key)"
                      @keydown.esc.prevent="cancelEdit"
                      @blur="commitEdit(row, metric.key)"
                    >
                  </div>
                  <div
                    v-else
                    class="ia-cell"
                  >
                    <span
                      class="ia-val"
                      :class="{ 'ia-val--muted': row[metric.key] == null }"
                    >{{ formatMetric(row[metric.key]) }}</span>
                    <span
                      v-if="row.sources[metric.key] === 'saisi'"
                      class="ia-src"
                      title="Valeur saisie manuellement"
                    >saisi</span>
                    <button
                      v-if="isAdmin && row.sources[metric.key] === 'saisi' && !metric.derived"
                      type="button"
                      class="ia-clear"
                      :aria-label="`Effacer ${metric.label} de ${row.annee}`"
                      title="Effacer la valeur saisie"
                      @click.stop="onClear(row.annee, metric.key)"
                    >
                      ×
                    </button>
                  </div>
                </td>
              </tr>

              <tr
                v-if="isExpanded(row.annee)"
                :id="detailId(row.annee)"
                class="ia-detail-row"
                :data-detail-annee="row.annee"
              >
                <td
                  :colspan="METRICS.length + 1"
                  class="ia-detail-cell"
                >
                  <div
                    v-if="isDetailLoading(row.annee)"
                    class="ia-detail-state"
                    role="status"
                  >
                    Chargement du détail mensuel…
                  </div>
                  <div
                    v-else-if="detailError(row.annee)"
                    class="ia-detail-state ia-detail-state--error"
                    role="alert"
                  >
                    <span>{{ detailError(row.annee) }}</span>
                    <button
                      type="button"
                      class="ia-detail-retry"
                      @click="retryDetail(row.annee)"
                    >
                      Réessayer
                    </button>
                  </div>
                  <div
                    v-else-if="detailFor(row.annee)"
                    class="ia-detail-scroll"
                    role="region"
                    :aria-label="`Détail mensuel ${row.annee}`"
                    tabindex="0"
                  >
                    <table class="ia-monthly">
                      <caption class="ia-sr-only">
                        Détail mensuel {{ row.annee }}
                      </caption>
                      <colgroup>
                        <col class="ia-monthly-col-label">
                        <col
                          v-for="month in MONTH_LABELS"
                          :key="`mc-${row.annee}-${month}`"
                        >
                        <col class="ia-monthly-col-total">
                      </colgroup>
                      <thead>
                        <tr>
                          <th
                            scope="col"
                            class="ia-monthly-th ia-monthly-th--metric"
                          >
                            Indicateur
                          </th>
                          <th
                            v-for="(month, index) in MONTH_LABELS"
                            :key="`mh-${row.annee}-${index}`"
                            scope="col"
                            class="ia-monthly-th"
                          >
                            {{ month }}
                          </th>
                          <th
                            scope="col"
                            class="ia-monthly-th ia-monthly-th--total"
                          >
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="ligne in monthlyRows(row.annee)"
                          :key="`${row.annee}-${ligne.metric}`"
                          :data-monthly-metric="ligne.metric"
                        >
                          <th
                            scope="row"
                            class="ia-monthly-rowlabel"
                            :title="METRIC_META[ligne.metric].label"
                          >
                            {{ METRIC_META[ligne.metric].shortLabel }}
                          </th>
                          <td
                            v-for="(value, index) in ligne.mois"
                            :key="`${row.annee}-${ligne.metric}-${index}`"
                            class="ia-monthly-cell"
                            :class="{ 'ia-monthly-cell--empty': value == null }"
                          >
                            {{ formatMonth(value) }}
                          </td>
                          <td class="ia-monthly-cell ia-monthly-cell--total">
                            {{ formatMonth(ligne.total) }}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr class="ia-monthly-total-row">
                          <th
                            scope="row"
                            class="ia-monthly-rowlabel"
                          >
                            Total
                          </th>
                          <td
                            v-for="(value, index) in detailFor(row.annee)?.totaux_mois ?? []"
                            :key="`${row.annee}-total-${index}`"
                            class="ia-monthly-cell"
                          >
                            {{ formatMonth(value) }}
                          </td>
                          <td class="ia-monthly-cell ia-monthly-cell--total ia-monthly-cell--grand">
                            {{ formatMonth(detailFor(row.annee)?.total ?? null) }}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div
                    v-else
                    class="ia-detail-state"
                  >
                    Détail indisponible.
                  </div>
                </td>
              </tr>
            </template>
          </tbody>

          <tfoot v-if="lignes.length > 0">
            <tr class="ia-foot-row ia-foot-total">
              <th
                scope="row"
                class="ia-col-year ia-foot-label"
              >
                Total
              </th>
              <td
                v-for="metric in METRICS"
                :key="`t-${metric.key}`"
                class="ia-td ia-foot-value"
                :class="{ 'ia-foot-value--muted': totaux?.[metric.key] == null }"
              >
                {{ formatMetric(totaux?.[metric.key] ?? null) }}
              </td>
            </tr>
            <tr class="ia-foot-row ia-foot-moyenne">
              <th
                scope="row"
                class="ia-col-year ia-foot-label"
              >
                Moyenne par an
              </th>
              <td
                v-for="metric in METRICS"
                :key="`m-${metric.key}`"
                class="ia-td ia-foot-value"
                :class="{ 'ia-foot-value--muted': totaux?.moyenne_par_an?.[metric.key] == null }"
              >
                {{ formatMetric(totaux?.moyenne_par_an?.[metric.key] ?? null) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <section class="cde-panel ia-chart-panel">
      <div class="cde-panel__head">
        <span class="cde-panel__title">Évolution annuelle</span>
        <span class="cde-panel__meta">Total activités (barres) · Suivi diabète/endo. (courbe)</span>
      </div>
      <div class="ia-chart">
        <Bar
          :data="chartData"
          :options="chartOptions"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Bar } from 'vue-chartjs'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { useIndicateursAnnuels } from '@/composables/useIndicateursAnnuels'
import { useExport } from '@/composables/useExport'
import {
  ACTIVITE_METRICS,
  ACTIVITY_KEYS,
  METRIC_META,
  METRICS,
  MONTH_LABELS,
  SUIVI_METRICS,
  type IndicateursMensuelsDto,
  type IndicateursMensuelLigne,
  type IndicateursYearRow,
  type MetricKey,
} from '@/types/indicateurs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
)

const CURRENT_YEAR = new Date().getFullYear()

const {
  lignes,
  totaux,
  loading,
  error,
  mensuels,
  mensuelLoading,
  mensuelErrors,
  isAdmin,
  hasData,
  fetchStats,
  fetchMensuel,
  setManuel,
  clearManuel,
} = useIndicateursAnnuels()
const { exportingIndicateurs, exportIndicateursExcel } = useExport()

const fromYear = ref(String(CURRENT_YEAR - 4))
const toYear = ref(String(CURRENT_YEAR))

const numberFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

function formatCount(value: number): string {
  return numberFormatter.format(value)
}

/**
 * Formate un comptage annuel. Toutes les métriques sont des cas entiers :
 * aucun montant ni symbole monétaire n'est affiché sur cet écran.
 */
function formatMetric(value: number | null | undefined): string {
  if (value == null) return '—'
  return formatCount(Math.round(value))
}

/** Formate une valeur mensuelle — « — » quand la cellule n'est pas renseignée. */
function formatMonth(value: number | null | undefined): string {
  if (value == null) return '—'
  return formatCount(Math.round(value))
}

/** Somme les valeurs disponibles ; `null` si aucune n'est renseignée. */
function sumNullable(values: Array<number | null | undefined>): number | null {
  const present = values.filter((value): value is number => value != null)
  if (present.length === 0) return null
  return present.reduce((sum, value) => sum + value, 0)
}

function normalizeRange(): { fromYear: number; toYear: number } {
  let from = Number(fromYear.value) || CURRENT_YEAR
  let to = Number(toYear.value) || CURRENT_YEAR
  if (from > to) [from, to] = [to, from]
  return { fromYear: from, toYear: to }
}

async function applyRange(): Promise<void> {
  const range = normalizeRange()
  fromYear.value = String(range.fromYear)
  toYear.value = String(range.toYear)
  await fetchStats(range.fromYear, range.toYear)
}

async function onExport(): Promise<void> {
  const range = normalizeRange()
  await exportIndicateursExcel(range)
}

const casSuivis = computed<number | null>(() =>
  totaux.value?.suivi_diabete_endocrino ?? null,
)
const totalActivites = computed<number | null>(() =>
  totaux.value?.total_activites ?? null,
)
const moyenneActivites = computed<number | null>(() =>
  totaux.value?.moyenne_par_an?.total_activites ?? null,
)
const nouveauxCasCumules = computed<number | null>(() => {
  if (!totaux.value) return null
  return sumNullable([
    totaux.value.nouveaux_cas_diabete,
    totaux.value.nouveaux_cas_thyroide_endocrino,
    totaux.value.autres_nouveaux_cas,
  ])
})

const periodLabel = computed(() => `${fromYear.value} → ${toYear.value}`)

// ─── Détail mensuel (paresseux, en cache par année) ───

const METRIC_ORDER = new Map(METRICS.map((metric, index) => [metric.key, index]))

const expandedYears = ref<Set<number>>(new Set())

function detailId(annee: number): string {
  return `ia-detail-${annee}`
}

function isExpanded(annee: number): boolean {
  return expandedYears.value.has(annee)
}

function isDetailLoading(annee: number): boolean {
  return Boolean(mensuelLoading.value[annee])
}

function detailError(annee: number): string | null {
  return mensuelErrors.value[annee] ?? null
}

function detailFor(annee: number): IndicateursMensuelsDto | null {
  return mensuels.value[annee] ?? null
}

/**
 * Lignes à afficher dans le détail mensuel : les métriques non dérivées,
 * dans l'ordre du tableau annuel. Les totaux sont rendus dans une ligne
 * dédiée (`tfoot`), jamais dupliqués en tant que métrique.
 */
function monthlyRows(annee: number): IndicateursMensuelLigne[] {
  const data = mensuels.value[annee]
  if (!data) return []
  return [...data.lignes]
    .filter((ligne) => ACTIVITY_KEYS.includes(ligne.metric))
    .sort(
      (a, b) =>
        (METRIC_ORDER.get(a.metric) ?? Number.MAX_SAFE_INTEGER) -
        (METRIC_ORDER.get(b.metric) ?? Number.MAX_SAFE_INTEGER),
    )
}

async function toggleDetail(annee: number): Promise<void> {
  const next = new Set(expandedYears.value)
  if (next.has(annee)) {
    next.delete(annee)
    expandedYears.value = next
    return
  }

  next.add(annee)
  expandedYears.value = next
  await fetchMensuel(annee)
}

async function retryDetail(annee: number): Promise<void> {
  await fetchMensuel(annee)
}

// ─── Édition inline (ADMIN) ───

const editing = ref<{ annee: number; metric: MetricKey } | null>(null)
const editValue = ref<string | number>('')
const editInput = ref<HTMLInputElement | null>(null)
let committing = false

function canEdit(metric: MetricKey): boolean {
  return isAdmin.value && !METRIC_META[metric].derived
}

function isEditing(annee: number, metric: MetricKey): boolean {
  return editing.value?.annee === annee && editing.value?.metric === metric
}

function setEditorRef(element: unknown): void {
  if (element instanceof HTMLInputElement) {
    editInput.value = element
    element.focus()
    element.select()
  } else {
    editInput.value = null
  }
}

function cellClasses(row: IndicateursYearRow, metric: MetricKey): Record<string, boolean> {
  const source = row.sources[metric]
  return {
    'ia-td': true,
    'ia-td--saisi': source === 'saisi',
    'ia-td--empty': row[metric] == null,
    'ia-td--derived': METRIC_META[metric].derived,
    'ia-td--editable': canEdit(metric),
  }
}

function startEdit(row: IndicateursYearRow, metric: MetricKey): void {
  if (!canEdit(metric) || editing.value) return
  editing.value = { annee: row.annee, metric }
  editValue.value = row[metric] == null ? '' : String(row[metric])
  nextTick(() => editInput.value?.focus())
}

function cancelEdit(): void {
  editing.value = null
  editValue.value = ''
}

async function commitEdit(row: IndicateursYearRow, metric: MetricKey): Promise<void> {
  if (!isEditing(row.annee, metric) || committing) return

  const raw = String(editValue.value ?? '').trim()
  if (raw === '') {
    cancelEdit()
    return
  }

  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0) {
    ElMessage.warning('La valeur doit être un entier positif ou nul')
    return
  }

  const previousValue = row[metric]
  const previousSource = row.sources[metric]

  committing = true
  editing.value = null

  // Mise à jour optimiste : la valeur et la source changent immédiatement,
  // puis le backend renvoie les lignes et totaux recalculés.
  lignes.value = lignes.value.map((ligne) =>
    ligne.annee === row.annee
      ? {
          ...ligne,
          [metric]: value,
          sources: { ...ligne.sources, [metric]: 'saisi' as const },
        }
      : ligne,
  )

  try {
    const saved = await setManuel(row.annee, metric, value)
    if (!saved) {
      lignes.value = lignes.value.map((ligne) =>
        ligne.annee === row.annee
          ? {
              ...ligne,
              [metric]: previousValue,
              sources: { ...ligne.sources, [metric]: previousSource },
            }
          : ligne,
      )
      ElMessage.error(error.value || "Échec de l'enregistrement de la valeur")
    }
  } finally {
    committing = false
    editValue.value = ''
  }
}

async function onClear(annee: number, metric: MetricKey): Promise<void> {
  const cleared = await clearManuel(annee, metric)
  if (!cleared) ElMessage.error(error.value || 'Échec de la suppression de la valeur')
}

// ─── Graphique ───

const chartData = computed<any>(() => ({
  labels: lignes.value.map((ligne) => String(ligne.annee)),
  datasets: [
    {
      type: 'bar',
      label: 'Total activités',
      // `null` = année sans donnée : Chart.js laisse un trou au lieu de
      // dessiner une barre à zéro, qui serait une information fausse.
      data: lignes.value.map((ligne) => ligne.total_activites ?? null),
      backgroundColor: 'rgba(14, 124, 123, 0.18)',
      borderColor: '#0E7C7B',
      borderWidth: 1,
      yAxisID: 'y',
      order: 2,
    },
    {
      type: 'line',
      label: 'Suivi diabète / endo.',
      data: lignes.value.map((ligne) => ligne.suivi_diabete_endocrino ?? null),
      borderColor: '#0A5F5E',
      backgroundColor: 'transparent',
      pointBackgroundColor: '#0A5F5E',
      pointRadius: 3,
      tension: 0.25,
      spanGaps: false,
      yAxisID: 'y',
      order: 1,
    },
  ],
}))

const chartOptions: any = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  layout: { padding: { top: 4, right: 10, bottom: 0, left: 0 } },
  plugins: {
    // Légende sous le tracé : elle ne chevauche pas le graphique à 1280 px.
    legend: {
      display: true,
      position: 'bottom',
      align: 'end',
      labels: { boxWidth: 10, boxHeight: 10, padding: 12, usePointStyle: true },
    },
    tooltip: {
      callbacks: {
        label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) => {
          const label = context.dataset.label ?? ''
          const value = context.parsed.y
          if (value == null) return `${label} : —`
          return `${label} : ${formatCount(Math.round(value))}`
        },
      },
    },
  },
  scales: {
    // Un seul axe, en cas : les barres et la courbe sont tous deux des
    // comptages. Aucun axe ni formatage monétaire ne subsiste.
    y: {
      beginAtZero: true,
      ticks: { precision: 0 },
      title: { display: true, text: 'Cas' },
    },
  },
}

onMounted(async () => {
  await applyRange()
})
</script>

<style scoped>
.indicateurs {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  max-width: 100%;
  /* La matrice peut grandir après le chargement asynchrone : sans cela le
     navigateur ajuste le scroll et masque le titre de la page. */
  overflow-anchor: none;
}

/* Bandeau de titre compact : hiérarchie calme, accent discret à gauche.
   Le bloc texte se comprime (flex: 1 1 0) pour que la barre d'outils reste
   sur la même ligne à 1280 px. */
.cde-page-head.ia-head {
  flex-shrink: 0;
  align-items: flex-end;
  flex-wrap: nowrap;
  gap: 16px;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  background: var(--cde-surface);
  box-shadow: inset 3px 0 0 var(--cde-accent);
}

.ia-head__text {
  flex: 1 1 0;
  min-width: 0;
}

.ia-head .cde-head-actions {
  flex: 0 0 auto;
  flex-wrap: nowrap;
}

.cde-page-title {
  font-size: 16px;
  line-height: 1.2;
}

.ia-range {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ia-range-sep {
  color: var(--cde-muted);
  font-size: 12px;
  line-height: 1;
}

/* Spécificité > `.el-date-editor.el-input` d'Element Plus, sinon la largeur
   par défaut (150 px) écrase la nôtre et la barre d'outils déborde. */
.ia-head :deep(.ia-year-picker) {
  width: 96px;
}

.ia-summary {
  flex-shrink: 0;
  margin: 0;
}

.ia-kpi {
  padding: 8px 12px;
}

.ia-kpi__value {
  font-size: 14px;
  line-height: 1.25;
}

.ia-kpi__label {
  font-size: 9px;
  line-height: 1.3;
}

.ia-kpi__unit {
  flex: 0 0 auto;
  margin-left: auto;
  color: var(--cde-muted);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.ia-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  padding: 7px 10px;
  border: 1px solid color-mix(in srgb, var(--cde-danger) 22%, transparent);
  border-radius: 4px;
  background: var(--cde-danger-tint);
  color: var(--cde-danger);
  font-size: 12px;
  line-height: 1.4;
}

.ia-error__retry {
  flex: 0 0 auto;
  border: 1px solid currentColor;
  border-radius: 3px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 600;
  padding: 2px 8px;
  cursor: pointer;
}

.ia-error__retry:hover {
  background: rgba(180, 35, 24, 0.08);
}

/* Ligne d'état toujours présente : même hauteur pendant le chargement, sur
   une période vide et après chargement, donc aucun saut de mise en page. */
.ia-status {
  display: flex;
  align-items: center;
  min-height: 24px;
  margin: 0;
  color: var(--cde-muted);
  font-size: 11px;
  line-height: 1.4;
}

.ia-status p {
  margin: 0;
}

.ia-status__note--empty {
  padding: 3px 8px;
  border: 1px solid var(--cde-border);
  border-radius: 4px;
  background: var(--cde-surface-tint);
}

.ia-status__meta {
  font-variant-numeric: tabular-nums;
}

/* ── Tableau matriciel ──────────────────────────────────── */

/* `.cde-table-card:has(> :not(.el-table))` rend la carte elle-même
   défilante ; on isole le défilement dans `.ia-scroll` pour que le pied
   collant reste aligné sur le corps. */
.cde-table-card.ia-card {
  flex: 0 1 auto;
  overflow: hidden;
}

.ia-scroll {
  max-height: var(--cde-table-max);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.ia-scroll:focus-visible {
  outline: 2px solid var(--cde-accent);
  outline-offset: -2px;
}

.ia-table {
  width: 100%;
  min-width: 0;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  color: var(--cde-text);
  font-size: 12px;
}

/* 14 colonnes : l'année et la cohorte suivie ont leur largeur propre, les
   12 autres indicateurs se partagent le reste (≈ 70 px à 1280 px de large). */
.ia-col-year {
  width: 7%;
}

/* La colonne « Suivi diabète / endo. » porte un libellé long : elle reçoit
   un peu plus de largeur que les comptages unitaires. */
.ia-col-suivi {
  width: 10%;
}

.ia-col-metric {
  width: auto;
}

.ia-th {
  position: sticky;
  z-index: 3;
  padding: 4px 6px;
  border-bottom: 1px solid var(--cde-border);
  background: var(--cde-header-bg);
  color: var(--cde-header-text);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.15;
  text-align: center;
  vertical-align: bottom;
  white-space: normal;
}

.ia-head-group .ia-th {
  top: 0;
  height: 24px;
  padding: 3px 6px;
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.ia-head-metrics .ia-th {
  top: 24px;
  height: auto;
  min-height: 42px;
  padding: 4px;
}

/* Les libellés se replient sur 2-3 lignes : jamais d'ellipsis qui masque
   le sens de la colonne (« Nouvea… »). */
.ia-th--metric {
  overflow-wrap: anywhere;
  word-break: normal;
  hyphens: auto;
}

.ia-th--suivi {
  border-left: 1px solid var(--cde-border);
}

.ia-th--derived {
  color: var(--cde-accent-strong);
}

.ia-group__unit {
  margin-left: 3px;
  color: var(--cde-muted);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: lowercase;
}

/* Colonne Année figée : le défilement horizontal (sous 1100 px) ne perd
   jamais le repère de lecture. */
.ia-col-year {
  position: sticky;
  left: 0;
  z-index: 4;
  padding-left: 8px;
  border-right: 1px solid var(--cde-border);
  background: var(--cde-surface);
  color: var(--cde-header-text);
  text-align: left;
  white-space: nowrap;
}

thead .ia-col-year {
  z-index: 6;
  background: var(--cde-header-bg);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.ia-td {
  height: 28px;
  padding: 4px 6px;
  border-bottom: 1px solid var(--cde-border-soft);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

.ia-year-row .ia-col-year {
  background: var(--cde-surface);
  font-size: 12px;
  font-weight: 700;
}

.ia-year-row--expanded .ia-col-year {
  background: var(--cde-accent-tint);
}

.ia-year-cell {
  padding: 0 6px 0 4px;
}

.ia-expand {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 28px;
  padding: 2px 2px 2px 4px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-variant-numeric: tabular-nums;
  text-align: left;
  cursor: pointer;
}

.ia-expand:hover {
  color: var(--cde-accent-strong);
}

.ia-expand:focus-visible {
  outline: 2px solid var(--cde-accent);
  outline-offset: -2px;
}

/* Chevron CSS : aucune icône externe, rotation seule (GPU-friendly). */
.ia-chevron {
  flex: 0 0 auto;
  width: 5px;
  height: 5px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(-45deg);
  transition: transform 120ms ease;
}

.ia-year-row--expanded .ia-chevron {
  transform: rotate(45deg);
}

@media (prefers-reduced-motion: reduce) {
  .ia-chevron {
    transition: none;
  }
}

.ia-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  min-width: 0;
  min-height: 18px;
}

.ia-val {
  overflow: hidden;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
}

.ia-val--muted {
  color: var(--cde-muted);
}

.ia-td--saisi {
  background: #F0F7F7;
}

.ia-td--saisi:hover {
  background: var(--cde-accent-tint);
}

.ia-td--derived {
  background: var(--cde-surface-tint);
  font-weight: 600;
}

.ia-td--editable {
  cursor: cell;
}

.ia-td--editable:hover {
  background: var(--cde-accent-tint);
}

.ia-td--editable:focus-visible {
  outline: 2px solid var(--cde-accent);
  outline-offset: -2px;
}

.ia-src {
  flex: 0 0 auto;
  display: inline-block;
  padding: 0 1px;
  border: 1px solid color-mix(in srgb, var(--cde-accent-strong) 28%, transparent);
  border-radius: 2px;
  background: var(--cde-surface);
  color: var(--cde-accent-strong);
  font-size: 7px;
  font-weight: 700;
  line-height: 10px;
  letter-spacing: 0;
}

/* Bouton compact : un « × » de 14 px ne rogne pas la valeur dans une
   colonne de 70 px, contrairement au libellé « Effacer ». */
.ia-clear {
  position: absolute;
  top: -2px;
  right: -3px;
  display: grid;
  width: 14px;
  height: 14px;
  padding: 0;
  border: 0;
  border-radius: 2px;
  background: var(--cde-surface);
  color: var(--cde-danger);
  font: inherit;
  font-size: 11px;
  line-height: 1;
  place-items: center;
  cursor: pointer;
  opacity: 0;
}

.ia-td:hover .ia-clear,
.ia-clear:focus-visible {
  opacity: 1;
}

.ia-clear:hover {
  color: #8B1A12;
}

.ia-edit {
  display: flex;
  justify-content: flex-end;
}

.ia-input {
  width: 100%;
  height: 22px;
  padding: 0 3px;
  border: 1px solid var(--cde-accent);
  border-radius: 2px;
  outline: none;
  background: var(--cde-surface);
  color: var(--cde-text);
  font-family: inherit;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  box-shadow: 0 0 0 1px var(--cde-accent-tint);
}

.ia-input::-webkit-outer-spin-button,
.ia-input::-webkit-inner-spin-button {
  margin: 0;
  -webkit-appearance: none;
}

/* ── Détail mensuel ─────────────────────────────────────── */

.ia-detail-row > .ia-detail-cell {
  border-bottom: 1px solid var(--cde-border);
  background: var(--cde-surface-tint);
}

.ia-detail-cell {
  padding: 6px;
}

.ia-detail-state {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 32px;
  padding: 6px 10px;
  color: var(--cde-muted);
  font-size: 12px;
  line-height: 1.4;
}

.ia-detail-state--error {
  color: var(--cde-danger);
}

.ia-detail-retry {
  flex: 0 0 auto;
  padding: 2px 8px;
  border: 1px solid currentColor;
  border-radius: 3px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.ia-detail-retry:hover {
  background: rgba(180, 35, 24, 0.08);
}

.ia-detail-scroll {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  border: 1px solid var(--cde-border);
  border-radius: 4px;
  background: var(--cde-surface);
}

.ia-detail-scroll:focus-visible {
  outline: 2px solid var(--cde-accent);
  outline-offset: -2px;
}

/* Tableau mensuel : 14 colonnes fixes (indicateur + 12 mois + total).
   `table-layout: fixed` garantit qu'aucune valeur ne pousse la largeur et ne
   provoque de rognage horizontal à 1280 px. */
.ia-monthly {
  width: 100%;
  min-width: 0;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  color: var(--cde-text);
  font-size: 11px;
}

.ia-monthly-col-label {
  width: 136px;
}

.ia-monthly-col-total {
  width: 52px;
}

.ia-monthly th,
.ia-monthly td {
  padding: 3px 4px;
  border-bottom: 1px solid var(--cde-border-soft);
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
}

.ia-monthly thead .ia-monthly-th {
  height: 26px;
  border-bottom: 1px solid var(--cde-border);
  background: var(--cde-header-bg);
  color: var(--cde-header-text);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ia-monthly-th--total {
  color: var(--cde-accent-strong);
}

.ia-monthly-th--metric,
.ia-monthly-rowlabel {
  position: sticky;
  left: 0;
  z-index: 2;
  padding-left: 8px;
  border-right: 1px solid var(--cde-border);
  background: var(--cde-surface);
  color: var(--cde-text);
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ia-monthly thead .ia-monthly-th--metric {
  z-index: 3;
  background: var(--cde-header-bg);
  color: var(--cde-header-text);
}

.ia-monthly-cell {
  height: 24px;
  padding-right: 6px;
  text-align: right;
  white-space: nowrap;
}

.ia-monthly-cell--empty {
  color: var(--cde-muted);
}

.ia-monthly-cell--total {
  background: color-mix(in srgb, var(--cde-accent-tint) 72%, var(--cde-surface));
  border-left: 1px solid var(--cde-border);
  font-weight: 600;
}

.ia-monthly-total-row th,
.ia-monthly-total-row td {
  border-top: 1px solid var(--cde-border);
  background: var(--cde-header-bg);
  color: var(--cde-header-text);
  font-weight: 700;
}

.ia-monthly-total-row .ia-monthly-rowlabel {
  z-index: 2;
  background: var(--cde-header-bg);
}

.ia-monthly-total-row .ia-monthly-cell--grand {
  background: var(--cde-accent-tint);
  color: var(--cde-accent-strong);
}

.ia-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  border: 0;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* ── Pied de tableau ────────────────────────────────────── */

.ia-foot-row td,
.ia-foot-row th {
  position: sticky;
  z-index: 2;
  height: 28px;
  padding: 4px 6px;
  border-top: 1px solid var(--cde-border);
  background: var(--cde-header-bg);
  color: var(--cde-header-text);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
}

.ia-foot-total td,
.ia-foot-total th {
  bottom: 28px;
}

.ia-foot-moyenne td,
.ia-foot-moyenne th {
  bottom: 0;
  border-top-color: var(--cde-border-soft);
  font-weight: 600;
}

.ia-foot-row .ia-col-year {
  z-index: 5;
  background: var(--cde-header-bg);
  font-size: 9.5px;
  letter-spacing: 0.03em;
  line-height: 1.05;
  text-align: left;
  text-transform: uppercase;
  white-space: normal;
}

.ia-foot-total .ia-col-year {
  bottom: 28px;
}

.ia-foot-moyenne .ia-col-year {
  bottom: 0;
}

.ia-foot-value--muted {
  color: var(--cde-muted);
}

/* ── Panneau graphique ──────────────────────────────────── */

.ia-chart-panel {
  flex-shrink: 0;
  margin-top: 0;
}

.ia-chart {
  position: relative;
  width: 100%;
  height: clamp(190px, 26vh, 260px);
  padding: 8px 10px 4px;
  overflow: hidden;
}

.ia-chart canvas {
  max-width: 100% !important;
}

/* Sous 1160 px, la matrice défile horizontalement plutôt que de comprimer
   les 14 colonnes ; le premier col reste collé à gauche. */
@media (max-width: 1160px) {
  .cde-page-head.ia-head {
    flex-wrap: wrap;
  }

  /* Le titre prend toute la largeur, la barre d'outils passe dessous : le
     sous-titre ne se réduit pas à une colonne de 150 px. */
  .ia-head__text {
    flex-basis: 100%;
  }

  .ia-head .cde-head-actions {
    flex-basis: 100%;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  /* Sous ~1160 px (≈ 60 px par colonne numérique), on préfère un scrollport
     horizontal à des libellés illisibles ; la colonne Année reste collée. */
  .ia-scroll {
    overflow-x: auto;
  }

  .ia-table {
    min-width: 940px;
  }
}

/* Le détail mensuel tient à 1280 px sans rognage. Sous 1100 px, il devient
   un scrollport horizontal : la colonne « Indicateur » reste collée. */
@media (max-width: 1100px) {
  .ia-detail-scroll {
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-gutter: stable;
  }

  .ia-monthly {
    min-width: 1000px;
  }
}

@media (max-width: 900px) {
  .ia-head :deep(.ia-year-picker) {
    width: 88px;
  }

  .ia-chart {
    height: clamp(180px, 24vh, 220px);
  }
}

@media (max-height: 860px) {
  .ia-chart {
    height: clamp(170px, 22vh, 220px);
  }
}
</style>
