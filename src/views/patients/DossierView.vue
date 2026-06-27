<template>
  <div class="dossier-view">
    <div class="dossier-view__tabs">
      <el-tabs v-model="activeSubTab">
        <el-tab-pane label="Médical" name="medical">
          <DossierMedicalTab />
        </el-tab-pane>
        <el-tab-pane label="Scores / SL" name="scores">
          <DossierScoresTab />
        </el-tab-pane>
        <el-tab-pane label="Ordonnance" name="ordonnance">
          <DossierOrdonnanceTab />
        </el-tab-pane>
        <el-tab-pane label="Documents" name="documents">
          <DossierDocumentsTab />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DossierMedicalTab from './dossier/DossierMedicalTab.vue'
import DossierScoresTab from './dossier/DossierScoresTab.vue'
import DossierOrdonnanceTab from './dossier/DossierOrdonnanceTab.vue'
import DossierDocumentsTab from './dossier/DossierDocumentsTab.vue'

const activeSubTab = ref('medical')
</script>

<style scoped>
.dossier-view {
  height: 100%;
}
.dossier-view__tabs {
  height: 100%;
}
.dossier-view__tabs :deep(.el-tabs__content) {
  height: calc(100% - 40px);
  overflow: auto;
}
.dossier-view__tabs :deep(.el-tab-pane) {
  height: 100%;
}
</style>
