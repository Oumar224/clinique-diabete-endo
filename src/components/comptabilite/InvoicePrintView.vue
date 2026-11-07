<template>
  <el-dialog
    v-model="visible"
    title="Aperçu facture"
    fullscreen
  >
    <div
      v-if="invoice"
      id="invoice-print"
      class="print-template"
    >
      <HospitalHeader
        :info="hospitalHeaderInfo"
        :logo="logoSrc"
        doc-title="FACTURE"
        :doc-ref="invoice.numero ?? ''"
        :doc-date="invoice.date ? `Date : ${formatDateLongue(invoice.date)}` : ''"
      />

      <div class="print-patient print-invoice-meta">
        <div><strong>Patient :</strong> {{ invoice.patient_prenom }} {{ invoice.patient_nom }}</div>
        <div><strong>IP :</strong> {{ invoice.patient_nip || invoice.patient_id || '—' }}</div>
        <div v-if="invoice.assurance_nom">
          <strong>Assurance :</strong> {{ invoice.assurance_nom }}
        </div>
        <div v-if="invoice.mode_paiement">
          <strong>Mode :</strong> {{ modeLabel(invoice.mode_paiement) }}
        </div>
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
          <tr
            v-for="item in detailed?.items ?? invoice.items"
            :key="item.id"
          >
            <td>{{ item.libelle }}</td>
            <td>{{ typeLabel(item.type) }}</td>
            <td class="print-right">
              {{ item.quantite }}
            </td>
            <td class="print-right">
              {{ formatCurrency(item.prix_unitaire) }}
            </td>
            <td class="print-right">
              {{ formatCurrency(item.montant) }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td
              colspan="4"
              class="print-right"
            >
              Sous-total :
            </td>
            <td class="print-right">
              {{ formatCurrency(sousTotal) }}
            </td>
          </tr>
          <tr v-if="(detailed?.remise_pct ?? invoice.remise_pct ?? 0) > 0">
            <td
              colspan="4"
              class="print-right"
            >
              Remise ({{ detailed?.remise_pct ?? invoice.remise_pct }} %) :
            </td>
            <td class="print-right">
              −{{ formatCurrency(remiseMontant) }}
            </td>
          </tr>
          <tr v-if="(detailed?.tva_pct ?? invoice.tva_pct ?? 0) > 0">
            <td
              colspan="4"
              class="print-right"
            >
              TVA ({{ detailed?.tva_pct ?? invoice.tva_pct }} %) :
            </td>
            <td class="print-right">
              +{{ formatCurrency(tvaMontant) }}
            </td>
          </tr>
          <tr>
            <td
              colspan="4"
              class="print-right"
            >
              <strong>Total TTC :</strong>
            </td>
            <td class="print-right">
              <strong>{{ formatCurrency(detailed?.montant_total ?? invoice.montant_total) }}</strong>
            </td>
          </tr>
          <tr v-if="detailed?.assurance_id || invoice.assurance_id">
            <td
              colspan="4"
              class="print-right"
            >
              Part assurance :
            </td>
            <td class="print-right">
              {{ formatCurrency(detailed?.part_assurance ?? invoice.part_assurance ?? 0) }}
            </td>
          </tr>
          <tr v-if="detailed?.assurance_id || invoice.assurance_id">
            <td
              colspan="4"
              class="print-right"
            >
              <strong>Part patient :</strong>
            </td>
            <td class="print-right">
              <strong>{{ formatCurrency(detailed?.part_patient ?? invoice.part_patient ?? invoice.montant_total) }}</strong>
            </td>
          </tr>
          <tr v-if="(detailed?.montant_restant ?? invoice.montant_restant) > 0">
            <td
              colspan="4"
              class="print-right"
            >
              Restant dû :
            </td>
            <td class="print-right">
              {{ formatCurrency(detailed?.montant_restant ?? invoice.montant_restant) }}
            </td>
          </tr>
        </tfoot>
      </table>

      <div class="print-amount-words">
        <strong>Arrêtée la présente facture à la somme de :</strong>
        <em>{{ montantLettres }}</em>
      </div>

      <div
        v-if="detailed?.payments && detailed.payments.length > 0"
        class="print-payments"
      >
        <h3>Paiements & reçus</h3>
        <table class="print-table print-table--small">
          <thead>
            <tr>
              <th>Date</th>
              <th>Reçu N°</th>
              <th>Mode</th>
              <th>Référence</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in detailed.payments"
              :key="p.id"
            >
              <td>{{ formatDate(p.date_paiement) }}</td>
              <td>{{ p.numero_recu || '—' }}</td>
              <td>{{ modeLabel(p.mode_paiement) }}</td>
              <td>{{ p.reference || '—' }}</td>
              <td class="print-right">
                {{ formatCurrency(p.montant) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="!isRichTextEmpty(detailed?.notes ?? invoice.notes)"
        class="print-notes"
      >
        <strong>Notes :</strong>
        <p v-html="detailed?.notes ?? invoice.notes" />
      </div>

      <div class="print-sign">
        <div>Le caissier<br><br>Signature :</div>
        <div class="print-stamp">
          CACHET DE LA CLINIQUE
        </div>
      </div>

      <div class="print-footer">
        <p>Merci de votre confiance.</p>
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
        @click="downloadExcel"
      >
        Excel
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
import type { Invoice } from '@/composables/useInvoices'
import { getInvoice } from '@/composables/useInvoices'
import { useExport } from '@/composables/useExport'
import { useHospitalInfo } from '@/composables/useHospitalInfo'
import { useLogo } from '@/composables/useLogo'
import HospitalHeader from '@/components/common/HospitalHeader.vue'
import { montantEnLettres } from '@/utils/montant-lettres'
import { isRichTextEmpty } from '@/utils/rich-text'
import { formatDate, formatDateLongue } from '@/utils/date'

const { formatCurrency } = useCurrency()
const { exportInvoicesExcel } = useExport()
const { info: hospitalInfo, loadInfo } = useHospitalInfo()
const { logoUrl } = useLogo()

const visible = ref(false)
const invoice = ref<Invoice | null>(null)
const detailed = ref<Invoice | null>(null)

const hospitalHeaderInfo = computed(() => ({
  name: hospitalInfo.value.name || 'Clinique Diabète & Endocrinologie',
  address: hospitalInfo.value.address || 'Conakry, République de Guinée',
  phone: hospitalInfo.value.phone || '+224 000 00 00 00',
  email: hospitalInfo.value.email || '',
  city: hospitalInfo.value.city || 'Conakry',
  regNumber: hospitalInfo.value.regNumber || '',
}))
const logoSrc = computed(() => logoUrl.value || null)
const generatedAt = computed(() =>
  new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
)

const sousTotal = computed(() => (detailed.value?.items ?? invoice.value?.items ?? []).reduce((s, i) => s + (i.quantite * i.prix_unitaire), 0))
const remiseMontant = computed(() => (sousTotal.value * ((detailed.value?.remise_pct ?? invoice.value?.remise_pct ?? 0))) / 100)
const tvaMontant = computed(() => ((sousTotal.value - remiseMontant.value) * ((detailed.value?.tva_pct ?? invoice.value?.tva_pct ?? 0))) / 100)
const montantLettres = computed(() => montantEnLettres(Math.round(detailed.value?.montant_total ?? invoice.value?.montant_total ?? 0)))

async function open(inv: Invoice) {
  invoice.value = inv
  detailed.value = inv
  await loadInfo()
  visible.value = true
  if (inv.id) {
    const full = await getInvoice(inv.id)
    if (full) detailed.value = full
  }
}

function print() {
  window.print()
}

async function downloadExcel() {
  await exportInvoicesExcel({ search: invoice.value?.numero })
}

function typeLabel(t?: string): string {
  const m: Record<string, string> = { consultation: 'Consultation', acte: 'Acte', medicament: 'Médicament', autre: 'Autre' }
  return m[t ?? ''] ?? t ?? '—'
}

function modeLabel(mode?: string | null): string {
  const labels: Record<string, string> = {
    'espèces': 'Espèces',
    especes: 'Espèces',
    mobile_money: 'Mobile Money',
    carte_bancaire: 'Carte bancaire',
    'chèque': 'Chèque',
    virement: 'Virement',
    assurance: 'Assurance',
    autre: 'Autre',
  }
  return labels[mode ?? ''] ?? mode ?? '—'
}

defineExpose({ open })
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

.print-header__left h2 {
  font-size: 18px;
  margin: 0 0 4px;
  color: #0E7C7B;
  letter-spacing: -0.01em;
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
  font-size: 24px;
  margin: 0;
  letter-spacing: 3px;
  color: #0F172A;
}

.print-numero {
  font-size: 14px;
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

/* Informations facture sur une seule ligne, réparties sur la largeur (cf. fiche de paie). */
.print-patient.print-invoice-meta {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 0;
}

.print-invoice-meta > div {
  flex: 1 1 0;
  min-width: 150px;
  padding: 0 14px;
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1.35;
  color: #0F172A;
  border-right: 1px solid var(--cd-border, #E2E8F0);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.print-invoice-meta > div:first-child {
  padding-left: 0;
}

.print-invoice-meta > div:last-child {
  border-right: none;
  padding-right: 0;
}

.print-invoice-meta strong {
  display: block;
  margin-bottom: 3px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--cde-accent-strong, #0A5F5E);
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

.print-payments {
  margin-top: 16px;
}

.print-payments h3 {
  font-size: 14px;
  margin-bottom: 8px;
}

.print-table--small th,
.print-table--small td {
  padding: 6px 10px;
  font-size: 12px;
}

.print-notes {
  margin-top: 16px;
  padding: 12px 16px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  font-size: 13px;
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
  padding: 12px 20px;
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
  :deep(.el-dialog__header),
  :deep(.el-dialog__footer) {
    display: none !important;
  }
}
</style>
