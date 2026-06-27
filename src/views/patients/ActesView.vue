<template>
  <div class="actes-view">
    <h3 class="actes-view__title">Plan de soins global</h3>

    <el-table :data="sortedActes" size="small" style="width:100%">
      <el-table-column prop="priorite" label="Priorité" width="100">
        <template #default="{ row }">
          <el-tag :type="prioriteType(row.priorite)" size="small">{{ row.priorite }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="type" label="Type" width="120" />
      <el-table-column prop="libelle" label="Libellé" />
      <el-table-column prop="prescripteur" label="Prescripteur" width="150" />
      <el-table-column prop="datePrescription" label="Date" width="110" />
      <el-table-column prop="valide" label="Validé" width="80">
        <template #default="{ row }">
          <el-tag :type="row.valide ? 'success' : 'warning'" size="small">{{ row.valide ? 'Oui' : 'Non' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="80" align="center">
        <el-button text type="primary" size="small" :icon="Edit" />
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Edit } from '@element-plus/icons-vue'

interface Acte {
  priorite: string
  type: string
  libelle: string
  prescripteur: string
  datePrescription: string
  valide: boolean
}

const mockActes: Acte[] = [
  { priorite: 'Haute', type: 'Médicament', libelle: 'Furosémide 40 mg - 2x/jour', prescripteur: 'Dr. Diallo', datePrescription: '26/06/2026', valide: true },
  { priorite: 'Haute', type: 'Médicament', libelle: 'Metformine 500 mg - 3x/jour', prescripteur: 'Dr. Diallo', datePrescription: '26/06/2026', valide: true },
  { priorite: 'Normale', type: 'Soin infirmier', libelle: 'Pansement plaie opératoire', prescripteur: 'Dr. Camara', datePrescription: '26/06/2026', valide: false },
  { priorite: 'Basse', type: 'Rééducation', libelle: 'Kinésithérapie respiratoire', prescripteur: 'Dr. Diallo', datePrescription: '25/06/2026', valide: true },
  { priorite: 'Normale', type: 'Examen', libelle: 'IRM cardiaque', prescripteur: 'Dr. Diallo', datePrescription: '26/06/2026', valide: false },
  { priorite: 'Haute', type: 'Surveillance', libelle: 'Surveillance tension artérielle - 3x/jour', prescripteur: 'Dr. Camara', datePrescription: '26/06/2026', valide: true },
]

const priorityOrder: Record<string, number> = { Urgente: 0, Haute: 1, Normale: 2, Basse: 3 }

const sortedActes = computed(() => {
  return [...mockActes].sort((a, b) => (priorityOrder[a.priorite] ?? 99) - (priorityOrder[b.priorite] ?? 99))
})

function prioriteType(p: string): 'danger' | 'warning' | 'success' | 'info' {
  switch (p) {
    case 'Urgente': return 'danger'
    case 'Haute': return 'warning'
    case 'Normale': return 'success'
    default: return 'info'
  }
}
</script>

<style scoped>
.actes-view__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--cd-gray-900);
  margin-bottom: 16px;
}
</style>
