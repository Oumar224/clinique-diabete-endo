<template>
  <div class="it cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Assurances
        </h1>
        <p class="cde-page-sub">
          Organismes et taux de prise en charge
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
            placeholder="Nom ou code…"
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
          Nouvelle assurance
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
        <el-table-column prop="code" label="Code" width="140" />
        <el-table-column prop="name" label="Nom" min-width="260" />
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
      Aucune assurance.
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ filteredList.length }} assurance(s)</span>
      <el-pagination
        v-model:current-page="paginator.currPage"
        v-model:page-size="paginator.pageSize"
        layout="sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        :total="filteredList.length"
      />
    </div>

    <InsuranceFormDialog ref="dialogRef" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Search, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useInsurances, type InsuranceDto } from '@/composables/useInsurances'

const { insurances, loading, error, fetchInsurances, updateInsurance, deleteInsurance } = useInsurances()

const searchQuery = ref('')
const dialogRef = ref<InstanceType<typeof import('./InsuranceFormDialog.vue').default> | null>(null)

const paginator = reactive({ currPage: 1, pageSize: 10 })

onMounted(async () => {
  await fetchInsurances()
})

const filteredList = computed(() => {
  let list = insurances.value
  const q = searchQuery.value.toLowerCase()
  if (q) {
    list = list.filter(o =>
      o.name.toLowerCase().includes(q) ||
      o.code.toLowerCase().includes(q)
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

function openEdit(insurance: InsuranceDto) {
  dialogRef.value?.open(insurance)
}

async function handleToggle(row: InsuranceDto) {
  await updateInsurance(row.id!, { is_active: !row.is_active })
}

async function handleDelete(row: InsuranceDto) {
  try {
    await ElMessageBox.confirm(
      `Supprimer l'assurance « ${row.name} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' }
    )
    const success = await deleteInsurance(row.id!)
    if (success) ElMessage.success('Assurance supprimée')
  } catch {
    // cancelled or error
  }
}

function onSaved() {
  paginator.currPage = 1
}
</script>
