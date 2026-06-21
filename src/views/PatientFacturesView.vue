<template>
  <div class="patient-factures">
    <div class="patient-factures__header">
      <h3>Factures du patient</h3>
      <el-button type="primary" size="small" :icon="Plus" @click="openCreate">Nouvelle facture</el-button>
    </div>

    <el-table v-loading="loading" :data="invoices" style="width:100%">
      <el-table-column prop="numero" label="N° Facture" width="160" />
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
          <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="150" align="center">
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

    <el-empty v-if="!loading && invoices.length === 0" description="Aucune facture pour ce patient" />

    <InvoiceFormDialog ref="formDialogRef" @created="onCreated" />
    <InvoicePaymentDialog ref="paymentDialogRef" @paid="refresh" />
    <InvoicePrintView ref="printDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Plus, Printer, Money } from '@element-plus/icons-vue'
import { invoices, fetchPatientInvoices } from '@/composables/useInvoices'
import { useCurrency } from '@/currency/useCurrency'
import { usePatientContext } from '@/composables/usePatientContext'
import { getPatient } from '@/composables/usePatients'
import InvoiceFormDialog from '@/components/facturation/InvoiceFormDialog.vue'
import InvoicePaymentDialog from '@/components/facturation/InvoicePaymentDialog.vue'
import InvoicePrintView from '@/components/facturation/InvoicePrintView.vue'

const route = useRoute()
const { formatCurrency, loadCurrency } = useCurrency()
const { setActivePatient } = usePatientContext()
const loading = ref(true)
const patientId = ref(0)
const formDialogRef = ref<InstanceType<typeof InvoiceFormDialog> | null>(null)
const paymentDialogRef = ref<InstanceType<typeof InvoicePaymentDialog> | null>(null)
const printDialogRef = ref<InstanceType<typeof InvoicePrintView> | null>(null)

onMounted(() => {
  loadCurrency()
  loadData()
})

watch(() => route.params.id, () => loadData())

async function loadData() {
  patientId.value = Number(route.params.id)
  if (!patientId.value) return
  loading.value = true
  try {
    const patient = await getPatient(patientId.value)
    if (patient) setActivePatient(patient)
    await fetchPatientInvoices(patientId.value)
  } catch (err) {
    console.error('[PatientFactures] Failed to load patient context:', err)
  } finally {
    loading.value = false
  }
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

function onCreated() {
  loadData()
}

function refresh() {
  fetchPatientInvoices(patientId.value)
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
.patient-factures__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.text-danger {
  color: var(--cd-secondary);
  font-weight: 600;
}
</style>
