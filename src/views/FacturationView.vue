<template>
  <div class="facturation">
    <div class="facturation__header">
      <h1 class="facturation__title">Facturation & Caisse</h1>
      <div class="facturation__actions">
        <el-input
          v-model="searchText"
          placeholder="Rechercher une facture..."
          clearable
          style="width: 280px"
          @input="onSearch"
        >
          <template #prepend><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" :icon="Plus" @click="openCreate">Nouvelle facture</el-button>
      </div>
    </div>

    <div class="facturation__cards">
      <div class="fact-card">
        <span class="fact-card__label">Chiffre d'affaires aujourd'hui</span>
        <span class="fact-card__value">{{ formatCurrency(stats.ca_jour) }}</span>
      </div>
      <div class="fact-card">
        <span class="fact-card__label">En attente de paiement</span>
        <span class="fact-card__value fact-card__value--danger">{{ formatCurrency(stats.en_attente) }}</span>
      </div>
      <div class="fact-card">
        <span class="fact-card__label">Factures émises (mois)</span>
        <span class="fact-card__value">{{ stats.nb_mois }}</span>
      </div>
      <div class="fact-card">
        <span class="fact-card__label">Taux d'encaissement</span>
        <span class="fact-card__value">{{ stats.taux_encaissement }} %</span>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="paginatedList"
      style="width: 100%"
      :header-cell-style="{ background: '#0E5C5B', color: '#ffffff', fontWeight: 600 }"
    >
      <el-table-column prop="numero" label="N° Facture" width="160" />
      <el-table-column label="Patient" width="200">
        <template #default="{ row }">
          {{ row.patient_prenom }} {{ row.patient_nom }}
        </template>
      </el-table-column>
      <el-table-column prop="date" label="Date" width="110">
        <template #default="{ row }">
          {{ formatDate(row.date) }}
        </template>
      </el-table-column>
      <el-table-column prop="montant_total" label="Montant" width="120" align="right">
        <template #default="{ row }">
          {{ formatCurrency(row.montant_total) }}
        </template>
      </el-table-column>
      <el-table-column label="Restant" width="120" align="right">
        <template #default="{ row }">
          <span :class="{ 'text-danger': row.montant_restant > 0 }">
            {{ formatCurrency(row.montant_restant) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="Statut" width="120">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="180" align="center">
        <template #default="{ row }">
          <el-button text type="primary" :icon="Printer" size="small" @click="openPrint(row)" />
          <el-button
            v-if="row.montant_restant > 0 && row.status !== 'annulé'"
            text
            type="success"
            size="small"
            :icon="Money"
            @click="openPayment(row)"
          />
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && filteredList.length === 0" description="Aucune facture" />

    <el-row justify="center" style="margin-top: 20px">
      <el-pagination
        v-model:current-page="paginator.currPage"
        background
        layout="prev, pager, next"
        :page-size="paginator.pageSize"
        :total="filteredList.length"
      />
    </el-row>

    <InvoiceFormDialog ref="formDialogRef" @created="onInvoiceCreated" />
    <InvoicePaymentDialog ref="paymentDialogRef" @paid="refresh" />
    <InvoicePrintView ref="printDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Printer, Search, Money } from '@element-plus/icons-vue'
import { invoices, fetchInvoices, fetchInvoiceStats } from '@/composables/useInvoices'
import type { InvoiceStats } from '@/composables/useInvoices'
import { useCurrency } from '@/currency/useCurrency'
import InvoiceFormDialog from '@/components/facturation/InvoiceFormDialog.vue'
import InvoicePaymentDialog from '@/components/facturation/InvoicePaymentDialog.vue'
import InvoicePrintView from '@/components/facturation/InvoicePrintView.vue'

const { formatCurrency, loadCurrency } = useCurrency()
const loading = ref(true)
const searchText = ref('')
const formDialogRef = ref<InstanceType<typeof InvoiceFormDialog> | null>(null)
const paymentDialogRef = ref<InstanceType<typeof InvoicePaymentDialog> | null>(null)
const printDialogRef = ref<InstanceType<typeof InvoicePrintView> | null>(null)

const stats = reactive<InvoiceStats>({
  ca_jour: 0,
  en_attente: 0,
  nb_mois: 0,
  taux_encaissement: 0,
})

const paginator = reactive({ currPage: 1, pageSize: 10 })

onMounted(async () => {
  await loadCurrency()
  await refresh()
})

const filteredList = computed(() => {
  const q = searchText.value.toLowerCase()
  if (!q) return invoices.value
  return invoices.value.filter(
    (inv) =>
      inv.numero.toLowerCase().includes(q) ||
      (inv.patient_nom?.toLowerCase().includes(q) ?? false) ||
      (inv.patient_prenom?.toLowerCase().includes(q) ?? false)
  )
})

const paginatedList = computed(() => {
  const start = (paginator.currPage - 1) * paginator.pageSize
  return filteredList.value.slice(start, start + paginator.pageSize)
})

async function refresh() {
  loading.value = true
  try {
    await fetchInvoices()
    const s = await fetchInvoiceStats()
    if (s) Object.assign(stats, s)
  } finally {
    loading.value = false
  }
  paginator.currPage = 1
}

function onSearch() {
  paginator.currPage = 1
}

function openCreate() {
  formDialogRef.value?.open()
}

function openPayment(inv: any) {
  paymentDialogRef.value?.open(inv)
}

function openPrint(inv: any) {
  printDialogRef.value?.open(inv)
}

function onInvoiceCreated() {
  refresh()
}

function statusType(status: string): 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'payé': return 'success'
    case 'en_attente': return 'warning'
    case 'partiel': return 'info'
    case 'annulé': return 'danger'
    default: return 'info'
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}
</script>

<style scoped>
.facturation__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.facturation__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--cd-gray-900);
}

.facturation__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.facturation__cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.fact-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 20px;
  background: var(--cd-white);
  border-radius: 10px;
  border: 1px solid var(--cd-gray-200);
}

.fact-card__label {
  font-size: 12px;
  color: var(--cd-gray-400);
}

.fact-card__value {
  font-size: 24px;
  font-weight: 700;
  color: var(--cd-gray-900);
}

.fact-card__value--danger {
  color: var(--cd-secondary);
}

.text-danger {
  color: var(--cd-secondary);
  font-weight: 600;
}
</style>
