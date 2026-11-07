<template>
  <div class="labo-commandes">
    <div class="cde-toolbar">
      <div class="cde-filters">
        <div class="cde-filter cde-toolbar__search">
          <span class="cde-filter__label">Recherche</span>
          <el-input
            v-model="search"
            placeholder="N° de commande…"
            clearable
            :prefix-icon="Search"
            class="cde-toolbar__search-input"
            @keyup.enter="reload"
            @clear="reload"
          />
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Statut</span>
          <el-select v-model="statutFilter" class="cde-toolbar__select" clearable placeholder="Toutes" @change="reload">
            <el-option
              v-for="(label, value) in LABO_COMMANDE_STATUT_LABEL"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </div>
      </div>
      <div class="cde-toolbar__actions">
        <el-button :icon="Refresh" @click="reload">Actualiser</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">Nouvelle commande</el-button>
      </div>
    </div>

    <div class="cde-table-wrap">
      <el-table :data="commandes" v-loading="loading" size="small" style="width: 100%" aria-label="Commandes laboratoire">
        <el-table-column label="N°" width="160">
          <template #default="{ row }"><span class="labo-cmd__numero">{{ row.numero }}</span></template>
        </el-table-column>
        <el-table-column label="Fournisseur" min-width="160">
          <template #default="{ row }">{{ row.fournisseurNom || '—' }}</template>
        </el-table-column>
        <el-table-column label="Date" width="110">
          <template #default="{ row }">{{ row.dateCommande || '—' }}</template>
        </el-table-column>
        <el-table-column label="Montant" width="130">
          <template #default="{ row }">{{ formatMontant(row.montantTotal ?? 0) }}</template>
        </el-table-column>
        <el-table-column label="Avancement" width="140">
          <template #default="{ row }">
            <el-progress
              v-if="row.statut !== 'brouillon'"
              :percentage="row.avancement ?? 0"
              :stroke-width="8"
              :show-text="true"
            />
            <span v-else class="labo-cmd__muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="Statut" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="LABO_COMMANDE_STATUT_TYPE[(row.statut as LaboCommandeStatut) || 'brouillon']" effect="plain">
              {{ LABO_COMMANDE_STATUT_LABEL[(row.statut as LaboCommandeStatut) || 'brouillon'] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link size="small" @click="openDetail(row)">Détail</el-button>
            <el-button
              v-if="row.statut === 'brouillon'"
              link
              type="primary"
              size="small"
              @click="envoyer(row)"
            >
              Envoyer
            </el-button>
            <el-button
              v-if="!['annulee', 'cloturee', 'livree'].includes(row.statut)"
              link
              type="success"
              size="small"
              @click="openDetail(row, true)"
            >
              Réceptionner
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="Aucune commande de laboratoire" :image-size="70" />
        </template>
      </el-table>
    </div>

    <!-- Création -->
    <el-dialog v-model="createDialog" title="Nouvelle commande" width="820px" :close-on-click-modal="false">
      <el-form label-position="top" :model="createForm">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="Fournisseur" required>
              <el-select v-model="createForm.fournisseurId" filterable placeholder="Choisir…" style="width: 100%">
                <el-option v-for="f in fournisseurOptions" :key="f.value" :label="f.label" :value="f.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Date commande">
              <el-date-picker v-model="createForm.dateCommande" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Livraison prévue">
              <el-date-picker v-model="createForm.dateLivraisonPrevue" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="Notes"><el-input v-model="createForm.notes" placeholder="Instructions…" /></el-form-item>
      </el-form>

      <div class="labo-cmd__lignes-head">
        <span>Lignes de commande</span>
        <el-button size="small" :icon="Plus" @click="addLigne">Ajouter une ligne</el-button>
      </div>
      <el-table :data="createForm.lignes" size="small" style="width: 100%">
        <el-table-column label="Article" min-width="200">
          <template #default="{ row }">
            <el-select v-model="row.articleId" filterable placeholder="Choisir…" size="small" style="width: 100%">
              <el-option v-for="a in articles" :key="a.id" :label="a.nom" :value="a.id as number" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="Quantité" width="120">
          <template #default="{ row }">
            <el-input-number v-model="row.quantite" :min="1" size="small" controls-position="right" style="width: 100%" />
          </template>
        </el-table-column>
        <el-table-column label="Prix unitaire" width="140">
          <template #default="{ row }">
            <el-input-number v-model="row.prixUnitaire" :min="0" :step="500" size="small" controls-position="right" style="width: 100%" />
          </template>
        </el-table-column>
        <el-table-column label="Total" width="120">
          <template #default="{ row }">{{ formatMontant((row.quantite ?? 0) * (row.prixUnitaire ?? 0)) }}</template>
        </el-table-column>
        <el-table-column width="60">
          <template #default="{ $index }">
            <el-button link type="danger" size="small" @click="createForm.lignes.splice($index, 1)">✕</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="labo-cmd__total">
        Total : <b>{{ formatMontant(totalCommande) }}</b>
      </div>
      <template #footer>
        <el-button @click="createDialog = false">Annuler</el-button>
        <el-button type="primary" :loading="saving" @click="submitCreate">Créer la commande</el-button>
      </template>
    </el-dialog>

    <!-- Détail -->
    <el-dialog v-model="detailDialog" title="Détail de la commande" width="880px">
      <template v-if="detail">
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="N°">{{ detail.numero }}</el-descriptions-item>
          <el-descriptions-item label="Fournisseur">{{ detail.fournisseurNom || '—' }}</el-descriptions-item>
          <el-descriptions-item label="Statut">
            {{ LABO_COMMANDE_STATUT_LABEL[(detail.statut as LaboCommandeStatut) || 'brouillon'] }}
          </el-descriptions-item>
          <el-descriptions-item label="Date">{{ detail.dateCommande || '—' }}</el-descriptions-item>
          <el-descriptions-item label="Livraison prévue">{{ detail.dateLivraisonPrevue || '—' }}</el-descriptions-item>
          <el-descriptions-item label="Montant">{{ formatMontant(detail.montantTotal ?? 0) }}</el-descriptions-item>
        </el-descriptions>

        <h4 class="labo-cmd__section">Lignes</h4>
        <el-table :data="detail.lignes ?? []" size="small" style="width: 100%">
          <el-table-column prop="articleNom" label="Article" min-width="180" />
          <el-table-column label="Commandé" width="100">
            <template #default="{ row }">{{ row.quantite }}</template>
          </el-table-column>
          <el-table-column label="Reçu" width="100">
            <template #default="{ row }">{{ row.quantiteRecue ?? 0 }}</template>
          </el-table-column>
          <el-table-column label="Prix unitaire" width="130">
            <template #default="{ row }">{{ formatMontant(row.prixUnitaire ?? 0) }}</template>
          </el-table-column>
          <el-table-column label="Montant" width="130">
            <template #default="{ row }">{{ formatMontant(row.montantLigne ?? 0) }}</template>
          </el-table-column>
        </el-table>

        <template v-if="receptions.length > 0">
          <h4 class="labo-cmd__section">Réceptions</h4>
          <el-table :data="receptions" size="small" style="width: 100%">
            <el-table-column label="Date" width="120">
              <template #default="{ row }">{{ row.dateReception }}</template>
            </el-table-column>
            <el-table-column label="Bon" width="150">
              <template #default="{ row }">{{ row.numeroBon || '—' }}</template>
            </el-table-column>
            <el-table-column label="Lignes" min-width="200">
              <template #default="{ row }">
                {{ (row.lignes ?? []).map((l: any) => `${l.quantite}${l.numeroLot ? ' (lot ' + l.numeroLot + ')' : ''}`).join(', ') }}
              </template>
            </el-table-column>
          </el-table>
        </template>
      </template>
      <template #footer>
        <el-button @click="detailDialog = false">Fermer</el-button>
        <el-button
          v-if="detail && !['annulee', 'cloturee', 'livree'].includes(detail.statut ?? '')"
          type="primary"
          @click="openReception"
        >
          Réceptionner
        </el-button>
      </template>
    </el-dialog>

    <!-- Réception -->
    <el-dialog v-model="receptionDialog" title="Réception de commande" width="760px" :close-on-click-modal="false">
      <el-form label-position="top">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="Date de réception">
              <el-date-picker v-model="receptionForm.dateReception" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="N° de bon de livraison">
              <el-input v-model="receptionForm.numeroBon" placeholder="BL-…" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <el-table :data="receptionForm.lignes" size="small" style="width: 100%">
        <el-table-column prop="articleNom" label="Article" min-width="160" />
        <el-table-column label="Reste à livrer" width="120">
          <template #default="{ row }">{{ row.reste }}</template>
        </el-table-column>
        <el-table-column label="Quantité reçue" width="150">
          <template #default="{ row }">
            <el-input-number v-model="row.quantite" :min="0" :max="row.reste" size="small" controls-position="right" style="width: 100%" />
          </template>
        </el-table-column>
        <el-table-column label="N° lot" width="150">
          <template #default="{ row }"><el-input v-model="row.numeroLot" size="small" /></template>
        </el-table-column>
        <el-table-column label="Péremption" width="150">
          <template #default="{ row }">
            <el-date-picker v-model="row.datePeremption" type="date" value-format="YYYY-MM-DD" size="small" style="width: 100%" />
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="receptionDialog = false">Annuler</el-button>
        <el-button type="primary" :loading="saving" @click="submitReception">Enregistrer la réception</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import {
  useLaboratoireStock,
  LABO_COMMANDE_STATUT_LABEL,
  LABO_COMMANDE_STATUT_TYPE,
  type LaboCommande,
  type LaboCommandeStatut,
  type LaboCommandeLigne,
  type LaboReceptionLigne,
} from '@/composables/useLaboratoireStock'
import { ipcInvoke } from '@/utils/ipc'
import { useFournisseurs } from '@/composables/useFournisseurs'
import { useAuth } from '@/composables/useAuth'

const {
  articles, commandes, loading,
  fetchArticles, fetchCommandes,
  createCommande, updateStatutCommande, receptionnerCommande,
} = useLaboratoireStock()
const { fournisseurs, fournisseurOptions, fetchFournisseurs } = useFournisseurs()
const { user } = useAuth()

const search = ref('')
const statutFilter = ref<string>('')
const saving = ref(false)

function reload(): void {
  fetchCommandes({ search: search.value || undefined, statut: statutFilter.value || undefined })
}

// ─── Création ──────────────────────────────────────────────────
const createDialog = ref(false)
const createForm = reactive({
  fournisseurId: undefined as number | undefined,
  dateCommande: new Date().toISOString().slice(0, 10),
  dateLivraisonPrevue: '',
  notes: '',
  lignes: [] as LaboCommandeLigne[],
})

const totalCommande = computed(() =>
  createForm.lignes.reduce((s, l) => s + (l.quantite ?? 0) * (l.prixUnitaire ?? 0), 0),
)

function openCreate(): void {
  createForm.fournisseurId = undefined
  createForm.dateCommande = new Date().toISOString().slice(0, 10)
  createForm.dateLivraisonPrevue = ''
  createForm.notes = ''
  createForm.lignes = []
  addLigne()
  createDialog.value = true
}

function addLigne(): void {
  createForm.lignes.push({ articleId: undefined, quantite: 1, prixUnitaire: 0 })
}

async function submitCreate(): Promise<void> {
  if (!createForm.fournisseurId) {
    ElMessage.warning('Sélectionnez un fournisseur')
    return
  }
  const lignes = createForm.lignes.filter((l) => l.articleId && (l.quantite ?? 0) > 0)
  if (lignes.length === 0) {
    ElMessage.warning('Ajoutez au moins une ligne valide')
    return
  }
  saving.value = true
  try {
    const created = await createCommande({
      fournisseurId: createForm.fournisseurId,
      dateCommande: createForm.dateCommande,
      dateLivraisonPrevue: createForm.dateLivraisonPrevue || null,
      notes: createForm.notes || undefined,
      lignes,
      createdBy: user.value?.id,
    })
    if (!created) {
      ElMessage.error('Création impossible')
      return
    }
    ElMessage.success(`Commande ${created.numero} créée`)
    createDialog.value = false
    reload()
  } finally {
    saving.value = false
  }
}

async function envoyer(row: LaboCommande): Promise<void> {
  if (!row.id) return
  const updated = await updateStatutCommande(row.id, 'envoyee')
  if (updated) {
    ElMessage.success('Commande envoyée')
    reload()
  } else {
    ElMessage.error('Mise à jour impossible')
  }
}

// ─── Détail ────────────────────────────────────────────────────
const detailDialog = ref(false)
const detail = ref<LaboCommande | null>(null)
const receptions = ref<any[]>([])

async function openDetail(row: LaboCommande, reception?: boolean): Promise<void> {
  if (!row.id) return
  const full = await ipcInvoke<LaboCommande>('labo-commande:get', { id: row.id }, { silent: true }).catch(() => null)
  detail.value = full ?? row
  detailDialog.value = true
  receptions.value = []
  if (row.id) {
    receptions.value = await ipcInvoke<any[]>('labo-commande:receptions', { commandeId: row.id }, { silent: true }).catch(() => [])
  }
  if (reception) openReception()
}

// ─── Réception ─────────────────────────────────────────────────
const receptionDialog = ref(false)
const receptionForm = reactive<{
  dateReception: string
  numeroBon: string
  lignes: Array<LaboReceptionLigne & { articleNom?: string; reste: number }>
}>({
  dateReception: new Date().toISOString().slice(0, 10),
  numeroBon: '',
  lignes: [],
})

function openReception(): void {
  if (!detail.value) return
  receptionForm.dateReception = new Date().toISOString().slice(0, 10)
  receptionForm.numeroBon = ''
  receptionForm.lignes = (detail.value.lignes ?? [])
    .filter((l) => (l.quantiteRecue ?? 0) < (l.quantite ?? 0))
    .map((l) => {
      const reste = (l.quantite ?? 0) - (l.quantiteRecue ?? 0)
      return {
        ligneId: l.id!,
        quantite: reste,
        numeroLot: '',
        datePeremption: '',
        articleNom: l.articleNom,
        reste,
      }
    })
  receptionDialog.value = true
}

async function submitReception(): Promise<void> {
  if (!detail.value?.id) return
  const lignes = receptionForm.lignes.filter((l) => (l.quantite ?? 0) > 0)
  if (lignes.length === 0) {
    ElMessage.warning('Saisissez au moins une quantité reçue')
    return
  }
  saving.value = true
  try {
    const updated = await receptionnerCommande({
      commandeId: detail.value.id,
      dateReception: receptionForm.dateReception,
      numeroBon: receptionForm.numeroBon || undefined,
      lignes: lignes.map((l) => ({
        ligneId: l.ligneId,
        quantite: l.quantite,
        numeroLot: l.numeroLot || undefined,
        datePeremption: l.datePeremption || undefined,
      })),
      createdBy: user.value?.id,
    })
    if (!updated) {
      ElMessage.error('Réception impossible')
      return
    }
    ElMessage.success('Réception enregistrée')
    receptionDialog.value = false
    detail.value = updated
    reload()
  } finally {
    saving.value = false
  }
}

function formatMontant(value: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(value)} GNF`
}

onMounted(async () => {
  reload()
  if (fournisseurs.value.length === 0) await fetchFournisseurs()
  if (articles.value.length === 0) await fetchArticles({ actif: true })
})
</script>

<style scoped>
.labo-cmd__numero {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}
.labo-cmd__muted { color: var(--cd-gray-400, #c0c4cc); }
.labo-cmd__lignes-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 6px 0;
  font-weight: 600;
  font-size: 13px;
}
.labo-cmd__total {
  margin-top: 8px;
  text-align: right;
  font-size: 13px;
}
.labo-cmd__section {
  margin: 14px 0 6px;
  font-size: 13px;
  font-weight: 600;
}
</style>
