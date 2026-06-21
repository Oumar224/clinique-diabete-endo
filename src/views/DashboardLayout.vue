<template>
  <div class="dashboard">
    <SideBar />
    <div class="dashboard__main-area">
      <TopBar />
      <template v-if="hasActivePatient && activePatient">
        <div class="patient-banner">
          <el-avatar :size="40" :src="activePatient.photo || undefined" class="patient-banner__avatar">
            {{ patientInitials }}
          </el-avatar>
          <span class="patient-banner__name">
            {{ activePatient.civilite }} {{ activePatient.prenom }} {{ activePatient.nom }}
          </span>
          <div class="patient-banner__meta-group">
            <span class="patient-banner__meta-item">Âge: {{ age }} ans</span>
            <span class="patient-banner__meta-item">N° SS: {{ activePatient.nir }}</span>
            <span v-if="activePatient.mutuelle" class="patient-banner__meta-item">Mutuelle: {{ activePatient.mutuelle }}</span>
          </div>
          <div v-if="activePatient.allergies?.length" class="patient-banner__allergies">
            <el-tag v-for="a in activePatient.allergies" :key="a" type="danger" size="small">
              {{ a }}
            </el-tag>
          </div>
        </div>
      </template>
      <main class="dashboard__main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { providePatientContext } from '@/composables/usePatientContext'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { restoreSession } = useAuth()

const { activePatient, age, hasActivePatient } = providePatientContext()

const patientInitials = computed(() => {
  if (!activePatient.value) return ''
  return `${activePatient.value.prenom[0]}${activePatient.value.nom[0]}`
})

onErrorCaptured((err) => {
  console.error('[Dashboard] Unhandled error:', err)
  ElMessage.error(`Erreur: ${(err as Error).message}`)
  return false
})

onMounted(() => {
  if (!restoreSession()) {
    router.push('/login')
  }
})
</script>

<style scoped>
.dashboard {
  height: 100vh;
  display: flex;
  flex-direction: row;
  background: var(--cd-gray-50);
}

.dashboard__main-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dashboard__main {
  flex: 1;
  overflow: auto;
  padding: 24px;
}

.patient-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 24px;
  background: var(--cd-white);
  border-bottom: 1px solid var(--cd-gray-200);
  flex-shrink: 0;
  min-height: 56px;
}

.patient-banner__avatar {
  background: var(--cd-primary);
  color: white;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
}

.patient-banner__name {
  font-size: 14px;
  font-weight: 700;
  color: var(--cd-gray-900);
  white-space: nowrap;
  flex-shrink: 0;
}

.patient-banner__meta-group {
  display: flex;
  align-items: center;
  gap: 0;
  flex-wrap: nowrap;
  flex-shrink: 0;
}

.patient-banner__meta-item {
  font-size: 12px;
  color: var(--cd-gray-700);
  white-space: nowrap;
}

.patient-banner__meta-item + .patient-banner__meta-item::before {
  content: '|';
  margin: 0 10px;
  color: var(--cd-gray-300);
  font-weight: 300;
}

.patient-banner__allergies {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
  overflow: hidden;
}
</style>
