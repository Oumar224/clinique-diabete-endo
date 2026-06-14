<template>
  <div class="spt">
    <div class="spt__header">
      <el-input
        v-model="searchQuery"
        placeholder="Rechercher une spécialité..."
        clearable
        style="width: 280px"
        @input="onSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" :icon="Plus" @click="openCreate">Nouvelle spécialité</el-button>
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
      :header-cell-style="{ background: '#0E5C5B', color: '#ffffff', fontWeight: 600 }"
      row-key="id"
    >
      <el-table-column prop="code" label="Code" width="130" />
      <el-table-column prop="name" label="Nom" min-width="200" />
      <el-table-column label="Préfixe titre" width="130" align="center">
        <template #default="{ row }">
          <el-tag size="small" type="info">{{ row.title_prefix }}</el-tag>
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

    <el-empty v-if="!loading && filteredList.length === 0" description="Aucune spécialité" />

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

    <SpecialtyFormDialog ref="dialogRef" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Search, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useSpecialties, type SpecialtyDto } from '@/composables/useSpecialties'

const { specialties, loading, error, fetchSpecialties, deleteSpecialty, toggleSpecialty } = useSpecialties()

const searchQuery = ref('')
const dialogRef = ref<InstanceType<typeof import('./SpecialtyFormDialog.vue').default> | null>(null)

const paginator = reactive({ currPage: 1, pageSize: 10 })

onMounted(async () => {
  await fetchSpecialties()
})

const filteredList = computed(() => {
  let list = specialties.value

  const q = searchQuery.value.toLowerCase()
  if (q) {
    list = list.filter(s =>
      s.code.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.title_prefix.toLowerCase().includes(q)
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

function openEdit(specialty: SpecialtyDto) {
  dialogRef.value?.open(specialty)
}

async function handleToggle(row: SpecialtyDto) {
  await toggleSpecialty(row.id!, !row.is_active)
}

async function handleDelete(row: SpecialtyDto) {
  try {
    await ElMessageBox.confirm(
      `Supprimer la spécialité « ${row.name} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' }
    )
    const success = await deleteSpecialty(row.id!)
    if (success) ElMessage.success('Spécialité supprimée')
  } catch {
    // cancelled or error
  }
}

function onSaved() {
  paginator.currPage = 1
}
</script>

<style scoped>
.spt__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
</style>
