<template>
  <div class="depenses cde">
    <div class="cde-toolbar">
      <div class="cde-filters">
        <div class="cde-filter cde-toolbar__search">
          <span class="cde-filter__label">Recherche</span>
          <el-input
            v-model="search"
            placeholder="Libellé, fournisseur, référence…"
            clearable
            :prefix-icon="Search"
            aria-label="Rechercher une dépense"
            @input="scheduleLoad"
            @clear="load"
          />
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Période</span>
          <el-date-picker
            v-model="dateRange"
            class="cde-toolbar__range"
            type="daterange"
            value-format="YYYY-MM-DD"
            start-placeholder="Début"
            end-placeholder="Fin"
            aria-label="Période des dépenses"
            @change="load"
          />
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Catégorie</span>
          <el-select
            v-model="categorieId"
            class="cde-toolbar__select"
            clearable
            placeholder="Toutes"
            aria-label="Filtrer par catégorie"
            @change="load"
          >
            <el-option
              v-for="categorie in categories"
              :key="categorie.id"
              :label="categorie.nom"
              :value="categorie.id as number"
            />
          </el-select>
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Statut</span>
          <el-select
            v-model="statutFilter"
            class="cde-toolbar__select"
            clearable
            placeholder="Tous"
            aria-label="Filtrer par statut"
            @change="load"
          >
            <el-option
              label="Payée"
              value="payee"
            />
            <el-option
              label="À crédit"
              value="credit"
            />
          </el-select>
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Source</span>
          <el-select
            v-model="sourceFilter"
            class="cde-toolbar__select"
            clearable
            placeholder="Toutes"
            aria-label="Filtrer par source"
            @change="load"
          >
            <el-option
              label="Saisie manuelle"
              value="manuel"
            />
            <el-option
              label="Achat pharmacie"
              value="stock_entree"
            />
          </el-select>
        </div>
        <span class="cde-toolbar__meta">Synthèse : {{ syntheseDateReferenceLabel }}</span>
      </div>
      <div class="cde-toolbar__actions">
        <el-button
          :icon="RefreshLeft"
          @click="resetFilters"
        >
          Réinitialiser
        </el-button>
        <el-button
          :icon="Setting"
          @click="categoriesDialogRef?.open()"
        >
          Catégories
        </el-button>
        <el-button
          type="primary"
          :icon="Plus"
          @click="formDialogRef?.open()"
        >
          Nouvelle dépense
        </el-button>
      </div>
    </div>

    <section
      class="cde-summary"
      aria-label="Synthèse des dépenses"
    >
      <div class="cde-summary__item">
        <span class="cde-summary__label">Total dépenses</span>
        <span class="cde-summary__value summary-card__value">{{ formatCurrency(total) }}</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Payé</span>
        <span class="cde-summary__value summary-card__value">{{ formatCurrency(totalPaye) }}</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">À crédit</span>
        <span class="cde-summary__value summary-card__value cde-summary__value--danger">{{ formatCurrency(totalCredit) }}</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Catégories</span>
        <span class="cde-summary__value summary-card__value">{{ categories.length }}</span>
      </div>
    </section>

    <div class="cde-table-wrap">
      <el-table
        v-loading="loading"
        :data="depenses"
        size="small"
        style="width: 100%"
        aria-label="Liste des dépenses"
      >
        <el-table-column
          label="Date d’écriture"
          width="118"
        >
          <template #default="{ row }">
            {{ formatDate(row.date) }}
          </template>
        </el-table-column>
        <el-table-column
          label="Libellé"
          min-width="220"
        >
          <template #default="{ row }">
            <span class="cde-cell-stack">
              <strong
                class="cde-cell-text"
                :title="row.libelle"
              >{{ row.libelle }}</strong>
              <span
                v-if="row.reference"
                class="cde-muted"
                :title="`Réf. ${row.reference}`"
              >Réf. {{ row.reference }}</span>
              <span
                v-if="row.notes"
                class="cde-muted"
                :title="row.notes"
              >{{ row.notes }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="Catégorie"
          width="150"
        >
          <template #default="{ row }">
            <span class="depenses__categorie">
              <span
                class="cde-dot"
                :style="{ background: row.categorieCouleur || 'var(--cd-gray-300)' }"
              />
              <span
                class="cde-cell-text"
                :title="row.categorieNom || ''"
              >{{ row.categorieNom || '—' }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="Fournisseur"
          min-width="150"
        >
          <template #default="{ row }">
            <span
              class="cde-cell-text"
              :title="row.fournisseurNom || ''"
            >{{ row.fournisseurNom || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Montant (GNF)"
          width="130"
          align="right"
        >
          <template #default="{ row }">
            <span class="cde-num cde-amount">{{ formatMontant(row.montant) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Statut"
          width="138"
        >
          <template #default="{ row }">
            <span
              class="cde-badge"
              :class="row.statutPaiement === 'credit' ? 'cde-badge--warning' : 'cde-badge--success'"
            >
              {{ row.statutPaiement === 'credit' ? 'À crédit' : 'Payée' }}
            </span>
            <span class="cde-cell-stack">
              <span
                v-if="row.modePaiement"
                class="cde-muted"
              >{{ modeLabel(row.modePaiement) }}</span>
              <span
                v-if="row.datePaiement"
                class="cde-muted"
              >{{ formatDate(row.datePaiement) }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="Source"
          width="152"
        >
          <template #default="{ row }">
            <span class="cde-badge cde-badge--muted">
              {{ row.source === 'stock_entree' ? 'Achat pharmacie' : 'Manuelle' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="Actions"
          width="300"
          align="right"
          fixed="right"
          class-name="cde-col-actions"
          label-class-name="cde-col-actions"
        >
          <template #default="{ row }">
            <span class="cde-actions">
              <el-button
                v-if="row.statutPaiement === 'credit'"
                text
                size="small"
                :icon="Money"
                @click="paymentDialogRef?.open(row)"
              >
                Marquer payée
              </el-button>
              <template v-if="row.source === 'manuel'">
                <el-button
                  text
                  size="small"
                  :icon="Edit"
                  @click="formDialogRef?.open(row)"
                >
                  Modifier
                </el-button>
                <el-button
                  text
                  type="danger"
                  size="small"
                  :icon="Delete"
                  @click="remove(row)"
                >
                  Supprimer
                </el-button>
              </template>
            </span>
          </template>
        </el-table-column>
        <template #empty>
          <div class="cde-empty">
            Aucune dépense sur cette période.
          </div>
        </template>
      </el-table>
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ depenses.length }} dépense(s)</span>
    </div>

    <DepenseFormDialog
      ref="formDialogRef"
      :categories="categories"
      @saved="onChanged"
    />
    <DepensePaiementDialog
      ref="paymentDialogRef"
      @paid="onChanged"
    />
    <DepensesCategoriesDialog
      ref="categoriesDialogRef"
      :categories="categories"
      @changed="onCategoriesChanged"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Money, Plus, RefreshLeft, Search, Setting } from '@element-plus/icons-vue'
import { useDepenses } from '@/composables/useDepenses'
import type { Depense, DepenseListFiltres, DepenseStatutPaiement, DepenseSource } from '@/composables/useDepenses'
import { MODES_PAIEMENT } from '@/composables/useSalaires'
import type { ModePaiement } from '@/composables/useSalaires'
import { useCurrency } from '@/currency/useCurrency'
import { formatDate } from '@/utils/date'
import { formatMontant } from '@/components/comptabilite/format'
import DepenseFormDialog from '@/components/comptabilite/DepenseFormDialog.vue'
import DepensePaiementDialog from '@/components/comptabilite/DepensePaiementDialog.vue'
import DepensesCategoriesDialog from '@/components/comptabilite/DepensesCategoriesDialog.vue'

const {
  depenses,
  categories,
  synthese,
  loading,
  fetchDepenses,
  fetchSynthese,
  fetchCategories,
  deleteDepense,
} = useDepenses()
const { formatCurrency } = useCurrency()

const search = ref('')
const dateRange = ref<[string, string] | null>(currentMonthRange())
const categorieId = ref<number | null>(null)
const statutFilter = ref<DepenseStatutPaiement | null>(null)
const sourceFilter = ref<DepenseSource | null>(null)

const formDialogRef = ref<InstanceType<typeof DepenseFormDialog> | null>(null)
const paymentDialogRef = ref<InstanceType<typeof DepensePaiementDialog> | null>(null)
const categoriesDialogRef = ref<InstanceType<typeof DepensesCategoriesDialog> | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | undefined

const total = computed(() => Number(synthese.value?.total ?? 0))
const totalPaye = computed(() => Number(synthese.value?.totalPaye ?? 0))
const totalCredit = computed(() => Number(synthese.value?.totalCredit ?? 0))
/** Référence temporelle affichée sur la carte de synthèse (jamais implicite). */
const syntheseDateReferenceLabel = computed(() =>
  synthese.value?.dateReference === 'ecriture'
    ? 'date d’écriture'
    : 'date de décaissement',
)

function currentMonthRange(): [string, string] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const first = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const last = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return [first, last]
}

function baseFilters(): DepenseListFiltres {
  return {
    dateDebut: dateRange.value?.[0] || undefined,
    dateFin: dateRange.value?.[1] || undefined,
    categorieId: categorieId.value ?? undefined,
    statutPaiement: statutFilter.value ?? undefined,
    source: sourceFilter.value ?? undefined,
    search: search.value.trim() || undefined,
  }
}

/** La liste opérationnelle est toujours bornée par la date d'écriture. */
function listFilters(): DepenseListFiltres {
  return { ...baseFilters(), dateReference: 'ecriture' }
}

/** La synthèse conserve le défaut backend (`decaissement`) pour réconcilier la caisse. */
function syntheseFilters(): DepenseListFiltres {
  return baseFilters()
}

function modeLabel(mode: ModePaiement): string {
  return MODES_PAIEMENT.find((item) => item.value === mode)?.label ?? mode
}

onMounted(async () => {
  await Promise.all([load(), loadCategories()])
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

async function load() {
  try {
    await Promise.all([fetchDepenses(listFilters()), fetchSynthese(syntheseFilters())])
  } catch {
    // ipcInvoke affiche déjà l'erreur backend.
  }
}

async function loadCategories() {
  try {
    await fetchCategories(true)
  } catch {
    // ipcInvoke affiche déjà l'erreur backend.
  }
}

function scheduleLoad() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 300)
}

function resetFilters() {
  search.value = ''
  dateRange.value = currentMonthRange()
  categorieId.value = null
  statutFilter.value = null
  sourceFilter.value = null
  load()
}

async function onChanged() {
  await load()
}

async function onCategoriesChanged() {
  await loadCategories()
  await load()
}

async function remove(depense: Depense) {
  if (depense.id == null || depense.source !== 'manuel') return
  try {
    await ElMessageBox.confirm(
      `Supprimer la dépense « ${depense.libelle} » ?`,
      'Supprimer la dépense',
      { confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler', type: 'warning' },
    )
  } catch {
    return
  }

  try {
    await deleteDepense(depense.id)
    ElMessage.success('Dépense supprimée')
    await load()
  } catch {
    // ipcInvoke affiche déjà l'erreur backend.
  }
}
</script>

<style scoped>
.depenses {
  min-width: 0;
}

.depenses__categorie {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
}

.depenses__categorie .cde-cell-text {
  min-width: 0;
}
</style>
