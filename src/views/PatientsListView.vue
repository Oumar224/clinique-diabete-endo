<template>
  <div class="patients-list">
    <div class="patients-list__header">
      <h1 class="patients-list__title">Patients</h1>
      <div class="patients-list__actions">
        <el-input
          v-model="search"
          placeholder="Rechercher par nom, prénom ou N° SS..."
          :prefix-icon="Search"
          clearable
          style="width: 320px"
          @input="onSearch"
        />
        <el-button type="primary" :icon="Plus" @click="openCreate">Nouveau patient</el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="filteredList"
      style="width: 100%"
      @row-click="onPatientClick"
      :header-cell-style="{ background: '#0E5C5B', color: '#ffffff', fontWeight: 600 }"
    >
      <el-table-column label="" width="50">
        <template #default="{ row }">
          <el-avatar :size="32" :src="row.photo || undefined" shape="circle">
            {{ (row.prenom?.[0] || '') + (row.nom?.[0] || '') }}
          </el-avatar>
        </template>
      </el-table-column>
      <el-table-column prop="civilite" label="Civ." width="60" />
      <el-table-column prop="nom" label="Nom" />
      <el-table-column prop="prenom" label="Prénom" />
      <el-table-column label="Âge">
        <template #default="{ row }">
          {{ calculateAge(row.date_naissance) }} ans
        </template>
      </el-table-column>
      <el-table-column prop="nip" label="NIP" width="130" />
      <el-table-column prop="region" label="Région" width="120">
        <template #default="{ row }">
          <span v-if="row.region">{{ row.region }}</span>
          <span v-else class="patients-list__none">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="nir" label="N° SS" width="140" />
      <el-table-column prop="telephone" label="Téléphone" width="130" />
      <el-table-column label="Mutuelle" width="140">
        <template #default="{ row }">
          <span v-if="row.mutuelle" class="patients-list__mutuelle">{{ row.mutuelle }}</span>
          <span v-else class="patients-list__none">—</span>
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="120" align="center">
        <template #default="{ row }">
          <el-button text type="primary" :icon="Edit" size="small" @click.stop="openEdit(row)" />
          <el-button text type="danger" :icon="Delete" size="small" @click.stop="onDelete(row)" />
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && patients.length === 0" description="Aucun patient trouvé" />

    <el-row justify="center" style="margin-top: 20px">
      <el-pagination
        v-model:current-page="paginator.currPage"
        background
        layout="prev, pager, next"
        :page-size="paginator.pageSize"
        :total="patients.length"
      />
    </el-row>

    <PatientFormDialog ref="formDialogRef" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { patients, fetchPatients, deletePatient } from '@/composables/usePatients'
import { calculateAge } from '@/utils/age'
import type { PatientDto } from '@/composables/usePatients'
import { usePatientContext } from '@/composables/usePatientContext'
import PatientFormDialog from '@/components/patients/PatientFormDialog.vue'

const router = useRouter()
const { setActivePatient } = usePatientContext()
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
    console.error('[PatientsListView] formDialogRef is null — PatientFormDialog may have failed to mount')
    ElMessage.error('Erreur: le formulaire patient n\'est pas disponible')
    return
  }
  formDialogRef.value.open()
}

function openEdit(patient: PatientDto) {
  if (!formDialogRef.value) {
    console.error('[PatientsListView] formDialogRef is null — PatientFormDialog may have failed to mount')
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
  }).catch(() => {
    // user cancelled
  })
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
.patients-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.patients-list__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--cd-gray-900);
}

.patients-list__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.patients-list__mutuelle {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--cd-primary-light);
  color: var(--cd-primary);
}

.patients-list__none {
  color: var(--cd-gray-400);
  font-size: 13px;
}
</style>
