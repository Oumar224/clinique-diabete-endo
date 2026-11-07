<template>
  <div class="clinic-config cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Configuration Clinic
        </h1>
        <p class="cde-page-sub">
          Stockages, actes, assurances et dispositifs médicaux
        </p>
      </div>
    </header>
    <div class="clinic-config__content">
      <el-tabs v-model="activeTab" class="cde-tabs">
        <el-tab-pane label="Stockages / Conservateurs" name="stockages">
          <StockageTab />
        </el-tab-pane>
        <el-tab-pane label="Actes Médicaux" name="actes">
          <CatalogueActesTab />
        </el-tab-pane>
        <el-tab-pane label="Mécanismes de contact" name="origins">
          <ContactOriginTab />
        </el-tab-pane>
        <el-tab-pane label="Assurances" name="insurances">
          <InsuranceTab />
        </el-tab-pane>
        <el-tab-pane label="Dispositifs médicaux &amp; Voies d'abord" name="dispositif-voies">
          <DispositifVoieTab />
        </el-tab-pane>
        <el-tab-pane label="Examens" name="examens">
          <ExamTypeTab />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import StockageTab from '@/components/settings/StockageTab.vue'
import CatalogueActesTab from '@/components/settings/CatalogueActesTab.vue'
import ContactOriginTab from '@/components/settings/ContactOriginTab.vue'
import InsuranceTab from '@/components/settings/InsuranceTab.vue'
import DispositifVoieTab from '@/components/settings/DispositifVoieTab.vue'
import ExamTypeTab from '@/components/settings/ExamTypeTab.vue'

const activeTab = ref('stockages')
</script>

<style scoped>
.clinic-config {
  min-width: 0;
  max-width: 100%;
}

.clinic-config__content {
  min-width: 0;
}
</style>
