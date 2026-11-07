<template>
  <div class="spt cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Spécialités
        </h1>
        <p class="cde-page-sub">
          Spécialités médicales et préfixes de titre
        </p>
      </div>
    </header>

    <el-alert
      v-if="error"
      class="cde-alert cde-alert--danger"
      type="error"
      :title="error"
      :closable="true"
      @close="error = null"
    />

    <div class="cde-toolbar">
      <div class="cde-filters">
        <div class="cde-filter cde-toolbar__search">
          <span class="cde-filter__label">Recherche</span>
          <el-input
            v-model="searchQuery"
            placeholder="Rechercher…"
            clearable
            size="small"
            @input="onSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </div>
      <div class="cde-toolbar__actions">
        <el-button type="primary" size="small" :icon="Plus" @click="openCreate">
          Nouvelle spécialité
        </el-button>
      </div>
    </div>

    <div class="cde-table-card">
      <el-table
        v-loading="loading"
        :data="paginatedList"
        style="width: 100%"
        size="small"
        row-key="id"
        empty-text=""
      >
        <el-table-column prop="code" label="Code" width="130" />
        <el-table-column prop="name" label="Nom" min-width="200" />
        <el-table-column label="Préfixe titre" width="130" align="center">
          <template #default="{ row }">
            <span class="cde-badge cde-badge--muted">{{ row.title_prefix }}</span>
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
            <el-button text type="primary" size="small" :icon="Edit" title="Modifier" @click="openEdit(row)" />
            <el-button text type="danger" size="small" :icon="Delete" title="Supprimer" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="!loading && filteredList.length === 0" class="cde-empty">
      Aucune spécialité.
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ filteredList.length }} élément(s)</span>
      <el-pagination
        v-model:current-page="paginator.currPage"
        v-model:page-size="paginator.pageSize"
        layout="sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        :total="filteredList.length"
      />
    </div>

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
