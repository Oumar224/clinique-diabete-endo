<template>
  <div class="fct cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Fonctions
        </h1>
        <p class="cde-page-sub">
          Fonctions du personnel
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
          Nouvelle fonction
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
        <el-table-column prop="name" label="Nom" min-width="200" />
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
      Aucune fonction.
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

    <FonctionFormDialog ref="dialogRef" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Search, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useFonctions, type FonctionDto } from '@/composables/useFonctions'

const { fonctions, loading, error, fetchFonctions, deleteFonction, toggleFonction } = useFonctions()

const searchQuery = ref('')
const dialogRef = ref<InstanceType<typeof import('./FonctionFormDialog.vue').default> | null>(null)

const paginator = reactive({ currPage: 1, pageSize: 10 })

onMounted(async () => {
  await fetchFonctions()
})

const filteredList = computed(() => {
  let list = fonctions.value

  const q = searchQuery.value.toLowerCase()
  if (q) {
    list = list.filter(s =>
      s.name.toLowerCase().includes(q)
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

function openEdit(fonction: FonctionDto) {
  dialogRef.value?.open(fonction)
}

async function handleToggle(row: FonctionDto) {
  await toggleFonction(row.id!)
}

async function handleDelete(row: FonctionDto) {
  try {
    await ElMessageBox.confirm(
      `Supprimer la fonction « ${row.name} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' }
    )
    const success = await deleteFonction(row.id!)
    if (success) ElMessage.success('Fonction supprimée')
  } catch {
    // cancelled or error
  }
}

function onSaved() {
  paginator.currPage = 1
}
</script>
