<template>
  <div class="settings">
    <h1 class="settings__title">Paramètres</h1>

    <el-tabs v-model="activeTab" class="settings__tabs">
      <el-tab-pane label="Sites" name="sites">
        <SitesTab />
      </el-tab-pane>

      <el-tab-pane label="Unités médicales" name="medical-units">
        <MedicalUnitsTab />
      </el-tab-pane>

      <el-tab-pane label="Services" name="services">
        <ServicesTab />
      </el-tab-pane>

      <el-tab-pane label="Spécialités" name="specialties">
        <SpecialtiesTab />
      </el-tab-pane>

      <el-tab-pane label="Fonctions" name="fonctions">
        <FonctionsTab />
      </el-tab-pane>

      <el-tab-pane label="Localités" name="localites">
        <LocalitesTab />
      </el-tab-pane>

      <el-tab-pane label="Tarifs" name="prices">
        <TarifsTab />
      </el-tab-pane>

      <el-tab-pane label="Identité" name="identity">
        <IdentityTab />
      </el-tab-pane>

      <el-tab-pane label="Système" name="system">
        <SystemTab />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeTab = ref('sites')
</script>

<style scoped>
.settings__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--cd-gray-900);
  margin-bottom: 24px;
}
</style>
