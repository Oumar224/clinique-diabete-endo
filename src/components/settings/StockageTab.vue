<template>
  <div class="stk cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Stockages / Conservateurs
        </h1>
        <p class="cde-page-sub">
          Emplacements et champs de localisation des échantillons
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
            v-model="stockageSearch"
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
        <el-button type="primary" size="small" :icon="Plus" @click="openStockageCreate">
          Nouveau stockage
        </el-button>
      </div>
    </div>

    <div class="stk__split">
      <aside class="stk__sidebar">
        <div v-loading="loading" class="stk__sidebar-list">
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
          <div v-if="!loading && filteredStockages.length === 0" class="cde-empty stk__sidebar-empty">
            Aucun stockage.
          </div>
        </div>
      </aside>

      <main class="stk__detail">
        <div v-if="!selectedStockage" class="cde-empty stk__empty-state">
          Sélectionnez un stockage.
        </div>

        <template v-else>
          <div class="stk__detail-header">
            <h2 class="stk__detail-title">{{ selectedStockage.name }}</h2>
            <div class="stk__detail-header-actions">
              <el-button text size="small" :icon="Edit" title="Modifier" @click="openStockageEdit(selectedStockage)" />
              <el-button text size="small" type="danger" :icon="Delete" title="Supprimer" @click="handleDeleteStockage" />
            </div>
          </div>

          <div class="cde-section-head stk__champ-toolbar">
            <h3 class="cde-section-title">
              Champs de localisation
            </h3>
            <el-button type="primary" size="small" :icon="Plus" @click="openCreateChamp">
              Nouveau champ
            </el-button>
          </div>

          <div class="cde-table-card">
            <el-table
              v-loading="champsLoading"
              :data="champs"
              size="small"
              style="width: 100%"
              row-key="id"
              empty-text=""
            >
              <el-table-column prop="cle" label="Clé" width="120" />
              <el-table-column prop="label" label="Label" min-width="180" />
              <el-table-column prop="type" label="Type" width="100">
                <template #default="{ row }">
                  <span class="cde-badge cde-badge--muted">{{ row.type || 'texte' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="sort_order" label="Ordre" width="80" align="right">
                <template #default="{ row }">
                  <span class="cde-num">{{ row.sort_order }}</span>
                </template>
              </el-table-column>
              <el-table-column label="Actions" width="100" align="center">
                <template #default="{ row }">
                  <el-button text type="primary" size="small" :icon="Edit" title="Modifier" @click="openChampEdit(row)" />
                  <el-button text type="danger" size="small" :icon="Delete" title="Supprimer" @click="handleDeleteChamp(row)" />
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div v-if="!champsLoading && champs.length === 0" class="cde-empty">
            Aucun champ de localisation.
          </div>

          <div class="cde-footer">
            <span class="cde-muted">{{ champs.length }} champ(s)</span>
          </div>
        </template>
      </main>
    </div>

    <StockageFormDialog ref="stockageDialogRef" @saved="onStockageSaved" />
    <ChampLocalisationFormDialog ref="champDialogRef" @saved="onChampSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Search, Edit, Delete } from '@element-plus/icons-vue'
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
.stk {
  min-width: 0;
  max-width: 100%;
}

.stk__split {
  display: flex;
  height: calc(100vh - 300px);
  min-height: 360px;
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  overflow: hidden;
}

.stk__sidebar {
  width: 260px;
  min-width: 200px;
  max-width: 380px;
  background: var(--cde-bg);
  border-right: 1px solid var(--cde-border);
  overflow-y: auto;
  flex-shrink: 0;
}

.stk__sidebar-list {
  height: 100%;
}

.stk__sidebar-item {
  padding: 9px 12px;
  cursor: pointer;
  border-left: 2px solid transparent;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.stk__sidebar-item:hover {
  background: var(--cd-gray-50);
}

.stk__sidebar-item.is-active {
  background: var(--cd-gray-50);
  border-left-color: var(--cde-accent);
}

.stk__sidebar-item-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--cd-gray-900);
}

.stk__sidebar-item-code,
.stk__sidebar-item-count {
  font-size: 11px;
  color: var(--cde-muted);
}

.stk__sidebar-empty {
  padding: 12px;
}

.stk__detail {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--cde-bg);
  min-width: 0;
}

.stk__empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.stk__detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--cde-border);
}

.stk__detail-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--cd-gray-900);
}

.stk__detail-header-actions {
  display: flex;
  gap: 2px;
}

.stk__champ-toolbar {
  margin: 0;
}

@media (max-width: 760px) {
  .stk__split {
    flex-direction: column;
    height: auto;
  }

  .stk__sidebar {
    width: 100%;
    max-width: none;
    border-right: 0;
    border-bottom: 1px solid var(--cde-border);
    max-height: 220px;
  }
}
</style>
