<template>
  <div class="st">
    <div class="st__header">
      <el-input
        v-model="searchQuery"
        placeholder="Rechercher un service..."
        clearable
        style="width: 280px"
        @input="onSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-radio-group v-model="filterActive" size="small">
        <el-radio-button :label="''">Tous</el-radio-button>
        <el-radio-button :label="'active'">Actifs</el-radio-button>
        <el-radio-button :label="'inactive'">Inactifs</el-radio-button>
      </el-radio-group>
      <el-button type="primary" :icon="Plus" @click="openCreate">Nouveau service</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="paginatedList"
      style="width: 100%"
      :header-cell-style="{ background: '#0E5C5B', color: '#ffffff', fontWeight: 600 }"
      row-key="id"
    >
      <el-table-column width="36">
        <template #default>
          <el-icon class="st__drag"><Rank /></el-icon>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="Nom" min-width="180" />
      <el-table-column prop="duration" label="Durée" width="90" align="center">
        <template #default="{ row }">
          {{ row.duration }} min
        </template>
      </el-table-column>
      <el-table-column label="Couleur" width="70" align="center">
        <template #default="{ row }">
          <span
            class="st__color-swatch"
            :style="{ background: row.color || 'transparent' }"
          />
        </template>
      </el-table-column>
      <el-table-column label="Statut" width="90" align="center">
        <template #default="{ row }">
          <el-switch
            :model-value="row.is_active"
            size="small"
            @change="handleToggle(row)"
          />
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="110" align="center">
        <template #default="{ row }">
          <el-button text type="primary" :icon="Edit" size="small" @click="openEdit(row)" />
          <el-button text type="danger" :icon="Delete" size="small" @click="handleDelete(row)" />
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && filteredList.length === 0" description="Aucun service" />

    <el-row justify="center" style="margin-top: 20px">
      <el-pagination
        v-model:current-page="paginator.currPage"
        v-model:page-size="paginator.pageSize"
        background
        layout="sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        :total="filteredList.length"
      />
    </el-row>

    <ServiceFormDialog ref="dialogRef" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Search, Edit, Delete, Rank } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useMedicalServices, type ServiceDto } from '@/composables/useMedicalServices'

const { services, loading, fetchServices, deleteService, toggleService } = useMedicalServices()

const searchQuery = ref('')
const filterActive = ref('')
const dialogRef = ref<InstanceType<typeof import('./ServiceFormDialog.vue').default> | null>(null)

const paginator = reactive({ currPage: 1, pageSize: 10 })

onMounted(async () => {
  await fetchServices()
})

const filteredList = computed(() => {
  let list = services.value

  if (filterActive.value === 'active') {
    list = list.filter(s => s.is_active)
  } else if (filterActive.value === 'inactive') {
    list = list.filter(s => !s.is_active)
  }

  const q = searchQuery.value.toLowerCase()
  if (q) {
    list = list.filter(s => s.name.toLowerCase().includes(q))
  }

  return list
})

const paginatedList = computed(() => {
  const start = (paginator.currPage - 1) * paginator.pageSize
  return filteredList.value.slice(start, start + paginator.pageSize)
})

function onSearch() {
  paginator.currPage = 1
}

function openCreate() {
  dialogRef.value?.open()
}

function openEdit(service: ServiceDto) {
  dialogRef.value?.open(service)
}

async function handleToggle(row: ServiceDto) {
  await toggleService(row.id!, !row.is_active)
}

async function handleDelete(row: ServiceDto) {
  try {
    await ElMessageBox.confirm(
      `Supprimer le service « ${row.name} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' }
    )
    const success = await deleteService(row.id!)
    if (success) ElMessage.success('Service supprimé')
  } catch {
    // cancelled or error
  }
}

function onSaved() {
  paginator.currPage = 1
}
</script>

<style scoped>
.st__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.st__drag {
  cursor: grab;
  color: var(--cd-gray-400);
  font-size: 16px;
}

.st__color-swatch {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid var(--cd-gray-200);
  vertical-align: middle;
}
</style>
