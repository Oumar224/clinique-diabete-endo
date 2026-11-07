<template>
  <div class="cut cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Unités de soins
        </h1>
        <p class="cde-page-sub">
          Unités rattachées aux services médicaux
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
        <div class="cde-filter">
          <span class="cde-filter__label">Service</span>
          <el-select
            v-model="serviceFilter"
            class="cde-toolbar__select"
            placeholder="Tous"
            clearable
            size="small"
            @change="onFilterChange"
          >
            <el-option
              v-for="svc in services"
              :key="svc.id"
              :label="svc.name"
              :value="svc.id!"
            />
          </el-select>
        </div>
        <div class="cde-filter cde-toolbar__search">
          <span class="cde-filter__label">Recherche</span>
          <el-input
            v-model="searchQuery"
            placeholder="Code ou nom…"
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
          Nouvelle unité
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
        <el-table-column label="Service" width="200">
          <template #default="{ row }">
            <span :class="{ 'cde-muted': !row.service_name }">{{ row.service_name || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="Code" width="120" />
        <el-table-column prop="name" label="Nom" min-width="180" />
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
      Aucune unité de soins.
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ filteredList.length }} unité(s)</span>
      <el-pagination
        v-model:current-page="paginator.currPage"
        v-model:page-size="paginator.pageSize"
        layout="sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        :total="filteredList.length"
      />
    </div>

    <CareUnitFormDialog ref="dialogRef" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Search, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useCareUnits, type CareUnitDto } from '@/composables/useCareUnits'
import { useMedicalServices } from '@/composables/useMedicalServices'

const { units, loading, error, fetchUnits, deleteUnit, toggleUnit } = useCareUnits()
const { services, fetchServices } = useMedicalServices()

const serviceFilter = ref<number | undefined>(undefined)
const searchQuery = ref('')
const dialogRef = ref<InstanceType<typeof import('./CareUnitFormDialog.vue').default> | null>(null)

const paginator = reactive({ currPage: 1, pageSize: 10 })

onMounted(async () => {
  await Promise.all([fetchUnits(), fetchServices()])
})

const filteredList = computed(() => {
  let list = units.value

  if (serviceFilter.value != null) {
    list = list.filter(u => u.service_id === serviceFilter.value)
  }

  const q = searchQuery.value.toLowerCase()
  if (q) {
    list = list.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.code || '').toLowerCase().includes(q) ||
      (u.service_name || '').toLowerCase().includes(q)
    )
  }

  return list
})

const paginatedList = computed(() => {
  const start = (paginator.currPage - 1) * paginator.pageSize
  return filteredList.value.slice(start, start + paginator.pageSize)
})

function onFilterChange() { paginator.currPage = 1 }
function onSearch() { paginator.currPage = 1 }

function openCreate() { dialogRef.value?.open() }

function openEdit(unit: CareUnitDto) { dialogRef.value?.open(unit) }

async function handleToggle(row: CareUnitDto) {
  await toggleUnit(row.id!, !row.is_active)
}

async function handleDelete(row: CareUnitDto) {
  try {
    await ElMessageBox.confirm(
      `Supprimer l'unité de soins « ${row.name} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' }
    )
    const success = await deleteUnit(row.id!)
    if (success) ElMessage.success('Unité de soins supprimée')
  } catch {
    // cancelled or error
  }
}

function onSaved() {
  paginator.currPage = 1
}
</script>
