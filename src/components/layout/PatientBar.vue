<template>
  <div v-if="hasActivePatient && activePatient" class="patient-bar">
    <div class="patient-bar__info">
      <el-avatar :size="36" class="patient-bar__avatar">
        {{ initials }}
      </el-avatar>
      <div class="patient-bar__details">
        <div class="patient-bar__name">
          {{ activePatient.civilite }} {{ activePatient.prenom }} {{ activePatient.nom }}
          <span class="patient-bar__age">{{ age }} ans</span>
        </div>
        <div class="patient-bar__meta">
          <span>NIR: {{ activePatient.nir }}</span>
          <span v-if="activePatient.mutuelle" class="patient-bar__mutuelle">
            {{ activePatient.mutuelle }}
          </span>
        </div>
      </div>
    </div>
    <div class="patient-bar__actions">
      <el-tabs v-model="activeTab" class="patient-bar__tabs" @tab-click="onTabClick">
        <el-tab-pane label="Infos" name="infos" />
        <el-tab-pane label="Consultations" name="consultations" />
        <el-tab-pane label="Ordonnances" name="ordonnances" />
        <el-tab-pane label="Factures" name="factures" />
      </el-tabs>
      <el-button text type="info" :icon="Close" @click="clearPatient">
        Fermer
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TabsPaneContext } from 'element-plus'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Close } from '@element-plus/icons-vue'
import { usePatientContext } from '@/composables/usePatientContext'

const { activePatient, age, hasActivePatient, clearPatient } = usePatientContext()
const route = useRoute()
const router = useRouter()

const activeTab = computed({
  get: () => {
    if (route.name === 'patient-detail') return 'infos'
    if (route.name === 'patient-factures') return 'factures'
    return 'infos'
  },
  set: () => {},
})

const initials = computed(() => {
  if (!activePatient.value) return ''
  return `${activePatient.value.prenom[0]}${activePatient.value.nom[0]}`
})

function onTabClick(pane: TabsPaneContext) {
  const patientId = activePatient.value?.id
  const tabName = pane.props.name
  if (patientId && tabName) {
    const tabRoutes: Record<string, string> = {
      infos: `/app/patients/${patientId}`,
      consultations: `/app/patients/${patientId}`,
      ordonnances: `/app/patients/${patientId}`,
      factures: `/app/patients/${patientId}/factures`,
    }
    router.push(tabRoutes[String(tabName)])
  }
}
</script>

<style scoped>
.patient-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 56px;
  background: var(--cd-gray-50);
  border-bottom: 1px solid var(--cd-gray-200);
  flex-shrink: 0;
  gap: 16px;
}

.patient-bar__info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.patient-bar__avatar {
  background: var(--cd-primary);
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.patient-bar__details {
  display: flex;
  flex-direction: column;
}

.patient-bar__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--cd-gray-900);
}

.patient-bar__age {
  font-size: 13px;
  font-weight: 400;
  color: var(--cd-gray-400);
  margin-left: 6px;
}

.patient-bar__meta {
  font-size: 12px;
  color: var(--cd-gray-400);
  display: flex;
  gap: 12px;
}

.patient-bar__mutuelle {
  color: var(--cd-primary);
}

.patient-bar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  overflow: hidden;
}

.patient-bar__tabs {
  flex: 1;
}

.patient-bar__tabs :deep(.el-tabs__header) {
  margin: 0;
  border-bottom: none;
}

.patient-bar__tabs :deep(.el-tabs__item) {
  height: 56px;
  line-height: 56px;
  font-size: 13px;
  padding: 0 12px;
}

.patient-bar__tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}
</style>
