<template>
  <el-dialog
    v-model="visible"
    title="Servir la délivrance"
    width="min(880px, 94vw)"
    class="servir-dialog"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <div v-if="patientLabel" class="servir-dialog__patient">{{ patientLabel }}</div>
    <el-table :data="rows" size="small" style="width:100%" class="servir-dialog__table">
      <el-table-column label="Ligne" min-width="170">
        <template #default="{ row }">
          <span class="servir-dialog__libelle">{{ row.ligne.libelle }}</span>
          <el-tag v-if="row.ligne.medicamentId == null" size="small" type="warning" effect="plain">
            Non mappée
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Demandée" width="80" align="center">
        <template #default="{ row }">{{ row.ligne.quantiteDemandee ?? '—' }}</template>
      </el-table-column>
      <el-table-column label="Déjà servie" width="85" align="center">
        <template #default="{ row }">{{ row.ligne.quantiteServie ?? 0 }}</template>
      </el-table-column>
      <el-table-column label="À servir" width="140" align="center">
        <template #default="{ row }">
          <el-input-number
            v-model="row.quantite"
            :min="0"
            :max="row.restant"
            :step="1"
            :precision="0"
            :disabled="row.ligne.medicamentId == null"
            size="small"
            style="width:100%"
          />
          <div class="servir-dialog__muted" title="Les décimales sont refusées">Entier</div>
        </template>
      </el-table-column>
      <el-table-column label="P.U. (GNF)" width="150" align="right">
        <template #default="{ row }">
          <span v-if="row.ligne.medicamentId == null" class="servir-dialog__muted">—</span>
          <template v-else-if="hasPrixServeur(row)">
            <span class="amount--gnf">{{ formatCurrency(prixServeur(row) as number) }}</span>
            <div class="servir-dialog__muted">{{ prixSourceLabel(row) }}</div>
          </template>
          <template v-else>
            <div v-if="canSaisirPrix" class="servir-dialog__prix">
              <el-input-number
                :model-value="row.prixManuel"
                :min="1"
                :step="500"
                :precision="0"
                size="small"
                controls-position="right"
                style="width:100%"
                @update:model-value="(value) => onPrixManuelChange(row, value)"
              />
              <div v-if="(row.prixManuel ?? 0) > 0" class="servir-dialog__muted">Saisi</div>
              <span v-else class="servir-dialog__missing">Prix manquant</span>
            </div>
            <span v-else class="servir-dialog__missing">Prix manquant</span>
          </template>
        </template>
      </el-table-column>
      <el-table-column label="Lot FIFO" min-width="220">
        <template #default="{ row }">
          <span v-if="row.ligne.medicamentId == null" class="servir-dialog__muted">—</span>
          <span v-else-if="row.suggestion" class="servir-dialog__muted servir-dialog__lot">
            Lot {{ row.suggestion.numeroLot ?? row.suggestion.id }} — {{ row.suggestion.quantite ?? 0 }} disp.{{ row.suggestion.datePeremption ? ` (péremption ${formatDate(row.suggestion.datePeremption)})` : '' }}
            <br />Total dispo : {{ row.totalDispo }} — {{ row.lotsCount }} lot(s) mobilisé(s) en cascade si besoin
          </span>
          <span v-else class="servir-dialog__muted">Stock insuffisant</span>
        </template>
      </el-table-column>
    </el-table>

    <!-- ── Section financière ─────────────────────────────────── -->
    <section class="servir-dialog__finances">
      <h4 class="servir-dialog__subtitle">Encaissement</h4>

      <el-alert
        v-if="submitError"
        type="error"
        :closable="false"
        show-icon
        :title="submitError"
        class="servir-dialog__alert"
      />

      <el-alert
        v-if="lignesPrixManquant.length > 0 && typeVente === 'facturee'"
        type="warning"
        :closable="false"
        show-icon
        title="Prix unitaire manquant"
        class="servir-dialog__alert"
      >
        <template #default>
          <ul class="servir-dialog__missing-list">
            <li v-for="row in lignesPrixManquant" :key="row.ligne.id ?? row.ligne.libelle">
              {{ row.ligne.libelle }}
            </li>
          </ul>
          <div v-if="canSaisirPrix" class="servir-dialog__muted">
            Saisissez le prix unitaire dans la colonne « P.U. » : il sera figé pour cette délivrance.
          </div>
          <div v-else class="servir-dialog__muted">
            Seuls un pharmacien, un comptable ou un administrateur peuvent saisir un prix.
            Renseignez le prix de vente au catalogue, puis rouvrez ce dialogue.
          </div>
        </template>
      </el-alert>

      <el-form label-position="top" @submit.prevent>
        <el-form-item label="Type de vente" required>
          <div class="servir-dialog__select--type">
            <el-select :model-value="typeVente" :disabled="typeVenteFige" @update:model-value="onTypeVenteChange">
              <el-option label="Facturée" value="facturee" />
              <el-option label="Gratuite" value="gratuite" />
            </el-select>
          </div>
          <div v-if="typeVenteFige" class="servir-dialog__muted">
            Type de vente figé au premier service.
          </div>
        </el-form-item>

        <template v-if="typeVente === 'gratuite'">
          <el-form-item label="Motif de gratuité" required :error="motifError">
            <div class="servir-dialog__select--motif">
              <el-select v-model="motif" :disabled="typeVenteFige" placeholder="Motif..." style="width:100%">
                <el-option
                  v-for="option in MOTIFS_GRATUITE"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </div>
          </el-form-item>
          <el-form-item v-if="motif === 'autre'" label="Précision du motif" required :error="motifError">
            <el-input
              v-model="motifPrecision"
              maxlength="120"
              placeholder="Précision (ex. campaign de dépistage)"
            />
          </el-form-item>
        </template>

        <template v-else>
          <el-form-item label="Total de la vente">
            <div class="servir-dialog__estime amount--gnf">{{ formatCurrency(totalVente) }}</div>
            <div v-if="lignesPrixManquant.length > 0" class="servir-dialog__muted servir-dialog__missing">
              Total incomplet : {{ lignesPrixManquant.length }} ligne(s) sans prix.
            </div>
            <div v-if="serverMontantTotal > 0" class="servir-dialog__muted">
              Déjà facturé : {{ formatCurrency(serverMontantTotal) }}.
              <template v-if="resteServeur != null">
                Reste avant ce service : {{ formatCurrency(resteServeur) }}.
              </template>
            </div>
            <div v-else class="servir-dialog__muted">
              Estimation locale (prix figé ou catalogue) × quantités à servir.
            </div>
          </el-form-item>
          <el-form-item label="Montant encaissé (GNF)" required>
            <div class="servir-dialog__montant">
              <el-input-number
                :model-value="montant"
                :min="0"
                :max="montantMaximum"
                :step="1000"
                :precision="0"
                controls-position="right"
                style="width:100%"
                @update:model-value="onMontantChange"
              />
            </div>
            <div class="servir-dialog__muted">
              0 = vente à crédit, sans encaissement immédiat.
              Maximum encaissable : {{ formatCurrency(montantMaximum) }}.
            </div>
          </el-form-item>
          <el-form-item label="Mode de paiement" required>
            <div class="servir-dialog__select--mode">
              <el-select v-model="modePaiement" style="width:100%">
                <el-option
                  v-for="mode in MODES_PAIEMENT"
                  :key="mode.value"
                  :label="mode.label"
                  :value="mode.value"
                />
              </el-select>
            </div>
          </el-form-item>
          <el-form-item label="Date du paiement">
            <el-date-picker
              v-model="datePaiement"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="Date du paiement"
              style="width:100%"
            />
          </el-form-item>
          <el-form-item label="Référence (optionnel)">
            <el-input v-model="reference" maxlength="80" placeholder="N° de transaction, chèque…" />
          </el-form-item>
        </template>
      </el-form>
    </section>

    <template #footer>
      <el-button @click="visible = false">Annuler</el-button>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="!canServe || !canSubmit"
        :title="submitBlockedReason"
        @click="submit"
      >
        Servir{{ isPartial ? ' (partiel)' : '' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  useDispensations,
  MOTIFS_GRATUITE,
  type DelivranceFileEntry,
  type DelivranceLigneDto,
  type DelivranceTypeVente,
  type MotifGratuite,
  type ServirDelivranceParams,
  type ServirLigneParams,
  type ServirPaiementParams,
} from '@/composables/useDispensations'
import { useStock, type StockLotDto } from '@/composables/useStock'
import { useMedicaments } from '@/composables/useMedicaments'
import { useAuth } from '@/composables/useAuth'
import { MODES_PAIEMENT, type ModePaiement } from '@/composables/useSalaires'
import { useCurrency } from '@/currency/useCurrency'

const emit = defineEmits<{
  saved: []
}>()

const { formatCurrency } = useCurrency()
const { servirDelivrance, error: dispError } = useDispensations()
const { fetchLots } = useStock()
const { fetchMedicaments, medicaments } = useMedicaments()
const { user } = useAuth()

/** Seuls les rôles de caisse peuvent fixer un prix manquant. */
const canSaisirPrix = computed(() => {
  const role = user.value?.role
  return typeof role === 'string' && (PRIX_ROLES as readonly string[]).includes(role)
})

interface ServirRow {
  ligne: DelivranceLigneDto
  restant: number
  quantite: number
  suggestion: StockLotDto | null
  lotsCount: number
  totalDispo: number
  /** Prix saisi quand ni le serveur ni le catalogue n'en fournissent. */
  prixManuel: number | null
}

/** Rôles autorisés à saisir un prix unitaire (miroir backend). */
const PRIX_ROLES = ['ADMIN', 'PHARMACIEN', 'COMPTABLE'] as const

const visible = ref(false)
const submitting = ref(false)
const delivranceId = ref<number | null>(null)
const patientLabel = ref('')
const rows = ref<ServirRow[]>([])

/** Catalogue `medicamentId → prix de vente` (null = prix non renseigné). */
const catalogue = ref<Record<number, number | null>>({})

const typeVente = ref<DelivranceTypeVente>('facturee')
const motif = ref<MotifGratuite | ''>('')
const motifPrecision = ref('')
const montant = ref(0)
const montantSaisi = ref(false)
const modePaiement = ref<ModePaiement>('espèces')
const datePaiement = ref(new Date().toISOString().slice(0, 10))
const reference = ref('')
const submitError = ref('')
/** Vrai si la délivrance a déjà été servie : le type de vente est figé côté backend. */
const typeVenteFige = ref(false)
/** Total et reste financiers fournis par le serveur pour la vente entière. */
const serverMontantTotal = ref(0)
const serverReste = ref<number | null>(null)
/** Cumul déjà encaissé sur la vente (pour ne pas le compter deux fois). */
const serverMontantPaye = ref(0)

function restantOf(ligne: DelivranceLigneDto): number {
  return Math.max(0, (ligne.quantiteDemandee ?? 0) - (ligne.quantiteServie ?? 0))
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}

function availableLots(lots: StockLotDto[]): StockLotDto[] {
  const today = new Date().toISOString().slice(0, 10)
  return lots
    .filter(l => (l.quantite ?? 0) > 0 && (l.datePeremption == null || l.datePeremption >= today))
    .sort((a, b) =>
      (a.datePeremption ?? '9999').localeCompare(b.datePeremption ?? '9999') ||
      (a.id ?? 0) - (b.id ?? 0),
    )
}

/** Lignes effectivement servies (quantité > 0, médicament mappé). */
const lignesServies = computed(() =>
  rows.value.filter(r => r.ligne.medicamentId != null && r.quantite > 0),
)

/** Prix figé ou catalogue fourni par le serveur (jamais modifiable en local). */
function prixServeur(row: ServirRow): number | null {
  const fige = row.ligne.prixUnitaire
  if (typeof fige === 'number' && fige > 0) return fige
  const cataloguePrix = row.ligne.medicamentId != null ? catalogue.value[row.ligne.medicamentId] : undefined
  return typeof cataloguePrix === 'number' && cataloguePrix > 0 ? cataloguePrix : null
}

function hasPrixServeur(row: ServirRow): boolean {
  return prixServeur(row) != null
}

/**
 * Prix de vente unitaire retenu pour une ligne.
 *
 * Priorité identique au backend : prix figé au premier service, puis prix
 * catalogue, puis prix saisi pour cette délivrance. `null` signifie « prix
 * inconnu » : le service est bloqué pour une vente facturée.
 */
function prixUnitaire(row: ServirRow): number | null {
  return prixServeur(row) ?? (typeof row.prixManuel === 'number' && row.prixManuel > 0 ? row.prixManuel : null)
}

/** Origine du prix affiché, pour rassurer l'utilisateur. */
function prixSourceLabel(row: ServirRow): string {
  if ((row.ligne.prixUnitaire ?? 0) > 0) return 'Figé'
  if (hasPrixServeur(row)) return 'Catalogue'
  if ((row.prixManuel ?? 0) > 0) return 'Saisi'
  return ''
}

/** Mémorise un prix saisi (arrondi GNF) ou l'efface. */
function onPrixManuelChange(row: ServirRow, value: number | undefined): void {
  row.prixManuel = typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null
  submitError.value = ''
}

/** Lignes servies dont le prix de vente est inconnu. */
const lignesPrixManquant = computed(() =>
  lignesServies.value.filter(r => prixUnitaire(r) == null),
)

/** Total estimé des lignes servies (prix unitaire × quantité). */
const totalEstime = computed(() =>
  lignesServies.value.reduce((total, row) => {
    const prix = prixUnitaire(row)
    return total + (prix ?? 0) * row.quantite
  }, 0),
)

/**
 * Total de la vente après ce service : montant déjà figé par le serveur +
 * valorisation des nouvelles quantités. On ne remplace jamais le total serveur
 * par l'estimation locale, sinon un service partiel « oublierait » le déjà
 * facturé.
 */
const totalApresService = computed(() => serverMontantTotal.value + totalEstime.value)

const totalVente = computed(() => totalApresService.value)

/** Reste serveur borné à 0 pour l'affichage (un négatif est une anomalie). */
const resteServeur = computed(() =>
  serverReste.value == null ? null : Math.max(0, serverReste.value),
)

/** Plafond d'encaissement : total après service moins les paiements déjà reçus. */
const montantMaximum = computed(() =>
  Math.max(0, totalApresService.value - serverMontantPaye.value),
)

/** Montant proposé : le maximum encaissable restant. */
const montantSuggere = computed(() => montantMaximum.value)

/** Le montant saisi suit la suggestion tant que l'utilisateur ne l'a pas modifié. */
watch(montantSuggere, (valeur) => {
  if (!montantSaisi.value) montant.value = Math.min(valeur, montantMaximum.value)
})

const motifError = computed(() => {
  if (typeVente.value !== 'gratuite') return undefined
  // Sur un service suivant, le motif est déjà figé côté backend.
  if (typeVenteFige.value) return undefined
  if (!motif.value) return 'Le motif de gratuité est obligatoire.'
  if (motif.value === 'autre' && !motifPrecision.value.trim()) {
    return 'La précision du motif est obligatoire.'
  }
  return undefined
})

const canSubmit = computed(() => {
  if (typeVente.value === 'gratuite') return !motifError.value
  if (lignesPrixManquant.value.length > 0) return false
  return Number.isFinite(montant.value) && montant.value >= 0 && montant.value <= montantMaximum.value
})

/** Explication affichée au survol du bouton Servir. */
const submitBlockedReason = computed(() => {
  if (!canServe.value) return 'Aucune ligne mappée avec une quantité à servir.'
  if (typeVente.value === 'gratuite') return motifError.value ?? ''
  if (lignesPrixManquant.value.length > 0) {
    return `Prix unitaire manquant : ${lignesPrixManquant.value.map(r => r.ligne.libelle).join(', ')}`
  }
  if (montant.value > montantMaximum.value) return 'Montant supérieur au maximum encaissable.'
  return ''
})

function onTypeVenteChange(value: string | number | boolean | undefined): void {
  typeVente.value = value === 'gratuite' ? 'gratuite' : 'facturee'
  submitError.value = ''
}

function onMontantChange(value: number | undefined): void {
  const saisi = Number.isFinite(value) ? (value as number) : 0
  montant.value = Math.max(0, Math.min(saisi, montantMaximum.value))
  montantSaisi.value = true
}

/**
 * Restaure le motif de gratuité déjà enregistré sur la délivrance.
 *
 * @param motifEnregistre - Motif stocké par le backend (motif connu ou texte libre).
 */
function restoreMotif(motifEnregistre: string | null | undefined): void {
  if (!motifEnregistre) return
  const connu = MOTIFS_GRATUITE.find(m => m.value === motifEnregistre)
  if (connu) {
    motif.value = connu.value
    return
  }
  motif.value = 'autre'
  motifPrecision.value = motifEnregistre
}

async function open(entry: DelivranceFileEntry) {
  delivranceId.value = entry.delivrance.id ?? null
  const p = entry.patient
  patientLabel.value = p ? `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() : ''
  rows.value = entry.lignes.map(l => ({
    ligne: l,
    restant: restantOf(l),
    quantite: restantOf(l),
    suggestion: null,
    lotsCount: 0,
    totalDispo: 0,
    prixManuel: null,
  }))
  serverMontantTotal.value = entry.delivrance.montantTotal ?? 0
  serverReste.value = typeof entry.delivrance.reste === 'number' ? entry.delivrance.reste : null
  serverMontantPaye.value = entry.delivrance.montantPaye
    ?? Math.max(0, (entry.delivrance.montantTotal ?? 0) - (entry.delivrance.reste ?? 0))
  typeVente.value = entry.delivrance.typeVente ?? 'facturee'
  typeVenteFige.value = !!entry.delivrance.dateVente
  motif.value = ''
  motifPrecision.value = ''
  restoreMotif(entry.delivrance.motifGratuite)
  montant.value = 0
  montantSaisi.value = false
  modePaiement.value = 'espèces'
  datePaiement.value = new Date().toISOString().slice(0, 10)
  reference.value = ''
  submitError.value = ''
  visible.value = true
  await loadCatalogue(entry)
  if (!montantSaisi.value) montant.value = montantSuggere.value
  const mids = [...new Set(entry.lignes.map(l => l.medicamentId).filter((id): id is number => id != null))]
  for (const mid of mids) {
    const lots = await fetchLots(mid)
    const available = availableLots(lots)
    const suggestion = available[0] ?? null
    const totalDispo = available.reduce((sum, l) => sum + (l.quantite ?? 0), 0)
    for (const row of rows.value) {
      if (row.ligne.medicamentId === mid) {
        row.suggestion = suggestion
        row.lotsCount = available.length
        row.totalDispo = totalDispo
      }
    }
  }
}

/**
 * Charge les prix de vente du catalogue (`medicament:list`).
 *
 * Un catalogue indisponible n'empêche jamais l'ouverture : les lignes sans
 * prix sont signalées, et seuls les rôles de caisse peuvent en saisir un.
 */
async function loadCatalogue(entry: DelivranceFileEntry): Promise<void> {
  const ids = new Set(entry.lignes.map(l => l.medicamentId).filter((id): id is number => id != null))
  if (ids.size === 0) {
    catalogue.value = {}
    return
  }
  await fetchMedicaments()
  const map: Record<number, number | null> = {}
  for (const id of ids) {
    const prix = medicamentsPrice(id)
    map[id] = prix
  }
  catalogue.value = map
}

/** Prix de vente catalogue d'un médicament (null si absent ou non renseigné). */
function medicamentsPrice(id: number): number | null {
  const med = medicaments.value.find(m => m.id === id)
  if (!med) return null
  return typeof med.prixVente === 'number' && med.prixVente > 0 ? med.prixVente : null
}

function close() {
  visible.value = false
}

const canServe = computed(() =>
  rows.value.some(r => r.ligne.medicamentId != null && r.quantite > 0 && r.quantite <= r.restant),
)

const isPartial = computed(() =>
  rows.value.some(r => r.ligne.medicamentId != null && r.quantite < r.restant),
)

async function submit() {
  if (delivranceId.value == null || !canServe.value || !canSubmit.value) {
    if (lignesPrixManquant.value.length > 0) {
      submitError.value = `Prix unitaire manquant : ${lignesPrixManquant.value.map(r => r.ligne.libelle).join(', ')}`
    }
    return
  }
  submitting.value = true
  submitError.value = ''
  try {
    const lignes: ServirLigneParams[] = rows.value
      .filter(r => r.ligne.medicamentId != null && r.ligne.id != null && r.restant > 0 && r.quantite > 0)
      .map(r => {
        const ligne: ServirLigneParams = {
          ligneId: r.ligne.id as number,
          quantite: Math.min(Math.floor(r.quantite), r.restant),
        }
        // Le prix n'est envoyé que s'il n'existe ni prix figé ni prix
        // catalogue : le backend reste seul juge de la priorité.
        const aUnPrixConnu = (r.ligne.prixUnitaire ?? 0) > 0
          || (r.ligne.medicamentId != null && (catalogue.value[r.ligne.medicamentId] ?? 0) > 0)
        if (!aUnPrixConnu && typeof r.prixManuel === 'number' && r.prixManuel > 0) {
          ligne.prixUnitaire = Math.round(r.prixManuel)
        }
        return ligne
      })

    const params: ServirDelivranceParams = {
      delivranceId: delivranceId.value,
      lignes,
      userId: user.value?.id,
      typeVente: typeVente.value,
    }

    if (typeVente.value === 'gratuite') {
      const motifEnvoye = motif.value === 'autre' ? motifPrecision.value.trim() : motif.value
      if (motifEnvoye) params.motifGratuite = motifEnvoye
    } else if (montant.value > 0) {
      const montantEncaisse = Math.max(0, Math.min(Math.round(montant.value), montantMaximum.value))
      const paiement: ServirPaiementParams = {
        montant: montantEncaisse,
        modePaiement: modePaiement.value,
      }
      if (datePaiement.value) paiement.datePaiement = datePaiement.value
      if (reference.value.trim()) paiement.reference = reference.value.trim()
      params.paiement = paiement
    }

    const result = await servirDelivrance(params)
    if (result) {
      ElMessage.success(result.delivrance.statut === 'servie' ? 'Délivrance servie' : 'Délivrance partiellement servie')
      emit('saved')
      visible.value = false
    } else {
      submitError.value = dispError.value || "Le service de la délivrance a échoué."
    }
  } finally {
    submitting.value = false
  }
}

function onClosed() {
  delivranceId.value = null
  rows.value = []
  catalogue.value = {}
  submitError.value = ''
  serverMontantTotal.value = 0
  serverReste.value = null
  serverMontantPaye.value = 0
}

defineExpose({ open, close })
</script>

<style scoped>
.servir-dialog__patient {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
}
.servir-dialog__muted {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
.servir-dialog__table {
  width: 100%;
}
.servir-dialog__libelle {
  margin-right: 6px;
  overflow-wrap: anywhere;
}
.servir-dialog__lot {
  display: inline-block;
  overflow-wrap: anywhere;
}
.servir-dialog__missing {
  color: var(--el-color-danger);
  font-weight: 600;
}
.servir-dialog__prix {
  margin-bottom: 4px;
}

.servir-dialog__finances {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--cde-border-soft);
}

.servir-dialog__subtitle {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--cd-gray-900);
}

.servir-dialog__alert {
  margin-bottom: 12px;
}

.servir-dialog__missing-list {
  margin: 4px 0 0;
  padding-left: 18px;
  font-size: 12px;
}

.servir-dialog__estime {
  font-size: 18px;
  font-weight: 700;
}

.servir-dialog__select--type,
.servir-dialog__select--motif,
.servir-dialog__select--mode,
.servir-dialog__montant {
  width: 100%;
  max-width: 100%;
}
</style>
