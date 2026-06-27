<template>
  <div class="dossier-section">
    <h3 class="dossier-section__title">Antécédents médicaux et chirurgicaux</h3>
    <el-table :data="mockAntecedents" style="width:100%" size="small">
      <el-table-column prop="codeCIM10" label="Code CIM-10" width="120" />
      <el-table-column prop="libelle" label="Libellé" />
      <el-table-column prop="type" label="Type" width="120" />
      <el-table-column prop="severe" label="Sévérité" width="100">
        <template #default="{ row }">
          <el-tag :type="severityType(row.severe)" size="small">{{ row.severe }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="dateDiagnostic" label="Date diag." width="110" />
      <el-table-column prop="actif" label="Actif" width="70">
        <template #default="{ row }">
          <el-tag :type="row.actif ? 'success' : 'info'" size="small">{{ row.actif ? 'Oui' : 'Non' }}</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <h3 class="dossier-section__title" style="margin-top:24px">Allergies et intolérances</h3>
    <el-table :data="mockAllergies" style="width:100%" size="small">
      <el-table-column prop="allergene" label="Allergène" />
      <el-table-column prop="type" label="Type" width="140" />
      <el-table-column prop="severite" label="Sévérité" width="100">
        <template #default="{ row }">
          <el-tag :type="severityType(row.severite)" size="small">{{ row.severite }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="reaction" label="Réaction" />
      <el-table-column prop="dateIdentif" label="Date" width="110" />
    </el-table>

    <h3 class="dossier-section__title" style="margin-top:24px">Histoire de la maladie</h3>
    <el-input
      type="textarea"
      :rows="4"
      placeholder="Histoire de la maladie..."
      v-model="histoireMaladie"
      class="dossier-section__textarea"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const histoireMaladie = ref('Patient admis pour insuffisance cardiaque congestive sur un terrain de diabète de type 2. Antécédent d\'HTA non traité. Suivi irrégulier.')

const mockAntecedents = [
  { codeCIM10: 'I50.0', libelle: 'Insuffisance cardiaque congestive', type: 'Médical', severe: 'Majeur', dateDiagnostic: '2025-06-15', actif: true },
  { codeCIM10: 'E11.9', libelle: 'Diabète de type 2', type: 'Médical', severe: 'Majeur', dateDiagnostic: '2018-03-22', actif: true },
  { codeCIM10: 'I10', libelle: 'Hypertension artérielle', type: 'Médical', severe: 'Modéré', dateDiagnostic: '2020-01-10', actif: true },
  { codeCIM10: 'Z90.0', libelle: 'Appendicectomie', type: 'Chirurgical', severe: 'Mineur', dateDiagnostic: '1995-08-05', actif: false },
]

const mockAllergies = [
  { allergene: 'Pénicilline', type: 'Médicamenteuse', severite: 'Critique', reaction: 'Choc anaphylactique', dateIdentif: '2020-05-12' },
  { allergene: 'Iode', type: 'Médicamenteuse', severite: 'Majeure', reaction: 'Urticaire généralisée', dateIdentif: '2021-09-30' },
]

function severityType(severe: string): 'success' | 'warning' | 'danger' | 'info' {
  switch (severe.toLowerCase()) {
    case 'critique': return 'danger'
    case 'majeur': case 'majeure': return 'warning'
    case 'mineur': case 'mineure': return 'info'
    default: return 'info'
  }
}
</script>

<style scoped>
.dossier-section__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--cd-gray-900);
  margin-bottom: 12px;
}
.dossier-section__textarea {
  margin-top: 8px;
}
</style>
