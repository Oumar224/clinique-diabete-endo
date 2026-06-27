<template>
  <div class="soins-view">
    <el-tabs v-model="activeTab" class="soins-view__tabs">
      <el-tab-pane label="Plan Distribution" name="distribution">
        <PlanDistributionTab />
      </el-tab-pane>
      <el-tab-pane label="Vital Check" name="vital-check">
        <VitalCheckTab />
      </el-tab-pane>
      <el-tab-pane label="Dispositifs & Accès" name="dispositifs">
        <DispositifsAccesTab />
      </el-tab-pane>
      <el-tab-pane label="Diagramme de Synthèse" name="diagramme">
        <DiagrammeSyntheseTab />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { provideVitalSigns } from '@/composables/useVitalSigns'
import PlanDistributionTab from './soins/PlanDistributionTab.vue'
import VitalCheckTab from './soins/VitalCheckTab.vue'
import DispositifsAccesTab from './soins/DispositifsAccesTab.vue'
import DiagrammeSyntheseTab from './soins/DiagrammeSyntheseTab.vue'

const route = useRoute()

const activeTab = ref('distribution')

/** Derive patient ID from route params, scoping all child composables. */
const patientId = computed<number | null>(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) ? id : null
})

// Provide vital-signs context scoped by patientId so that
// PlanDistributionTab, VitalCheckTab, and other children
// can inject it via useVitalSigns().
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
</style>
