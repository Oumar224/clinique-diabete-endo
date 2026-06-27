<template>
  <div class="dashboard">
    <SideBar />
    <div class="dashboard__main-area">
      <TopBar />
      <template v-if="hasActivePatient && activePatient">
        <div class="patient-banner">
          <el-avatar :size="40" :src="activePatient.photo || undefined" :class="'patient-banner__avatar patient-record__photo--' + (activePatient.civilite === 'M' ? 'male' : activePatient.civilite === 'Mme' || activePatient.civilite === 'Mlle' ? 'female' : 'none')">
            <span style="font-size:20px">{{ getCiviliteSymbol(activePatient.civilite) }}</span>
          </el-avatar>
          <span class="patient-banner__name">
            {{ getCiviliteSymbol(activePatient.civilite) }} {{ activePatient.prenom }} {{ activePatient.nom }}
          </span>
          <div class="patient-banner__meta-group">
            <span class="patient-banner__meta-item">Âge: {{ age }} ans</span>
            <span class="patient-banner__meta-item">N° SS: {{ activePatient.nir }}</span>
            <span v-if="activePatient.assuranceMutuelle" class="patient-banner__meta-item">Assurance: {{ activePatient.assuranceMutuelle }}</span>
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
import { onMounted, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { providePatientContext } from '@/composables/usePatientContext'
import { useAuth } from '@/composables/useAuth'
import { getCiviliteSymbol } from '@/utils/civilite'

const router = useRouter()
const { restoreSession } = useAuth()

const { activePatient, age, hasActivePatient } = providePatientContext()

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
  align-items: flex-start;
  gap: 16px;
  padding: 12px 24px;
  background: var(--cd-white);
  border-bottom: 1px solid var(--cd-gray-200);
  flex-shrink: 0;
  min-height: 56px;
}

.patient-banner__avatar {
  color: white;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
}

.patient-banner__name {
  font-size: 16px;
  font-weight: 700;
  color: var(--cd-gray-900);
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1.3;
}

.patient-banner__meta-group {
  display: flex;
  align-items: center;
  gap: 0;
  flex-wrap: nowrap;
  flex-shrink: 0;
  margin-top: 2px;
}

.patient-banner__meta-item {
  font-size: 15px;
  font-weight: 600;
  color: var(--cd-gray-700);
  white-space: nowrap;
}

.patient-banner__meta-item + .patient-banner__meta-item::before {
  content: '|';
  margin: 0 12px;
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
.patient-record__photo--male {
  background: var(--el-color-primary, #409eff) !important;
}
.patient-record__photo--female {
  background: var(--el-color-danger, #f56c6c) !important;
}
.patient-record__photo--none {
  background: var(--el-color-info, #909399) !important;
}
</style>
