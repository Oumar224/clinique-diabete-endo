<template>
  <div class="soins-view">
    <el-tabs v-model="activeTab" class="soins-view__tabs">
      <el-tab-pane name="distribution">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="12" height="12" rx="1" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.1"/>
              <path d="M3.5 4.5H10.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M3.5 7H10.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M3.5 9.5H8" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
            Plan Distribution
          </span>
        </template>
        <PlanDistributionTab />
      </el-tab-pane>
      <el-tab-pane name="vital-check">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1C4 1 1.5 3.5 1.5 6.5C1.5 10 7 13 7 13C7 13 12.5 10 12.5 6.5C12.5 3.5 10 1 7 1Z" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.1"/>
              <circle cx="7" cy="6.5" r="1.5" stroke="currentColor" stroke-width="0.8"/>
            </svg>
            Vital Check
          </span>
        </template>
        <VitalCheckTab />
      </el-tab-pane>
      <el-tab-pane name="dispositifs">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="4.5" y="1.5" width="5" height="11" rx="1" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.1"/>
              <path d="M2 4.5H12" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M2 9.5H12" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
            Dispositifs & Accès
          </span>
        </template>
        <DispositifsAccesTab />
      </el-tab-pane>
      <el-tab-pane name="diagramme">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="3" width="3" height="8" rx="0.5" fill="#3498DB" fill-opacity="0.6"/>
              <rect x="5.5" y="1" width="3" height="10" rx="0.5" fill="#E74C3C" fill-opacity="0.6"/>
              <rect x="10" y="5" width="3" height="6" rx="0.5" fill="#27AE60" fill-opacity="0.6"/>
              <path d="M2.5 7L6 6L8 8.5L11 6" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Diagramme de Synthèse
          </span>
        </template>
        <DiagrammeSyntheseTab />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import { useRoute } from 'vue-router'
import { provideVitalSigns } from '@/composables/useVitalSigns'
import PlanDistributionTab from './soins/PlanDistributionTab.vue'
import VitalCheckTab from './soins/VitalCheckTab.vue'
import DispositifsAccesTab from './soins/DispositifsAccesTab.vue'
import DiagrammeSyntheseTab from './soins/DiagrammeSyntheseTab.vue'

const route = useRoute()
const activeTab = ref('distribution')

/* Provide activeTab so child tab components can react to tab activation.
   Used by VitalCheckTab (scroll-to-current-time) and DiagrammeSyntheseTab (data refresh). */
provide('activeTab', activeTab)

const patientId = computed<number | null>(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) ? id : null
})

provideVitalSigns(patientId)
</script>

<style scoped>
.soins-view {
  height: 100%;
}

.soins-view__tabs {
  height: 100%;
}

.soins-view__tabs :deep(.el-tabs__header) {
  margin: 0 !important;
}

.soins-view__tabs :deep(.el-tabs__content) {
  height: calc(100% - 31px);
  overflow: auto;
}

.soins-view__tabs :deep(.el-tab-pane) {
  height: 100%;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
}

.tab-label svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}
</style>
