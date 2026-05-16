<template>
  <el-dialog v-model="visible" title="Aperçu facture" fullscreen>
    <div v-if="invoice" id="invoice-print" class="print-template">
      <div class="print-header">
        <div class="print-header__left">
          <h2>Clinique Diabète & Endocrinologie</h2>
          <p>Adresse de la clinique</p>
          <p>Tél : 000 000 000</p>
        </div>
        <div class="print-header__right">
          <h1>FACTURE</h1>
          <p class="print-numero">{{ invoice.numero }}</p>
          <p>Date : {{ formatDate(invoice.date) }}</p>
        </div>
      </div>

      <div class="print-patient">
        <strong>Patient :</strong>
        <span>{{ invoice.patient_prenom }} {{ invoice.patient_nom }}</span>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th>Désignation</th>
            <th>Type</th>
            <th>Qté</th>
            <th>Prix unitaire</th>
            <th>Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in invoice.items" :key="item.id">
            <td>{{ item.libelle }}</td>
            <td>{{ item.type }}</td>
            <td class="print-right">{{ item.quantite }}</td>
            <td class="print-right">{{ formatCurrency(item.prix_unitaire) }}</td>
            <td class="print-right">{{ formatCurrency(item.montant) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" class="print-right"><strong>Total :</strong></td>
            <td class="print-right"><strong>{{ formatCurrency(invoice.montant_total) }}</strong></td>
          </tr>
          <tr v-if="invoice.montant_restant > 0">
            <td colspan="4" class="print-right">Restant dû :</td>
            <td class="print-right">{{ formatCurrency(invoice.montant_restant) }}</td>
          </tr>
        </tfoot>
      </table>

      <div v-if="invoice.payments && invoice.payments.length > 0" class="print-payments">
        <h3>Paiements</h3>
        <table class="print-table print-table--small">
          <thead>
            <tr>
              <th>Date</th>
              <th>Mode</th>
              <th>Référence</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in invoice.payments" :key="p.id">
              <td>{{ formatDate(p.date_paiement) }}</td>
              <td>{{ p.mode_paiement }}</td>
              <td>{{ p.reference || '—' }}</td>
              <td class="print-right">{{ formatCurrency(p.montant) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="invoice.notes" class="print-notes">
        <strong>Notes :</strong>
        <p>{{ invoice.notes }}</p>
      </div>

      <div class="print-footer">
        <p>Merci de votre confiance.</p>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">Fermer</el-button>
      <el-button type="primary" :icon="Printer" @click="print">Imprimer</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Printer } from '@element-plus/icons-vue'
import { useCurrency } from '@/currency/useCurrency'
import type { Invoice } from '@/composables/useInvoices'

const { formatCurrency } = useCurrency()

const visible = ref(false)
const invoice = ref<Invoice | null>(null)

function open(inv: Invoice) {
  invoice.value = inv
  visible.value = true
}

function print() {
  window.print()
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

defineExpose({ open })
</script>

<style scoped>
.print-template {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Courier New', monospace;
}

.print-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #000;
  padding-bottom: 16px;
  margin-bottom: 24px;
}

.print-header__left h2 {
  font-size: 16px;
  margin: 0 0 4px;
}

.print-header__left p {
  margin: 2px 0;
  font-size: 12px;
  color: #555;
}

.print-header__right {
  text-align: right;
}

.print-header__right h1 {
  font-size: 24px;
  margin: 0;
}

.print-numero {
  font-size: 14px;
  font-weight: 600;
}

.print-patient {
  font-size: 14px;
  margin-bottom: 16px;
}

.print-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
}

.print-table th,
.print-table td {
  border: 1px solid #ccc;
  padding: 8px;
  font-size: 13px;
  text-align: left;
}

.print-table th {
  background: #f5f5f5;
  font-weight: 600;
}

.print-right {
  text-align: right;
}

.print-payments {
  margin-top: 16px;
}

.print-payments h3 {
  font-size: 14px;
  margin-bottom: 8px;
}

.print-table--small th,
.print-table--small td {
  padding: 4px 8px;
  font-size: 12px;
}

.print-notes {
  margin-top: 16px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 4px;
  font-size: 13px;
}

.print-footer {
  margin-top: 40px;
  text-align: center;
  font-size: 12px;
  color: #888;
  border-top: 1px solid #ccc;
  padding-top: 16px;
}

@media print {
  .print-template {
    padding: 0;
  }
}
</style>
