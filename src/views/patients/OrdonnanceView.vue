<template>
  <div class="ordonnance-view cde">
    <PatientPageToolbar>
      <el-button :icon="Refresh" :loading="loading" @click="loadData">
        Rafraîchir
      </el-button>
    </PatientPageToolbar>

    <div class="cde-table-card">
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
            <span class="cde-badge cde-badge--muted">#{{ row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Médicaments" min-width="250">
          <template #default="{ row }">
            <span v-if="getFormMeds(row).length > 0">
              {{ getFormMeds(row).join(', ') }}
            </span>
            <span v-else class="cde-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="Groupe" width="140">
          <template #default="{ row }">
            <span class="cde-muted">{{ getFormGroups(row) }}</span>
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
        <el-table-column label="Prescripteur" width="160">
          <template #default="{ row }">
            {{ formatPrescripteur(row) }}
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="240" align="center">
          <template #default="{ row }">
            <el-tooltip content="Voir PDF" placement="top" :show-after="400">
              <el-button size="small" text type="primary" aria-label="Voir le PDF" @click.stop="viewPdf(row)">
                <el-icon><View /></el-icon>
              </el-button>
            </el-tooltip>
            <el-button
              v-if="peutTransferer(row)"
              size="small"
              type="success"
              :loading="transferringId === row.id"
              @click.stop="onTransfer(row)"
            >
              Transférer
            </el-button>
            <span
              v-else-if="row.dejaTransferee"
              class="cde-badge cde-badge--muted"
              title="Cette ordonnance a déjà été transférée à la pharmacie"
            >
              Transférée à la pharmacie
            </span>
            <el-tooltip content="Supprimer" placement="top" :show-after="400">
              <el-button
                size="small"
                text
                type="danger"
                aria-label="Supprimer l'ordonnance"
                :disabled="row.status === 'signed'"
                @click.stop="onDelete(row)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <template #empty>
          <div class="cde-empty">
            Aucune ordonnance pour ce patient.
          </div>
        </template>
      </el-table>
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ ordonnances.length }} ordonnance(s)</span>
    </div>

    <!-- PDF Preview -->
    <OrdonnancePreview
      ref="ordonnancePreviewRef"
      :patient-id="patientId ?? 0"
      :prescription-ids="previewPrescriptionIds"
      :inline-prescriptions="previewInlinePrescriptions"
      :ordonnance-items="previewOrdonnanceItems"
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
import { useDispensations } from '@/composables/useDispensations'
import OrdonnancePreview from '@/components/prescriptions/OrdonnancePreview.vue'
import PatientPageToolbar from '@/components/patients/PatientPageToolbar.vue'

const route = useRoute()
const { ordonnances, loading, fetchOrdonnances, deleteOrdonnance } = useOrdonnanceLibre()
const { createFromDocument, error: dispError } = useDispensations()
const transferringId = ref<number | null>(null)

const patientId = computed(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) ? id : null
})

const ordonnancePreviewRef = ref<InstanceType<typeof OrdonnancePreview> | null>(null)
const previewPrescriptionIds = ref<number[]>([])
const previewInlinePrescriptions = ref<any[]>([])
const previewOrdonnanceItems = ref<any[] | null>(null)

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function parseFormData(row: OrdonnanceLibreRecord): any {
  if (!row.form_data) return null
  try {
    const raw = typeof row.form_data === 'string' ? row.form_data : JSON.stringify(row.form_data)
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function getFormMeds(row: OrdonnanceLibreRecord): string[] {
  const fd = parseFormData(row)
  if (!fd) return []
  const meds: string[] = []

  // Legacy : prescriptions inline + liées
  if (fd.inlinePrescriptions) {
    for (const rx of fd.inlinePrescriptions) {
      if (rx.medicament) meds.push(rx.medicament)
    }
  }
  if (fd.linkedPrescriptionIds && fd.linkedPrescriptionIds.length > 0) {
    meds.push(`${fd.linkedPrescriptionIds.length} prescription(s) liée(s)`)
  }

  // Nouveaux docs : items OrdonnanceSortie (4 groupes)
  if (Array.isArray(fd.ordonnanceSortie)) {
    for (const item of fd.ordonnanceSortie) {
      const cat = item.categorie ?? 'medicament'
      if (cat === 'medicament') {
        if (item.medicament) meds.push(item.medicament)
      } else if (cat === 'soins') {
        if (item.medicament) meds.push(item.medicament)
      } else if (cat === 'examen') {
        const laboLabel = Array.isArray(item.examens) && item.examens.length > 0
          ? item.examens.join(', ')
          : ''
        if (laboLabel) meds.push(laboLabel)
        else if (item.examen) meds.push(item.examen)
      } else if (cat === 'avis') {
        if (item.specialite) meds.push(item.specialite)
      }
    }
  }

  return meds
}

const GROUP_LABELS: Record<string, string> = {
  medicament: 'Médicaments',
  soins: 'Soins',
  examen: "Demandes d'examens",
  avis: 'Avis spécialisés',
}

/** Ordre canonique des groupes pour la colonne « Groupe ». */
const GROUP_ORDER = ['medicament', 'soins', 'examen', 'avis'] as const

function getFormGroups(row: OrdonnanceLibreRecord): string {
  const fd = parseFormData(row)
  if (!fd) return '—'

  // Documents CRH/CRC générés : libellé de fd.categorie
  if (fd.source === 'crh') {
    return GROUP_LABELS[fd.categorie] ?? '—'
  }

  // Nouveaux docs OrdonnanceSortie : liste dédupliquée des groupes présents,
  // dans l'ordre canonique MEDICAMENTS→SOINS→EXAMENS→AVIS.
  if (Array.isArray(fd.ordonnanceSortie) && fd.ordonnanceSortie.length > 0) {
    const present = new Set<string>()
    const labels: string[] = []
    for (const order of GROUP_ORDER) {
      const hasGroup = fd.ordonnanceSortie.some(
        (item: any) => (item.categorie ?? 'medicament') === order,
      )
      if (hasGroup && !present.has(order)) {
        present.add(order)
        const label = GROUP_LABELS[order]
        if (label) labels.push(label)
      }
    }
    return labels.length > 0 ? labels.join(', ') : '—'
  }

  // Legacy : inline / liées → uniquement médicaments
  if (fd.inlinePrescriptions || (fd.linkedPrescriptionIds && fd.linkedPrescriptionIds.length > 0)) {
    return 'Médicaments'
  }

  return '—'
}

function formatPrescripteur(row: OrdonnanceLibreRecord): string {
  if (row.medecin_nom && row.medecin_prenom) {
    return `Dr. ${row.medecin_prenom} ${row.medecin_nom}`
  }
  return '—'
}

function viewPdf(row: OrdonnanceLibreRecord) {
  const fd = parseFormData(row)

  previewOrdonnanceItems.value = null
  previewPrescriptionIds.value = []
  previewInlinePrescriptions.value = []

  if (fd) {
    // Documents CRH/CRC générés : le groupe complet
    if (fd.source === 'crh' && Array.isArray(fd.items)) {
      previewOrdonnanceItems.value = JSON.parse(JSON.stringify(fd.items))
    } else if (Array.isArray(fd.ordonnanceSortie) && fd.ordonnanceSortie.length > 0) {
      previewOrdonnanceItems.value = JSON.parse(JSON.stringify(fd.ordonnanceSortie))
    } else {
      // Chemin legacy
      previewPrescriptionIds.value = fd.linkedPrescriptionIds ? [...fd.linkedPrescriptionIds] : []
      previewInlinePrescriptions.value = fd.inlinePrescriptions ? JSON.parse(JSON.stringify(fd.inlinePrescriptions)) : []
    }
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

/**
 * Une ordonnance est transférable si elle possède au moins une ligne
 * médicament (source : backend) et qu'aucune délivrance pharmacie n'existe
 * déjà pour ce document. Garde défensive : on ne sollicite jamais l'IPC pour
 * une ordonnance inéligible.
 *
 * @param row - Ordonnance affichée dans la liste.
 * @returns `true` si le bouton « Transférer » doit être proposé.
 */
function peutTransferer(row: OrdonnanceLibreRecord): boolean {
  return row.dejaTransferee !== true && row.hasMedicamentLines === true
}

async function onTransfer(row: OrdonnanceLibreRecord) {
  if (!peutTransferer(row)) return
  transferringId.value = row.id
  try {
    const result = await createFromDocument(String(row.id))
    if (!result) {
      if (!dispError.value) ElMessage.warning('Aucune ligne médicament à transférer pour cette ordonnance')
      return
    }
    row.dejaTransferee = true
    if (result.created === false) {
      ElMessage.info('Ordonnance déjà transférée à la pharmacie')
    } else {
      ElMessage.success('Ordonnance transférée à la pharmacie')
    }
  } catch (e) {
    ElMessage.error((e as Error).message)
  } finally {
    transferringId.value = null
  }
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
</style>
