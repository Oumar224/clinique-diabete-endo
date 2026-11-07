<template>
  <div class="labo-stock">
    <div class="cde-toolbar">
      <div class="cde-filters">
        <div class="cde-filter cde-toolbar__search">
          <span class="cde-filter__label">Recherche</span>
          <el-input
            v-model="search"
            placeholder="Nom ou code de l'article…"
            clearable
            :prefix-icon="Search"
            class="cde-toolbar__search-input"
            @keyup.enter="reloadArticles"
            @clear="reloadArticles"
          />
        </div>
        <div class="cde-filter">
          <span class="cde-filter__label">Catégorie</span>
          <el-select v-model="categorie" class="cde-toolbar__select" clearable placeholder="Toutes" @change="reloadArticles">
            <el-option
              v-for="(label, value) in LABO_ARTICLE_CATEGORIE_LABEL"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </div>
      </div>
      <div class="cde-toolbar__actions">
        <el-button :icon="Download" @click="() => openEntree()">Entrée</el-button>
        <el-button :icon="Upload" @click="() => openSortie()">Sortie</el-button>
        <el-button :icon="List" @click="() => openMouvements()">Mouvements</el-button>
        <el-button type="primary" :icon="Plus" @click="() => openArticleForm()">Nouvel article</el-button>
      </div>
    </div>

    <el-alert
      v-if="alertes.length > 0"
      type="warning"
      :closable="false"
      show-icon
      class="labo-stock__alert"
      :title="`${alertes.length} article(s) sous le seuil d'alerte`"
    >
      <template #default>
        {{ alertes.map((a) => `${a.nom} (${a.stockTotal ?? 0})`).join(' · ') }}
      </template>
    </el-alert>

    <div class="labo-stock__kpis">
      <div class="labo-stock__kpi"><b>{{ stats.articles }}</b><span>Articles</span></div>
      <div class="labo-stock__kpi"><b>{{ stats.lots }}</b><span>Lots en stock</span></div>
      <div class="labo-stock__kpi" :class="{ 'labo-stock__kpi--danger': stats.alertes > 0 }"><b>{{ stats.alertes }}</b><span>Alertes</span></div>
      <div class="labo-stock__kpi"><b>{{ formatMontant(stats.valeurStock) }}</b><span>Valeur du stock</span></div>
    </div>

    <div class="cde-table-wrap">
      <el-table :data="articles" v-loading="loading" size="small" style="width: 100%" aria-label="Articles de laboratoire">
        <el-table-column label="Code" width="110">
          <template #default="{ row }">{{ row.code || '—' }}</template>
        </el-table-column>
        <el-table-column prop="nom" label="Article" min-width="180" />
        <el-table-column label="Catégorie" width="130">
          <template #default="{ row }">
            {{ LABO_ARTICLE_CATEGORIE_LABEL[(row.categorie as LaboArticleCategorie) || 'reactif'] }}
          </template>
        </el-table-column>
        <el-table-column label="Stock" width="110">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="(row.stockTotal ?? 0) <= (row.seuilAlerte ?? 0) ? 'danger' : 'success'"
              effect="plain"
            >
              {{ row.stockTotal ?? 0 }} {{ row.uniteStock || '' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Seuil" width="80">
          <template #default="{ row }">{{ row.seuilAlerte ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="Fournisseur" min-width="150">
          <template #default="{ row }">{{ row.fournisseurNom || '—' }}</template>
        </el-table-column>
        <el-table-column label="Prix achat" width="120">
          <template #default="{ row }">{{ row.prixAchat != null ? formatMontant(row.prixAchat) : '—' }}</template>
        </el-table-column>
        <el-table-column label="Actions" width="190" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEntree(row)">Entrée</el-button>
            <el-button link type="success" size="small" @click="openSortie(row)">Sortie</el-button>
            <el-button link size="small" @click="openArticleForm(row)">Modifier</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="Aucun article de laboratoire" :image-size="70" />
        </template>
      </el-table>
    </div>

    <!-- Article form -->
    <el-dialog v-model="articleDialog" :title="editingArticleId ? 'Modifier un article' : 'Nouvel article'" width="600px">
      <el-form label-position="top" :model="articleForm">
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="Code"><el-input v-model="articleForm.code" placeholder="R-001" /></el-form-item>
          </el-col>
          <el-col :span="16">
            <el-form-item label="Nom" required><el-input v-model="articleForm.nom" /></el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="Catégorie">
              <el-select v-model="articleForm.categorie" style="width: 100%">
                <el-option
                  v-for="(label, value) in LABO_ARTICLE_CATEGORIE_LABEL"
                  :key="value"
                  :label="label"
                  :value="value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Unité"><el-input v-model="articleForm.uniteStock" placeholder="flacon, test…" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Seuil d'alerte">
              <el-input-number v-model="articleForm.seuilAlerte" :min="0" style="width: 100%" controls-position="right" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="Prix d'achat (GNF)">
              <el-input-number v-model="articleForm.prixAchat" :min="0" :step="500" style="width: 100%" controls-position="right" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Prix de vente (GNF)">
              <el-input-number v-model="articleForm.prixVente" :min="0" :step="500" style="width: 100%" controls-position="right" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="Fournisseur principal">
          <el-select v-model="articleForm.fournisseurPrincipalId" clearable filterable placeholder="—" style="width: 100%">
            <el-option v-for="f in fournisseurOptions" :key="f.value" :label="f.label" :value="f.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="Actif">
          <el-switch v-model="articleForm.actif" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="articleDialog = false">Annuler</el-button>
        <el-button type="primary" :loading="saving" @click="submitArticle">Enregistrer</el-button>
      </template>
    </el-dialog>

    <!-- Entrée de stock -->
    <el-dialog v-model="entreeDialog" title="Entrée de stock" width="560px">
      <el-form label-position="top" :model="entreeForm">
        <el-form-item label="Article" required>
          <el-select v-model="entreeForm.articleId" filterable placeholder="Choisir…" style="width: 100%">
            <el-option v-for="a in articles" :key="a.id" :label="a.nom" :value="a.id as number" />
          </el-select>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="Quantité" required>
              <el-input-number v-model="entreeForm.quantite" :min="1" style="width: 100%" controls-position="right" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="N° de lot"><el-input v-model="entreeForm.numeroLot" /></el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="Péremption">
              <el-date-picker v-model="entreeForm.datePeremption" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Prix d'achat unitaire">
              <el-input-number v-model="entreeForm.prixAchat" :min="0" :step="500" style="width: 100%" controls-position="right" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="Motif"><el-input v-model="entreeForm.motif" placeholder="Réception, retour…" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="entreeDialog = false">Annuler</el-button>
        <el-button type="primary" :loading="saving" @click="submitEntree">Enregistrer l'entrée</el-button>
      </template>
    </el-dialog>

    <!-- Sortie de stock -->
    <el-dialog v-model="sortieDialog" title="Sortie de stock" width="520px">
      <el-form label-position="top" :model="sortieForm">
        <el-form-item label="Article" required>
          <el-select v-model="sortieForm.articleId" filterable placeholder="Choisir…" style="width: 100%">
            <el-option v-for="a in articles" :key="a.id" :label="`${a.nom} (${a.stockTotal ?? 0} en stock)`" :value="a.id as number" />
          </el-select>
        </el-form-item>
        <el-form-item label="Quantité" required>
          <el-input-number v-model="sortieForm.quantite" :min="1" style="width: 100%" controls-position="right" />
        </el-form-item>
        <el-form-item label="Motif"><el-input v-model="sortieForm.motif" placeholder="Consommation analyse…" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sortieDialog = false">Annuler</el-button>
        <el-button type="primary" :loading="saving" @click="submitSortie">Enregistrer la sortie</el-button>
      </template>
    </el-dialog>

    <!-- Mouvements -->
    <el-dialog v-model="mouvementsDialog" title="Mouvements de stock" width="820px">
      <el-table :data="mouvements" size="small" style="width: 100%">
        <el-table-column label="Date" width="160">
          <template #default="{ row }">{{ row.createdAt || '—' }}</template>
        </el-table-column>
        <el-table-column prop="articleNom" label="Article" min-width="160" />
        <el-table-column label="Type" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="row.type === 'entree' ? 'success' : row.type === 'sortie' ? 'warning' : 'info'" effect="plain">
              {{ row.type === 'entree' ? 'Entrée' : row.type === 'sortie' ? 'Sortie' : 'Ajustement' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Qté" width="90">
          <template #default="{ row }">{{ row.quantite }}</template>
        </el-table-column>
        <el-table-column prop="motif" label="Motif / référence" min-width="180" />
        <template #empty><el-empty description="Aucun mouvement" :image-size="60" /></template>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, List, Plus, Search, Upload } from '@element-plus/icons-vue'
import {
  useLaboratoireStock,
  LABO_ARTICLE_CATEGORIE_LABEL,
  type LaboArticle,
  type LaboArticleCategorie,
} from '@/composables/useLaboratoireStock'
import { useFournisseurs } from '@/composables/useFournisseurs'
import { useAuth } from '@/composables/useAuth'

const {
  articles, mouvements, alertes, stats, loading,
  fetchArticles, createArticle, updateArticle,
  fetchLots, fetchAlertes, fetchStats, fetchMouvements,
  entreeStock, sortieStock,
} = useLaboratoireStock()
const { fournisseurs, fournisseurOptions, fetchFournisseurs } = useFournisseurs()
const { user } = useAuth()

const search = ref('')
const categorie = ref<string>('')
const saving = ref(false)

function reloadArticles(): void {
  fetchArticles({
    search: search.value || undefined,
    categorie: categorie.value || undefined,
  })
  fetchAlertes()
  fetchStats()
}

// ─── Article ───────────────────────────────────────────────────
const articleDialog = ref(false)
const editingArticleId = ref<number | null>(null)
const articleForm = reactive<LaboArticle>({
  code: '',
  nom: '',
  categorie: 'reactif',
  uniteStock: 'unité',
  seuilAlerte: 5,
  prixAchat: null,
  prixVente: null,
  fournisseurPrincipalId: null,
  actif: true,
})

function openArticleForm(row?: LaboArticle): void {
  editingArticleId.value = row?.id ?? null
  articleForm.code = row?.code ?? ''
  articleForm.nom = row?.nom ?? ''
  articleForm.categorie = row?.categorie ?? 'reactif'
  articleForm.uniteStock = row?.uniteStock ?? 'unité'
  articleForm.seuilAlerte = row?.seuilAlerte ?? 5
  articleForm.prixAchat = row?.prixAchat ?? null
  articleForm.prixVente = row?.prixVente ?? null
  articleForm.fournisseurPrincipalId = row?.fournisseurPrincipalId ?? null
  articleForm.actif = row?.actif ?? true
  articleDialog.value = true
}

async function submitArticle(): Promise<void> {
  if (!articleForm.nom?.trim()) {
    ElMessage.warning("Le nom de l'article est requis")
    return
  }
  saving.value = true
  try {
    const saved = editingArticleId.value
      ? await updateArticle({ ...articleForm, id: editingArticleId.value })
      : await createArticle({ ...articleForm })
    if (!saved) {
      ElMessage.error('Enregistrement impossible')
      return
    }
    ElMessage.success('Article enregistré')
    articleDialog.value = false
    reloadArticles()
  } finally {
    saving.value = false
  }
}

// ─── Entrée ────────────────────────────────────────────────────
const entreeDialog = ref(false)
const entreeForm = reactive({
  articleId: undefined as number | undefined,
  quantite: 1,
  numeroLot: '',
  datePeremption: '',
  prixAchat: 0,
  motif: '',
})

function openEntree(row?: LaboArticle): void {
  entreeForm.articleId = row?.id
  entreeForm.quantite = 1
  entreeForm.numeroLot = ''
  entreeForm.datePeremption = ''
  entreeForm.prixAchat = row?.prixAchat ?? 0
  entreeForm.motif = ''
  entreeDialog.value = true
}

async function submitEntree(): Promise<void> {
  if (!entreeForm.articleId) {
    ElMessage.warning('Sélectionnez un article')
    return
  }
  saving.value = true
  try {
    const ok = await entreeStock({
      articleId: entreeForm.articleId,
      quantite: entreeForm.quantite,
      numeroLot: entreeForm.numeroLot || undefined,
      datePeremption: entreeForm.datePeremption || undefined,
      prixAchat: entreeForm.prixAchat || undefined,
      motif: entreeForm.motif || 'Entrée manuelle',
      createdBy: user.value?.id,
    })
    if (!ok) {
      ElMessage.error('Entrée impossible')
      return
    }
    ElMessage.success('Entrée enregistrée')
    entreeDialog.value = false
    reloadArticles()
  } finally {
    saving.value = false
  }
}

// ─── Sortie ────────────────────────────────────────────────────
const sortieDialog = ref(false)
const sortieForm = reactive({
  articleId: undefined as number | undefined,
  quantite: 1,
  motif: '',
})

function openSortie(row?: LaboArticle): void {
  sortieForm.articleId = row?.id
  sortieForm.quantite = 1
  sortieForm.motif = ''
  sortieDialog.value = true
}

async function submitSortie(): Promise<void> {
  if (!sortieForm.articleId) {
    ElMessage.warning('Sélectionnez un article')
    return
  }
  saving.value = true
  try {
    const ok = await sortieStock({
      articleId: sortieForm.articleId,
      quantite: sortieForm.quantite,
      motif: sortieForm.motif || 'Sortie manuelle',
      createdBy: user.value?.id,
    })
    if (!ok) {
      ElMessage.error('Sortie impossible')
      return
    }
    ElMessage.success('Sortie enregistrée')
    sortieDialog.value = false
    reloadArticles()
  } finally {
    saving.value = false
  }
}

// ─── Mouvements ────────────────────────────────────────────────
const mouvementsDialog = ref(false)
async function openMouvements(): Promise<void> {
  mouvementsDialog.value = true
  await fetchMouvements({ limit: 300 })
}

function formatMontant(value: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(value)} GNF`
}

onMounted(async () => {
  reloadArticles()
  if (fournisseurs.value.length === 0) await fetchFournisseurs()
  void fetchLots()
})
</script>

<style scoped>
.labo-stock__alert {
  margin-bottom: 10px;
}
.labo-stock__kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}
.labo-stock__kpi {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  border: 1px solid var(--cd-border, #e4e7ed);
  border-radius: 6px;
  background: #fff;
}
.labo-stock__kpi b { font-size: 18px; }
.labo-stock__kpi span { font-size: 11px; text-transform: uppercase; color: var(--cd-gray-500, #909399); }
.labo-stock__kpi--danger b { color: #c0392b; }
</style>
