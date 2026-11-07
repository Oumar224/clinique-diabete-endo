<template>
  <div class="cot cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Mécanismes de contact
        </h1>
        <p class="cde-page-sub">
          Origines et canaux d'acquisition des patients
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
            placeholder="Valeur ou libellé…"
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
          Nouveau mécanisme
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
        <el-table-column prop="value" label="Valeur" width="160" />
        <el-table-column prop="label" label="Libellé" min-width="220" />
        <el-table-column prop="sort_order" label="Ordre" width="80" align="right">
          <template #default="{ row }">
            <span class="cde-num">{{ row.sort_order }}</span>
          </template>
        </el-table-column>
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
            <el-button text type="primary" size="small" :icon="Edit" title="Modifier" @click="openEdit(row)" />
            <el-button text type="danger" size="small" :icon="Delete" title="Supprimer" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="!loading && filteredList.length === 0" class="cde-empty">
      Aucun mécanisme de contact.
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ filteredList.length }} mécanisme(s)</span>
      <el-pagination
        v-model:current-page="paginator.currPage"
        v-model:page-size="paginator.pageSize"
        layout="sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        :total="filteredList.length"
      />
    </div>

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
