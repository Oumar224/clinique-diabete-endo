<template>
  <div class="patient-factures cde">
    <PatientPageToolbar v-if="canWrite">
      <el-button type="primary" :icon="Plus" @click="openCreate">Nouvelle facture</el-button>
    </PatientPageToolbar>

    <div class="cde-table-card">
      <el-table v-loading="loading" :data="invoices" style="width:100%" size="small">
        <el-table-column prop="date" label="Date" width="110">
          <template #default="{ row }">
            {{ formatDate(row.date) }}
          </template>
        </el-table-column>
        <el-table-column prop="numero" label="N° Facture" width="160" />
        <el-table-column prop="montant_total" label="Montant" width="120" align="right">
          <template #default="{ row }">
            <span class="cde-amount cde-num">{{ formatCurrency(row.montant_total) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Restant" width="120" align="right">
          <template #default="{ row }">
            <span class="cde-amount cde-num" :class="{ 'cde-danger': row.montant_restant > 0 }">
              {{ formatCurrency(row.montant_restant) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Statut" width="120">
          <template #default="{ row }">
            <span class="cde-badge" :class="statusBadgeClass(row.status)">{{ row.status }}</span>
          </template>
        </el-table-column>
        <!-- `min-width` (et non `width`) : dernière colonne flexible, elle
             absorbe l'espace restant. Element Plus ne stretch pas un tableau
             dont toutes les colonnes ont une largeur fixe. -->
        <el-table-column label="Actions" min-width="150" align="center">
          <template #default="{ row }">
            <el-button text type="primary" :icon="Printer" size="small" aria-label="Imprimer la facture" @click="openPrint(row)" />
            <el-button
              v-if="canWrite && row.status === 'en_attente'"
              text
              type="primary"
              size="small"
              :icon="Edit"
              aria-label="Modifier la facture"
              @click="openEditInvoice(row)"
            />
            <el-button
              v-if="canWrite && row.montant_restant > 0 && row.status !== 'annulé'"
              text
              type="success"
              size="small"
              :icon="Money"
              aria-label="Enregistrer un paiement"
              @click="openPayment(row)"
            />
          </template>
        </el-table-column>
        <template #empty>
          <div class="cde-empty">
            Aucune facture pour ce patient.
          </div>
        </template>
      </el-table>
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ invoices.length }} facture(s)</span>
    </div>

    <InvoiceFormDialog ref="formDialogRef" :patient-id="patientId > 0 ? patientId : null" @created="onCreated" @updated="refresh" />
    <InvoicePaymentDialog ref="paymentDialogRef" @paid="refresh" />
    <InvoicePrintView ref="printDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Plus, Printer, Money, Edit } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { invoices, fetchPatientInvoices, getInvoice } from '@/composables/useInvoices'
import { useAuth } from '@/composables/useAuth'
import { useCurrency } from '@/currency/useCurrency'
import { usePatientContext } from '@/composables/usePatientContext'
import { usePatients } from '@/composables/usePatients'
import InvoiceFormDialog from '@/components/comptabilite/InvoiceFormDialog.vue'
import InvoicePaymentDialog from '@/components/comptabilite/InvoicePaymentDialog.vue'
import InvoicePrintView from '@/components/comptabilite/InvoicePrintView.vue'
import PatientPageToolbar from '@/components/patients/PatientPageToolbar.vue'

const route = useRoute()
const { user } = useAuth()
const canWrite = computed(() => ['COMPTABLE', 'ADMIN', 'SECRETAIRE'].includes(user.value?.role ?? ''))
const { formatCurrency, loadCurrency } = useCurrency()
const { setActivePatient } = usePatientContext()
const { getPatient } = usePatients()
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
  if (!canWrite.value) return
  formDialogRef.value?.open()
}

function openPayment(inv: any) {
  if (!canWrite.value) return
  if (!patientId.value || patientId.value <= 0) {
    ElMessage.error('Patient non valide')
    return
  }
  paymentDialogRef.value?.open(inv)
}

async function openEditInvoice(inv: any) {
  if (!canWrite.value) return
  // Les lignes de liste n'ont ni items ni payments : on recharge le détail.
  const full = inv.id ? await getInvoice(inv.id) : inv
  if (full?.payments?.length) {
    ElMessage.warning('Facture déjà réglée : modification impossible.')
    return
  }
  if (full) formDialogRef.value?.openEdit(full)
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

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'payé': return 'cde-badge--success'
    case 'en_attente': return 'cde-badge--warning'
    case 'partiel': return 'cde-badge--info'
    case 'annulé': return 'cde-badge--danger'
    default: return 'cde-badge--muted'
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}
</script>

<style scoped>
.patient-factures {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
