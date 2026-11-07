<template>
  <div class="sit cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Sites
        </h1>
        <p class="cde-page-sub">
          Établissements rattachés à la clinique
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
            placeholder="Nom, adresse, email…"
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
        <el-button
          type="primary"
          size="small"
          :icon="Plus"
          @click="openCreate"
        >
          Nouveau site
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
        <el-table-column
          prop="name"
          label="Nom"
          min-width="180"
        />
        <el-table-column
          prop="address"
          label="Adresse"
          min-width="200"
        >
          <template #default="{ row }">
            <span :class="{ 'cde-muted': !row.address }">{{ row.address || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="phone"
          label="Téléphone"
          width="140"
        >
          <template #default="{ row }">
            <span :class="{ 'cde-muted': !row.phone }">{{ row.phone || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="email"
          label="Email"
          min-width="180"
        >
          <template #default="{ row }">
            <span :class="{ 'cde-muted': !row.email }">{{ row.email || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Par défaut"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <span
              v-if="row.is_default"
              class="cde-badge cde-badge--warning"
            >Oui</span>
            <el-button
              v-else
              text
              size="small"
              :icon="Star"
              title="Définir par défaut"
              @click="handleSetDefault(row)"
            />
          </template>
        </el-table-column>
        <el-table-column
          label="Statut"
          width="90"
          align="center"
        >
          <template #default="{ row }">
            <el-switch
              :model-value="row.is_active"
              size="small"
              @change="handleToggle(row)"
            />
          </template>
        </el-table-column>
        <el-table-column
          label="Actions"
          width="110"
          align="center"
        >
          <template #default="{ row }">
            <el-button
              text
              type="primary"
              size="small"
              :icon="Edit"
              title="Modifier"
              @click="openEdit(row)"
            />
            <el-button
              text
              type="danger"
              size="small"
              :icon="Delete"
              title="Supprimer"
              @click="handleDelete(row)"
            />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div
      v-if="!loading && filteredList.length === 0"
      class="cde-empty"
    >
      Aucun site.
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ filteredList.length }} site(s)</span>
      <el-pagination
        v-model:current-page="paginator.currPage"
        v-model:page-size="paginator.pageSize"
        layout="sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        :total="filteredList.length"
      />
    </div>

    <SiteFormDialog
      ref="dialogRef"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Search, Edit, Delete, Star } from '@element-plus/icons-vue'
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
