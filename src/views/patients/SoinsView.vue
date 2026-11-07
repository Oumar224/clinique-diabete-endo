<template>
  <div class="soins-view cde" :class="{ 'soins-view--in-layout': inLayout }">
    <el-tabs
      v-model="activeTab"
      class="soins-view__tabs cde-tabs"
    >
      <el-tab-pane name="distribution">
        <template #label>
          <span>Plan Distribution</span>
        </template>
        <PlanDistributionTab />
      </el-tab-pane>
      <el-tab-pane name="vital-check">
        <template #label>
          <span>Vital Check</span>
        </template>
        <VitalCheckTab />
      </el-tab-pane>
      <el-tab-pane name="diagramme">
        <template #label>
          <span>Diagramme de Synthèse</span>
        </template>
        <DiagrammeSyntheseTab />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, provide } from 'vue'
import { useRoute } from 'vue-router'
import { provideVitalSigns } from '@/composables/useVitalSigns'
import PlanDistributionTab from './soins/PlanDistributionTab.vue'
import VitalCheckTab from './soins/VitalCheckTab.vue'
import DiagrammeSyntheseTab from './soins/DiagrammeSyntheseTab.vue'
import {
  PATIENT_ACTIVE_SECTION_TAB,
  PATIENT_SECTION_TABS,
} from './patientSections'

const route = useRoute()

/* Inside PatientLayout the tab strip is rendered in the page band. The layout
   provides the active tab so both strips stay in sync; standalone mounts keep
   a local state and their own `.cde-tabs` header. */
const layoutActiveTab = inject(PATIENT_ACTIVE_SECTION_TAB, null)
const localActiveTab = ref(PATIENT_SECTION_TABS['patient-soins'][0].name)

const activeTab = computed<string>({
  get: () => layoutActiveTab?.value ?? localActiveTab.value,
  set: (value) => {
    if (layoutActiveTab) layoutActiveTab.value = value
    else localActiveTab.value = value
  },
})

const inLayout = computed(() => layoutActiveTab !== null)

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

.soins-view__tabs :deep(.el-tabs__content) {
  height: calc(100% - 40px);
  overflow: auto;
}

.soins-view__tabs :deep(.el-tab-pane) {
  height: 100%;
}

/* The layout owns the visible tab strip inside the page band: hide the
   duplicate Element Plus header and let the panes use the full height. */
.soins-view--in-layout :deep(.el-tabs__header) {
  display: none;
}

.soins-view--in-layout :deep(.el-tabs__content) {
  height: 100%;
}
</style>
