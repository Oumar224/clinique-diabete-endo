<template>
  <div class="tt cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Tarifs
        </h1>
        <p class="cde-page-sub">
          Devises et prix unitaires des actes médicaux
        </p>
      </div>
    </header>

    <section class="cde-panel">
      <header class="cde-panel__head">
        <h2 class="cde-panel__title">
          Devise par défaut
        </h2>
      </header>
      <div class="cde-toolbar tt__currency">
        <div class="cde-filters">
          <div class="cde-filter">
            <span class="cde-filter__label">Devise</span>
            <el-select
              v-model="selectedCurrency"
              class="cde-toolbar__select"
              :loading="curLoading"
              size="small"
              @change="handleCurrencyChange"
            >
              <el-option
                v-for="c in currencies"
                :key="c.code"
                :label="`${c.code} — ${c.name} (${c.symbol})`"
                :value="c.code"
              >
                <span>{{ c.code }} — {{ c.name }} ({{ c.symbol }})</span>
                <span class="tt__preview"> {{ formatPrice(12500, c.code) }}</span>
              </el-option>
            </el-select>
          </div>
          <span class="cde-toolbar__meta">
            Aperçu : <strong>{{ formatPrice(12500) }}</strong>
          </span>
        </div>
      </div>
      <p class="cde-muted tt__section-desc">
        Monnaie utilisée par défaut dans l'application.
      </p>
    </section>

    <section class="cde-section">
      <div class="cde-section-head">
        <h2 class="cde-section-title">
          Toutes les devises
        </h2>
        <el-button size="small" :icon="Plus" @click="openCurrencyCreate">
          Ajouter une devise
        </el-button>
      </div>
      <div class="cde-table-card">
        <el-table
          :data="currencies"
          size="small"
          style="width: 100%"
          empty-text=""
        >
          <el-table-column prop="code" label="Code" width="100" />
          <el-table-column prop="name" label="Nom" min-width="140" />
          <el-table-column prop="symbol" label="Symbole" width="80" />
          <el-table-column prop="decimals" label="Décimales" width="100" align="right">
            <template #default="{ row }">
              <span class="cde-num">{{ row.decimals }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Actions" width="100" align="center">
            <template #default="{ row }">
              <el-button text type="primary" size="small" :icon="Edit" title="Modifier" @click="openCurrencyEdit(row)" />
              <el-button text type="danger" size="small" :icon="Delete" title="Supprimer" @click="handleCurrencyDelete(row)" />
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div v-if="currencies.length === 0" class="cde-empty">
        Aucune devise.
      </div>
      <div class="cde-footer">
        <span class="cde-muted">{{ currencies.length }} devise(s)</span>
      </div>
    </section>

    <section class="cde-section">
      <div class="cde-section-head">
        <div>
          <h2 class="cde-section-title">
            Gestion des tarifs
          </h2>
          <span class="cde-muted tt__section-desc">Définir les prix unitaires des actes médicaux par code tarif</span>
        </div>
      </div>

      <div class="cde-toolbar">
        <div class="cde-filters">
          <div class="cde-filter cde-toolbar__search">
            <span class="cde-filter__label">Recherche</span>
            <el-input
              v-model="actSearch"
              placeholder="Code ou libellé…"
              clearable
              size="small"
              @input="onSearch"
            >
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
          </div>
          <div class="cde-filter">
            <span class="cde-filter__label">Service</span>
            <el-select
              v-model="actServiceFilter"
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
          <div class="cde-filter">
            <span class="cde-filter__label">Code tarif</span>
            <el-select
              v-model="codeTarifFilter"
              class="cde-toolbar__select"
              size="small"
            >
              <el-option label="TARIF.STANDARD" value="TARIF.STANDARD" />
              <el-option label="TARIF.VIP" value="TARIF.VIP" />
              <el-option label="TARIF.ASSURANCE" value="TARIF.ASSURANCE" />
            </el-select>
          </div>
        </div>
        <div class="cde-toolbar__actions">
          <el-badge :value="pendingCount" :hidden="pendingCount === 0">
            <el-button
              type="primary"
              size="small"
              :disabled="pendingCount === 0"
              :loading="savingTarifs"
              @click="applyBulkUpdate"
            >
              Appliquer les nouveaux tarifs
            </el-button>
          </el-badge>
        </div>
      </div>

      <div class="cde-table-card">
        <el-table
          v-loading="actsLoading || tarifsLoading"
          :data="paginatedActs"
          style="width: 100%"
          size="small"
          row-key="id"
          empty-text=""
          :row-class-name="rowClassName"
          :expand-row-keys="expandRowKeys"
          @expand-change="onExpandChange"
        >
          <el-table-column type="expand" width="40">
            <template #default="{ row }">
              <PriceHistoryTimeline :history="getHistoryForAct(row.id)" />
            </template>
          </el-table-column>
          <el-table-column prop="code" label="Code" width="130" />
          <el-table-column prop="label" label="Libellé" min-width="200" />
          <el-table-column prop="service_name" label="Service" width="150" />
          <el-table-column label="Prix unitaire" width="180" align="right">
            <template #default="{ row }">
              <el-input-number
                :model-value="getEditedPrice(row.id)"
                :min="0"
                :step="1000"
                controls-position="right"
                style="width: 150px"
                size="small"
                @update:model-value="(v: number | undefined) => onPriceChange(row.id, v ?? 0)"
              />
            </template>
          </el-table-column>
          <el-table-column label="Actions" width="60" align="center">
            <template #default="{ row }">
              <el-button text type="primary" size="small" :icon="Histogram" title="Historique" @click="toggleExpand(row)" />
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div v-if="!actsLoading && !tarifsLoading && paginatedActs.length === 0" class="cde-empty">
        Aucun acte médical.
      </div>

      <div class="cde-footer">
        <span class="cde-muted">{{ filteredActs.length }} acte(s)</span>
        <el-pagination
          v-model:current-page="actPaginator.currPage"
          v-model:page-size="actPaginator.pageSize"
          layout="sizes, prev, pager, next"
          :page-sizes="[10, 20, 50]"
          :total="filteredActs.length"
        />
      </div>
    </section>

    <CurrencyFormDialog ref="currencyDialogRef" @saved="onCurrencySaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Search, Edit, Delete, Histogram } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useCurrencies } from '@/composables/useCurrencies'
import { useMedicalActs } from '@/composables/useMedicalActs'
import { useConfigTarifs } from '@/composables/useConfigTarifs'
import { useMedicalServices } from '@/composables/useMedicalServices'

const {
  currencies, defaultCurrency, loading: curLoading,
  fetchCurrencies, setDefault, deleteCurrency, formatCurrency,
} = useCurrencies()

const {
  acts, loading: actsLoading, fetchActs,
} = useMedicalActs()

const {
  tarifs, loading: tarifsLoading, fetchTarifs, bulkUpdateTarifs, fetchPriceHistory,
} = useConfigTarifs()

const { services, fetchServices } = useMedicalServices()

const selectedCurrency = ref(defaultCurrency.value)

const currencyDialogRef = ref<InstanceType<typeof import('./CurrencyFormDialog.vue').default> | null>(null)

const actSearch = ref('')
const actServiceFilter = ref<number | undefined>(undefined)
const codeTarifFilter = ref('TARIF.STANDARD')
const actPaginator = reactive({ currPage: 1, pageSize: 10 })

const priceHistoryCache = ref<Record<number, any[]>>({})
const loadingHistory = ref<Record<number, boolean>>({})

const edits = ref<Map<number, number>>(new Map())
const savingTarifs = ref(false)

const expandRowKeys = ref<string[]>([])

onMounted(async () => {
  await Promise.all([
    fetchCurrencies(),
    fetchActs(),
    fetchServices(),
    fetchTarifs(undefined, codeTarifFilter.value),
  ])
  selectedCurrency.value = defaultCurrency.value
})

const filteredActs = computed(() => {
  let list = acts.value
  const q = actSearch.value.toLowerCase()
  if (q) {
    list = list.filter(a => a.code.toLowerCase().includes(q) || a.label.toLowerCase().includes(q))
  }
  if (actServiceFilter.value !== undefined) {
    list = list.filter(a => a.service_id === actServiceFilter.value)
  }
  return list
})

const paginatedActs = computed(() => {
  const start = (actPaginator.currPage - 1) * actPaginator.pageSize
  return filteredActs.value.slice(start, start + actPaginator.pageSize)
})

const pendingCount = computed(() => edits.value.size)

function rowClassName({ row }: { row: any }) {
  if (edits.value.has(row.id)) {
    return 'tt__row-modified'
  }
  return ''
}

function getTarifPrice(acteId: number): number {
  const tarif = tarifs.value.find(t => t.acte_id === acteId)
  return tarif?.prix_unitaire ?? 0
}

function getEditedPrice(acteId: number): number {
  if (edits.value.has(acteId)) {
    return edits.value.get(acteId)!
  }
  return getTarifPrice(acteId)
}

function onPriceChange(acteId: number, newPrice: number) {
  const currentPrice = getTarifPrice(acteId)
  if (newPrice === currentPrice) {
    edits.value.delete(acteId)
  } else {
    edits.value.set(acteId, newPrice)
  }
  edits.value = new Map(edits.value)
}

async function applyBulkUpdate() {
  if (pendingCount.value === 0) return
  savingTarifs.value = true
  try {
    const items = Array.from(edits.value.entries()).map(([acte_id, prix_unitaire]) => ({
      acte_id,
      code_tarif: codeTarifFilter.value,
      prix_unitaire,
    }))
    const ok = await bulkUpdateTarifs(items)
    if (ok) {
      ElMessage.success(`${items.length} tarif(s) mis à jour`)
      edits.value = new Map()
      await fetchTarifs(undefined, codeTarifFilter.value)
    }
  } finally {
    savingTarifs.value = false
  }
}

function formatPrice(amount: number, code?: string): string {
  return formatCurrency(amount, code)
}

function onSearch() {
  actPaginator.currPage = 1
}

async function handleCurrencyChange(code: string) {
  await setDefault(code)
  selectedCurrency.value = code
}

function openCurrencyCreate() {
  currencyDialogRef.value?.open()
}

function openCurrencyEdit(currency: any) {
  currencyDialogRef.value?.open(currency)
}

async function handleCurrencyDelete(row: any) {
  try {
    await ElMessageBox.confirm(
      `Supprimer la devise « ${row.code} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' }
    )
    const success = await deleteCurrency(row.code)
    if (success) ElMessage.success('Devise supprimée')
  } catch {
    // cancelled or error
  }
}

function onCurrencySaved() {
  // refetch handled inside composable
}

function onExpandChange(_row: any, expandedRows: any[]) {
  expandRowKeys.value = expandedRows.map((r: any) => String(r.id))
}

function toggleExpand(row: any) {
  const id = String(row.id)
  const idx = expandRowKeys.value.indexOf(id)
  if (idx === -1) {
    expandRowKeys.value.push(id)
  } else {
    expandRowKeys.value.splice(idx, 1)
  }
}

function getHistoryForAct(acteId: number): any[] {
  if (acteId == null) return []
  if (!priceHistoryCache.value[acteId] && !loadingHistory.value[acteId]) {
    loadingHistory.value[acteId] = true
    priceHistoryCache.value[acteId] = []
    fetchPriceHistory(acteId).then(h => {
      priceHistoryCache.value[acteId] = h
    }).finally(() => {
      loadingHistory.value[acteId] = false
    })
  }
  return priceHistoryCache.value[acteId]
}
</script>

<style scoped>
.tt {
  min-width: 0;
  max-width: 100%;
}

.tt__currency {
  padding: 8px 12px 4px;
}

.tt__section-desc {
  display: block;
  margin: 0;
  padding: 0 12px 8px;
  font-size: 11px;
}

.tt__preview {
  font-size: 11px;
  color: var(--cde-muted);
  margin-left: 8px;
}

.tt :deep(.tt__row-modified) {
  background-color: var(--el-color-warning-light-9);
}

.tt :deep(.tt__row-modified:hover > td) {
  background-color: var(--el-color-warning-light-8);
}
</style>
