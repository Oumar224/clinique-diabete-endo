<template>
  <div class="clinic-config">
    <h1 class="clinic-config__title">Configuration Clinic</h1>
    <div class="clinic-config__content">
      <el-tabs v-model="activeTab" type="border-card" class="clinic-config__tabs">
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
        <el-tab-pane label="Catégories de contact" name="contact-categories">
          <ContactCategoryTab />
        </el-tab-pane>
        <el-tab-pane label="Dispositifs & Voies d'abord" name="dispositifs">
          <DispositifTypeTab />
        </el-tab-pane>
        <el-tab-pane label="Voies d'administration" name="voies">
          <VoieTypeTab />
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
import ContactCategoryTab from '@/components/settings/ContactCategoryTab.vue'
import DispositifTypeTab from '@/components/settings/DispositifTypeTab.vue'
import VoieTypeTab from '@/components/settings/VoieTypeTab.vue'
import ExamTypeTab from '@/components/settings/ExamTypeTab.vue'

const activeTab = ref('stockages')
</script>

<style scoped>
.clinic-config__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--cd-gray-900);
  margin-bottom: 12px;
}

.clinic-config__content {
  background: var(--cd-white);
  border: 1px solid var(--cd-gray-200);
  border-radius: 4px;
  padding: 16px;
}

.clinic-config__tabs :deep(.el-tabs__nav) {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}
</style>
