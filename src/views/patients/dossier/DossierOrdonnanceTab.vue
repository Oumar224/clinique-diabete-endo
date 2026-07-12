<template>
  <div class="dossier-section">
    <SectionHeader label="Conciliation médicamenteuse" level="secondary" collapsible>
      <template #actions>
        <el-button type="primary" size="small" :icon="Plus">Ajouter</el-button>
      </template>
      <el-table :data="mockOrdonnances" style="width:100%" size="small" border>
        <el-table-column prop="medicament" label="Molécule" />
        <el-table-column prop="dosage" label="Quantité" width="90" />
        <el-table-column prop="frequence" label="Fréquence" width="160" />
        <el-table-column prop="voie" label="Voie" width="70" />
        <el-table-column prop="dateDebut" label="Début" width="95" />
        <el-table-column label="Actions" width="70" align="center">
          <el-button text type="primary" size="small" :icon="Edit" aria-label="Modifier" />
        </el-table-column>
      </el-table>
    </SectionHeader>
  </div>
</template>

<script setup lang="ts">
import { Plus, Edit } from '@element-plus/icons-vue'
import SectionHeader from '@/components/common/SectionHeader.vue'

const mockOrdonnances = [
  { medicament: 'Furosémide', dosage: '40 mg', frequence: 'Matin - Soir', voie: 'PO', dateDebut: '2026-06-15' },
  { medicament: 'Metformine', dosage: '500 mg', frequence: 'Matin - Midi - Soir', voie: 'PO', dateDebut: '2018-03-22' },
  { medicament: 'Ramipril', dosage: '5 mg', frequence: 'Matin', voie: 'PO', dateDebut: '2020-01-10' },
]
</script>

<style scoped>
.dossier-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
