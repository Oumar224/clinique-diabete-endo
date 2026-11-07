<template>
  <el-dialog
    v-model="visible"
    title="Reçu de caisse"
    fullscreen
  >
    <div
      v-if="recu"
      id="receipt-print"
      class="print-template"
    >
      <HospitalHeader
        :info="hospitalHeaderInfo"
        :logo="logoSrc"
        doc-title="REÇU"
        :doc-ref="recu.payment.numero_recu ?? ''"
        :doc-date="recu.payment.date_paiement ? `Conakry, le ${formatDate(recu.payment.date_paiement)}` : ''"
      />

      <div class="print-patient">
        <div><strong>Facture N° :</strong> {{ recu.invoice_numero }} du {{ formatDate(recu.invoice_date ?? '') }}</div>
        <div><strong>Patient :</strong> {{ recu.patient_prenom }} {{ recu.patient_nom }}{{ recu.patient_nip ? ` — NIP ${recu.patient_nip}` : '' }}</div>
        <div v-if="recu.assurance_nom">
          <strong>Assurance :</strong> {{ recu.assurance_nom }}
        </div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th>Désignation</th>
            <th style="width:180px;text-align:right">
              Montant
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Paiement facture {{ recu.invoice_numero }} — {{ modeLabel(recu.payment.mode_paiement) }}{{ recu.payment.reference ? ` (Réf : ${recu.payment.reference})` : '' }}</td>
            <td class="print-right">
              <strong>{{ formatCurrency(recu.payment.montant) }}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="print-amount-words">
        <strong>Montant en lettres :</strong>
        <em>{{ recu.montant_lettres ?? montantLettres }}</em>
      </div>

      <div class="print-meta">
        <div><strong>Mode de paiement :</strong> {{ modeLabel(recu.payment.mode_paiement) }}</div>
        <div v-if="recu.payment.reference">
          <strong>Référence :</strong> {{ recu.payment.reference }}
        </div>
        <div><strong>Total facture :</strong> {{ formatCurrency(recu.invoice_total ?? 0) }}</div>
        <div><strong>Reste dû :</strong> {{ formatCurrency(recu.reste_du ?? 0) }}</div>
        <div><strong>Caissier(ère) :</strong> {{ recu.caissier_nom ?? '—' }}</div>
      </div>

      <div class="print-sign">
        <div>
          <strong>Le caissier</strong><br>
          {{ recu.caissier_nom ?? '' }}<br><br>
          Signature :
        </div>
        <div class="print-stamp">
          CACHET DE LA CLINIQUE
        </div>
      </div>

      <div class="print-footer">
        <p>Merci de votre confiance. Présentez ce numéro en cas de réclamation : <strong>{{ recu.payment.numero_recu }}</strong>.</p>
        <p class="print-generated">
          Document généré par CDE — Clinique Diabète &amp; Endocrinologie le {{ generatedAt }}
        </p>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">
        Fermer
      </el-button>
      <el-button
        :icon="Download"
        @click="downloadPdf"
      >
        Télécharger PDF
      </el-button>
      <el-button
        type="primary"
        :icon="Printer"
        @click="print"
      >
        Imprimer
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Printer, Download } from '@element-plus/icons-vue'
import { useCurrency } from '@/currency/useCurrency'
import { fetchRecu, type Recu } from '@/composables/useInvoices'
import { useExport } from '@/composables/useExport'
import { useHospitalInfo } from '@/composables/useHospitalInfo'
import { useLogo } from '@/composables/useLogo'
import HospitalHeader from '@/components/common/HospitalHeader.vue'
import { montantEnLettres } from '@/utils/montant-lettres'

const { formatCurrency } = useCurrency()
const { exportReceiptPdf } = useExport()
const { info: hospitalInfo, loadInfo } = useHospitalInfo()
const { logoUrl } = useLogo()

const visible = ref(false)
const recu = ref<Recu | null>(null)

const hospitalHeaderInfo = computed(() => ({
  name: hospitalInfo.value.name || 'Clinique Diabète & Endocrinologie',
  address: hospitalInfo.value.address || 'Conakry, République de Guinée',
  phone: hospitalInfo.value.phone || '+224 000 00 00 00',
  email: hospitalInfo.value.email || '',
  city: hospitalInfo.value.city || 'Conakry',
  regNumber: hospitalInfo.value.regNumber || '',
}))
const logoSrc = computed(() => logoUrl.value || null)
const montantLettres = computed(() => montantEnLettres(recu.value?.payment.montant ?? 0))
const generatedAt = computed(() =>
  new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
)

async function openByPayment(paymentId: number) {
  await loadInfo()
  recu.value = await fetchRecu({ payment_id: paymentId })
  visible.value = true
}

async function openByNumero(numeroRecu: string) {
  await loadInfo()
  recu.value = await fetchRecu({ numero_recu: numeroRecu })
  visible.value = true
}

function print() {
  window.print()
}

async function downloadPdf() {
  if (!recu.value) return
  if (recu.value.payment.id) await exportReceiptPdf({ payment_id: recu.value.payment.id })
  else if (recu.value.payment.numero_recu) await exportReceiptPdf({ numero_recu: recu.value.payment.numero_recu })
}

function modeLabel(mode?: string): string {
  const labels: Record<string, string> = {
    'espèces': 'Espèces',
    mobile_money: 'Mobile Money',
    carte_bancaire: 'Carte bancaire',
    'chèque': 'Chèque',
    virement: 'Virement',
    assurance: 'Assurance',
    autre: 'Autre',
  }
  return labels[mode ?? ''] ?? mode ?? '—'
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

defineExpose({ openByPayment, openByNumero })
</script>

<style scoped>
.print-template {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  font-family: var(--cd-font-sans, Arial, Helvetica, sans-serif);
  background: #fff;
  border: 1px solid var(--cd-border);
  border-radius: var(--cd-radius-md);
  box-shadow: var(--cd-shadow-sm);
}

.print-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  border-bottom: 3px solid #0E7C7B;
  padding-bottom: 16px;
  margin-bottom: 24px;
}

.print-logo {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: #0E7C7B;
}

.print-header__left p {
  margin: 2px 0;
  font-size: 12px;
  color: #475569;
}

.print-header__right {
  text-align: right;
}

.print-header__right h1 {
  font-size: 26px;
  margin: 0;
  letter-spacing: 3px;
  color: #0F172A;
}

.print-numero {
  font-size: 15px;
  font-weight: 700;
}

.print-patient {
  font-size: 14px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 12px 16px;
}

.print-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
}

.print-table th,
.print-table td {
  border: 1px solid #94A3B8;
  padding: 10px 12px;
  font-size: 13px;
  text-align: left;
}

.print-table th {
  background: #EAF6F5;
  font-weight: 700;
  color: #0A5E5D;
}

.print-right {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.print-amount-words {
  background: #FDF3D7;
  border: 1px solid #C9A227;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 12px;
}

.print-meta {
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.print-sign {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  margin-top: 56px;
  font-size: 13px;
}

.print-stamp {
  border: 2px dashed #0E7C7B;
  border-radius: 12px;
  padding: 16px 24px;
  color: #0E7C7B;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.print-footer {
  margin-top: 40px;
  text-align: center;
  font-size: 12px;
  color: #475569;
  border-top: 1px solid #94A3B8;
  padding-top: 16px;
}

@media print {
  .print-template {
    padding: 0;
    border: none;
    box-shadow: none;
    border-radius: 0;
    max-width: 100%;
  }
  .print-header {
    text-align: center;
  }
  /* Masque le chrome applicatif (sidebar/topbar/boutons/dialog) */
  :deep(.el-dialog__header),
  :deep(.el-dialog__footer) {
    display: none !important;
  }
}
</style>
