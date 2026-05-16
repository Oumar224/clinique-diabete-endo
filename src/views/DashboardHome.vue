<template>
  <div class="dashboard-home">
    <div class="dashboard-home__header">
      <div>
        <h1 class="dashboard-home__title">Bonjour, {{ user?.prenom }}</h1>
        <p class="dashboard-home__date">{{ formattedDate }}</p>
      </div>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="au"
        start-placeholder="Début"
        end-placeholder="Fin"
        format="dd/MM/yyyy"
        size="default"
      />
    </div>

    <div class="dashboard-home__cards">
      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--primary">
          <el-icon :size="22"><User /></el-icon>
        </div>
        <div class="stat-card__body">
          <span class="stat-card__value">12</span>
          <span class="stat-card__label">Patients aujourd'hui</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--accent">
          <el-icon :size="22"><Calendar /></el-icon>
        </div>
        <div class="stat-card__body">
          <span class="stat-card__value">8</span>
          <span class="stat-card__label">Rendez-vous</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--danger">
          <el-icon :size="22"><Document /></el-icon>
        </div>
        <div class="stat-card__body">
          <span class="stat-card__value">5</span>
          <span class="stat-card__label">Consultations</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--primary">
          <el-icon :size="22"><Money /></el-icon>
        </div>
        <div class="stat-card__body">
          <span class="stat-card__value">{{ formatCurrency(2450) }}</span>
          <span class="stat-card__label">Chiffre d'affaires</span>
        </div>
      </div>
    </div>

    <div class="dashboard-home__grid">
      <div class="dashboard-home__section">
        <h2 class="dashboard-home__section-title">Prochains rendez-vous</h2>
        <el-table
          :data="upcomingAppointments"
          style="width: 100%"
          size="small"
          :header-cell-style="{ background: '#0E5C5B', color: '#ffffff', fontWeight: 600 }"
        >
          <el-table-column prop="time" label="Heure" width="80" />
          <el-table-column prop="patient" label="Patient" />
          <el-table-column prop="motif" label="Motif" />
          <el-table-column prop="status" label="Statut" width="100">
            <template #default="{ row }">
              <el-tag :type="row.statusType" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="upcomingAppointments.length === 0" class="dashboard-home__empty">
          Aucun rendez-vous programmé.
        </div>
      </div>

      <div class="dashboard-home__section">
        <h2 class="dashboard-home__section-title">Derniers patients</h2>
        <el-table
          :data="recentPatients"
          style="width: 100%"
          size="small"
          :header-cell-style="{ background: '#0E5C5B', color: '#ffffff', fontWeight: 600 }"
        >
          <el-table-column prop="nom" label="Nom" />
          <el-table-column prop="prenom" label="Prénom" />
          <el-table-column prop="date" label="Dernière visite" width="130" />
        </el-table>
        <div v-if="recentPatients.length === 0" class="dashboard-home__empty">
          Aucun patient récent.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  User,
  Calendar,
  Document,
  Money,
} from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'
import { useCurrency } from '@/currency/useCurrency'

const { formatCurrency, loadCurrency } = useCurrency()

onMounted(() => { loadCurrency() })

const { user } = useAuth()
const dateRange = ref<[Date, Date]>([new Date(), new Date()])

const formattedDate = computed(() => {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
})

const upcomingAppointments = ref([
  { time: '09:00', patient: 'Dupont Marie', motif: 'Consultation diabète', status: 'Confirmé', statusType: 'success' },
  { time: '10:30', patient: 'Diallo Amadou', motif: 'Bilan annuel', status: 'En attente', statusType: 'warning' },
  { time: '14:00', patient: 'Martin Sophie', motif: 'Résultats analyse', status: 'Confirmé', statusType: 'success' },
])

const recentPatients = ref([
  { nom: 'Dupont', prenom: 'Marie', date: '15/05/2026' },
  { nom: 'Diallo', prenom: 'Amadou', date: '14/05/2026' },
  { nom: 'Martin', prenom: 'Sophie', date: '13/05/2026' },
  { nom: 'Bernard', prenom: 'Pierre', date: '12/05/2026' },
])
</script>

<style scoped>
.dashboard-home__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}

.dashboard-home__title {
  font-size: 24px;
  font-weight: 700;
  color: var(--cd-gray-900);
  margin-bottom: 4px;
}

.dashboard-home__date {
  font-size: 14px;
  color: var(--cd-gray-400);
  text-transform: capitalize;
}

.dashboard-home__cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--cd-white);
  border-radius: 12px;
  border: 1px solid var(--cd-gray-200);
}

.stat-card__icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card__icon--primary {
  background: #EBF6F5;
  color: var(--cd-primary);
}

.stat-card__icon--accent {
  background: #FEF3C7;
  color: #D97706;
}

.stat-card__icon--danger {
  background: #FEF2F2;
  color: var(--cd-secondary);
}

.stat-card__body {
  display: flex;
  flex-direction: column;
}

.stat-card__value {
  font-size: 22px;
  font-weight: 700;
  color: var(--cd-gray-900);
  line-height: 1.2;
}

.stat-card__label {
  font-size: 13px;
  color: var(--cd-gray-400);
  margin-top: 2px;
}

.dashboard-home__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.dashboard-home__section {
  background: var(--cd-white);
  border-radius: 12px;
  border: 1px solid var(--cd-gray-200);
  padding: 20px;
}

.dashboard-home__section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--cd-gray-900);
  margin-bottom: 16px;
}

.dashboard-home__empty {
  text-align: center;
  padding: 32px;
  color: var(--cd-gray-400);
  font-size: 14px;
}
</style>
