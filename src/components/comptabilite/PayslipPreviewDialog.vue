<template>
  <el-dialog
    v-model="visible"
    title="Fiche de paie"
    fullscreen
  >
    <div
      v-loading="loading"
      class="payslip-preview"
    >
      <div
        v-if="payslip"
        id="payslip-print"
        class="print-template"
      >
        <HospitalHeader
          :info="hospitalHeaderInfo"
          :logo="logoSrc"
          doc-title="FICHE DE PAIE"
          :doc-ref="`PAIE-${payslip.periode}-${payslip.employee.userId}`"
          :doc-date="`Période : ${formatPeriode(payslip.periode)}`"
        />

        <div class="print-patient print-employee">
          <div><strong>Employé :</strong> {{ payslip.employee.prenom }} {{ payslip.employee.nom }}</div>
          <div><strong>Fonction :</strong> {{ payslip.employee.fonction || payslip.employee.role || '—' }}</div>
          <div><strong>Sécurité sociale :</strong> {{ payslip.employee.numeroSecuriteSociale || '—' }}</div>
          <div><strong>Contrat :</strong> {{ payslip.employee.typeContrat || '—' }}</div>
          <div><strong>Temps travaillé :</strong> {{ payslip.employee.tempsTravail === 'PARTIEL' ? 'Temps partiel' : 'Temps plein' }}</div>
        </div>

        <table class="print-table">
          <thead>
            <tr>
              <th>Rubrique</th>
              <th style="width:30%;text-align:center">
                Base / Jours
              </th>
              <th style="width:25%;text-align:right">
                Montant
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Salaire de base</td>
              <td class="print-center">
                —
              </td>
              <td class="print-right">
                <strong>{{ formatCurrency(payslip.base) }}</strong>
              </td>
            </tr>
            <tr
              v-for="(rubrique, index) in payslip.rubriques"
              :key="index"
            >
              <td>
                {{ rubrique.libelle }}
                <span
                  v-if="!rubrique.impactNet"
                  class="print-muted"
                >(informatif)</span>
              </td>
              <td class="print-center">
                {{ rubriqueBase(rubrique) }}
              </td>
              <td class="print-right">
                <strong>{{ formatCurrency(rubrique.montantCalcule) }}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        <table class="print-totals">
          <tbody>
            <tr>
              <td>Total mensuel (toutes rubriques)</td>
              <td>{{ formatCurrency(payslip.totalMensuel) }}</td>
            </tr>
            <tr v-if="payslip.totalInformations > 0">
              <td>dont rubriques informatives (sans impact net)</td>
              <td>{{ formatCurrency(payslip.totalInformations) }}</td>
            </tr>
            <tr class="print-totals__net">
              <td>NET À PAYER</td>
              <td>{{ formatCurrency(payslip.netAPayer) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="print-meta">
          <div v-if="payslip.paiement">
            <strong>Paiement :</strong> {{ modeLabel(payslip.paiement.modePaiement) }} — Payé le {{ formatDateLongue(payslip.paiement.datePaiement) }}
            <template v-if="payslip.paiement.reference">
              — Réf : {{ payslip.paiement.reference }}
            </template>
          </div>
          <div v-else>
            <strong>Paiement :</strong> non réglé à ce jour
          </div>
        </div>

        <div class="print-sign">
          <div>
            <strong>L'employeur</strong><br>
            Nom et signature :
          </div>
          <div>
            <strong>L'employé(e)</strong><br>
            {{ payslip.employee.prenom }} {{ payslip.employee.nom }}<br><br>
            Signature :
          </div>
          <div class="print-stamp">
            CACHET DE LA CLINIQUE
          </div>
        </div>

        <div class="print-footer">
          <p>Fiche de paie {{ formatPeriode(payslip.periode) }} — {{ payslip.employee.prenom }} {{ payslip.employee.nom }}</p>
          <p class="print-generated">
            Document généré par CDE — Clinique Diabète &amp; Endocrinologie le {{ generatedAt }}
          </p>
        </div>
      </div>

      <div
        v-else-if="!loading"
        class="payslip-preview__empty"
      >
        Fiche de paie indisponible.
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">
        Fermer
      </el-button>
      <el-button
        :icon="Download"
        :disabled="!payslip"
        :loading="exportingPdf"
        @click="downloadPdf"
      >
        Télécharger PDF
      </el-button>
      <el-button
        type="primary"
        :icon="Printer"
        :disabled="!payslip"
        @click="print"
      >
        Imprimer
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Download, Printer } from '@element-plus/icons-vue'
import { useSalaires } from '@/composables/useSalaires'
import type { SalairePayslip, SalairePayslipRubrique } from '@/composables/useSalaires'
import { useExport } from '@/composables/useExport'
import { useCurrency } from '@/currency/useCurrency'
import { useHospitalInfo } from '@/composables/useHospitalInfo'
import { useLogo } from '@/composables/useLogo'
import HospitalHeader from '@/components/common/HospitalHeader.vue'
import { formatDateLongue, formatPeriode } from '@/utils/date'

const { fetchPayslip } = useSalaires()
const { exportPayslipPdf, exportingPdf } = useExport()
const { formatCurrency } = useCurrency()
const { info: hospitalInfo, loadInfo } = useHospitalInfo()
const { logoUrl } = useLogo()

const visible = ref(false)
const loading = ref(false)
const payslip = ref<SalairePayslip | null>(null)

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

/** Ouvre l'aperçu avant tout téléchargement. */
async function open(userId: number, periode: string) {
  payslip.value = null
  visible.value = true
  loading.value = true
  try {
    await loadInfo()
    payslip.value = await fetchPayslip(userId, periode)
  } catch {
    // ipcInvoke affiche déjà l'erreur backend ; le dialogue reste ouvert.
  } finally {
    loading.value = false
  }
}

function rubriqueBase(rubrique: SalairePayslipRubrique): string {
  if (rubrique.type !== 'journalier') return formatCurrency(rubrique.montant)
  return `${formatCurrency(rubrique.montantJour ?? 0)} × ${rubrique.jours ?? 0} j`
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

function print() {
  window.print()
}

async function downloadPdf() {
  if (!payslip.value) return
  await exportPayslipPdf({
    userId: payslip.value.employee.userId,
    periode: payslip.value.periode,
  })
}

defineExpose({ open })
</script>

<style scoped>
.payslip-preview {
  min-height: 200px;
}

.payslip-preview__empty {
  padding: 48px;
  text-align: center;
  color: var(--cd-gray-500);
}

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

/* Bloc employé : 5 colonnes égales, une seule ligne, séparateurs réguliers. */
.print-patient.print-employee {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: center;
  gap: 0;
}

.print-employee > div {
  min-width: 0;
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

.print-employee > div:first-child { padding-left: 0; }
.print-employee > div:last-child { border-right: none; padding-right: 0; }

/* Libellés homogènes, façon formulaire administratif : petit label au-dessus de la valeur.
   Le label prend l'accent de la charte pour se détacher nettement de la valeur (donnée). */
.print-employee strong {
  display: block;
  margin-bottom: 3px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--cde-accent-strong, #0A5F5E);
}

@media (max-width: 720px) {
  .print-patient.print-employee {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 10px;
  }

  .print-employee > div:nth-child(2n) { border-right: none; padding-right: 0; }
  .print-employee > div:nth-child(2n+1) { padding-left: 0; }
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

.print-center {
  text-align: center;
}

.print-muted {
  margin-left: 4px;
  font-size: 11px;
  color: #B45309;
}

.print-totals {
  width: 60%;
  margin: 0 0 16px auto;
  border-collapse: collapse;
}

.print-totals td {
  padding: 6px 10px;
  font-size: 13px;
  text-align: right;
}

.print-totals td:first-child {
  text-align: left;
  color: #475569;
}

.print-totals__net td {
  border-top: 2px solid #0E7C7B;
  font-weight: 800;
  font-size: 15px;
  color: #0A5E5D;
  padding-top: 10px;
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

.print-generated {
  color: #94A3B8;
  font-size: 11px;
}

@media print {
  .print-template {
    padding: 0;
    border: none;
    box-shadow: none;
    border-radius: 0;
    max-width: 100%;
  }
}
</style>
