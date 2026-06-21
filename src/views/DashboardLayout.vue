<template>
  <div class="dashboard">
    <SideBar />
    <div class="dashboard__main-area">
      <TopBar />
      <template v-if="hasActivePatient && activePatient">
        <div class="patient-banner">
          <el-avatar :size="36" class="patient-banner__avatar">
            {{ patientInitials }}
          </el-avatar>
          <div class="patient-banner__info">
            <div class="patient-banner__name">
              {{ activePatient.civilite }} {{ activePatient.prenom }} {{ activePatient.nom }}
            </div>
            <div class="patient-banner__meta">
              <span>{{ age }} ans</span>
              <span aria-hidden="true">·</span>
              <span>N° SS/Assurance: {{ activePatient.nir }}</span>
              <span v-if="activePatient.mutuelle" aria-hidden="true">·</span>
              <span v-if="activePatient.mutuelle">{{ activePatient.mutuelle }}</span>
            </div>
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
  gap: 12px;
  padding: 10px 24px;
  background: var(--cd-white);
  border-bottom: 1px solid var(--cd-gray-200);
  flex-shrink: 0;
}

.patient-banner__avatar {
  background: var(--cd-primary);
  color: white;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.patient-banner__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.patient-banner__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--cd-gray-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.patient-banner__meta {
  font-size: 12px;
  color: var(--cd-gray-500);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
</style>
