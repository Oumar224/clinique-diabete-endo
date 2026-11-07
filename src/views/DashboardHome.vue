<template>
  <div
    v-loading="isLoading"
    class="dashboard-home cde"
  >
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Bonjour, {{ user?.prenom }}
        </h1>
        <p class="cde-page-sub">
          {{ formattedDate }}
          <span
            v-if="user"
            class="cde-badge cde-badge--muted"
          >{{ user.role }}</span>
        </p>
      </div>
      <div class="cde-page-actions">
        <el-date-picker
          v-model="dateRange"
          class="cde-toolbar__range"
          type="daterange"
          range-separator="→"
          start-placeholder="Début"
          end-placeholder="Fin"
          format="DD/MM/YYYY"
          value-format="YYYY-MM-DD"
          size="small"
          aria-label="Période des indicateurs"
          @change="reload"
        />
      </div>
    </header>

    <!-- 8 indicateurs : bande dense, une seule ligne -->
    <section
      class="cde-summary dashboard-home__summary"
      aria-label="Indicateurs de la période"
      :aria-busy="isLoading"
    >
      <div
        class="cde-summary__item"
        title="Montant réellement encaissé aujourd'hui"
      >
        <span class="cde-summary__label">CA encaissé jour</span>
        <span class="cde-summary__value cde-amount">{{ formatCurrency(kpi.caEncaisseJour) }}</span>
      </div>
      <div
        class="cde-summary__item"
        title="Montant réellement encaissé sur le mois"
      >
        <span class="cde-summary__label">CA encaissé mois</span>
        <span class="cde-summary__value cde-amount">{{ formatCurrency(kpi.caEncaisseMois) }}</span>
      </div>
      <div
        class="cde-summary__item"
        title="Montant facturé sur le mois (hors factures annulées)"
      >
        <span class="cde-summary__label">CA facturé mois</span>
        <span class="cde-summary__value cde-amount">{{ formatCurrency(kpi.caFactureMois) }}</span>
      </div>
      <div
        class="cde-summary__item"
        title="Montants restant à recouvrer"
      >
        <span class="cde-summary__label">Reste à recouvrer</span>
        <span class="cde-summary__value cde-amount cde-summary__value--danger">{{ formatCurrency(kpi.resteARecouvrer) }}</span>
      </div>
      <div
        class="cde-summary__item"
        title="Patients enregistrés aujourd'hui"
      >
        <span class="cde-summary__label">Patients jour</span>
        <span class="cde-summary__value cde-num">{{ kpi.patientsJour }}</span>
      </div>
      <div
        class="cde-summary__item"
        title="Rendez-vous programmés aujourd'hui"
      >
        <span class="cde-summary__label">RDV jour</span>
        <span class="cde-summary__value cde-num">{{ kpi.rdvJour }}</span>
      </div>
      <div
        class="cde-summary__item"
        title="Taux d'encaissement sur la période"
      >
        <span class="cde-summary__label">Taux encaissement</span>
        <span class="cde-summary__value cde-num">{{ kpi.tauxEncaissement }} %</span>
      </div>
      <div
        class="cde-summary__item"
        title="Consultations réalisées aujourd'hui"
      >
        <span class="cde-summary__label">Consultations jour</span>
        <span class="cde-summary__value cde-num">{{ kpi.consultationsJour }}</span>
      </div>
    </section>

    <!-- 3 graphiques + top actes -->
    <div class="dashboard-home__charts">
      <section class="cde-panel">
        <header class="cde-panel__head">
          <h2 class="cde-panel__title">
            Chiffre d'affaires — 30 derniers jours
          </h2>
        </header>
        <div class="chart-box">
          <Line
            v-if="hasCaData"
            :data="caChartData"
            :options="lineOptions"
          />
          <div
            v-else
            class="cde-empty"
          >
            Aucune donnée de facturation.
          </div>
        </div>
      </section>
      <section class="cde-panel">
        <header class="cde-panel__head">
          <h2 class="cde-panel__title">
            Répartition des RDV par statut
          </h2>
        </header>
        <div class="chart-box chart-box--small">
          <Doughnut
            v-if="hasStatusData"
            :data="statusChartData"
            :options="doughnutOptions"
          />
          <div
            v-else
            class="cde-empty"
          >
            Aucun rendez-vous sur la période.
          </div>
        </div>
      </section>
      <section class="cde-panel">
        <header class="cde-panel__head">
          <h2 class="cde-panel__title">
            RDV par jour
          </h2>
        </header>
        <div class="chart-box">
          <Bar
            v-if="hasRdvData"
            :data="rdvChartData"
            :options="barOptions"
          />
          <div
            v-else
            class="cde-empty"
          >
            Aucun rendez-vous sur la période.
          </div>
        </div>
      </section>
      <section class="cde-section dashboard-home__top">
        <div class="cde-section-head">
          <h2 class="cde-section-title">
            Top actes / services
          </h2>
          <span class="cde-section-meta">{{ topActes.length }}</span>
        </div>
        <div class="cde-table-card">
          <el-table
            :data="topActes"
            style="width: 100%"
            size="small"
            empty-text=""
          >
            <el-table-column
              prop="libelle"
              label="Acte"
              min-width="140"
              show-overflow-tooltip
            />
            <el-table-column
              prop="quantite"
              label="Qté"
              width="60"
              align="right"
            >
              <template #default="{ row }">
                <span class="cde-num">{{ row.quantite }}</span>
              </template>
            </el-table-column>
            <el-table-column
              prop="montant"
              label="Montant (GNF)"
              width="140"
              align="right"
            >
              <template #default="{ row }">
                <span class="cde-num cde-amount">{{ formatCurrency(row.montant) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div
          v-if="topActes.length === 0"
          class="cde-empty"
        >
          Aucun acte facturé sur la période.
        </div>
      </section>
    </div>

    <!-- Mon planning (filtré par rôle) -->
    <section class="cde-section">
      <div class="cde-section-head">
        <h2 class="cde-section-title">
          {{ planningTitle }}
        </h2>
        <span class="cde-section-meta">{{ myPlanning.length }} rendez-vous</span>
      </div>
      <div class="cde-table-card">
        <el-table
          :data="myPlanning"
          style="width: 100%"
          size="small"
          empty-text=""
        >
          <el-table-column
            prop="time"
            label="Heure"
            width="70"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ row.time }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="patient"
            label="Patient"
            min-width="140"
          />
          <el-table-column
            prop="motif"
            label="Motif"
            min-width="160"
            show-overflow-tooltip
          />
          <el-table-column
            prop="status"
            label="Statut"
            width="110"
          >
            <template #default="{ row }">
              <span
                class="cde-badge"
                :class="'cde-badge--' + row.statusType"
              >{{ row.status }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="cde-footer">
        <span class="cde-muted">{{ myPlanning.length }} rendez-vous aujourd'hui{{ isMedecin ? ' pour vous' : '' }}</span>
      </div>
      <div
        v-if="myPlanning.length === 0"
        class="cde-empty"
      >
        Aucun rendez-vous aujourd'hui{{ isMedecin ? ' pour vous' : '' }}.
      </div>
    </section>

    <div class="dashboard-home__grid">
      <SectionHeader
        label="Prochains rendez-vous"
        :icon="Calendar"
        level="secondary"
        collapsible
      >
        <div class="cde-table-card">
          <el-table
            :data="upcomingAppointments"
            style="width: 100%"
            size="small"
            empty-text=""
          >
            <el-table-column
              prop="time"
              label="Heure"
              width="90"
            />
            <el-table-column
              prop="patient"
              label="Patient"
            />
            <el-table-column
              prop="motif"
              label="Motif"
              show-overflow-tooltip
            />
            <el-table-column
              prop="status"
              label="Statut"
              width="100"
            >
              <template #default="{ row }">
                <span
                  class="cde-badge"
                  :class="'cde-badge--' + row.statusType"
                >{{ row.status }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div
          v-if="upcomingAppointments.length === 0"
          class="cde-empty"
        >
          Aucun rendez-vous à venir.
        </div>
      </SectionHeader>

      <SectionHeader
        label="Derniers patients"
        :icon="User"
        level="secondary"
        collapsible
      >
        <div class="cde-table-card">
          <el-table
            :data="recentPatients"
            style="width: 100%"
            size="small"
            empty-text=""
          >
            <el-table-column
              prop="date"
              label="Créé le"
              width="110"
            />
            <el-table-column
              prop="nom"
              label="Nom"
            />
            <el-table-column
              prop="prenom"
              label="Prénom"
            />
          </el-table>
        </div>
        <div
          v-if="recentPatients.length === 0"
          class="cde-empty"
        >
          Aucun patient enregistré.
        </div>
      </SectionHeader>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { User, Calendar } from '@element-plus/icons-vue'
import { Line, Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { useAuth } from '@/composables/useAuth'
import { useCurrency } from '@/currency/useCurrency'
import { useMedicalServices } from '@/composables/useMedicalServices'
import { useDashboard } from '@/composables/useDashboard'
import { fetchInvoices, fetchInvoiceStats } from '@/composables/useInvoices'
import { listAppointments, type AppointmentDto } from '@/composables/useAppointments'
import SectionHeader from '@/components/common/SectionHeader.vue'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

const router = useRouter()
const { formatCurrency, loadCurrency } = useCurrency()
const { user } = useAuth()
const { fetchFavorites, favorites } = useMedicalServices()
const { stats, loading: statsLoading, fetchDashboardStats } = useDashboard()

const toISODate = (d: Date) => d.toISOString().slice(0, 10)
const monthStart = new Date()
monthStart.setDate(1)
const dateRange = ref<[string, string]>([toISODate(monthStart), toISODate(new Date())])
const allAppointments = ref<AppointmentDto[]>([])
const appointmentsLoading = ref(false)

const isLoading = computed(() => statsLoading.value || appointmentsLoading.value)

const formattedDate = computed(() => {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
})

const isMedecin = computed(() => user.value?.role === 'MEDECIN')
const planningTitle = computed(() =>
  isMedecin.value ? 'Mon planning — aujourd\'hui' : 'Planning du jour — tous les praticiens',
)

function rangeParams() {
  const [debut, fin] = dateRange.value ?? []
  return {
    date_debut: typeof debut === 'string' ? debut : toISODate(new Date(debut)),
    date_fin: typeof fin === 'string' ? fin : toISODate(new Date(fin)),
  }
}

async function reload() {
  const params = rangeParams()
  await Promise.all([
    fetchDashboardStats(params),
    fetchInvoiceStats(params),
    (async () => {
      try {
        await fetchInvoices({ date_debut: params.date_debut, date_fin: params.date_fin })
      } catch { /* liste factures optionnelle */ }
    })(),
    (async () => {
      appointmentsLoading.value = true
      try {
        allAppointments.value = await listAppointments({
          date_debut: params.date_debut,
          date_fin: params.date_fin,
        })
      } catch {
        allAppointments.value = []
      } finally {
        appointmentsLoading.value = false
      }
    })(),
  ])
}

onMounted(async () => {
  loadCurrency()
  await reload()

  // Auto-navigate to first favorite on app open (comportement conservé)
  if (user.value?.id) {
    await fetchFavorites(user.value.id)
  }
  if (favorites.value.length > 0) {
    router.replace('/app/planning')
  }
})

// ─── KPI ───
/** Taux d'encaissement de la période, borné à 0..100 et arrondi. */
const tauxEncaissement = computed(() => {
  const raw = Number(stats.value?.ca.taux_encaissement ?? 0)
  if (!Number.isFinite(raw)) return 0
  return Math.min(100, Math.max(0, Math.round(raw)))
})

const kpi = computed(() => ({
  // Encaissé (trésorerie réelle) vs facturé (CA comptable) : champs explicites.
  caEncaisseJour: stats.value?.ca.ca_jour ?? 0,
  caEncaisseMois: stats.value?.ca.ca_mois ?? 0,
  caFactureMois: stats.value?.ca.ca_facture_mois ?? 0,
  resteARecouvrer: stats.value?.ca.reste_a_recouvrer ?? 0,
  patientsJour: stats.value?.patients.nouveaux_jour ?? 0,
  rdvJour: stats.value?.rendez_vous.jour ?? 0,
  tauxEncaissement: tauxEncaissement.value,
  consultationsJour: stats.value?.consultations.jour ?? 0,
}))

// ─── Charts ───
const hasCaData = computed(() => (stats.value?.ca.serie_30j ?? []).some((p) => p.montant > 0 || p.encaisse > 0))
const caChartData = computed(() => {
  const serie = stats.value?.ca.serie_30j ?? []
  return {
    labels: serie.map((p) => p.date.slice(5)),
    datasets: [
      {
        label: 'Facturé (GNF)',
        data: serie.map((p) => p.montant),
        borderColor: '#0E7C7B',
        backgroundColor: 'rgba(14, 124, 123, 0.12)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      },
      {
        label: 'Encaissé (GNF)',
        data: serie.map((p) => p.encaisse),
        borderColor: '#15803D',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.3,
        pointRadius: 2,
      },
    ],
  }
})
const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: true, position: 'top' as const } },
  scales: { y: { beginAtZero: true } },
}

const hasRdvData = computed(() => (stats.value?.rendez_vous.par_jour ?? []).length > 0)
const rdvChartData = computed(() => {
  const points = stats.value?.rendez_vous.par_jour ?? []
  return {
    labels: points.map((p) => p.date.slice(5)),
    datasets: [
      {
        label: 'RDV',
        data: points.map((p) => p.count),
        backgroundColor: '#C9A227',
        borderRadius: 6,
      },
    ],
  }
})
const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
}

const hasStatusData = computed(() => Object.keys(stats.value?.rendez_vous.par_statut ?? {}).length > 0)
const statusChartData = computed(() => {
  const parStatut = stats.value?.rendez_vous.par_statut ?? {}
  const labels = Object.keys(parStatut)
  return {
    labels,
    datasets: [
      {
        data: labels.map((k) => parStatut[k]),
        backgroundColor: ['#0E7C7B', '#C9A227', '#15803D', '#C0392B', '#7C3AED'],
      },
    ],
  }
})
const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: true, position: 'bottom' as const } },
}

const topActes = computed(() => stats.value?.top_actes ?? [])

// ─── Tables ───
function statusMeta(status?: string): { label: string; type: 'success' | 'warning' | 'danger' | 'info' } {
  switch (status) {
    case 'confirmed': return { label: 'Confirmé', type: 'success' }
    case 'pending': return { label: 'En attente', type: 'warning' }
    case 'cancelled': return { label: 'Annulé', type: 'danger' }
    case 'done': return { label: 'Terminé', type: 'info' }
    default: return { label: status ?? '—', type: 'info' }
  }
}

const upcomingAppointments = computed(() =>
  (stats.value?.rendez_vous.prochains ?? []).map((r) => {
    const meta = statusMeta(r.status)
    return {
      time: `${r.date ?? ''} ${r.time ?? ''}`.trim(),
      patient: r.patient_nom ?? `#${r.patient_id ?? '—'}`,
      motif: r.motif ?? '—',
      status: meta.label,
      statusType: meta.type,
    }
  }),
)

const recentPatients = computed(() =>
  (stats.value?.patients.recents ?? []).map((p) => ({
    nom: p.nom,
    prenom: p.prenom,
    date: p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '—',
  })),
)

// ─── Mon planning : filtré par user.id + rôle ───
const myPlanning = computed(() => {
  const todayStr = toISODate(new Date())
  let rows = allAppointments.value.filter((a) => (a.date ?? '').slice(0, 10) === todayStr)
  // MEDECIN : uniquement ses RDV ; SECRETAIRE/ADMIN/COMPTABLE : tous ;
  // autres rôles : tous (pas de filtre service disponible ici).
  if (isMedecin.value && user.value?.id) {
    rows = rows.filter((a) => a.medecin_id === user.value!.id)
  }
  return rows
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
    .slice(0, 8)
    .map((a) => {
      const meta = statusMeta(a.status)
      return {
        time: a.time ?? '—',
        patient: (a as AppointmentDto).patient_nom ?? `#${a.patient_id ?? '—'}`,
        motif: a.motif ?? '—',
        status: meta.label,
        statusType: meta.type,
      }
    })
})
</script>

<style scoped>
.dashboard-home {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  max-width: 100%;
  overflow-x: clip;
}

.dashboard-home__summary {
  margin: 0;
}

.dashboard-home__charts {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  max-width: 100%;
}

.dashboard-home__charts > * {
  min-width: 0;
  min-height: 0;
}

.dashboard-home__charts .cde-panel {
  border-radius: 6px;
}

.dashboard-home__top {
  margin-top: 0;
}

.chart-box {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  height: 246px;
  position: relative;
  overflow: hidden;
  padding: 10px 12px;
}

.chart-box canvas {
  max-width: 100% !important;
}

.dashboard-home__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  max-width: 100%;
}

.dashboard-home__grid > * {
  min-width: 0;
  min-height: 0;
}

@media (max-width: 1100px) {
  .dashboard-home__charts {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 900px) {
  .dashboard-home__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .chart-box,
  .chart-box--small {
    height: 220px;
  }
}

/* ── Anti-débordement : scroll interne au tableau, jamais la page ── */
.dashboard-home :deep(.el-table) {
  max-width: 100%;
  min-width: 0;
}

.dashboard-home :deep(.el-table__inner-wrapper) {
  overflow-x: auto;
  max-width: 100%;
}

.dashboard-home :deep(.el-date-editor) {
  max-width: 100%;
  min-width: 0;
  flex-shrink: 1;
}
</style>
