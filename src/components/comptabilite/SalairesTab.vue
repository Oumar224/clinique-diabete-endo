<template>
  <div class="salaires cde">
    <div class="cde-toolbar">
      <div class="cde-filters">
        <div class="cde-filter">
          <span class="cde-filter__label">Période de paie</span>
          <el-date-picker
            v-model="periode"
            class="cde-toolbar__date"
            type="month"
            value-format="YYYY-MM"
            placeholder="Période"
            :clearable="false"
            aria-label="Période de paie"
            @change="load"
          />
        </div>
      </div>
      <div class="cde-toolbar__actions">
        <el-button
          :icon="CopyDocument"
          :loading="saving"
          @click="copyPrevious"
        >
          Copier le mois précédent
        </el-button>
        <el-button
          type="primary"
          :icon="Money"
          :disabled="unpaidRows.length === 0"
          @click="openBulk"
        >
          Payer en masse
        </el-button>
      </div>
    </div>

    <section
      class="cde-summary"
      aria-label="Synthèse de la paie"
    >
      <div class="cde-summary__item">
        <span class="cde-summary__label">Employés</span>
        <span class="cde-summary__value summary-card__value">{{ paie.length }}</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Masse salariale</span>
        <span class="cde-summary__value summary-card__value">{{ formatCurrency(totalNet) }}</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Déjà payé</span>
        <span class="cde-summary__value summary-card__value">{{ formatCurrency(paidTotal) }}</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Reste à payer</span>
        <span class="cde-summary__value summary-card__value cde-summary__value--danger">{{ formatCurrency(unpaidTotal) }}</span>
        <span class="cde-summary__sub">{{ unpaidRows.length }} employé(s)</span>
      </div>
    </section>

    <div class="cde-table-wrap">
      <el-table
        v-loading="loading"
        :data="paie"
        size="small"
        style="width: 100%"
        aria-label="Feuille de paie"
        @expand-change="onExpandPaie"
      >
        <el-table-column
          type="expand"
          width="34"
        >
          <template #default="{ row }">
            <div class="salaires-tab__historique">
              <div class="salaires-tab__historique-title">
                Historique des paiements — {{ row.prenom }} {{ row.nom }}
                <span
                  v-if="paiementsStatut(row.userId) === 'pret'"
                  class="salaires-tab__historique-count"
                  :class="{ 'cde-muted': paiementsCount(row.userId) === 0 }"
                >({{ paiementsCount(row.userId) }} paiement(s))</span>
              </div>
              <el-table
                v-if="paiementsStatut(row.userId) === 'pret'"
                :data="paiementsDe(row.userId)"
                size="small"
                style="width: 100%"
                :aria-label="`Historique des paiements de ${row.prenom} ${row.nom}`"
              >
                <el-table-column
                  label="Fiche"
                  width="64"
                >
                  <template #default="{ row: paiement }">
                    <el-button
                      size="small"
                      text
                      type="primary"
                      :disabled="!Number.isFinite(paiement.userId)"
                      @click="openPayslipFor(paiement.userId, paiement.periode)"
                    >
                      Fiche
                    </el-button>
                  </template>
                </el-table-column>
                <el-table-column
                  label="Période"
                  width="88"
                >
                  <template #default="{ row: paiement }">
                    {{ paiement.periode ?? '—' }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="Date paiement"
                  width="104"
                >
                  <template #default="{ row: paiement }">
                    {{ formatDate(paiement.datePaiement) }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="Mode"
                  width="104"
                >
                  <template #default="{ row: paiement }">
                    {{ modeLabel(paiement.modePaiement) }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="Référence"
                  min-width="120"
                >
                  <template #default="{ row: paiement }">
                    {{ paiement.reference || '—' }}
                  </template>
                </el-table-column>
                <el-table-column
                  label="Montant net (GNF)"
                  width="116"
                  align="right"
                >
                  <template #default="{ row: paiement }">
                    <span class="cde-num">{{ formatMontant(paiement.montantNet) }}</span>
                  </template>
                </el-table-column>
                <template #empty>
                  <div class="cde-empty">
                    Aucun paiement
                  </div>
                </template>
              </el-table>
              <div
                v-else-if="paiementsStatut(row.userId) === 'erreur'"
                class="cde-empty"
              >
                Historique indisponible.
                <el-button
                  link
                  type="primary"
                  @click="chargerPaiements(row)"
                >
                  Réessayer
                </el-button>
              </div>
              <div
                v-else
                class="cde-empty"
              >
                Chargement…
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="Employé"
          min-width="190"
        >
          <template #default="{ row }">
            <span class="salaires__employee">
              <strong
                class="cde-cell-text"
                :title="`${row.prenom} ${row.nom}`"
              >{{ row.prenom }} {{ row.nom }}</strong>
              <span class="cde-badge cde-badge--muted">{{ row.role }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="Base (GNF)"
          width="110"
          align="right"
        >
          <template #default="{ row }">
            <span
              v-if="row.config"
              class="cde-num"
            >{{ formatMontant(row.config.base ?? 0) }}</span>
            <span
              v-else
              class="cde-muted"
            >—</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Jours"
          width="70"
          align="right"
        >
          <template #default="{ row }">
            <span v-if="row.config">{{ row.config.joursTravailles ?? 0 }}</span>
            <span
              v-else
              class="cde-muted"
            >—</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Rubriques"
          width="90"
          align="right"
        >
          <template #default="{ row }">
            <span v-if="row.config">{{ row.config.rubriques?.length ?? 0 }}</span>
            <span
              v-else
              class="cde-muted"
            >—</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Net (GNF)"
          width="110"
          align="right"
        >
          <template #default="{ row }">
            <span class="cde-num cde-amount">{{ formatMontant(row.montantNet) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Statut"
          width="110"
        >
          <template #default="{ row }">
            <span class="salaires-tab__statut">
              <span
                v-if="row.paye"
                class="cde-badge cde-badge--success"
              >Payé</span>
              <span
                v-else-if="row.config"
                class="cde-badge cde-badge--warning"
              >À payer</span>
              <span
                v-else
                class="cde-badge cde-badge--muted"
              >Non configuré</span>
              <span
                v-if="row.paye && row.datePaiement"
                class="cde-cell-stack"
              >
                <span class="cde-muted">{{ formatDate(row.datePaiement) }}</span>
              </span>
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="Actions"
          width="116"
          align="right"
          fixed="right"
          class-name="cde-col-actions"
          label-class-name="cde-col-actions"
        >
          <template #default="{ row }">
            <span class="salaires-tab__actions">
              <el-button
                text
                size="small"
                :icon="Edit"
                title="Configurer le salaire"
                aria-label="Configurer le salaire"
                @click="openConfig(row)"
              />
              <el-button
                v-if="row.config && !row.paye"
                text
                size="small"
                :icon="Money"
                title="Payer le salaire"
                aria-label="Payer le salaire"
                @click="openPayment(row)"
              />
              <el-button
                text
                size="small"
                :icon="Document"
                title="Voir la fiche de paie"
                aria-label="Voir la fiche de paie"
                @click="openPayslip(row)"
              />
            </span>
          </template>
        </el-table-column>
        <template #empty>
          <div class="cde-empty">
            Aucun employé actif à payer pour cette période.
          </div>
        </template>
      </el-table>
    </div>

    <SalaireConfigDialog
      ref="configDialogRef"
      @saved="load"
    />
    <SalairePaiementDialog
      ref="paymentDialogRef"
      @paid="load"
    />
    <PaiementBulkDialog
      ref="bulkDialogRef"
      @paid="load"
    />
    <PayslipPreviewDialog ref="payslipDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CopyDocument, Document, Edit, Money } from '@element-plus/icons-vue'
import { useSalaires, MODES_PAIEMENT } from '@/composables/useSalaires'
import type { ModePaiement, SalaireHistoriqueRow, SalairePaieRow } from '@/composables/useSalaires'
import { useCurrency } from '@/currency/useCurrency'
import { formatDate } from '@/utils/date'
import { formatMontant } from '@/components/comptabilite/format'
import SalaireConfigDialog from '@/components/comptabilite/SalaireConfigDialog.vue'
import SalairePaiementDialog from '@/components/comptabilite/SalairePaiementDialog.vue'
import PaiementBulkDialog from '@/components/comptabilite/PaiementBulkDialog.vue'
import PayslipPreviewDialog from '@/components/comptabilite/PayslipPreviewDialog.vue'

const { paie, loading, saving, fetchPaie, fetchPaiementsEmploye, copyPreviousMonth } = useSalaires()
const { formatCurrency } = useCurrency()

/** Statut de chargement de l'historique d'un employé (évite de confondre vide, erreur et attente). */
type PaiementsEntry =
  | { statut: 'chargement' }
  | { statut: 'pret'; lignes: SalaireHistoriqueRow[]; stale?: boolean }
  | { statut: 'erreur' }

/** Tableau partagé stable : évite une nouvelle identité de tableau à chaque rendu. */
const EMPTY_ROWS: SalaireHistoriqueRow[] = []

const periode = ref(currentMonth())
const configDialogRef = ref<InstanceType<typeof SalaireConfigDialog> | null>(null)
const paymentDialogRef = ref<InstanceType<typeof SalairePaiementDialog> | null>(null)
const bulkDialogRef = ref<InstanceType<typeof PaiementBulkDialog> | null>(null)
const payslipDialogRef = ref<InstanceType<typeof PayslipPreviewDialog> | null>(null)
/** Historique par employé (clé : `userId`), chargé à la première ouverture de la ligne. */
const paiementsCache = ref<Record<number, PaiementsEntry>>({})
/** Incrémenté à chaque rechargement : invalide les réponses encore en vol. */
let paiementsGeneration = 0

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const paidRows = computed(() => paie.value.filter((row) => row.paye))
const paidTotal = computed(() => paidRows.value.reduce((sum, row) => sum + Number(row.paiement?.montantNet ?? row.montantNet ?? 0), 0))
const unpaidRows = computed(() => paie.value.filter((row) => !row.paye && row.config != null))
const unpaidTotal = computed(() => unpaidRows.value.reduce((sum, row) => sum + Number(row.montantNet ?? 0), 0))
const totalNet = computed(() => paie.value.reduce((sum, row) => sum + Number(row.montantNet ?? 0), 0))

onMounted(load)

async function load() {
  if (!periode.value) return
  paiementsGeneration += 1
  try {
    await fetchPaie(periode.value)
    paiementsCache.value = {}
  } catch {
    // ipcInvoke affiche déjà l'erreur backend. On garde l'historique affiché
    // (pas de « Chargement… » éternel) mais on le marque périmé : la prochaine
    // ouverture de la ligne le rechargera.
    paiementsCache.value = Object.fromEntries(
      Object.entries(paiementsCache.value).map(([userId, entry]) => [
        userId,
        entry.statut === 'pret' ? { ...entry, stale: true } : entry,
      ]),
    )
  }
}

function modeLabel(mode: ModePaiement | undefined): string {
  return MODES_PAIEMENT.find((item) => item.value === mode)?.label ?? '—'
}

function paiementsStatut(userId: number): PaiementsEntry['statut'] | undefined {
  return paiementsCache.value[userId]?.statut
}

function paiementsDe(userId: number): SalaireHistoriqueRow[] {
  const entry = paiementsCache.value[userId]
  return entry?.statut === 'pret' ? entry.lignes : EMPTY_ROWS
}

function paiementsCount(userId: number): number {
  return paiementsDe(userId).length
}

/**
 * Charge l'historique des paiements d'un employé.
 *
 * Sans effet si l'historique est déjà chargé ou en cours de chargement ; une
 * entrée en erreur est retentée.
 *
 * @param row - Ligne de paie de l'employé.
 */
async function chargerPaiements(row: SalairePaieRow) {
  const userId = row.userId
  const existant = paiementsCache.value[userId]
  if (existant?.statut === 'chargement' || (existant?.statut === 'pret' && !existant.stale)) return

  const generation = paiementsGeneration
  paiementsCache.value = { ...paiementsCache.value, [userId]: { statut: 'chargement' } }
  try {
    const lignes = await fetchPaiementsEmploye(userId)
    if (generation !== paiementsGeneration) return
    paiementsCache.value = { ...paiementsCache.value, [userId]: { statut: 'pret', lignes } }
  } catch {
    if (generation !== paiementsGeneration) return
    paiementsCache.value = { ...paiementsCache.value, [userId]: { statut: 'erreur' } }
  }
}

/**
 * Charge l'historique à l'ouverture d'une ligne (jamais au repli).
 *
 * @param row - Ligne de paie dépliée.
 * @param expandedRows - Lignes actuellement dépliées (fourni par Element Plus).
 */
async function onExpandPaie(row: SalairePaieRow, expandedRows: SalairePaieRow[]) {
  if (!expandedRows.includes(row)) return
  await chargerPaiements(row)
}

function openConfig(row: SalairePaieRow) {
  configDialogRef.value?.open(row, periode.value)
}

function openPayment(row: SalairePaieRow) {
  paymentDialogRef.value?.open(row, periode.value)
}

/**
 * Ouvre l'aperçu d'une fiche de paie pour un employé et une période donnés.
 *
 * @param userId - Identifiant de l'employé.
 * @param periodePaiement - Période de paie (YYYY-MM) du paiement concerné.
 */
function openPayslipFor(userId: number, periodePaiement: string | undefined) {
  if (!Number.isFinite(userId) || !periodePaiement) return
  payslipDialogRef.value?.open(userId, periodePaiement)
}

/** Ouvre la fiche de paie de l'employé pour la période sélectionnée. */
function openPayslip(row: SalairePaieRow) {
  openPayslipFor(row.userId, periode.value)
}

function openBulk() {
  bulkDialogRef.value?.open(periode.value, paie.value)
}

async function copyPrevious() {
  try {
    await ElMessageBox.confirm(
      `Copier les configurations du mois précédent vers ${periode.value} ? Les configurations déjà présentes seront conservées.`,
      'Copier les salaires',
      { confirmButtonText: 'Copier', cancelButtonText: 'Annuler', type: 'info' },
    )
  } catch {
    return
  }

  try {
    const result = await copyPreviousMonth(periode.value)
    ElMessage.success(`${result.copied} configuration(s) copiée(s), ${result.skipped} ignorée(s)`)
    await load()
  } catch {
    // ipcInvoke affiche déjà l'erreur backend.
  }
}
</script>

<style scoped>
.salaires {
  min-width: 0;
}

.salaires__employee {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  max-width: 100%;
  min-width: 0;
}

.salaires__employee > strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.salaires__employee > .cde-badge {
  flex: 0 0 auto;
}

/*
 * Actions en icônes seules : trois boutons `text` (zone de clic ~24px) sur une
 * seule ligne. Aucun libellé visible, l'intitulé reste accessible via `title`
 * et `aria-label`.
 */
.salaires-tab__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  flex-wrap: nowrap;
}

.salaires-tab__actions :deep(.el-button) {
  min-width: 24px;
  padding: 0;
}

.salaires-tab__actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

/* Statut empilé (badge puis date) contenu dans les 110px de la colonne. */
.salaires-tab__statut {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
  max-width: 100%;
}

/*
 * Badge compact : « Non configuré » doit tenir dans les 110px de la colonne
 * (padding de cellule 10px inclus), y compris avec une police de repli large.
 */
.salaires-tab__statut .cde-badge {
  gap: 3px;
  padding: 0 4px;
  font-size: 10px;
}

.salaires-tab__historique {
  padding: 6px 12px 10px 42px;
  background: var(--cde-surface-alt, #fafafa);
}

/*
 * Les libellés de l'historique sont longs (« Date paiement », « Montant net
 * (GNF) ») : on autorise deux lignes dans l'en-tête plutôt qu'une troncature
 * par ellipsis, la hauteur de 32px suffisant à deux lignes de 11px.
 */
.salaires-tab__historique :deep(.el-table th.el-table__cell) {
  white-space: normal;
  line-height: 1.2;
}

.salaires-tab__historique-title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--cde-header-text);
}

.salaires-tab__historique-count {
  margin-left: 6px;
  font-weight: 400;
}
</style>
