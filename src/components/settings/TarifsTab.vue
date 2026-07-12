<template>
  <div class="tt">
    <!-- ── Currency Section ── -->
    <div class="tt__section">
      <div class="tt__section-header">
        <div>
          <h2 class="tt__section-title">Devise par défaut</h2>
          <p class="tt__section-desc">Monnaie utilisée par défaut dans l'application</p>
        </div>
        <el-select
          v-model="selectedCurrency"
          :loading="curLoading"
          style="width: 260px"
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
      <p class="tt__preview-line">
        Aperçu du montant par défaut : <strong>{{ formatPrice(12500) }}</strong>
      </p>
    </div>

    <el-divider />

    <div class="tt__section">
      <div class="tt__section-header">
        <h2 class="tt__section-title">Toutes les devises</h2>
        <el-button :icon="Plus" size="small" @click="openCurrencyCreate">Ajouter une devise</el-button>
      </div>
      <el-table
        :data="currencies"
        size="small"
        style="width: 100%; margin-top: 12px"
        border
      >
        <el-table-column prop="code" label="Code" width="100" />
        <el-table-column prop="name" label="Nom" min-width="140" />
        <el-table-column prop="symbol" label="Symbole" width="80" />
        <el-table-column prop="decimals" label="Décimales" width="100" align="center" />
        <el-table-column label="Actions" width="100" align="center">
          <template #default="{ row }">
            <el-button text type="primary" :icon="Edit" size="small" @click="openCurrencyEdit(row)" />
            <el-button text type="danger" :icon="Delete" size="small" @click="handleCurrencyDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-divider />

    <!-- ── Tariff Manager Section ── -->
    <div class="tt__section">
      <div class="tt__section-header">
        <div>
          <h2 class="tt__section-title">Gestion des tarifs</h2>
          <p class="tt__section-desc">Définir les prix unitaires des actes médicaux par code tarif</p>
        </div>
      </div>

      <div class="tt__tariff-toolbar">
        <el-input
          v-model="actSearch"
          placeholder="Rechercher un acte..."
          clearable
          style="width: 260px"
          @input="onSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select
          v-model="actServiceFilter"
          placeholder="Filtrer par service"
          clearable
          style="width: 200px"
          @change="onSearch"
        >
          <el-option
            v-for="s in services"
            :key="s.id"
            :label="s.name"
            :value="s.id!"
          />
        </el-select>
        <el-select v-model="codeTarifFilter" style="width: 200px">
          <el-option label="TARIF.STANDARD" value="TARIF.STANDARD" />
          <el-option label="TARIF.VIP" value="TARIF.VIP" />
          <el-option label="TARIF.ASSURANCE" value="TARIF.ASSURANCE" />
        </el-select>
        <div class="tt__spacer" />
        <el-badge :value="pendingCount" :hidden="pendingCount === 0" class="tt__badge">
          <el-button type="primary" :disabled="pendingCount === 0" :loading="savingTarifs" @click="applyBulkUpdate">
            Appliquer les nouveaux tarifs
          </el-button>
        </el-badge>
      </div>

      <el-table
        v-loading="actsLoading || tarifsLoading"
        :data="paginatedActs"
        style="width: 100%"
        border
        row-key="id"
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
              @update:model-value="(v: number | undefined) => onPriceChange(row.id, v ?? 0)"
              :min="0"
              :step="1000"
              controls-position="right"
              style="width: 150px"
              size="small"
            />
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="60" align="center">
          <template #default="{ row }">
            <el-button text type="primary" :icon="Histogram" size="small" @click="toggleExpand(row)" />
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!actsLoading && !tarifsLoading && paginatedActs.length === 0" description="Aucun acte médical" />

      <el-row justify="center" style="margin-top: 20px">
        <el-pagination
          v-model:current-page="actPaginator.currPage"
          v-model:page-size="actPaginator.pageSize"
          background
          layout="sizes, prev, pager, next"
          :page-sizes="[10, 20, 50]"
          :total="filteredActs.length"
        />
      </el-row>
    </div>

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
.tt__section {
  margin-bottom: 16px;
}

.tt__section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.tt__section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--cd-gray-900);
  margin-bottom: 2px;
}

.tt__section-desc {
  font-size: 13px;
  color: var(--cd-gray-400);
}

.tt__preview {
  font-size: 12px;
  color: var(--cd-gray-400);
  margin-left: 8px;
}

.tt__preview-line {
  margin-top: 10px;
  font-size: 13px;
  color: var(--cd-gray-600);
}

.tt__preview-line strong {
  color: var(--cd-primary);
}

.tt__tariff-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.tt__spacer {
  flex: 1;
}

.tt__badge :deep(.el-badge__content) {
  z-index: 1;
}

.tt :deep(.tt__row-modified) {
  background-color: var(--el-color-warning-light-9);
}

.tt :deep(.tt__row-modified:hover > td) {
  background-color: var(--el-color-warning-light-8);
}
</style>
