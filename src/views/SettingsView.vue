<template>
  <div class="settings">
    <h1 class="settings__title">Paramètres</h1>

    <el-tabs v-model="activeTab" class="settings__tabs">
      <el-tab-pane name="sites">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="2.5" width="11" height="10" rx="1" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.1"/>
              <path d="M7 1.5V3" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M4.5 6H9.5V10H4.5V6Z" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round"/>
            </svg>
            Sites
          </span>
        </template>
        <SitesTab />
      </el-tab-pane>
      <el-tab-pane name="services">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="5" r="2.5" stroke="currentColor" stroke-width="0.8"/>
              <path d="M2 12C2 9.5 4 8 7 8C10 8 12 9.5 12 12" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
            Services
          </span>
        </template>
        <ServicesTab />
      </el-tab-pane>
      <el-tab-pane name="care-units">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="1.5" width="10" height="11" rx="1" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.1"/>
              <path d="M5 4.5H9" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M5 7H9" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M5 9.5H7" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
            Unités de soins
          </span>
        </template>
        <CareUnitsTab />
      </el-tab-pane>
      <el-tab-pane name="specialties">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2H12V12H2V2Z" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.1"/>
              <path d="M4.5 4.5H9.5V9.5H4.5V4.5Z" stroke="currentColor" stroke-width="0.8"/>
              <path d="M7 4.5V9.5" stroke="currentColor" stroke-width="0.8"/>
              <path d="M4.5 7H9.5" stroke="currentColor" stroke-width="0.8"/>
            </svg>
            Spécialités
          </span>
        </template>
        <SpecialtiesTab />
      </el-tab-pane>
      <el-tab-pane name="fonctions">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="5" cy="4" r="2" stroke="currentColor" stroke-width="0.8"/>
              <path d="M1 11.5C1 9.5 2.5 8 5 8C7.5 8 9 9.5 9 11.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M10 3L13 6" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M13 3L10 6" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
            Fonctions
          </span>
        </template>
        <FonctionsTab />
      </el-tab-pane>
      <el-tab-pane name="localites">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1C4.5 1 2.5 3 2.5 5.5C2.5 9 7 13 7 13C7 13 11.5 9 11.5 5.5C11.5 3 9.5 1 7 1Z" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.1"/>
              <circle cx="7" cy="5.5" r="1.5" stroke="currentColor" stroke-width="0.8"/>
            </svg>
            Localités
          </span>
        </template>
        <LocalitesTab />
      </el-tab-pane>
      <el-tab-pane name="prices">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.1"/>
              <path d="M5.5 5.5C5.5 4.5 7 4 7.5 5C8 6 6.5 6.5 6.5 7.5C6.5 8.5 8 9 8.5 8" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M7 4V5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M7 9V10" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
            Tarifs
          </span>
        </template>
        <TarifsTab />
      </el-tab-pane>
      <el-tab-pane name="identity">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="2" width="12" height="10" rx="1" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.1"/>
              <circle cx="5" cy="5.5" r="1.5" stroke="currentColor" stroke-width="0.8"/>
              <path d="M2 11C2 9.5 3.5 8.5 5 8.5C6.5 8.5 8 9.5 8 11" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M9.5 5H12" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M9.5 7.5H12" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M9.5 10H11" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
            Identité
          </span>
        </template>
        <IdentityTab />
      </el-tab-pane>
      <el-tab-pane name="attachment-types">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 2.5H8L11.5 6V12C11.5 12.2761 11.2761 12.5 11 12.5H2.5C2.22386 12.5 2 12.2761 2 12V3C2 2.72386 2.22386 2.5 2.5 2.5Z" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.1"/>
              <path d="M8 2.5V6H11.5" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round"/>
            </svg>
            Types pièces jointes
          </span>
        </template>
        <AttachmentTypesTab />
      </el-tab-pane>
      <el-tab-pane name="system">
        <template #label>
          <span class="tab-label">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="5" width="10" height="7" rx="1" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.1"/>
              <path d="M5 3H9" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M6 1.5H8" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M4.5 8H9.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              <path d="M4.5 10H7" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            </svg>
            Système
          </span>
        </template>
        <SystemTab />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AttachmentTypesTab from '@/components/settings/AttachmentTypesTab.vue'
import CareUnitsTab from '@/components/settings/CareUnitsTab.vue'

const activeTab = ref('sites')
</script>

<style scoped>
.settings__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--cd-gray-900);
  margin-bottom: 8px;
}

.settings__tabs :deep(.el-tabs__header) {
  margin: 0 !important;
}

.settings__tabs :deep(.el-tabs__content) {
  padding: 10px;
  border: 1px solid var(--cd-tab-border);
  border-top: none;
  background: var(--cd-tab-active-bg);
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
