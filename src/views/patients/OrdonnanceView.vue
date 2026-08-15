<template>
  <div class="ordonnance-view">
    <SectionHeader label="Ordonnances" level="primary">
      <template #badge>{{ ordonnances.length }}</template>
      <template #actions>
        <el-button size="small" :icon="Refresh" :loading="loading" @click="loadData">
          Rafraîchir
        </el-button>
      </template>

      <el-table
        :data="ordonnances"
        style="width:100%"
        size="small"
        highlight-current-row
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
            <el-tag size="small" effect="plain">#{{ row.id }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Médicaments" min-width="250">
          <template #default="{ row }">
            <span v-if="getFormMeds(row).length > 0" class="ordonnance-view__meds">
              {{ getFormMeds(row).join(', ') }}
            </span>
            <span v-else class="ordonnance-view__empty-meds">—</span>
          </template>
        </el-table-column>
        <el-table-column label="Statut" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'signed' ? 'success' : 'warning'" size="small" effect="plain">
              {{ row.status === 'signed' ? 'Signé' : 'Brouillon' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Prescripteur" width="160">
          <template #default="{ row }">
            {{ formatPrescripteur(row) }}
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="120" align="center">
          <template #default="{ row }">
            <el-tooltip content="Voir PDF" placement="top" :show-after="400">
              <el-button size="small" text type="primary" @click.stop="viewPdf(row)">
                <el-icon><View /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="Supprimer" placement="top" :show-after="400">
              <el-button
                size="small"
                text
                type="danger"
                :disabled="row.status === 'signed'"
                @click.stop="onDelete(row)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="Aucune ordonnance pour ce patient" :image-size="80" />
        </template>
      </el-table>
    </SectionHeader>

    <!-- PDF Preview -->
    <OrdonnancePreview
      ref="ordonnancePreviewRef"
      :patient-id="patientId ?? 0"
      :prescription-ids="previewPrescriptionIds"
      :inline-prescriptions="previewInlinePrescriptions"
      @close="() => {}"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Delete, View, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useOrdonnanceLibre, type OrdonnanceLibreRecord } from '@/composables/useOrdonnanceLibre'
import SectionHeader from '@/components/common/SectionHeader.vue'
import OrdonnancePreview from '@/components/prescriptions/OrdonnancePreview.vue'

const route = useRoute()
const { ordonnances, loading, fetchOrdonnances, deleteOrdonnance } = useOrdonnanceLibre()

const patientId = computed(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) ? id : null
})

const ordonnancePreviewRef = ref<InstanceType<typeof OrdonnancePreview> | null>(null)
const previewPrescriptionIds = ref<number[]>([])
const previewInlinePrescriptions = ref<any[]>([])

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function getFormMeds(row: OrdonnanceLibreRecord): string[] {
  if (!row.form_data) return []
  try {
    const raw = typeof row.form_data === 'string' ? row.form_data : JSON.stringify(row.form_data)
    const fd = JSON.parse(raw)
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

function formatPrescripteur(row: OrdonnanceLibreRecord): string {
  if (row.medecin_nom && row.medecin_prenom) {
    return `Dr. ${row.medecin_prenom} ${row.medecin_nom}`
  }
  return '—'
}

function viewPdf(row: OrdonnanceLibreRecord) {
  try {
    const raw = typeof row.form_data === 'string' ? row.form_data : JSON.stringify(row.form_data || '{}')
    const fd = JSON.parse(raw)
    previewPrescriptionIds.value = fd.linkedPrescriptionIds ? [...fd.linkedPrescriptionIds] : []
    previewInlinePrescriptions.value = fd.inlinePrescriptions ? JSON.parse(JSON.stringify(fd.inlinePrescriptions)) : []
  } catch {
    previewPrescriptionIds.value = []
    previewInlinePrescriptions.value = []
  }
  ordonnancePreviewRef.value?.open()
}

async function onDelete(row: OrdonnanceLibreRecord) {
  try {
    await ElMessageBox.confirm(
      `Supprimer l'ordonnance #${row.id} ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' },
    )
  } catch {
    return
  }

  try {
    await deleteOrdonnance(row.id)
    ElMessage.success('Ordonnance supprimée')
    await loadData()
  } catch {
    ElMessage.error('Erreur lors de la suppression')
  }
}

async function loadData() {
  if (!patientId.value) return
  await fetchOrdonnances(patientId.value)
}

onMounted(loadData)

watch(patientId, loadData)
</script>

<style scoped>
.ordonnance-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ordonnance-view__meds {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.ordonnance-view__empty-meds {
  color: var(--el-text-color-placeholder);
}
</style>
