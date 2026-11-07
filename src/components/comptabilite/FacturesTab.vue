<template>
  <div class="factures cde">
    <div class="cde-toolbar">
      <div class="cde-filters">
        <div class="cde-filter cde-toolbar__search">
          <span class="cde-filter__label">Recherche</span>
          <el-input
            v-model="searchText"
            placeholder="N° facture, patient, reçu…"
            clearable
            :prefix-icon="Search"
            aria-label="Rechercher une facture"
            @input="onSearch"
          />
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Statut</span>
          <el-select
            v-model="statusFilter"
            class="cde-toolbar__select"
            clearable
            placeholder="Tous"
            aria-label="Filtrer par statut"
            @change="refresh"
          >
            <el-option
              label="En attente"
              value="en_attente"
            />
            <el-option
              label="Partiel"
              value="partiel"
            />
            <el-option
              label="Payé"
              value="payé"
            />
            <el-option
              label="Annulé"
              value="annulé"
            />
          </el-select>
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Du</span>
          <el-date-picker
            v-model="dateDebut"
            class="cde-toolbar__date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="Date début"
            aria-label="Date début"
            @change="refresh"
          />
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Au</span>
          <el-date-picker
            v-model="dateFin"
            class="cde-toolbar__date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="Date fin"
            aria-label="Date fin"
            @change="refresh"
          />
        </div>
      </div>
      <div class="cde-toolbar__actions">
        <el-button
          :icon="Download"
          :loading="exportingExcel"
          @click="onExportExcel"
        >
          Exporter
        </el-button>
        <el-button
          v-if="canWrite"
          type="primary"
          :icon="Plus"
          @click="openCreate"
        >
          Nouvelle facture
        </el-button>
      </div>
    </div>

    <section
      class="cde-summary"
      aria-label="Indicateurs de facturation"
    >
      <div class="cde-summary__item">
        <span class="cde-summary__label">CA encaissé</span>
        <span class="cde-summary__value">{{ formatCurrency(stats.ca_jour) }}</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">CA semaine</span>
        <span class="cde-summary__value">{{ formatCurrency(stats.ca_semaine ?? 0) }}</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Impayés</span>
        <span class="cde-summary__value cde-summary__value--danger">{{ formatCurrency(stats.en_attente) }}</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Factures (mois)</span>
        <span class="cde-summary__value">{{ stats.nb_mois }}</span>
      </div>
    </section>

    <div class="cde-table-wrap">
      <el-table
        v-loading="loading"
        :data="paginatedList"
        size="small"
        style="width: 100%"
        aria-label="Liste des factures"
      >
        <el-table-column
          prop="date"
          label="Date"
          width="100"
        >
          <template #default="{ row }">
            {{ formatDate(row.date) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="numero"
          label="N° facture"
          width="150"
        >
          <template #default="{ row }">
            <span
              class="cde-cell-text"
              :title="row.numero"
            >{{ row.numero }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Patient"
          min-width="180"
        >
          <template #default="{ row }">
            <span class="cde-cell-stack">
              <span
                class="cde-cell-text"
                :title="`${row.patient_prenom ?? ''} ${row.patient_nom ?? ''}`.trim()"
              >{{ row.patient_prenom }} {{ row.patient_nom }}</span>
              <span
                v-if="row.assurance_nom"
                class="cde-muted factures__assurance"
                :title="row.assurance_nom"
              >{{ row.assurance_nom }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="Total (GNF)"
          width="130"
          align="right"
        >
          <template #default="{ row }">
            <span class="cde-cell-stack">
              <span class="cde-num">{{ formatMontant(row.montant_total) }}</span>
              <span
                v-if="row.remise_pct || row.tva_pct"
                class="cde-num-sub factures__mini"
              >Remise {{ row.remise_pct ?? 0 }} % · TVA {{ row.tva_pct ?? 0 }} %</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="Part patient (GNF)"
          width="160"
          align="right"
        >
          <template #default="{ row }">
            <span class="cde-cell-stack">
              <span class="cde-num">{{ formatMontant(row.part_patient ?? row.montant_total) }}</span>
              <span
                class="cde-num-sub"
                :class="row.montant_restant > 0 ? 'cde-danger' : 'cde-muted'"
                :title="`Reste ${formatMontant(row.montant_restant)}`"
              >Reste {{ formatMontant(row.montant_restant) }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column
          prop="mode_paiement"
          label="Mode"
          width="104"
        >
          <template #default="{ row }">
            <span
              class="cde-cell-text"
              :title="row.mode_paiement ?? ''"
            >{{ row.mode_paiement }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Statut"
          width="112"
        >
          <template #default="{ row }">
            <span
              class="cde-badge"
              :class="statusBadge(row.status)"
            >{{ row.status }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Actions"
          width="150"
          align="right"
          fixed="right"
          class-name="cde-col-actions"
          label-class-name="cde-col-actions"
        >
          <template #default="{ row }">
            <span class="cde-actions">
              <el-tooltip
                content="Imprimer la facture"
                placement="top"
              >
                <el-button
                  text
                  :icon="Printer"
                  size="small"
                  aria-label="Imprimer la facture"
                  @click="openPrint(row)"
                />
              </el-tooltip>
              <el-tooltip
                v-if="canWrite && row.status === 'en_attente'"
                content="Modifier la facture"
                placement="top"
              >
                <el-button
                  text
                  :icon="Edit"
                  size="small"
                  aria-label="Modifier la facture"
                  @click="openEditInvoice(row)"
                />
              </el-tooltip>
              <el-tooltip
                v-if="canWrite && row.montant_restant > 0 && row.status !== 'annulé'"
                content="Encaisser un paiement"
                placement="top"
              >
                <el-button
                  text
                  :icon="Money"
                  size="small"
                  aria-label="Encaisser"
                  @click="openPayment(row)"
                />
              </el-tooltip>
              <el-tooltip
                content="Voir le dernier reçu"
                placement="top"
              >
                <el-button
                  text
                  :icon="Ticket"
                  size="small"
                  aria-label="Dernier reçu"
                  @click="openLastReceipt(row)"
                />
              </el-tooltip>
            </span>
          </template>
        </el-table-column>
        <template #empty>
          <div class="cde-empty">
            Aucune facture ne correspond à ces filtres.
          </div>
        </template>
      </el-table>
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ filteredList.length }} facture(s)</span>
      <el-pagination
        v-model:current-page="paginator.currPage"
        layout="sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        :page-size="paginator.pageSize"
        :total="filteredList.length"
        :pager-count="5"
        aria-label="Pagination des factures"
        @size-change="(s:number)=>paginator.pageSize=s"
      />
    </div>

    <div class="cde-panels">
      <section class="cde-panel">
        <header class="cde-panel__head">
          <h2 class="cde-section__title">
            Encaissé par mode de paiement
          </h2>
        </header>
        <div class="cde-panel__body">
          <el-table
            :data="stats.ca_par_mode ?? []"
            size="small"
            aria-label="Encaissé par mode de paiement"
          >
            <el-table-column
              label="Mode"
              min-width="120"
            >
              <template #default="{ row }">
                <span
                  class="cde-cell-text"
                  :title="row.mode"
                >{{ row.mode }}</span>
              </template>
            </el-table-column>
            <el-table-column
              label="Total (GNF)"
              align="right"
              width="130"
            >
              <template #default="{ row }">
                <span class="cde-num">{{ formatMontant(row.total) }}</span>
              </template>
            </el-table-column>
            <el-table-column
              prop="nb"
              label="Nb"
              width="100"
              align="right"
            />
          </el-table>
        </div>
      </section>
      <section class="cde-panel">
        <header class="cde-panel__head">
          <h2 class="cde-section__title">
            Top 5 actes facturés
          </h2>
        </header>
        <div class="cde-panel__body">
          <el-table
            :data="stats.top_actes ?? []"
            size="small"
            aria-label="Top 5 actes facturés"
          >
            <el-table-column
              label="Acte"
              min-width="140"
            >
              <template #default="{ row }">
                <span
                  class="cde-cell-text"
                  :title="row.libelle"
                >{{ row.libelle }}</span>
              </template>
            </el-table-column>
            <el-table-column
              label="Total (GNF)"
              align="right"
              width="130"
            >
              <template #default="{ row }">
                <span class="cde-num">{{ formatMontant(row.total) }}</span>
              </template>
            </el-table-column>
            <el-table-column
              prop="quantite"
              label="Qté"
              width="100"
              align="right"
            />
          </el-table>
        </div>
      </section>
    </div>

    <InvoiceFormDialog
      ref="formDialogRef"
      @created="onInvoiceCreated"
      @updated="refresh"
    />
    <InvoicePaymentDialog
      ref="paymentDialogRef"
      @paid="refresh"
    />
    <InvoicePrintView ref="printDialogRef" />
    <ReceiptPrintView ref="receiptRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Printer, Search, Money, Download, Ticket, Edit } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { invoices, fetchInvoices, fetchInvoiceStats, getInvoice } from '@/composables/useInvoices'
import type { Invoice, InvoiceStats } from '@/composables/useInvoices'
import { useCurrency } from '@/currency/useCurrency'
import { useExport } from '@/composables/useExport'
import { useAuth } from '@/composables/useAuth'
import { formatMontant } from '@/components/comptabilite/format'
import InvoiceFormDialog from '@/components/comptabilite/InvoiceFormDialog.vue'
import InvoicePaymentDialog from '@/components/comptabilite/InvoicePaymentDialog.vue'
import InvoicePrintView from '@/components/comptabilite/InvoicePrintView.vue'
import ReceiptPrintView from '@/components/comptabilite/ReceiptPrintView.vue'

const { formatCurrency, loadCurrency } = useCurrency()
const { exportInvoicesExcel, exportingExcel } = useExport()
const { user } = useAuth()
const loading = ref(true)
const searchText = ref('')
const statusFilter = ref('')
const dateDebut = ref('')
const dateFin = ref('')
const formDialogRef = ref<InstanceType<typeof InvoiceFormDialog> | null>(null)
const paymentDialogRef = ref<InstanceType<typeof InvoicePaymentDialog> | null>(null)
const printDialogRef = ref<InstanceType<typeof InvoicePrintView> | null>(null)
const receiptRef = ref<InstanceType<typeof ReceiptPrintView> | null>(null)

const canWrite = computed(() => ['COMPTABLE', 'ADMIN', 'SECRETAIRE'].includes(user.value?.role ?? ''))

const stats = reactive<InvoiceStats>({
  ca_jour: 0,
  ca_facture_jour: 0,
  en_attente: 0,
  nb_mois: 0,
  nb_jour: 0,
  nb_jours_periode: 1,
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
      (inv.patient_prenom?.toLowerCase().includes(q) ?? false) ||
      (inv.payments?.some(p => p.numero_recu?.toLowerCase().includes(q)) ?? false)
  )
})

const paginatedList = computed(() => {
  const start = (paginator.currPage - 1) * paginator.pageSize
  return filteredList.value.slice(start, start + paginator.pageSize)
})

async function refresh() {
  loading.value = true
  try {
    await fetchInvoices({
      search: undefined,
      status: statusFilter.value || undefined,
      date_debut: dateDebut.value || undefined,
      date_fin: dateFin.value || undefined,
    })
    const s = await fetchInvoiceStats({
      date_debut: dateDebut.value || undefined,
      date_fin: dateFin.value || undefined,
    })
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
  if (!canWrite.value) return
  formDialogRef.value?.open()
}

function openPayment(inv: Invoice) {
  if (!canWrite.value) return
  paymentDialogRef.value?.open(inv)
}

async function openEditInvoice(inv: Invoice) {
  if (!canWrite.value) return
  // Les lignes de liste n'ont ni items ni payments : on recharge le détail.
  const full = inv.id ? await getInvoice(inv.id) : inv
  if (full?.payments?.length) {
    ElMessage.warning('Facture déjà réglée : modification impossible.')
    return
  }
  if (full) formDialogRef.value?.openEdit(full)
}

function openPrint(inv: Invoice) {
  printDialogRef.value?.open(inv)
}

async function openLastReceipt(inv: Invoice) {
  const full = inv.id ? await getInvoice(inv.id) : inv
  const payments = full?.payments ?? inv.payments ?? []
  const last = payments[payments.length - 1]
  if (last?.id) await receiptRef.value?.openByPayment(last.id)
  else if (last?.numero_recu) await receiptRef.value?.openByNumero(last.numero_recu)
}

async function onExportExcel() {
  await exportInvoicesExcel({
    status: statusFilter.value || undefined,
    date_debut: dateDebut.value || undefined,
    date_fin: dateFin.value || undefined,
  })
}

function onInvoiceCreated() {
  refresh()
}

function statusBadge(status: string): string {
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
.factures {
  min-width: 0;
}

.factures__assurance {
  font-size: 11px;
  color: var(--cd-primary-dark);
}

.factures__mini {
  font-size: 10.5px;
  color: var(--cd-gray-500);
}
</style>
