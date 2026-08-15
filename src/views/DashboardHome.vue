<template>
  <div class="dashboard-home">
    <SectionHeader label="Accueil" :icon="HomeFilled" level="primary">
      <div class="dashboard-home__header">
        <div>
          <span class="dashboard-home__title">Bonjour, {{ user?.prenom }}</span>
          <span class="dashboard-home__date">{{ formattedDate }}</span>
        </div>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="au"
          start-placeholder="Début"
          end-placeholder="Fin"
          format="dd/MM/yyyy"
          size="small"
          style="width: 200px"
        />
      </div>
    </SectionHeader>

    <div class="dashboard-home__cards">
      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--primary">
          <el-icon :size="16"><User /></el-icon>
        </div>
        <div class="stat-card__body">
          <span class="stat-card__value">12</span>
          <span class="stat-card__label">Patients aujourd'hui</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--accent">
          <el-icon :size="16"><Calendar /></el-icon>
        </div>
        <div class="stat-card__body">
          <span class="stat-card__value">8</span>
          <span class="stat-card__label">Rendez-vous</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--danger">
          <el-icon :size="16"><Document /></el-icon>
        </div>
        <div class="stat-card__body">
          <span class="stat-card__value">5</span>
          <span class="stat-card__label">Consultations</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--primary">
          <el-icon :size="16"><Money /></el-icon>
        </div>
        <div class="stat-card__body">
          <span class="stat-card__value">{{ formatCurrency(2450) }}</span>
          <span class="stat-card__label">Chiffre d'affaires</span>
        </div>
      </div>
    </div>

    <div class="dashboard-home__grid">
      <SectionHeader label="Prochains rendez-vous" :icon="Calendar" level="secondary" collapsible>
        <el-table
          :data="upcomingAppointments"
          style="width: 100%"
          size="small"
          border
        >
          <el-table-column prop="time" label="Heure" width="60" />
          <el-table-column prop="patient" label="Patient" />
          <el-table-column prop="motif" label="Motif" />
          <el-table-column prop="status" label="Statut" width="90">
            <template #default="{ row }">
              <el-tag :type="row.statusType" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </SectionHeader>

      <SectionHeader label="Derniers patients" :icon="User" level="secondary" collapsible>
        <el-table
          :data="recentPatients"
          style="width: 100%"
          size="small"
          border
        >
          <el-table-column prop="date" label="Dernière visite" width="110" />
          <el-table-column prop="nom" label="Nom" />
          <el-table-column prop="prenom" label="Prénom" />
        </el-table>
      </SectionHeader>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  User,
  Calendar,
  Document,
  Money,
  HomeFilled,
} from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'
import { useCurrency } from '@/currency/useCurrency'
import { useMedicalServices } from '@/composables/useMedicalServices'
import SectionHeader from '@/components/common/SectionHeader.vue'

const router = useRouter()
const { formatCurrency, loadCurrency } = useCurrency()

const { user } = useAuth()
const { fetchFavorites, favorites } = useMedicalServices()

onMounted(async () => {
  loadCurrency()

  // Auto-navigate to first favorite on app open
  if (user.value?.id) {
    await fetchFavorites(user.value.id)
  }
  if (favorites.value.length > 0) {
    // Navigate to planning (general landing for service context)
    router.replace('/app/planning')
  }
})
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
.dashboard-home {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dashboard-home__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dashboard-home__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--cd-gray-900);
  margin-right: 10px;
}

.dashboard-home__date {
  font-size: 12px;
  color: var(--cd-gray-400);
  text-transform: capitalize;
}

.dashboard-home__cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--cd-widget-bg);
  border: 1px solid var(--cd-gray-200);
  border-radius: 2px;
}

.stat-card__icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 2px;
}

.stat-card__icon--primary {
  background: var(--cd-primary-light);
  color: var(--cd-primary);
}

.stat-card__icon--accent {
  background: #FEF3C7;
  color: var(--cd-color-warning);
}

.stat-card__icon--danger {
  background: #FDE8E8;
  color: var(--cd-secondary);
}

.stat-card__body {
  display: flex;
  flex-direction: column;
}

.stat-card__value {
  font-size: 18px;
  font-weight: 700;
  color: var(--cd-gray-900);
  line-height: 1.2;
}

.stat-card__label {
  font-size: 11px;
  color: var(--cd-gray-500);
  margin-top: 1px;
}

.dashboard-home__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.dashboard-home__empty {
  text-align: center;
  padding: 16px;
  color: var(--cd-gray-400);
  font-size: 12px;
}
</style>
