<template>
  <div class="labo-compta cde">
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
            aria-label="Date de début de la période laboratoire"
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
            aria-label="Date de fin de la période laboratoire"
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
    />

    <section
      class="cde-summary"
      aria-label="Synthèse laboratoire de la période"
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
        <span class="cde-summary__sub">{{ synthese?.impayesCount ?? 0 }} demande(s) à recouvrer</span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Exonérations</span>
        <span class="cde-summary__value summary-card__value">{{ formatCurrency(synthese?.exonerations ?? 0) }}</span>
      </div>
      <div
        class="cde-summary__break"
        aria-hidden="true"
      />
      <div class="cde-summary__item">
        <span class="cde-summary__label">Demandes</span>
        <span class="cde-summary__value summary-card__value">{{ synthese?.demandes ?? 0 }}</span>
        <span class="cde-summary__sub">
          {{ synthese?.realisees ?? 0 }} réalisée(s) · {{ synthese?.annulees ?? 0 }} annulée(s)
        </span>
      </div>
      <div class="cde-summary__item">
        <span class="cde-summary__label">Internes / externes</span>
        <span class="cde-summary__value summary-card__value">{{ synthese?.internes ?? 0 }} / {{ synthese?.externes ?? 0 }}</span>
        <span class="cde-summary__sub">Dossiers cliniques / demandes à la volée</span>
      </div>
    </section>

    <section class="cde-section">
      <div class="cde-section-head">
        <h2 class="cde-section-title">
          Encaissements par mode
        </h2>
        <span class="cde-section-meta">{{ formatCurrency(synthese?.encaisse ?? 0) }} encaissés</span>
      </div>
      <div class="cde-table-wrap">
        <el-table
          :data="modes"
          size="small"
          style="width: 100%"
          aria-label="Encaissements laboratoire par mode"
        >
          <el-table-column
            label="Mode"
            min-width="160"
          >
            <template #default="{ row }">
              {{ LABO_MODE_PAIEMENT_LABEL[row.mode as LaboModePaiement] }}
            </template>
          </el-table-column>
          <el-table-column
            label="Nombre"
            width="100"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ row.count }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Montant (GNF)"
            width="150"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ formatMontant(row.montant) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Part"
            width="110"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ partLabel(row.montant) }}</span>
            </template>
          </el-table-column>
          <template #empty>
            <div class="cde-empty">
              Aucun encaissement sur cette période.
            </div>
          </template>
        </el-table>
      </div>
    </section>

    <section class="cde-section">
      <div class="cde-section-head">
        <h2 class="cde-section-title">
          Examens les plus facturés
        </h2>
        <span class="cde-section-meta">{{ synthese?.topExamens.length ?? 0 }} examen(s)</span>
      </div>
      <div class="cde-table-wrap">
        <el-table
          :data="synthese?.topExamens ?? []"
          size="small"
          style="width: 100%"
          aria-label="Examens de laboratoire les plus facturés"
        >
          <el-table-column
            label="Examen"
            min-width="220"
          >
            <template #default="{ row }">
              {{ row.libelle }}
            </template>
          </el-table-column>
          <el-table-column
            label="Demandes"
            width="110"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ row.count }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Montant (GNF)"
            width="150"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ formatMontant(row.montant) }}</span>
            </template>
          </el-table-column>
          <template #empty>
            <div class="cde-empty">
              Aucun examen facturé sur cette période.
            </div>
          </template>
        </el-table>
      </div>
    </section>

    <section class="cde-section">
      <div class="cde-section-head">
        <h2 class="cde-section-title">
          Paiements de la période
        </h2>
        <span class="cde-section-meta">{{ synthese?.paiements.length ?? 0 }} règlement(s)</span>
      </div>
      <div class="cde-table-wrap">
        <el-table
          :data="synthese?.paiements ?? []"
          size="small"
          style="width: 100%"
          aria-label="Paiements laboratoire de la période"
        >
          <el-table-column
            label="Date"
            width="105"
          >
            <template #default="{ row }">
              {{ row.datePaiement }}
            </template>
          </el-table-column>
          <el-table-column
            label="N° demande"
            width="150"
          >
            <template #default="{ row }">
              {{ row.numero || '—' }}
            </template>
          </el-table-column>
          <el-table-column
            label="Patient"
            min-width="190"
          >
            <template #default="{ row }">
              <span
                v-if="row.externe"
                class="cde-badge cde-badge--muted labo-compta__tag"
              >Externe</span>
              {{ row.patient }}
            </template>
          </el-table-column>
          <el-table-column
            label="Montant (GNF)"
            width="140"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ formatMontant(row.montant) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Mode"
            width="140"
          >
            <template #default="{ row }">
              {{ LABO_MODE_PAIEMENT_LABEL[row.modePaiement as LaboModePaiement] }}
            </template>
          </el-table-column>
          <el-table-column
            label="Référence"
            min-width="140"
          >
            <template #default="{ row }">
              <span class="cde-muted">{{ row.reference || '—' }}</span>
            </template>
          </el-table-column>
          <template #empty>
            <div class="cde-empty">
              Aucun paiement laboratoire sur cette période.
            </div>
          </template>
        </el-table>
      </div>
    </section>

    <section class="cde-section">
      <div class="cde-section-head">
        <h2 class="cde-section-title">
          Impayés &amp; créances
        </h2>
        <span class="cde-section-meta">{{ formatCurrency(synthese?.creances ?? 0) }} restant</span>
      </div>
      <div class="cde-table-wrap">
        <el-table
          :data="synthese?.impayes ?? []"
          size="small"
          style="width: 100%"
          aria-label="Demandes de laboratoire restant à encaisser"
        >
          <el-table-column
            label="N°"
            width="150"
          >
            <template #default="{ row }">
              {{ row.numero || '—' }}
            </template>
          </el-table-column>
          <el-table-column
            label="Date"
            width="105"
          >
            <template #default="{ row }">
              {{ row.date || '—' }}
            </template>
          </el-table-column>
          <el-table-column
            label="Patient"
            min-width="190"
          >
            <template #default="{ row }">
              <span
                v-if="row.externe"
                class="cde-badge cde-badge--muted labo-compta__tag"
              >Externe</span>
              {{ row.patient }}
            </template>
          </el-table-column>
          <el-table-column
            label="Facturé (GNF)"
            width="130"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ formatMontant(row.montant) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Payé (GNF)"
            width="125"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ formatMontant(row.montantPaye) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Reste (GNF)"
            width="125"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num cde-danger">{{ formatMontant(row.reste) }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Statut"
            width="110"
          >
            <template #default="{ row }">
              <span
                class="cde-badge"
                :class="statutMeta(row.statutPaiement).badge"
              >{{ statutMeta(row.statutPaiement).label }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Action"
            width="120"
            fixed="right"
          >
            <template #default="{ row }">
              <el-button
                link
                type="warning"
                size="small"
                @click="openPaiement(row)"
              >
                Encaisser
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <div class="cde-empty">
              Aucune créance laboratoire sur cette période.
            </div>
          </template>
        </el-table>
      </div>
    </section>

    <el-dialog
      v-model="dialogVisible"
      class="cde-dialog"
      title="Encaisser une demande de laboratoire"
      width="460px"
      :close-on-click-modal="false"
    >
      <div class="labo-compta__dialog-recap">
        <span class="labo-compta__dialog-numero">{{ paiementForm.numero || '—' }}</span>
        <span>{{ paiementForm.patient }}</span>
        <span class="cde-danger">Reste : {{ formatMontant(resteCourant) }} GNF</span>
      </div>
      <el-form
        label-position="top"
        :model="paiementForm"
      >
        <el-form-item label="Mode de règlement">
          <el-select
            v-model="paiementForm.modePaiement"
            class="labo-compta__field"
          >
            <el-option
              v-for="mode in LABO_MODES_PAIEMENT"
              :key="mode"
              :label="LABO_MODE_PAIEMENT_LABEL[mode]"
              :value="mode"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="paiementForm.modePaiement !== 'exonere'"
          label="Montant encaissé (GNF)"
        >
          <el-input-number
            v-model="paiementForm.montant"
            class="labo-compta__field"
            :min="1"
            :max="resteCourant"
            :step="1000"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item label="Date du règlement">
          <el-date-picker
            v-model="paiementForm.datePaiement"
            class="labo-compta__field"
            type="date"
            value-format="YYYY-MM-DD"
            :clearable="false"
          />
        </el-form-item>
        <el-form-item label="Référence (facultatif)">
          <el-input
            v-model="paiementForm.reference"
            maxlength="60"
            placeholder="Reçu, transaction…"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          Annuler
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="validerPaiement"
        >
          Enregistrer
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { useCurrency } from '@/currency/useCurrency'
import { formatMontant } from '@/components/comptabilite/format'
import {
  LABO_MODE_PAIEMENT_LABEL,
  LABO_MODES_PAIEMENT,
  useLaboratoireComptabilite,
  type LaboComptabiliteImpayeDto,
  type LaboModePaiement,
} from '@/composables/useLaboratoireComptabilite'

const { formatCurrency } = useCurrency()
const { synthese, loading, saving, error, fetchSynthese, encaisser } = useLaboratoireComptabilite()

const dateDebut = ref(firstOfMonth())
const dateFin = ref(today())

const dialogVisible = ref(false)
const resteCourant = ref(0)
const paiementForm = reactive({
  id: 0,
  numero: '',
  patient: '',
  montant: 0,
  modePaiement: 'espece' as LaboModePaiement,
  datePaiement: today(),
  reference: '',
})

const modes = computed(() => synthese.value?.parMode ?? [])

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

/** Part d'un mode dans l'encaissé total de la période. */
function partLabel(montant: number): string {
  const total = synthese.value?.encaisse ?? 0
  if (total <= 0) return '—'
  return `${Math.round((montant / total) * 100)} %`
}

function statutMeta(statut: LaboComptabiliteImpayeDto['statutPaiement']): { label: string; badge: string } {
  switch (statut) {
    case 'partiel':
      return { label: 'Partiel', badge: 'cde-badge--warning' }
    case 'paye':
      return { label: 'Payé', badge: 'cde-badge--success' }
    case 'exonere':
      return { label: 'Exonéré', badge: 'cde-badge--muted' }
    default:
      return { label: 'Non payé', badge: 'cde-badge--danger' }
  }
}

async function load(): Promise<void> {
  await fetchSynthese(dateDebut.value, dateFin.value)
}

function openPaiement(row: LaboComptabiliteImpayeDto): void {
  paiementForm.id = row.id
  paiementForm.numero = row.numero ?? ''
  paiementForm.patient = row.patient
  paiementForm.montant = row.reste
  paiementForm.modePaiement = 'espece'
  paiementForm.datePaiement = today()
  paiementForm.reference = ''
  resteCourant.value = row.reste
  dialogVisible.value = true
}

async function validerPaiement(): Promise<void> {
  if (paiementForm.modePaiement !== 'exonere') {
    if (!Number.isFinite(paiementForm.montant) || paiementForm.montant <= 0) {
      ElMessage.warning('Le montant encaissé doit être strictement positif')
      return
    }
    if (paiementForm.montant > resteCourant.value) {
      ElMessage.warning('Le montant ne peut pas dépasser le reste à encaisser')
      return
    }
  }

  try {
    await encaisser({
      id: paiementForm.id,
      montant: paiementForm.montant,
      modePaiement: paiementForm.modePaiement,
      datePaiement: paiementForm.datePaiement,
      reference: paiementForm.reference.trim() || undefined,
    })
    dialogVisible.value = false
    ElMessage.success(
      paiementForm.modePaiement === 'exonere'
        ? 'Demande exonérée'
        : 'Paiement enregistré',
    )
    await load()
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

onMounted(load)
</script>

<style scoped>
.labo-compta__tag {
  margin-right: 6px;
}

.labo-compta__field {
  width: 100%;
}

.labo-compta__dialog-recap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid var(--cd-gray-200, #e5e7eb);
  border-radius: 8px;
  font-size: 13px;
}

.labo-compta__dialog-numero {
  font-weight: 700;
  color: var(--cd-gray-700, #374151);
}
</style>
