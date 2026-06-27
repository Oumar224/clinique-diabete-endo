<template>
  <div class="dossier-section">
    <div class="dossier-section__header">
      <h3 class="dossier-section__title">Conciliation médicamenteuse</h3>
      <el-button type="primary" size="small" :icon="Plus">Ajouter</el-button>
    </div>
    <el-table :data="mockOrdonnances" style="width:100%" size="small">
      <el-table-column prop="medicament" label="Molécule" />
      <el-table-column prop="dosage" label="Dosage" width="100" />
      <el-table-column prop="frequence" label="Fréquence" width="180" />
      <el-table-column prop="voie" label="Voie" width="80" />
      <el-table-column prop="dateDebut" label="Début" width="110" />
      <el-table-column label="Actions" width="80" align="center">
        <el-button text type="primary" size="small" :icon="Edit" aria-label="Modifier" />
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { Plus, Edit } from '@element-plus/icons-vue'

const mockOrdonnances = [
  { medicament: 'Furosémide', dosage: '40 mg', frequence: 'Matin - Soir', voie: 'PO', dateDebut: '2026-06-15' },
  { medicament: 'Metformine', dosage: '500 mg', frequence: 'Matin - Midi - Soir', voie: 'PO', dateDebut: '2018-03-22' },
  { medicament: 'Ramipril', dosage: '5 mg', frequence: 'Matin', voie: 'PO', dateDebut: '2020-01-10' },
]
</script>

<style scoped>
.dossier-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.dossier-section__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--cd-gray-900);
}
</style>
