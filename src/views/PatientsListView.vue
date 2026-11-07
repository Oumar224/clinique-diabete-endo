<template>
  <div class="patients-list cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Gestion des Patients
        </h1>
      </div>
      <div class="cde-head-actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">Nouveau patient</el-button>
      </div>
    </header>

    <div class="cde-toolbar">
      <div class="cde-filters">
        <div class="cde-filter cde-toolbar__search">
          <span class="cde-filter__label">Recherche</span>
          <el-input
            v-model="search"
            placeholder="Nom, prénom ou N° SS..."
            :prefix-icon="Search"
            clearable
            aria-label="Rechercher un patient"
            @input="onSearch"
          />
        </div>
      </div>
      <div class="cde-toolbar__actions">
        <el-button :loading="exportingExcel" @click="exportPatientsListExcel">
          <el-icon><Download /></el-icon> Exporter (Excel)
        </el-button>
      </div>
    </div>

    <div class="cde-table-card">
    <el-table
      v-loading="loading"
      :data="filteredList"
      style="width: 100%"
      @row-click="onPatientClick"
      size="small"
      highlight-current-row
    >
      <el-table-column label="" width="38">
        <template #default="{ row }">
          <el-avatar :size="24" :src="row.photo || undefined" shape="circle" :class="'patient-list__avatar--' + (row.civilite === 'M' ? 'male' : row.civilite === 'Mme' || row.civilite === 'Mlle' ? 'female' : 'none')">
            <span style="font-size:13px">{{ getCiviliteSymbol(row.civilite) }}</span>
          </el-avatar>
        </template>
      </el-table-column>
      <el-table-column label="Civ." width="65">
        <template #default="{ row }">
          <span style="font-size:12px">{{ getCiviliteLabel(row.civilite) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="nom" label="Nom" />
      <el-table-column prop="prenom" label="Prénom" />
      <el-table-column label="Âge" width="60">
        <template #default="{ row }">
          {{ calculateAge(row.date_naissance) }} ans
        </template>
      </el-table-column>
      <el-table-column prop="nip" label="NIP" width="100" />
      <el-table-column prop="region" label="Région" width="100">
        <template #default="{ row }">
          <span v-if="row.region">{{ row.region }}</span>
          <span v-else class="cde-muted">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="nir" label="N° SS" width="110" />
      <el-table-column label="Assurance" width="120">
        <template #default="{ row }">
          <span v-if="row.assuranceMutuelle">{{ row.assuranceMutuelle }}</span>
          <span v-else class="cde-muted">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="telephone" label="Téléphone" width="110" />
      <el-table-column label="Actions" width="90" align="center">
        <template #default="{ row }">
          <el-button text type="primary" :icon="Edit" size="small" aria-label="Modifier le patient" @click.stop="openEdit(row)" />
          <el-button text type="danger" :icon="Delete" size="small" aria-label="Supprimer le patient" @click.stop="onDelete(row)" />
        </template>
      </el-table-column>
      <template #empty>
        <div class="cde-empty">
          Aucun patient.
        </div>
      </template>
    </el-table>
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ patients.length }} patient(s)</span>
      <el-pagination
        v-model:current-page="paginator.currPage"
        background
        layout="prev, pager, next"
        :page-size="paginator.pageSize"
        :total="patients.length"
        small
      />
    </div>

    <PatientFormDialog ref="formDialogRef" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Plus, Edit, Delete, Download } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePatients } from '@/composables/usePatients'
import { calculateAge } from '@/utils/age'
import { getCiviliteSymbol, getCiviliteLabel } from '@/utils/civilite'
import type { PatientDto } from '@/composables/usePatients'
import { usePatientContext } from '@/composables/usePatientContext'
import PatientFormDialog from '@/components/patients/PatientFormDialog.vue'
import { useExport } from '@/composables/useExport'

const router = useRouter()
const { setActivePatient } = usePatientContext()
const { patients, fetchPatients, deletePatient } = usePatients()
const { exportingExcel, exportPatientsListExcel } = useExport()
const loading = ref(true)
const search = ref('')
const formDialogRef = ref<InstanceType<typeof PatientFormDialog> | null>(null)

const paginator = reactive({ currPage: 1, pageSize: 10 })

const filteredList = computed(() => {
  const start = (paginator.currPage - 1) * paginator.pageSize
  return patients.value.slice(start, start + paginator.pageSize)
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

onErrorCaptured((err) => {
  ElMessage.error(`Erreur: ${(err as Error).message}`)
  return false
})

onMounted(async () => {
  try {
    await fetchPatients()
  } catch (e) {
    ElMessage.error(`Erreur lors du chargement des patients: ${(e as Error).message}`)
  } finally {
    loading.value = false
  }
})

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    paginator.currPage = 1
    loading.value = true
    try {
      await fetchPatients(search.value)
    } catch (e) {
      ElMessage.error(`Erreur lors de la recherche: ${(e as Error).message}`)
    } finally {
      loading.value = false
    }
  }, 300)
}

function onPatientClick(patient: PatientDto) {
  setActivePatient(patient)
  router.push(`/app/patients/${patient.id}`)
}

function openCreate() {
  if (!formDialogRef.value) {
    console.error('[PatientsListView] formDialogRef is null')
    ElMessage.error('Erreur: le formulaire patient n\'est pas disponible')
    return
  }
  formDialogRef.value.open()
}

function openEdit(patient: PatientDto) {
  if (!formDialogRef.value) {
    ElMessage.error('Erreur: le formulaire patient n\'est pas disponible')
    return
  }
  formDialogRef.value.open(patient)
}

function onDelete(patient: PatientDto) {
  ElMessageBox.confirm(
    `Supprimer le patient ${patient.prenom} ${patient.nom} ?`,
    'Confirmation',
    { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' },
  ).then(async () => {
    try {
      await deletePatient(patient.id)
      await fetchPatients(search.value)
    } catch (e) {
      ElMessage.error(`Erreur lors de la suppression: ${(e as Error).message}`)
    }
  }).catch(() => {})
}

async function onSaved() {
  try {
    await fetchPatients(search.value)
  } catch (e) {
    ElMessage.error(`Erreur lors du rafraîchissement: ${(e as Error).message}`)
  }
}
</script>

<style scoped>
.patients-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}


.patient-list__avatar--male {
  background: var(--cd-primary) !important;
}

.patient-list__avatar--female {
  background: var(--cd-secondary) !important;
}

.patient-list__avatar--none {
  background: var(--cd-gray-400) !important;
}
</style>
