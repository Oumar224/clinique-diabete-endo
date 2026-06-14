<template>
  <div class="sit">
    <div class="sit__header">
      <el-input
        v-model="searchQuery"
        placeholder="Rechercher un site..."
        clearable
        style="width: 280px"
        @input="onSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" :icon="Plus" @click="openCreate">Nouveau site</el-button>
    </div>

    <el-alert
      v-if="error"
      type="error"
      :title="error"
      closable
      @close="error = null"
      style="margin-bottom: 16px"
    />

    <el-table
      v-loading="loading"
      :data="paginatedList"
      style="width: 100%"
      :header-cell-style="{ background: '#0E5C5B', color: '#ffffff', fontWeight: 600 }"
      row-key="id"
    >
      <el-table-column prop="name" label="Nom" min-width="180" />
      <el-table-column prop="address" label="Adresse" min-width="200">
        <template #default="{ row }">
          {{ row.address || '—' }}
        </template>
      </el-table-column>
      <el-table-column prop="phone" label="Téléphone" width="140">
        <template #default="{ row }">
          {{ row.phone || '—' }}
        </template>
      </el-table-column>
      <el-table-column prop="email" label="Email" min-width="180">
        <template #default="{ row }">
          {{ row.email || '—' }}
        </template>
      </el-table-column>
      <el-table-column label="Par défaut" width="100" align="center">
        <template #default="{ row }">
          <el-button
            v-if="row.is_default"
            type="warning"
            :icon="StarFilled"
            size="small"
            circle
            disabled
          />
          <el-button
            v-else
            :icon="Star"
            size="small"
            circle
            @click="handleSetDefault(row)"
          />
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
          <el-button text type="primary" :icon="Edit" size="small" @click="openEdit(row)" />
          <el-button text type="danger" :icon="Delete" size="small" @click="handleDelete(row)" />
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && filteredList.length === 0" description="Aucun site" />

    <el-row justify="center" style="margin-top: 20px">
      <el-pagination
        v-model:current-page="paginator.currPage"
        v-model:page-size="paginator.pageSize"
        background
        layout="sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        :total="filteredList.length"
      />
    </el-row>

    <SiteFormDialog ref="dialogRef" @saved="onSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Search, Edit, Delete, Star, StarFilled } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useSites, type SiteDto } from '@/composables/useSites'

const { sites, loading, error, fetchSites, deleteSite, toggleSite, setDefaultSite } = useSites()

const searchQuery = ref('')
const dialogRef = ref<InstanceType<typeof import('./SiteFormDialog.vue').default> | null>(null)

const paginator = reactive({ currPage: 1, pageSize: 10 })

onMounted(async () => {
  await fetchSites()
})

const filteredList = computed(() => {
  let list = sites.value

  const q = searchQuery.value.toLowerCase()
  if (q) {
    list = list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.address && s.address.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q))
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

function openEdit(site: SiteDto) {
  dialogRef.value?.open(site)
}

async function handleToggle(row: SiteDto) {
  await toggleSite(row.id!, !row.is_active)
}

async function handleSetDefault(row: SiteDto) {
  try {
    const result = await setDefaultSite(row.id!)
    if (result) ElMessage.success('Site par défaut défini')
  } catch {
    // error handled in composable
  }
}

async function handleDelete(row: SiteDto) {
  try {
    await ElMessageBox.confirm(
      `Supprimer le site « ${row.name} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' }
    )
    const success = await deleteSite(row.id!)
    if (success) ElMessage.success('Site supprimé')
  } catch {
    // cancelled or error
  }
}

function onSaved() {
  paginator.currPage = 1
}
</script>

<style scoped>
.sit__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
</style>
