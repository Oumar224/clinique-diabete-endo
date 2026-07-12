<template>
  <div class="stk">
    <!-- Error alert -->
    <el-alert v-if="error" type="error" :title="error" show-icon closable style="margin-bottom: 12px" />

    <!-- Toolbar globale -->
    <div class="stk__toolbar">
      <el-input
        v-model="stockageSearch"
        placeholder="Rechercher un stockage..."
        clearable
        style="width: 240px"
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
      <el-button type="primary" :icon="Plus" @click="openStockageCreate">Nouveau stockage</el-button>
    </div>

    <!-- Split panel -->
    <div class="stk__split">
      <!-- Sidebar : liste des stockages -->
      <aside class="stk__sidebar">
        <div class="stk__sidebar-list" v-loading="loading">
          <div
            v-for="stk in filteredStockages"
            :key="stk.id"
            class="stk__sidebar-item"
            :class="{ 'is-active': selectedStockage?.id === stk.id }"
            @click="selectStockage(stk)"
          >
            <div class="stk__sidebar-item-name">{{ stk.name }}</div>
            <div class="stk__sidebar-item-code">{{ stk.code }}</div>
            <div class="stk__sidebar-item-count">{{ stk.champs_count ?? '?' }} champ(s)</div>
          </div>
          <el-empty
            v-if="!loading && filteredStockages.length === 0"
            :image-size="60"
            description="Aucun stockage"
          />
        </div>
      </aside>

      <!-- Panneau détail -->
      <main class="stk__detail">
        <!-- État vide : aucun stockage sélectionné -->
        <div v-if="!selectedStockage" class="stk__empty-state">
          <el-icon :size="40" color="var(--cd-gray-300)"><FolderOpened /></el-icon>
          <p>Sélectionnez un stockage</p>
        </div>

        <template v-else>
          <!-- En-tête stockage -->
          <div class="stk__detail-header">
            <h2 class="stk__detail-title">{{ selectedStockage.name }}</h2>
            <div class="stk__detail-header-actions">
              <el-button text size="small" :icon="Edit" @click="openStockageEdit(selectedStockage)" />
              <el-button text size="small" type="danger" :icon="Delete" @click="handleDeleteStockage" />
            </div>
          </div>

          <!-- Barre d'outils champs -->
          <div class="stk__champ-toolbar">
            <span class="stk__champ-toolbar-title">Champs de localisation</span>
            <el-button type="primary" size="small" :icon="Plus" @click="openCreateChamp">Nouveau champ</el-button>
          </div>

          <!-- Tableau des champs -->
          <el-table
            v-loading="champsLoading"
            :data="champs"
            size="small"
            style="width: 100%"
            border
            row-key="id"
          >
            <el-table-column prop="cle" label="Clé" width="120" />
            <el-table-column prop="label" label="Label" min-width="180" />
            <el-table-column prop="type" label="Type" width="100">
              <template #default="{ row }">
                {{ row.type || 'texte' }}
              </template>
            </el-table-column>
            <el-table-column prop="sort_order" label="Ordre" width="80" align="center" />
            <el-table-column label="Actions" width="100" align="center">
              <template #default="{ row }">
                <el-button text type="primary" :icon="Edit" size="small" @click="openChampEdit(row)" />
                <el-button text type="danger" :icon="Delete" size="small" @click="handleDeleteChamp(row)" />
              </template>
            </el-table-column>
          </el-table>

          <!-- État vide : aucun champ -->
          <el-empty v-if="!champsLoading && champs.length === 0" description="Aucun champ de localisation" />
        </template>
      </main>
    </div>

    <!-- Dialogues -->
    <StockageFormDialog ref="stockageDialogRef" @saved="onStockageSaved" />
    <ChampLocalisationFormDialog ref="champDialogRef" @saved="onChampSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Search, Edit, Delete, FolderOpened } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useConservateurs, type StockageDto, type ChampLocalisationDto } from '@/composables/useConservateurs'

const {
  stockages, champs, loading, champsLoading, error,
  fetchStockages, fetchChampsByStockage, deleteStockage, deleteChamp,
} = useConservateurs()

/* ---- Filtres & recherche ---- */
const stockageSearch = ref('')
const filterActive = ref('active')
const selectedStockage = ref<StockageDto | null>(null)

/* ---- Références dialogues ---- */
const stockageDialogRef = ref<InstanceType<typeof import('./StockageFormDialog.vue').default> | null>(null)
const champDialogRef = ref<InstanceType<typeof import('./ChampLocalisationFormDialog.vue').default> | null>(null)

onMounted(async () => {
  await fetchStockages()
})

/* ---- Computed filtrés ---- */

const filteredStockages = computed(() => {
  let list = stockages.value ?? []
  const fa = filterActive.value
  if (fa === 'active') {
    list = list.filter(s => s.is_active)
  } else if (fa === 'inactive') {
    list = list.filter(s => !s.is_active)
  }
  const q = stockageSearch.value.toLowerCase()
  if (q) {
    list = list.filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
  }
  return list
})

/* ---- Fonctions ---- */

function onSearch() {
  if (selectedStockage.value && !filteredStockages.value.some(s => s.id === selectedStockage.value?.id)) {
    selectedStockage.value = null
  }
}

async function selectStockage(stk: StockageDto) {
  selectedStockage.value = stk
  await fetchChampsByStockage(stk.id!)
}

/* ---- Stockages ---- */

function openStockageCreate() {
  stockageDialogRef.value?.open()
}

function openStockageEdit(stk: StockageDto) {
  stockageDialogRef.value?.open(stk)
}

async function handleDeleteStockage() {
  if (!selectedStockage.value) return
  try {
    await ElMessageBox.confirm(
      `Supprimer le stockage « ${selectedStockage.value.name} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' }
    )
    const ok = await deleteStockage(selectedStockage.value.id!)
    if (ok) {
      selectedStockage.value = null
    }
  } catch {
    // cancelled or error
  }
}

/* ---- Champs ---- */

function openCreateChamp() {
  champDialogRef.value?.open(null, selectedStockage.value?.id)
}

function openChampEdit(champ: ChampLocalisationDto) {
  champDialogRef.value?.open(champ)
}

async function handleDeleteChamp(champ: ChampLocalisationDto) {
  try {
    await ElMessageBox.confirm(
      `Supprimer le champ « ${champ.label} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' }
    )
    const ok = await deleteChamp(champ.id!, selectedStockage.value?.id)
    if (ok) {
      // Champ deleted
    }
  } catch {
    // cancelled or error
  }
}

/* ---- Callbacks dialogues ---- */

function onStockageSaved() {
  fetchStockages()
  if (selectedStockage.value) {
    const updated = stockages.value.find(s => s.id === selectedStockage.value?.id)
    if (updated) selectedStockage.value = updated
  }
}

function onChampSaved() {
  if (selectedStockage.value) {
    fetchChampsByStockage(selectedStockage.value.id!)
  }
}
</script>

<style scoped>
.stk__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.stk__split {
  display: flex;
  height: calc(100vh - 280px);
  min-height: 400px;
  border: 1px solid var(--cd-gray-200);
  border-radius: 4px;
  overflow: hidden;
}

.stk__sidebar {
  width: 280px;
  min-width: 220px;
  max-width: 400px;
  background: var(--cd-white);
  border-right: 1px solid var(--cd-gray-200);
  overflow-y: auto;
  flex-shrink: 0;
}

.stk__sidebar-list {
  height: 100%;
}

.stk__sidebar-item {
  padding: 10px 14px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.1s ease;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stk__sidebar-item:hover {
  background: var(--cd-gray-100);
}

.stk__sidebar-item.is-active {
  background: var(--cd-primary-light-9);
  border-left-color: var(--cd-primary);
}

.stk__sidebar-item-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--cd-gray-900);
}

.stk__sidebar-item-code {
  font-size: 11px;
  color: var(--cd-gray-500);
}

.stk__sidebar-item-count {
  font-size: 11px;
  color: var(--cd-gray-400);
}

.stk__detail {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background: var(--cd-white);
}

.stk__empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--cd-gray-400);
  font-size: 13px;
}

.stk__detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--cd-gray-200);
}

.stk__detail-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--cd-gray-900);
}

.stk__detail-header-actions {
  display: flex;
  gap: 4px;
}

.stk__champ-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.stk__champ-toolbar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--cd-gray-700);
}
</style>
