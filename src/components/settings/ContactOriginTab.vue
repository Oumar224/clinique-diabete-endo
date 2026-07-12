<template>
  <div class="cot">
    <div class="cot__header">
      <el-input
        v-model="searchQuery"
        placeholder="Rechercher un mécanisme..."
        clearable
        style="width: 280px"
        @input="onSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" :icon="Plus" @click="openCreate">
        Nouveau mécanisme
      </el-button>
    </div>

    <el-alert
      v-if="error"
      type="error"
      :title="error"
      closable
      @close="error = null"
      style="margin-bottom: 16px"
    />

    <el-table
      v-loading="loading"
      :data="paginatedList"
      style="width: 100%"
      border
      row-key="id"
    >
      <el-table-column prop="value" label="Valeur" width="160" />
      <el-table-column prop="label" label="Libellé" min-width="220" />
      <el-table-column prop="sort_order" label="Ordre" width="80" align="center" />
      <el-table-column label="Actif" width="80" align="center">
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

    <el-empty v-if="!loading && filteredList.length === 0" description="Aucun mécanisme de contact" />

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

    <ContactOriginFormDialog ref="dialogRef" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Search, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useContactOrigins, type ContactOriginDto } from '@/composables/useContactOrigins'

const { origins, loading, error, fetchOrigins, updateOrigin, deleteOrigin } = useContactOrigins()

const searchQuery = ref('')
const dialogRef = ref<InstanceType<typeof import('./ContactOriginFormDialog.vue').default> | null>(null)

const paginator = reactive({ currPage: 1, pageSize: 10 })

onMounted(async () => {
  await fetchOrigins()
})

const filteredList = computed(() => {
  let list = origins.value
  const q = searchQuery.value.toLowerCase()
  if (q) {
    list = list.filter(o =>
      o.value.toLowerCase().includes(q) ||
      o.label.toLowerCase().includes(q)
    )
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

function openEdit(origin: ContactOriginDto) {
  dialogRef.value?.open(origin)
}

async function handleToggle(row: ContactOriginDto) {
  await updateOrigin(row.id!, { is_active: !row.is_active })
}

async function handleDelete(row: ContactOriginDto) {
  try {
    await ElMessageBox.confirm(
      `Supprimer le mécanisme « ${row.label} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' }
    )
    const success = await deleteOrigin(row.id!)
    if (success) ElMessage.success('Mécanisme supprimé')
  } catch {
    // cancelled or error
  }
}

function onSaved() {
  paginator.currPage = 1
}
</script>

<style scoped>
.cot__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
</style>
