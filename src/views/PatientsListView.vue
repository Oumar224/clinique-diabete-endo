<template>
  <div class="patients-list">
    <SectionHeader label="Gestion des Patients" :icon="User" level="primary">
      <template #actions>
        <el-button type="primary" :icon="Plus" size="small" @click="openCreate">Nouveau patient</el-button>
      </template>
      <div class="patients-list__toolbar">
        <el-input
          v-model="search"
          placeholder="Rechercher par nom, prénom ou N° SS..."
          :prefix-icon="Search"
          clearable
          style="width: 280px"
          size="small"
          @input="onSearch"
        />
        <el-button size="small" :loading="exportingExcel" @click="exportPatientsListExcel">
          <el-icon><Download /></el-icon> Exporter (Excel)
        </el-button>
      </div>
    </SectionHeader>

    <el-table
      v-loading="loading"
      :data="filteredList"
      style="width: 100%"
      @row-click="onPatientClick"
      size="small"
      border
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
          <span v-else class="patients-list__none">\u2014</span>
        </template>
      </el-table-column>
      <el-table-column prop="nir" label="N° SS" width="110" />
      <el-table-column label="Assurance" width="120">
        <template #default="{ row }">
          <span v-if="row.assuranceMutuelle">{{ row.assuranceMutuelle }}</span>
          <span v-else class="patients-list__none">\u2014</span>
        </template>
      </el-table-column>
      <el-table-column prop="telephone" label="Téléphone" width="110" />
      <el-table-column label="Actions" width="90" align="center">
        <template #default="{ row }">
          <el-button text type="primary" :icon="Edit" size="small" @click.stop="openEdit(row)" />
          <el-button text type="danger" :icon="Delete" size="small" @click.stop="onDelete(row)" />
        </template>
      </el-table-column>
    </el-table>

    <div class="patients-list__pagination">
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
import { Search, Plus, Edit, Delete, User, Download } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { patients, fetchPatients, deletePatient } from '@/composables/usePatients'
import { calculateAge } from '@/utils/age'
import { getCiviliteSymbol, getCiviliteLabel } from '@/utils/civilite'
import type { PatientDto } from '@/composables/usePatients'
import { usePatientContext } from '@/composables/usePatientContext'
import PatientFormDialog from '@/components/patients/PatientFormDialog.vue'
import SectionHeader from '@/components/common/SectionHeader.vue'
import { useExport } from '@/composables/useExport'

const router = useRouter()
const { setActivePatient } = usePatientContext()
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
  gap: 6px;
}

.patients-list__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.patients-list__none {
  color: var(--cd-gray-400);
  font-size: 12px;
}

.patients-list__pagination {
  display: flex;
  justify-content: center;
  padding: 8px 0;
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
