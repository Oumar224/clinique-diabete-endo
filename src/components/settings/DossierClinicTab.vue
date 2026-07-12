<template>
  <div class="dct">
    <el-alert v-if="error" type="error" :title="error" show-icon closable style="margin-bottom: 12px" />

    <div class="dct__toolbar">
      <el-input
        v-model="search"
        placeholder="Rechercher un type de document..."
        clearable
        style="width: 260px"
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
      <el-button type="primary" :icon="Plus" @click="openCreate">Nouveau type</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="paginatedTypes"
      style="width: 100%"
      border
      row-key="id"
    >
      <el-table-column prop="code" label="Code" width="130" />
      <el-table-column prop="label" label="Libellé" min-width="200" />
      <el-table-column prop="category" label="Catégorie" width="140" />
      <el-table-column label="Acte lié" width="180">
        <template #default="{ row }">
          <span v-if="row.acteLabel" class="dct__acte-badge">
            <el-tag size="small" effect="plain" type="warning">
              {{ row.acteLabel }}
            </el-tag>
          </span>
          <span v-else class="dct__none">&mdash;</span>
        </template>
      </el-table-column>
      <el-table-column label="Prix" width="120" align="right">
        <template #default="{ row }">
          {{ row.prixUnitaire != null ? formatPrice(row.prixUnitaire) : '&mdash;' }}
        </template>
      </el-table-column>
      <el-table-column label="Actif" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
            {{ row.isActive ? 'Oui' : 'Non' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="120" align="center">
        <template #default="{ row }">
          <el-button text type="primary" :icon="Edit" size="small" @click="openEdit(row)" />
          <el-button
            text
            :type="row.isActive ? 'danger' : 'success'"
            :icon="row.isActive ? Delete : Check"
            size="small"
            @click="handleToggleActive(row)"
          />
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && filteredTypes.length === 0" description="Aucun type de document" />

    <el-row justify="center" style="margin-top: 20px">
      <el-pagination
        v-model:current-page="paginator.currPage"
        v-model:page-size="paginator.pageSize"
        background
        layout="sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        :total="filteredTypes.length"
      />
    </el-row>

    <DocumentTypeFormDialog ref="formDialogRef" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Search, Edit, Delete, Check } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { ipcInvoke } from '@/utils/ipc'
import { useCurrencies } from '@/composables/useCurrencies'
import type { ClinicalDocumentTypeDTO } from '@/composables/useClinicalDocuments'
import DocumentTypeFormDialog from './DocumentTypeFormDialog.vue'

const { formatCurrency } = useCurrencies()

function formatPrice(amount: number): string {
  return formatCurrency(amount)
}

const allTypes = ref<ClinicalDocumentTypeDTO[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const search = ref('')
const filterActive = ref('')

const paginator = reactive({ currPage: 1, pageSize: 10 })
const formDialogRef = ref<InstanceType<typeof DocumentTypeFormDialog> | null>(null)

const filteredTypes = computed(() => {
  let list = allTypes.value
  const q = search.value.toLowerCase()
  if (q) {
    list = list.filter(t => t.label.toLowerCase().includes(q) || t.code.toLowerCase().includes(q))
  }
  if (filterActive.value === 'active') {
    list = list.filter(t => t.isActive)
  } else if (filterActive.value === 'inactive') {
    list = list.filter(t => !t.isActive)
  }
  return list
})

const paginatedTypes = computed(() => {
  const start = (paginator.currPage - 1) * paginator.pageSize
  return filteredTypes.value.slice(start, start + paginator.pageSize)
})

onMounted(async () => {
  await loadTypes()
})

async function loadTypes() {
  loading.value = true
  error.value = null
  try {
    allTypes.value = await ipcInvoke<ClinicalDocumentTypeDTO[]>('clinical-documents:get-all-types')
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

function onSearch() {
  paginator.currPage = 1
}

function openCreate() {
  formDialogRef.value?.open()
}

function openEdit(row: ClinicalDocumentTypeDTO) {
  formDialogRef.value?.open(row)
}

async function handleToggleActive(row: ClinicalDocumentTypeDTO) {
  const action = row.isActive ? 'désactiver' : 'réactiver'
  try {
    await ElMessageBox.confirm(
      `${action.charAt(0).toUpperCase() + action.slice(1)} le type « ${row.label} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Confirmer', cancelButtonText: 'Annuler' },
    )
    await ipcInvoke('clinical-documents:update-type', {
      id: row.id,
      isActive: !row.isActive,
    })
    ElMessage.success(`Type ${action === 'désactiver' ? 'désactivé' : 'réactivé'}`)
    await loadTypes()
  } catch {
    // cancelled or error
  }
}

function onSaved() {
  loadTypes()
}
</script>

<style scoped>
.dct__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.dct__acte-badge {
  font-size: 12px;
}

.dct__none {
  color: var(--el-text-color-secondary);
}
</style>
