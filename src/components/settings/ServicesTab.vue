<template>
  <div class="st cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Services
        </h1>
        <p class="cde-page-sub">
          Services médicaux, catégories et sites de rattachement
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
            placeholder="Nom ou catégorie…"
            clearable
            size="small"
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
          Nouveau service
        </el-button>
      </div>
    </div>

    <div v-if="loading && services.length === 0" class="cde-muted st__loading">
      Chargement…
    </div>

    <template v-else>
      <div class="cde-table-card">
        <el-table
          :data="paginatedServices"
          style="width: 100%"
          size="small"
          empty-text=""
        >
          <el-table-column prop="name" label="Nom" min-width="180" />
          <el-table-column prop="category" label="Catégorie" width="140">
            <template #default="{ row }">
              <span class="cde-badge cde-badge--muted">{{ row.category }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Site(s)" width="200">
            <template #default="{ row }">
              <span v-if="row.site_ids && row.site_ids.length > 0">
                <span
                  v-for="siteId in row.site_ids"
                  :key="siteId"
                  class="cde-badge cde-badge--muted st__site"
                >{{ siteName(siteId) }}</span>
              </span>
              <span v-else class="cde-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column prop="duration" label="Durée" width="80" align="right">
            <template #default="{ row }">
              <span v-if="row.duration" class="cde-num">{{ row.duration }} min</span>
              <span v-else class="cde-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="Couleur" width="70" align="center">
            <template #default="{ row }">
              <span
                v-if="row.color"
                class="st__color-swatch"
                :style="{ background: row.color }"
              />
              <span v-else class="cde-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="Statut" width="90" align="center">
            <template #default="{ row }">
              <span class="cde-badge" :class="row.is_active ? 'cde-badge--success' : 'cde-badge--danger'">
                {{ row.is_active ? 'Actif' : 'Inactif' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="Actions" width="130" align="center">
            <template #default="{ row }">
              <el-button text type="primary" size="small" :icon="Edit" title="Modifier" @click="openEdit(row)" />
              <el-button
                text
                :type="row.is_active ? 'warning' : 'success'"
                size="small"
                :icon="row.is_active ? CircleClose : CircleCheck"
                :title="row.is_active ? 'Désactiver' : 'Activer'"
                @click="handleToggle(row)"
              />
              <el-button
                text
                type="danger"
                size="small"
                :icon="Delete"
                title="Supprimer"
                :disabled="isDeleteDisabled(row)"
                @click="handleDelete(row)"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div v-if="filteredServices.length === 0" class="cde-empty">
        Aucun service.
      </div>
    </template>

    <div class="cde-footer">
      <span class="cde-muted">{{ filteredServices.length }} service(s)</span>
      <el-pagination
        v-model:current-page="paginator.currPage"
        v-model:page-size="paginator.pageSize"
        layout="sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        :total="filteredServices.length"
      />
    </div>

    <ServiceFormDialog ref="dialogRef" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Plus, Search, Edit, Delete, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useMedicalServices, type ServiceDto } from '@/composables/useMedicalServices'
import { useSites } from '@/composables/useSites'

const {
  services,
  loading,
  error,
  fetchServices,
  toggleService,
  deleteService,
} = useMedicalServices()

const { sites, fetchSites } = useSites()

const searchQuery = ref('')
const filterActive = ref('')
const dialogRef = ref<InstanceType<typeof import('./ServiceFormDialog.vue').default> | null>(null)
const paginator = reactive({ currPage: 1, pageSize: 10 })

onMounted(async () => {
  await Promise.all([fetchServices(), fetchSites()])
})

const filteredServices = computed(() => {
  let result = services.value

  if (filterActive.value === 'active') {
    result = result.filter(s => s.is_active)
  } else if (filterActive.value === 'inactive') {
    result = result.filter(s => !s.is_active)
  }

  const q = searchQuery.value.toLowerCase().trim()
  if (q) {
    result = result.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    )
  }

  return result
})

const paginatedServices = computed(() => {
  const start = (paginator.currPage - 1) * paginator.pageSize
  return filteredServices.value.slice(start, start + paginator.pageSize)
})

watch(filteredServices, () => {
  paginator.currPage = 1
})

function siteName(siteId: number): string {
  return sites.value.find(s => s.id === siteId)?.name ?? `Site #${siteId}`
}

function isDeleteDisabled(_service: ServiceDto): boolean {
  return false
}

function openCreate() {
  dialogRef.value?.open()
}

function openEdit(service: ServiceDto) {
  dialogRef.value?.open(service)
}

async function handleToggle(row: ServiceDto) {
  if (row.id == null) return
  await toggleService(row.id!, !row.is_active)
}

async function handleDelete(row: ServiceDto) {
  if (row.id == null) return
  try {
    await ElMessageBox.confirm(
      `Supprimer le service « ${row.name} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' },
    )
    const success = await deleteService(row.id!)
    if (success) ElMessage.success('Service supprimé')
  } catch {
    // cancelled or error
  }
}

function onSaved() {
  // Services are refreshed by createService/updateService internally
}
</script>

<style scoped>
.st {
  min-width: 0;
  max-width: 100%;
}

.st__loading {
  padding: 12px 0;
}

.st__site {
  margin-right: 4px;
}

.st__color-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--cde-border);
  vertical-align: middle;
}
</style>
