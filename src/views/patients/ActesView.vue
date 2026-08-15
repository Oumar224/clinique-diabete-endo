<template>
  <div class="actes-view">
    <h3 class="actes-view__title">Actes médicaux prescrits</h3>

    <el-table v-loading="loading" :data="patientActes" size="small" style="width:100%">
      <el-table-column prop="acte_code" label="Code" width="100" />
      <el-table-column prop="acte_label" label="Libellé" min-width="200" />
      <el-table-column prop="quantite" label="Qté" width="80" align="center" />
      <el-table-column label="Prix unitaire" width="130" align="right">
        <template #default="{ row }">
          {{ row.prix_unitaire != null ? formatCurrency(row.prix_unitaire) : '—' }}
        </template>
      </el-table-column>
      <el-table-column label="Statut paiement" width="140" align="center">
        <template #default="{ row }">
          <el-tag :type="row.statut_paiement === 'PAYE' ? 'success' : 'warning'" size="small">
            {{ row.statut_paiement === 'PAYE' ? 'Payé' : 'À payer' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="100" align="center">
        <template #default="{ row }">
          <el-button
            v-if="row.statut_paiement === 'A_PAYER'"
            text
            type="success"
            size="small"
            @click="handleMarquerPaye(row)"
          >
            Payer
          </el-button>
          <el-button
            v-if="row.statut_paiement === 'PAYE'"
            text
            type="warning"
            size="small"
            @click="handleMarquerAPayer(row)"
          >
            Dé-payer
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && patientActes.length === 0" description="Aucun acte prescrit" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { usePatientActes } from '@/composables/usePatientActes'
import { useCurrencies } from '@/composables/useCurrencies'

const route = useRoute()
const { patientActes, loading, fetchPatientActes, updateStatut } = usePatientActes()
const { formatCurrency, fetchCurrencies } = useCurrencies()

const patientId = computed<number>(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) && id > 0 ? id : 0
})

onMounted(() => {
  fetchCurrencies()
  loadData()
})

watch(() => route.params.id, () => loadData())

async function loadData() {
  const pid = patientId.value
  if (!pid || pid <= 0) return
  await fetchPatientActes(pid)
}

async function handleMarquerPaye(row: any) {
  if (row.id == null) return
  try {
    await ElMessageBox.confirm(
      'Marquer cet acte comme payé ?',
      'Confirmation',
      { type: 'info', confirmButtonText: 'Oui', cancelButtonText: 'Annuler' }
    )
    const ok = await updateStatut(row.id, 'PAYE')
    if (ok) ElMessage.success('Acte marqué comme payé')
  } catch {
    // cancelled or error
  }
}

async function handleMarquerAPayer(row: any) {
  if (row.id == null) return
  try {
    await ElMessageBox.confirm(
      'Repasser cet acte en statut « À payer » ?',
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Oui', cancelButtonText: 'Annuler' }
    )
    const ok = await updateStatut(row.id, 'A_PAYER')
    if (ok) ElMessage.success('Acte repassé en attente de paiement')
  } catch {
    // cancelled or error
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
