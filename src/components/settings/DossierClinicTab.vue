<template>
  <div class="dct cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Types de documents
        </h1>
        <p class="cde-page-sub">
          Documents cliniques et actes associés
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
            v-model="search"
            placeholder="Code ou libellé…"
            clearable
            size="small"
            @input="onSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Statut</span>
          <el-radio-group v-model="filterActive" size="small">
            <el-radio-button :label="''">Tous</el-radio-button>
            <el-radio-button :label="'active'">Actifs</el-radio-button>
            <el-radio-button :label="'inactive'">Inactifs</el-radio-button>
          </el-radio-group>
        </div>
      </div>
      <div class="cde-toolbar__actions">
        <el-button type="primary" size="small" :icon="Plus" @click="openCreate">
          Nouveau type
        </el-button>
      </div>
    </div>

    <div class="cde-table-card">
      <el-table
        v-loading="loading"
        :data="paginatedTypes"
        style="width: 100%"
        size="small"
        row-key="id"
        empty-text=""
      >
        <el-table-column prop="code" label="Code" width="130" />
        <el-table-column prop="label" label="Libellé" min-width="200" />
        <el-table-column prop="category" label="Catégorie" width="140">
          <template #default="{ row }">
            <span class="cde-badge cde-badge--muted">{{ row.category }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Acte lié" width="180">
          <template #default="{ row }">
            <span v-if="row.acteLabel">{{ row.acteLabel }}</span>
            <span v-else class="cde-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="Prix" width="120" align="right">
          <template #default="{ row }">
            <span v-if="row.prixUnitaire != null" class="cde-num cde-amount">{{ formatPrice(row.prixUnitaire) }}</span>
            <span v-else class="cde-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="Actif" width="80" align="center">
          <template #default="{ row }">
            <span class="cde-badge" :class="row.isActive ? 'cde-badge--success' : 'cde-badge--danger'">
              {{ row.isActive ? 'Oui' : 'Non' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="120" align="center">
          <template #default="{ row }">
            <el-button text type="primary" size="small" :icon="Edit" title="Modifier" @click="openEdit(row)" />
            <el-button
              text
              :type="row.isActive ? 'danger' : 'success'"
              size="small"
              :icon="row.isActive ? Delete : Check"
              :title="row.isActive ? 'Désactiver' : 'Activer'"
              @click="handleToggleActive(row)"
            />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="!loading && filteredTypes.length === 0" class="cde-empty">
      Aucun type de document.
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ filteredTypes.length }} type(s)</span>
      <el-pagination
        v-model:current-page="paginator.currPage"
        v-model:page-size="paginator.pageSize"
        layout="sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        :total="filteredTypes.length"
      />
    </div>

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
