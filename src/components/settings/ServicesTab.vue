<template>
  <div class="st">
    <div class="st__header">
      <el-input
        v-model="searchQuery"
        placeholder="Rechercher un service..."
        clearable
        style="width: 280px"
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
      <el-button type="primary" :icon="Plus" @click="openCreate">
        Nouveau service
      </el-button>
    </div>

    <el-alert
      v-if="error"
      type="error"
      :title="error"
      closable
      @close="error = null"
      style="margin-bottom: 16px"
    />

    <div v-if="loading && services.length === 0" class="st__loading">
      <el-skeleton :rows="5" animated />
    </div>

    <el-table
      v-else-if="filteredServices.length > 0"
      :data="filteredServices"
      style="width: 100%"
      stripe
      size="small"
    >
      <el-table-column prop="name" label="Nom" min-width="180" />

      <el-table-column prop="category" label="Catégorie" width="140">
        <template #default="{ row }">
          <el-tag size="small" :type="categoryTagType(row.category)">
            {{ row.category }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="Site(s)" width="200">
        <template #default="{ row }">
          <span v-if="row.site_ids && row.site_ids.length > 0">
            <el-tag
              v-for="siteId in row.site_ids"
              :key="siteId"
              size="small"
              type="info"
              style="margin-right: 4px"
            >
              {{ siteName(siteId) }}
            </el-tag>
          </span>
          <span v-else class="st__no-sites">—</span>
        </template>
      </el-table-column>

      <el-table-column prop="duration" label="Durée" width="80" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.duration" size="small" type="info">
            {{ row.duration }} min
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="Couleur" width="70" align="center">
        <template #default="{ row }">
          <span
            v-if="row.color"
            class="st__color-swatch"
            :style="{ background: row.color }"
          />
        </template>
      </el-table-column>

      <el-table-column prop="is_active" label="Statut" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
            {{ row.is_active ? 'Actif' : 'Inactif' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="Actions" width="130" align="center" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" :icon="Edit" size="small" @click="openEdit(row)" />
          <el-button
            text
            :type="row.is_active ? 'warning' : 'success'"
            :icon="row.is_active ? CircleClose : CircleCheck"
            size="small"
            @click="handleToggle(row)"
          />
          <el-button
            text
            type="danger"
            :icon="Delete"
            size="small"
            :disabled="isDeleteDisabled(row)"
            @click="handleDelete(row)"
          />
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-else-if="!loading" description="Aucun service">
      <el-button type="primary" :icon="Plus" @click="openCreate">
        Créer le premier service
      </el-button>
    </el-empty>

    <ServiceFormDialog ref="dialogRef" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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

function siteName(siteId: number): string {
  return sites.value.find(s => s.id === siteId)?.name ?? `Site #${siteId}`
}

function categoryTagType(category: string): 'primary' | 'success' | 'warning' | 'info' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'info'> = {
    Consultation: 'primary',
    Hospitalisation: 'success',
    Soins: 'warning',
    Technique: 'info',
    Radiologie: 'info',
    Laboratoire: 'info',
    Rééducation: 'warning',
    Administration: 'info',
  }
  return map[category] ?? 'info'
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
.st__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.st__loading {
  padding: 20px;
}

.st__color-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--cd-gray-200, #e4e7ed);
  vertical-align: middle;
}

.st__no-sites {
  color: var(--el-text-color-placeholder, #c0c4cc);
  font-size: 12px;
}
</style>
