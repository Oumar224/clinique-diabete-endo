<template>
  <div class="cat">
    <el-alert v-if="error" type="error" :title="error" show-icon closable style="margin-bottom: 12px" />

    <div class="cat__toolbar">
      <el-input
        v-model="search"
        placeholder="Rechercher un acte..."
        clearable
        style="width: 260px"
        @input="onSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-select
        v-model="serviceFilter"
        placeholder="Filtrer par service"
        clearable
        style="width: 200px"
        @change="onSearch"
      >
        <el-option
          v-for="s in services"
          :key="s.id"
          :label="s.name"
          :value="s.id!"
        />
      </el-select>
      <el-button type="primary" :icon="Plus" @click="openCreate">Nouvel acte</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="paginatedActs"
      style="width: 100%"
      border
      row-key="id"
    >
      <el-table-column prop="code" label="Code" width="130" />
      <el-table-column prop="label" label="Libellé" min-width="250" />
      <el-table-column prop="service_name" label="Service" width="180" />
      <el-table-column label="Actif" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
            {{ row.is_active ? 'Oui' : 'Non' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="120" align="center">
        <template #default="{ row }">
          <el-button text type="primary" :icon="Edit" size="small" @click="openEdit(row)" />
          <el-button text type="danger" :icon="Delete" size="small" @click="handleDelete(row)" />
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && filteredActs.length === 0" description="Aucun acte médical" />

    <el-row justify="center" style="margin-top: 20px">
      <el-pagination
        v-model:current-page="paginator.currPage"
        v-model:page-size="paginator.pageSize"
        background
        layout="sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        :total="filteredActs.length"
      />
    </el-row>

    <MedicalActFormDialog ref="actDialogRef" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Search, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useMedicalActs, type MedicalActDto } from '@/composables/useMedicalActs'
import { useMedicalServices } from '@/composables/useMedicalServices'

const {
  acts, loading, error, fetchActs, deleteAct,
} = useMedicalActs()

const { services, fetchServices } = useMedicalServices()

const search = ref('')
const serviceFilter = ref<number | undefined>(undefined)
const paginator = reactive({ currPage: 1, pageSize: 10 })

const actDialogRef = ref<InstanceType<typeof import('./MedicalActFormDialog.vue').default> | null>(null)

onMounted(async () => {
  await Promise.all([
    fetchActs(),
    fetchServices(),
  ])
})

const filteredActs = computed(() => {
  let list = acts.value
  const q = search.value.toLowerCase()
  if (q) {
    list = list.filter(a => a.code.toLowerCase().includes(q) || a.label.toLowerCase().includes(q))
  }
  if (serviceFilter.value !== undefined) {
    list = list.filter(a => a.service_id === serviceFilter.value)
  }
  return list
})

const paginatedActs = computed(() => {
  const start = (paginator.currPage - 1) * paginator.pageSize
  return filteredActs.value.slice(start, start + paginator.pageSize)
})

function onSearch() {
  paginator.currPage = 1
}

function openCreate() {
  actDialogRef.value?.open()
}

function openEdit(act: MedicalActDto) {
  actDialogRef.value?.open(act)
}

async function handleDelete(row: MedicalActDto) {
  if (row.id == null) {
    ElMessage.error('Impossible de supprimer : identifiant manquant')
    return
  }
  try {
    await ElMessageBox.confirm(
      `Supprimer l'acte « ${row.code} — ${row.label} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' }
    )
    const ok = await deleteAct(row.id)
    if (ok) ElMessage.success('Acte supprimé')
  } catch {
    // cancelled or error
  }
}

function onSaved() {
  paginator.currPage = 1
}
</script>

<style scoped>
.cat__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
</style>
