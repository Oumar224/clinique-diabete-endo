<template>
  <div class="cat cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Actes médicaux
        </h1>
        <p class="cde-page-sub">
          Catalogue des actes et services associés
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
          <span class="cde-filter__label">Service</span>
          <el-select
            v-model="serviceFilter"
            class="cde-toolbar__select"
            placeholder="Tous"
            clearable
            size="small"
            @change="onSearch"
          >
            <el-option
              v-for="s in services"
              :key="s.id"
              :label="s.name"
              :value="s.id!"
            />
          </el-select>
        </div>
      </div>
      <div class="cde-toolbar__actions">
        <el-button type="primary" size="small" :icon="Plus" @click="openCreate">
          Nouvel acte
        </el-button>
      </div>
    </div>

    <div class="cde-table-card">
      <el-table
        v-loading="loading"
        :data="paginatedActs"
        style="width: 100%"
        size="small"
        row-key="id"
        empty-text=""
      >
        <el-table-column prop="code" label="Code" width="130" />
        <el-table-column prop="label" label="Libellé" min-width="250" />
        <el-table-column prop="service_name" label="Service" width="180">
          <template #default="{ row }">
            <span :class="{ 'cde-muted': !row.service_name }">{{ row.service_name || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Actif" width="80" align="center">
          <template #default="{ row }">
            <span class="cde-badge" :class="row.is_active ? 'cde-badge--success' : 'cde-badge--danger'">
              {{ row.is_active ? 'Oui' : 'Non' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="120" align="center">
          <template #default="{ row }">
            <el-button text type="primary" size="small" :icon="Edit" title="Modifier" @click="openEdit(row)" />
            <el-button text type="danger" size="small" :icon="Delete" title="Supprimer" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="!loading && filteredActs.length === 0" class="cde-empty">
      Aucun acte médical.
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ filteredActs.length }} acte(s)</span>
      <el-pagination
        v-model:current-page="paginator.currPage"
        v-model:page-size="paginator.pageSize"
        layout="sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        :total="filteredActs.length"
      />
    </div>

    <MedicalActFormDialog ref="actDialogRef" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Search, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useMedicalActs, type MedicalActDto } from '@/composables/useMedicalActs'
import { useMedicalServices } from '@/composables/useMedicalServices'

const {
  acts, loading, error, fetchActs, deleteAct,
} = useMedicalActs()

const { services, fetchServices } = useMedicalServices()

const search = ref('')
const serviceFilter = ref<number | undefined>(undefined)
const paginator = reactive({ currPage: 1, pageSize: 10 })

const actDialogRef = ref<InstanceType<typeof import('./MedicalActFormDialog.vue').default> | null>(null)

onMounted(async () => {
  await Promise.all([
    fetchActs(),
    fetchServices(),
  ])
})

const filteredActs = computed(() => {
  let list = acts.value
  const q = search.value.toLowerCase()
  if (q) {
    list = list.filter(a => a.code.toLowerCase().includes(q) || a.label.toLowerCase().includes(q))
  }
  if (serviceFilter.value !== undefined) {
    list = list.filter(a => a.service_id === serviceFilter.value)
  }
  return list
})

const paginatedActs = computed(() => {
  const start = (paginator.currPage - 1) * paginator.pageSize
  return filteredActs.value.slice(start, start + paginator.pageSize)
})

function onSearch() {
  paginator.currPage = 1
}

function openCreate() {
  actDialogRef.value?.open()
}

function openEdit(act: MedicalActDto) {
  actDialogRef.value?.open(act)
}

async function handleDelete(row: MedicalActDto) {
  if (row.id == null) {
    ElMessage.error('Impossible de supprimer : identifiant manquant')
    return
  }
  try {
    await ElMessageBox.confirm(
      `Supprimer l'acte « ${row.code} — ${row.label} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' }
    )
    const ok = await deleteAct(row.id)
    if (ok) ElMessage.success('Acte supprimé')
  } catch {
    // cancelled or error
  }
}

function onSaved() {
  paginator.currPage = 1
}
</script>
