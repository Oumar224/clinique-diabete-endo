<template>
  <div class="pharma-compta cde">
    <div class="cde-toolbar">
      <div class="cde-filters">
        <div class="cde-filter">
          <span class="cde-filter__label">Du</span>
          <el-date-picker
            v-model="dateDebut"
            class="cde-toolbar__date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="Date début"
            aria-label="Date de début de la période pharmacie"
            @change="load"
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
            aria-label="Date de fin de la période pharmacie"
            @change="load"
          />
        </div>
      </div>
      <div class="cde-toolbar__actions">
        <el-button
          :icon="Refresh"
          :loading="loading"
          @click="load"
        >
          Actualiser
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="error"
      class="cde-alert"
      type="warning"
      :closable="false"
      show-icon
      :title="error"
    >
      <template #default>
        <el-button
          text
          type="primary"
          size="small"
          :loading="loading"
          @click="load"
        >
          Réessayer
        </el-button>
      </template>
    </el-alert>

    <section
      v-loading="loading"
      class="cde-summary"
      aria-label="Synthèse pharmacie"
    >
      <div class="cde-summary__item">
        <span class="cde-summary__label">CA facturé</span>
        <span class="cde-summary__value summary-card__value">{{ formatCurrency(synthese?.caFacture ?? 0) }}</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Encaissé</span>
        <span class="cde-summary__value summary-card__value">{{ formatCurrency(synthese?.encaisse ?? 0) }}</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Créances</span>
        <span class="cde-summary__value summary-card__value cde-summary__value--danger">{{ formatCurrency(synthese?.creances ?? 0) }}</span>
        <span class="cde-summary__sub">{{ ventesCredit.length }} patient(s) à recouvrer</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Gratuités</span>
        <span class="cde-summary__value summary-card__value">{{ formatCurrency(synthese?.gratuiteValeur ?? 0) }}</span>
      </div>
      <span
        class="cde-summary__break"
        aria-hidden="true"
      />
      <div class="cde-summary__item">
        <span class="cde-summary__label">Marge brute</span>
        <span
          class="cde-summary__value summary-card__value"
          :class="{ 'cde-summary__value--danger': (synthese?.margeBrute ?? 0) < 0 }"
        >{{ formatCurrency(synthese?.margeBrute ?? 0) }}</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Marge nette</span>
        <span
          class="cde-summary__value summary-card__value"
          :class="{ 'cde-summary__value--danger': (synthese?.margeNette ?? 0) < 0 }"
        >{{ formatCurrency(synthese?.margeNette ?? 0) }}</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Achats pharmacie</span>
        <span class="cde-summary__value summary-card__value">{{ formatCurrency(achats?.synthese.total ?? 0) }}</span>
      </div>
    </section>

    <section class="cde-section">
      <div class="cde-section-head">
        <h2 class="cde-section-title">
          Ventes de la période
        </h2>
        <span class="cde-section-meta">{{ ventes.length }} vente(s)</span>
      </div>
      <div class="cde-table-wrap">
        <el-table
          :data="ventes"
          size="small"
          style="width: 100%"
          aria-label="Ventes pharmacie de la période"
        >
          <el-table-column
            label="Date"
            width="94"
          >
            <template #default="{ row }">
              {{ formatDate(row.dateVente) }}
            </template>
          </el-table-column>
          <el-table-column
            label="Patient"
            min-width="160"
          >
            <template #default="{ row }">
              <span
                class="cde-cell-text"
                :title="patientLabel(row.patient)"
              >{{ patientLabel(row.patient) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Type"
            width="132"
          >
            <template #default="{ row }">
              <span
                class="cde-badge"
                :class="row.typeVente === 'gratuite' ? 'cde-badge--muted' : 'cde-badge--success'"
              >
                {{ typeLabel(row.typeVente) }}
              </span>
              <span
                v-if="row.motifGratuite"
                class="cde-cell-stack"
              >
                <span class="cde-muted">{{ motifLabel(row.motifGratuite) }}</span>
              </span>
            </template>
          </el-table-column>
          <el-table-column
            label="Total (GNF)"
            width="130"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ formatMontant(row.montantTotal) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Payé (GNF)"
            width="120"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ formatMontant(row.montantPaye) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Reste (GNF)"
            width="120"
            align="right"
          >
            <template #default="{ row }">
              <span
                class="cde-num"
                :class="{ 'cde-danger': row.reste > 0 }"
              >{{ formatMontant(row.reste) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Statut"
            width="210"
          >
            <template #default="{ row }">
              <span class="cde-cell-stack">
                <span>
                  <span
                    class="cde-badge"
                    :class="statutBadgeClass(row.statutFinancier)"
                  >
                    {{ statutFinancierMeta(row.statutFinancier).label }}
                  </span>
                  <el-tooltip
                    v-if="row.prixManquant"
                    content="Une ligne servie n'a pas de prix de vente : elle est valorisée à 0."
                    placement="top"
                  >
                    <span class="cde-badge cde-badge--warning pharma-compta__tag-spaced">Prix manquant</span>
                  </el-tooltip>
                </span>
              </span>
            </template>
          </el-table-column>
          <el-table-column
            label="Actions"
            width="176"
            align="right"
            fixed="right"
            class-name="cde-col-actions"
            label-class-name="cde-col-actions"
          >
            <template #default="{ row }">
              <el-button
                v-if="canEncaisser(row)"
                text
                size="small"
                @click="openEncaissement(row)"
              >
                Encaisser
              </el-button>
              <el-button
                text
                size="small"
                @click="openRecu(row)"
              >
                Reçu
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <div class="cde-empty">
              Aucune vente pharmacie sur cette période.
            </div>
          </template>
        </el-table>
      </div>
    </section>

    <div class="cde-panels">
      <section class="cde-panel">
        <header class="cde-panel__head">
          <h2 class="cde-panel__title">
            Top médicaments
          </h2>
          <el-radio-group
            v-model="topMetric"
            size="small"
            aria-label="Classement des médicaments"
          >
            <el-radio-button value="ca">
              CA
            </el-radio-button>
            <el-radio-button value="quantite">
              Quantité
            </el-radio-button>
          </el-radio-group>
        </header>
        <div class="cde-panel__body">
          <el-table
            :data="topMedicaments"
            size="small"
            aria-label="Top médicaments"
          >
            <el-table-column
              label="#"
              width="52"
              align="right"
            >
              <template #default="{ row }">
                <span class="cde-num">{{ row.rang }}</span>
              </template>
            </el-table-column>
            <el-table-column
              label="Médicament"
              min-width="150"
            >
              <template #default="{ row }">
                <span
                  class="cde-cell-text"
                  :title="row.libelle"
                >{{ row.libelle }}</span>
              </template>
            </el-table-column>
            <el-table-column
              label="Qté"
              width="100"
              align="right"
            >
              <template #default="{ row }">
                <span class="cde-num">{{ row.quantite }}</span>
              </template>
            </el-table-column>
            <el-table-column
              label="CA (GNF)"
              width="130"
              align="right"
            >
              <template #default="{ row }">
                <span class="cde-num">{{ formatMontant(row.ca) }}</span>
              </template>
            </el-table-column>
            <el-table-column
              label="Coût (GNF)"
              width="120"
              align="right"
            >
              <template #default="{ row }">
                <span class="cde-num">{{ valueOrDash(row.cout) }}</span>
              </template>
            </el-table-column>
            <el-table-column
              label="Marge (GNF)"
              width="120"
              align="right"
            >
              <template #default="{ row }">
                <span class="cde-num">{{ valueOrDash(row.marge) }}</span>
              </template>
            </el-table-column>
            <template #empty>
              <div class="cde-empty">
                Aucune vente facturée sur la période.
              </div>
            </template>
          </el-table>
        </div>
      </section>

      <section class="cde-panel">
        <header class="cde-panel__head">
          <h2 class="cde-panel__title">
            Gratuités par motif
          </h2>
          <span class="cde-section-meta">{{ synthese?.gratuiteCount ?? 0 }} vente(s)</span>
        </header>
        <div class="cde-panel__body">
          <el-table
            :data="topMotifsGratuits"
            size="small"
            aria-label="Gratuités par motif"
          >
            <el-table-column
              label="Motif"
              min-width="150"
            >
              <template #default="{ row }">
                <span
                  class="cde-cell-text"
                  :title="motifLabel(row.motif)"
                >{{ motifLabel(row.motif) }}</span>
              </template>
            </el-table-column>
            <el-table-column
              label="Ventes"
              width="100"
              align="right"
            >
              <template #default="{ row }">
                <span class="cde-num">{{ row.count }}</span>
              </template>
            </el-table-column>
            <el-table-column
              label="Valeur (GNF)"
              width="130"
              align="right"
            >
              <template #default="{ row }">
                <span class="cde-num">{{ formatMontant(row.valeur) }}</span>
              </template>
            </el-table-column>
            <el-table-column
              label="Coût (GNF)"
              width="120"
              align="right"
            >
              <template #default="{ row }">
                <span class="cde-num">{{ valueOrDash(row.cout) }}</span>
              </template>
            </el-table-column>
            <template #empty>
              <div class="cde-empty">
                Aucune gratuité sur la période.
              </div>
            </template>
          </el-table>
        </div>
      </section>
    </div>

    <section class="cde-section">
      <div class="cde-section-head">
        <h2 class="cde-section-title">
          Créances par patient
        </h2>
        <span class="cde-section-meta">
          Arrêté au {{ creditReferenceLabel }}
        </span>
      </div>
      <div class="cde-table-wrap">
        <el-table
          :data="ventesCredit"
          size="small"
          style="width: 100%"
          aria-label="Créances pharmacie par patient"
        >
          <el-table-column
            label="Patient"
            min-width="180"
          >
            <template #default="{ row }">
              <span
                class="cde-cell-text"
                :title="creditPatientLabel(row)"
              >{{ creditPatientLabel(row) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Ventes"
            width="100"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ row.nbVentes }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Total dû (GNF)"
            width="130"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ formatMontant(row.montantTotal) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Payé (GNF)"
            width="120"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ formatMontant(row.montantPaye) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Reste (GNF)"
            width="120"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num cde-danger">{{ formatMontant(row.reste) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="1re vente"
            width="96"
          >
            <template #default="{ row }">
              {{ formatDate(row.datePremiereVente) }}
            </template>
          </el-table-column>
          <el-table-column
            label="Dernière vente"
            width="108"
          >
            <template #default="{ row }">
              {{ formatDate(row.dateDerniereVente) }}
            </template>
          </el-table-column>
          <el-table-column
            label="Arrêté au"
            width="92"
          >
            <template #default="{ row }">
              {{ formatDate(row.dateReference) }}
            </template>
          </el-table-column>
          <el-table-column
            label="Actions"
            width="128"
            align="right"
            fixed="right"
            class-name="cde-col-actions"
            label-class-name="cde-col-actions"
          >
            <template #default="{ row }">
              <el-button
                text
                size="small"
                :disabled="row.patientId == null"
                @click="openPatientSales(row)"
              >
                Encaisser
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <div class="cde-empty">
              Aucune créance pharmacie sur cette période.
            </div>
          </template>
        </el-table>
      </div>
    </section>

    <section class="cde-section">
      <div class="cde-section-head">
        <h2 class="cde-section-title">
          Achats par fournisseur
        </h2>
        <span class="cde-section-meta">
          {{ formatCurrency(achats?.synthese.total ?? 0) }} · {{ achats?.synthese.count ?? 0 }} achat(s)
        </span>
      </div>
      <div class="cde-table-wrap">
        <el-table
          :data="achats?.fournisseurs ?? []"
          size="small"
          style="width: 100%"
          aria-label="Achats pharmacie par fournisseur"
        >
          <el-table-column
            label="Fournisseur"
            min-width="200"
          >
            <template #default="{ row }">
              <span
                class="cde-cell-text"
                :title="row.fournisseurNom"
              >{{ row.fournisseurNom }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Achats"
            width="100"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ row.count }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Total (GNF)"
            width="130"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ formatMontant(row.total) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Payé (GNF)"
            width="120"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ formatMontant(row.paye) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="À crédit (GNF)"
            width="130"
            align="right"
          >
            <template #default="{ row }">
              <span
                class="cde-num"
                :class="{ 'cde-danger': row.credit > 0 }"
              >{{ formatMontant(row.credit) }}</span>
            </template>
          </el-table-column>
          <template #empty>
            <div class="cde-empty">
              Aucun achat pharmacie sur cette période.
            </div>
          </template>
        </el-table>
      </div>
    </section>

    <FournisseursSeriesCharts
      :date-debut="dateDebut"
      :date-fin="dateFin"
    />

    <el-dialog
      v-model="patientDialogVisible"
      class="cde-dialog"
      :title="patientDialogTitle"
      width="640px"
      :close-on-click-modal="false"
    >
      <div v-loading="patientDialogLoading">
        <el-table
          :data="patientSales"
          size="small"
          style="width: 100%"
          aria-label="Ventes à crédit du patient"
        >
          <el-table-column
            label="Date"
            width="96"
          >
            <template #default="{ row }">
              {{ formatDate(row.dateVente) }}
            </template>
          </el-table-column>
          <el-table-column
            label="Total (GNF)"
            width="130"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ formatMontant(row.montantTotal) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Payé (GNF)"
            width="120"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ formatMontant(row.montantPaye) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Reste (GNF)"
            width="106"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num cde-danger">{{ formatMontant(row.reste) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Actions"
            width="104"
            align="right"
          >
            <template #default="{ row }">
              <el-button
                text
                size="small"
                @click="encaisserSale(row)"
              >
                Encaisser
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <div class="cde-empty">
              Aucune vente à crédit pour ce patient.
            </div>
          </template>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="patientDialogVisible = false">
          Fermer
        </el-button>
      </template>
    </el-dialog>

    <EncaisserVenteDialog
      ref="encaisserDialogRef"
      @saved="onEncaisse"
    />
    <RecuServiceDialog
      ref="recuDialogRef"
      service="pharmacie"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { useCurrency } from '@/currency/useCurrency'
import { formatDate } from '@/utils/date'
import { formatMontant } from '@/components/comptabilite/format'
import EncaisserVenteDialog from './EncaisserVenteDialog.vue'
import RecuServiceDialog from '@/components/common/RecuServiceDialog.vue'
import FournisseursSeriesCharts from './FournisseursSeriesCharts.vue'
import {
  usePharmacieComptabilite,
  type DelivranceTypeVente,
  type StatutFinancierVente,
  type VenteCreditPatientDto,
  type VentePharmacieDto,
} from '@/composables/usePharmacieComptabilite'

const { formatCurrency } = useCurrency()
const {
  synthese,
  ventes,
  ventesCredit,
  achats,
  loading,
  error,
  topMedicamentsCA,
  topMedicamentsQuantite,
  topMotifsGratuits,
  clearError,
  fetchSynthese,
  fetchVentes,
  fetchVentesCredit,
  fetchAchats,
  findVentesForPatient,
} = usePharmacieComptabilite()

const encaisserDialogRef = ref<InstanceType<typeof EncaisserVenteDialog> | null>(null)
const recuDialogRef = ref<InstanceType<typeof RecuServiceDialog> | null>(null)

const dateDebut = ref(firstOfMonth())
const dateFin = ref(lastOfMonth())
const topMetric = ref<'ca' | 'quantite'>('ca')

const patientDialogVisible = ref(false)
const patientDialogLoading = ref(false)
const patientCreditRow = ref<VenteCreditPatientDto | null>(null)
const patientSales = ref<VentePharmacieDto[]>([])

const MOTIF_LABELS: Record<string, string> = {
  depistage_gratuit: 'Dépistage gratuit',
  indigent: 'Indigent',
  autre: 'Autre',
  'Non précisé': 'Non précisé',
}

const STATUT_FINANCIER_META: Record<StatutFinancierVente, { label: string; badge: string }> = {
  gratuite: { label: 'Gratuité', badge: 'cde-badge--muted' },
  sans_montant: { label: 'Sans montant', badge: 'cde-badge--warning' },
  credit: { label: 'À crédit', badge: 'cde-badge--danger' },
  partielle: { label: 'Partiel', badge: 'cde-badge--warning' },
  payee: { label: 'Payée', badge: 'cde-badge--success' },
}

const topMedicaments = computed(() => {
  const source = topMetric.value === 'quantite' ? topMedicamentsQuantite.value : topMedicamentsCA.value
  return source.map((row, index) => ({ ...row, rang: index + 1 }))
})

/** Date d'arrêté effective des créances (fournie par le backend, repli sur la période). */
const creditReferenceLabel = computed(() => {
  const reference = ventesCredit.value.find((row) => row.dateReference)?.dateReference
  return formatDate(reference ?? dateFin.value)
})

const patientDialogTitle = computed(() => {
  const row = patientCreditRow.value
  if (!row) return 'Ventes à crédit du patient'
  return `Ventes à crédit — ${creditPatientLabel(row)}`
})

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function firstOfMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`
}

function lastOfMonth(): string {
  const now = new Date()
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return `${last.getFullYear()}-${pad2(last.getMonth() + 1)}-${pad2(last.getDate())}`
}

function patientLabel(patient: VentePharmacieDto['patient']): string {
  if (!patient) return 'Patient non renseigné'
  return `${patient.prenom ?? ''} ${patient.nom ?? ''}`.trim() || 'Patient non renseigné'
}

function creditPatientLabel(row: VenteCreditPatientDto): string {
  return `${row.patientPrenom ?? ''} ${row.patientNom ?? ''}`.trim() || 'Patient non renseigné'
}

function typeLabel(type: DelivranceTypeVente): string {
  return type === 'gratuite' ? 'Gratuité' : 'Facturée'
}

function motifLabel(motif: string | null | undefined): string {
  if (!motif) return '—'
  return MOTIF_LABELS[motif] ?? motif
}

function statutFinancierMeta(statut: StatutFinancierVente) {
  return STATUT_FINANCIER_META[statut] ?? { label: statut, badge: 'cde-badge--muted' }
}

function statutBadgeClass(statut: StatutFinancierVente): string {
  return statutFinancierMeta(statut).badge
}

function valueOrDash(value: number | null | undefined): string {
  return value == null ? '—' : formatMontant(value)
}

/** Une vente n'est encaissable que si elle est à crédit ou partiellement payée. */
function canEncaisser(vente: VentePharmacieDto): boolean {
  return vente.statutFinancier === 'credit' || vente.statutFinancier === 'partielle'
}

async function load(): Promise<void> {
  clearError()
  await Promise.all([
    fetchSynthese(dateDebut.value, dateFin.value),
    fetchVentes({ dateDebut: dateDebut.value, dateFin: dateFin.value }),
    fetchVentesCredit(dateDebut.value, dateFin.value),
    fetchAchats(dateDebut.value, dateFin.value),
  ])
}

function openEncaissement(vente: VentePharmacieDto): void {
  encaisserDialogRef.value?.open(vente)
}

/** Ouvre le reçu de service de la vente pharmacie. */
function openRecu(vente: VentePharmacieDto): void {
  if (!vente.id) return
  recuDialogRef.value?.open(vente.id)
}

async function openPatientSales(row: VenteCreditPatientDto): Promise<void> {
  if (row.patientId == null) return
  patientCreditRow.value = row
  patientSales.value = []
  patientDialogVisible.value = true
  patientDialogLoading.value = true
  try {
    const all = await findVentesForPatient(row.patientId, dateFin.value)
    patientSales.value = all
      .filter(v => v.typeVente === 'facturee' && v.reste > 0)
      .sort((a, b) => (a.dateVente ?? '').localeCompare(b.dateVente ?? '') || a.id - b.id)
    if (patientSales.value.length === 0) {
      ElMessage.info('Aucune vente à crédit ouverte pour ce patient.')
    }
  } finally {
    patientDialogLoading.value = false
  }
}

function encaisserSale(vente: VentePharmacieDto): void {
  patientDialogVisible.value = false
  encaisserDialogRef.value?.open(vente)
}

async function onEncaisse(): Promise<void> {
  await load()
}

onMounted(load)
</script>

<style scoped>
.pharma-compta {
  min-width: 0;
}

.pharma-compta__tag-spaced {
  margin-left: 4px;
}
</style>
