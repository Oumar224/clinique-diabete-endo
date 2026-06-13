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
        :header-cell-style="{ background: '#0E5C5B', color: '#ffffff', fontWeight: 600 }"
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

    <!-- ── Acts Section ── -->
    <div class="tt__section">
      <div class="tt__section-header">
        <el-input
          v-model="actSearch"
          placeholder="Rechercher un acte..."
          clearable
          style="width: 260px"
          @input="onActSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select
          :model-value="actServiceFilter"
          @update:model-value="actServiceFilter = $event; onActSearch()"
          placeholder="Filtrer par service"
          clearable
          style="width: 200px"
        >
          <el-option
            v-for="s in services"
            :key="s.id"
            :label="s.name"
            :value="s.id!"
          />
        </el-select>
        <el-button type="primary" :icon="Plus" @click="openActCreate">Nouvel acte</el-button>
      </div>

      <el-table
        v-loading="actsLoading"
        :data="paginatedActs"
        style="width: 100%"
        :header-cell-style="{ background: '#0E5C5B', color: '#ffffff', fontWeight: 600 }"
        row-key="id"
      >
        <el-table-column type="expand" width="40">
          <template #default="{ row }">
            <PriceHistoryTimeline :history="getHistoryForAct(row.id)" />
          </template>
        </el-table-column>
        <el-table-column prop="code" label="Code" width="130" />
        <el-table-column prop="label" label="Libellé" min-width="200" />
        <el-table-column prop="service_name" label="Service" width="150" />
        <el-table-column prop="price" label="Prix" width="130" align="right">
          <template #default="{ row }">
            {{ formatPrice(row.price, row.currency_code) }}
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="120" align="center">
          <template #default="{ row }">
            <el-button text type="primary" :icon="Edit" size="small" @click="openActEdit(row)" />
            <el-button text type="danger" :icon="Delete" size="small" @click="handleActDelete(row)" />
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!actsLoading && filteredActs.length === 0" description="Aucun acte médical" />

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
    <MedicalActFormDialog ref="actDialogRef" @saved="onActSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Search, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useCurrencies } from '@/composables/useCurrencies'
import { useMedicalActs, type ActPriceHistoryDto } from '@/composables/useMedicalActs'
import { useMedicalServices } from '@/composables/useMedicalServices'

const {
  currencies, defaultCurrency, loading: curLoading,
  fetchCurrencies, setDefault, deleteCurrency, formatCurrency,
} = useCurrencies()

const {
  acts, loading: actsLoading, fetchActs, deleteAct, fetchPriceHistory,
} = useMedicalActs()

const { services, fetchServices } = useMedicalServices()

const selectedCurrency = ref(defaultCurrency.value)

const currencyDialogRef = ref<InstanceType<typeof import('./CurrencyFormDialog.vue').default> | null>(null)
const actDialogRef = ref<InstanceType<typeof import('./MedicalActFormDialog.vue').default> | null>(null)

const actSearch = ref('')
const actServiceFilter = ref<number | undefined>(undefined)
const actPaginator = reactive({ currPage: 1, pageSize: 10 })

const priceHistoryCache = ref<Record<number, ActPriceHistoryDto[]>>({})
const loadingHistory = ref<Record<number, boolean>>({})

onMounted(async () => {
  await Promise.all([
    fetchCurrencies(),
    fetchActs(),
    fetchServices(),
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

function formatPrice(amount: number, code?: string): string {
  return formatCurrency(amount, code)
}

function onActSearch() {
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

function openActCreate() {
  actDialogRef.value?.open()
}

function openActEdit(act: any) {
  actDialogRef.value?.open(act)
}

async function handleActDelete(row: any) {
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
    const success = await deleteAct(row.id)
    if (success) ElMessage.success('Acte supprimé')
  } catch {
    // cancelled or error
  }
}

function onActSaved() {
  actPaginator.currPage = 1
}

function getHistoryForAct(actId: number): ActPriceHistoryDto[] {
  if (actId == null) return []
  if (!priceHistoryCache.value[actId] && !loadingHistory.value[actId]) {
    loadingHistory.value[actId] = true
    priceHistoryCache.value[actId] = []
    fetchPriceHistory(actId).then(h => {
      priceHistoryCache.value[actId] = h
    }).finally(() => {
      loadingHistory.value[actId] = false
    })
  }
  return priceHistoryCache.value[actId]
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
</style>
