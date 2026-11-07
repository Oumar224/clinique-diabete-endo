<template>
  <div class="dossier-section cde">
    <SectionHeader label="Ordonnances" level="secondary" collapsible :badge="ordonnances.length">
      <template #actions>
        <el-button size="small" :icon="Refresh" :loading="loading" @click="loadData">
          Rafraîchir
        </el-button>
      </template>
      <div class="cde-table-card">
        <el-table
          :data="ordonnances"
          style="width:100%"
          size="small"
          v-loading="loading"
          element-loading-text="Chargement des ordonnances..."
        >
          <el-table-column label="Date" width="110">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="Référence" width="100">
            <template #default="{ row }">
              <span class="cde-badge cde-badge--muted">#{{ row.id }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Médicaments" min-width="200">
            <template #default="{ row }">
              <span v-if="getFormMeds(row).length > 0">
                {{ getFormMeds(row).join(', ') }}
              </span>
              <span v-else class="cde-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="Statut" width="100" align="center">
            <template #default="{ row }">
              <span
                class="cde-badge"
                :class="row.status === 'signed' ? 'cde-badge--success' : 'cde-badge--warning'"
              >
                {{ row.status === 'signed' ? 'Signé' : 'Brouillon' }}
              </span>
            </template>
          </el-table-column>
          <template #empty>
            <div class="cde-empty">
              Aucune ordonnance.
            </div>
          </template>
        </el-table>
      </div>
      <div class="cde-footer">
        <span class="cde-muted">{{ ordonnances.length }} ordonnance(s)</span>
      </div>
    </SectionHeader>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { usePatientContext } from '@/composables/usePatientContext'
import { useOrdonnanceLibre, type OrdonnanceLibreRecord } from '@/composables/useOrdonnanceLibre'
import SectionHeader from '@/components/common/SectionHeader.vue'

const { activePatient } = usePatientContext()
const { ordonnances, loading, fetchOrdonnances } = useOrdonnanceLibre()

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function getFormMeds(row: OrdonnanceLibreRecord): string[] {
  if (!row.form_data) return []
  try {
    const fd = typeof row.form_data === 'string' ? JSON.parse(row.form_data) : row.form_data
    const meds: string[] = []
    if (fd.inlinePrescriptions) {
      for (const rx of fd.inlinePrescriptions) {
        if (rx.medicament) meds.push(rx.medicament)
      }
    }
    if (fd.linkedPrescriptionIds && fd.linkedPrescriptionIds.length > 0) {
      meds.push(`${fd.linkedPrescriptionIds.length} prescription(s) liée(s)`)
    }
    return meds
  } catch {
    return []
  }
}

async function loadData() {
  if (!activePatient.value?.id) return
  await fetchOrdonnances(activePatient.value.id)
}

onMounted(loadData)

watch(() => activePatient.value?.id, loadData)
</script>

<style scoped>
.dossier-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
