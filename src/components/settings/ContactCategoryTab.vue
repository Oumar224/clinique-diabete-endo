<template>
  <div class="cct">
    <div class="cct__header">
      <el-input
        v-model="searchQuery"
        placeholder="Rechercher un type..."
        clearable
        style="width: 280px"
        @input="onSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" :icon="Plus" @click="openCreate">
        Nouveau type de contact
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

    <el-empty v-if="!loading && filteredList.length === 0" description="Aucun type de contact" />

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

    <ContactCategoryFormDialog ref="dialogRef" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Search, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useContactCategories, type ContactCategoryDto } from '@/composables/useContactCategories'

const { categories, loading, error, fetchCategories, updateCategory, deleteCategory } = useContactCategories()

const searchQuery = ref('')
const dialogRef = ref<InstanceType<typeof import('./ContactCategoryFormDialog.vue').default> | null>(null)

const paginator = reactive({ currPage: 1, pageSize: 10 })

onMounted(async () => {
  await fetchCategories()
})

const filteredList = computed(() => {
  let list = categories.value
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

function openEdit(category: ContactCategoryDto) {
  dialogRef.value?.open(category)
}

async function handleToggle(row: ContactCategoryDto) {
  await updateCategory(row.id!, { is_active: !row.is_active })
}

async function handleDelete(row: ContactCategoryDto) {
  try {
    await ElMessageBox.confirm(
      `Supprimer le type « ${row.label} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' }
    )
    const success = await deleteCategory(row.id!)
    if (success) ElMessage.success('Type supprimé')
  } catch {
    // cancelled or error
  }
}

function onSaved() {
  paginator.currPage = 1
}
</script>

<style scoped>
.cct__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
</style>
