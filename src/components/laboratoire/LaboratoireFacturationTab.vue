<template>
  <div class="labo-facturation">
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
            aria-label="Date de début de la facturation laboratoire"
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
            aria-label="Date de fin de la facturation laboratoire"
            @change="load"
          />
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Statut</span>
          <el-select
            v-model="statutFilter"
            class="cde-toolbar__select"
          >
            <el-option
              label="Tous"
              value="tous"
            />
            <el-option
              v-for="(label, value) in LABO_PAIEMENT_LABEL"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </div>
        <div class="cde-filter cde-toolbar__search">
          <span class="cde-filter__label">Recherche</span>
          <el-input
            v-model="search"
            placeholder="N°, patient…"
            clearable
            :prefix-icon="Search"
            class="cde-toolbar__search-input"
            @keyup.enter="load"
            @clear="load"
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

    <section
      class="cde-summary labo-facturation__summary"
      aria-label="Synthèse de la facturation laboratoire"
    >
      <div class="cde-summary__item">
        <span class="cde-summary__label">Total facturé</span>
        <span class="cde-summary__value summary-card__value">{{ formatMontant(totalFacture) }} GNF</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Encaissé</span>
        <span class="cde-summary__value summary-card__value">{{ formatMontant(totalEncaisse) }} GNF</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Reste à encaisser</span>
        <span class="cde-summary__value summary-card__value cde-summary__value--danger">{{ formatMontant(reste) }} GNF</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Impayés</span>
        <span class="cde-summary__value summary-card__value">{{ impayesCount }}</span>
        <span class="cde-summary__sub">demande(s) non soldée(s)</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Exonérations</span>
        <span class="cde-summary__value summary-card__value">{{ formatMontant(exonerations) }} GNF</span>
      </div>
    </section>

    <div class="cde-table-wrap">
      <el-table
        v-loading="loading"
        :data="lignes"
        size="small"
        style="width: 100%"
        aria-label="Facturation du laboratoire"
        @row-dblclick="(row: LaboDemande) => emit('detail', row)"
      >
        <el-table-column
          label="N°"
          width="150"
        >
          <template #default="{ row }">
            <span class="labo-facturation__numero">{{ row.numero || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Date"
          width="100"
        >
          <template #default="{ row }">
            {{ row.plannedDate || '—' }}
          </template>
        </el-table-column>
        <el-table-column
          label="Heure"
          width="80"
        >
          <template #default="{ row }">
            {{ formatHeure(row.plannedHour) }}
          </template>
        </el-table-column>
        <el-table-column
          label="Patient"
          min-width="190"
        >
          <template #default="{ row }">
            <template v-if="row.patientExterne">
              <span class="labo-facturation__externe">Externe</span>
              {{ row.externePrenom }} {{ row.externeNom }}
            </template>
            <template v-else>
              {{ row.patientPrenom }} {{ row.patientNom }}
            </template>
          </template>
        </el-table-column>
        <el-table-column
          label="Examen"
          min-width="170"
        >
          <template #default="{ row }">
            {{ row.examenLabel || (row.examIds?.length ? `${row.examIds.length} examen(s)` : '—') }}
          </template>
        </el-table-column>
        <el-table-column
          label="Facturé (GNF)"
          width="130"
          align="right"
        >
          <template #default="{ row }">
            <span class="cde-num">{{ formatMontant(row.montant ?? 0) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Payé (GNF)"
          width="125"
          align="right"
        >
          <template #default="{ row }">
            <span class="cde-num">{{ formatMontant(row.montantPaye ?? 0) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Reste (GNF)"
          width="125"
          align="right"
        >
          <template #default="{ row }">
            <span
              class="cde-num"
              :class="{ 'cde-danger': resteLigne(row) > 0 }"
            >{{ formatMontant(resteLigne(row)) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="Statut"
          width="115"
        >
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="statutType(row.statutPaiement)"
              effect="plain"
            >
              {{ LABO_PAIEMENT_LABEL[(row.statutPaiement as LaboStatutPaiement) || 'non_paye'] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="Actions"
          width="210"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              v-if="canCashier && peutEncaisser(row)"
              link
              type="warning"
              size="small"
              @click="emit('payer', row)"
            >
              Encaisser
            </el-button>
            <el-button
              link
              size="small"
              @click="emit('recu', row)"
            >
              Reçu
            </el-button>
            <el-button
              link
              size="small"
              @click="emit('detail', row)"
            >
              Détails
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty
            description="Aucune facture de laboratoire pour la période"
            :image-size="70"
          />
        </template>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Refresh, Search } from '@element-plus/icons-vue'
import {
  LABO_PAIEMENT_LABEL,
  useLaboratoire,
  type LaboDemande,
  type LaboStatutPaiement,
} from '@/composables/useLaboratoire'

defineProps<{
  canCashier: boolean
}>()

const emit = defineEmits<{
  payer: [row: LaboDemande]
  detail: [row: LaboDemande]
  recu: [row: LaboDemande]
}>()

const { facturation, facturationLoading: loading, fetchFacturation } = useLaboratoire()

const dateDebut = ref(firstOfMonth())
const dateFin = ref(today())
const statutFilter = ref<LaboStatutPaiement | 'tous'>('tous')
const search = ref('')

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

function firstOfMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`
}

function formatMontant(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(value))
}

/** Affiche une heure planifiée (`9` → `09:00`). */
function formatHeure(value?: number | null): string {
  if (value == null) return '—'
  return `${String(value).padStart(2, '0')}:00`
}

function resteLigne(row: LaboDemande): number {
  return Math.max(0, (row.montant ?? 0) - (row.montantPaye ?? 0))
}

function peutEncaisser(row: LaboDemande): boolean {
  return row.statut !== 'annule'
    && row.statutPaiement !== 'paye'
    && row.statutPaiement !== 'exonere'
    && resteLigne(row) > 0
}

function statutType(statut?: LaboStatutPaiement): 'success' | 'info' | 'warning' | 'danger' {
  switch (statut) {
    case 'paye':
      return 'success'
    case 'exonere':
      return 'info'
    case 'partiel':
      return 'warning'
    default:
      return 'danger'
  }
}

/** Factures non annulées et réellement montantées. */
const factures = computed(() => facturation.value.filter(
  (row) => row.statut !== 'annule' && (row.montant ?? 0) > 0,
))

const lignes = computed(() => factures.value.filter((row) => {
  if (statutFilter.value === 'tous') return true
  return (row.statutPaiement ?? 'non_paye') === statutFilter.value
}))

const totalFacture = computed(() => factures.value.reduce((sum, row) => sum + (row.montant ?? 0), 0))
const totalEncaisse = computed(() => factures.value.reduce((sum, row) => sum + (row.montantPaye ?? 0), 0))
const reste = computed(() => Math.max(0, totalFacture.value - totalEncaisse.value))
const impayesCount = computed(() => factures.value.filter(
  (row) => row.statutPaiement === 'non_paye' || row.statutPaiement === 'partiel',
).length)
const exonerations = computed(() => factures.value
  .filter((row) => row.statutPaiement === 'exonere')
  .reduce((sum, row) => sum + (row.montant ?? 0), 0))

async function load(): Promise<void> {
  await fetchFacturation({
    dateFrom: dateDebut.value || undefined,
    dateTo: dateFin.value || undefined,
    search: search.value,
  })
}

defineExpose({ reload: load })

onMounted(load)
</script>

<style scoped>
.labo-facturation__summary {
  margin-bottom: 14px;
}

.labo-facturation__numero {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.labo-facturation__externe {
  display: inline-block;
  margin-right: 4px;
  padding: 0 4px;
  border-radius: 2px;
  background: #fdf3d8;
  color: #8a6d1f;
  font-size: 10px;
  font-weight: 700;
  vertical-align: middle;
}
</style>
