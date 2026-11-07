import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

export type LaboArticleCategorie = 'reactif' | 'consommable' | 'milieu' | 'kit' | 'autre'

export interface LaboArticle {
  id?: number
  code?: string
  nom?: string
  categorie?: LaboArticleCategorie
  uniteStock?: string
  seuilAlerte?: number
  prixAchat?: number | null
  prixVente?: number | null
  fournisseurPrincipalId?: number | null
  fournisseurNom?: string
  actif?: boolean
  stockTotal?: number
}

export interface LaboStockLot {
  id?: number
  articleId?: number
  articleNom?: string
  uniteStock?: string
  numeroLot?: string
  quantite?: number
  quantiteRestante?: number
  datePeremption?: string
  fournisseurId?: number | null
  prixAchat?: number | null
  createdAt?: string
}

export interface LaboMouvement {
  id?: number
  articleId?: number
  articleNom?: string
  lotId?: number | null
  type?: 'entree' | 'sortie' | 'ajustement'
  quantite?: number
  motif?: string
  reference?: string
  createdAt?: string
}

export interface LaboCommandeLigne {
  id?: number
  commandeId?: number
  articleId?: number
  articleNom?: string
  uniteStock?: string
  quantite?: number
  quantiteRecue?: number
  prixUnitaire?: number
  montantLigne?: number
}

export type LaboCommandeStatut = 'brouillon' | 'envoyee' | 'partielle' | 'livree' | 'cloturee' | 'annulee'

export interface LaboCommande {
  id?: number
  numero?: string
  fournisseurId?: number | null
  fournisseurNom?: string
  statut?: LaboCommandeStatut
  dateCommande?: string
  dateLivraisonPrevue?: string | null
  montantTotal?: number
  notes?: string
  createdBy?: number | null
  lignes?: LaboCommandeLigne[]
  avancement?: number
}

export interface LaboReceptionLigne {
  ligneId: number
  quantite: number
  numeroLot?: string
  datePeremption?: string
}

export interface LaboStockStats {
  articles: number
  alertes: number
  lots: number
  valeurStock: number
  commandesEnCours: number
}

const articles = ref<LaboArticle[]>([])
const lots = ref<LaboStockLot[]>([])
const mouvements = ref<LaboMouvement[]>([])
const alertes = ref<LaboArticle[]>([])
const commandes = ref<LaboCommande[]>([])
const stats = ref<LaboStockStats>({ articles: 0, alertes: 0, lots: 0, valeurStock: 0, commandesEnCours: 0 })
const loading = ref(false)
const error = ref<string | null>(null)

export function useLaboratoireStock() {
  async function fetchArticles(filters: { search?: string; categorie?: string; actif?: boolean } = {}): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const rows = await ipcInvoke<LaboArticle[]>('labo-stock:articles-list', filters)
      articles.value = Array.isArray(rows) ? rows : []
    } catch (e) {
      error.value = (e as Error).message
      articles.value = []
    } finally {
      loading.value = false
    }
  }

  async function createArticle(dto: LaboArticle): Promise<LaboArticle | null> {
    error.value = null
    try {
      return await ipcInvoke<LaboArticle>('labo-stock:article-create', dto, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function updateArticle(dto: LaboArticle & { id: number }): Promise<LaboArticle | null> {
    error.value = null
    try {
      return await ipcInvoke<LaboArticle>('labo-stock:article-update', dto, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function fetchLots(filters: { articleId?: number; includeEmpty?: boolean } = {}): Promise<void> {
    try {
      const rows = await ipcInvoke<LaboStockLot[]>('labo-stock:lots', filters, { silent: true })
      lots.value = Array.isArray(rows) ? rows : []
    } catch (e) {
      error.value = (e as Error).message
      lots.value = []
    }
  }

  async function fetchMouvements(filters: { articleId?: number; limit?: number } = {}): Promise<void> {
    try {
      const rows = await ipcInvoke<LaboMouvement[]>('labo-stock:mouvements', filters, { silent: true })
      mouvements.value = Array.isArray(rows) ? rows : []
    } catch (e) {
      error.value = (e as Error).message
      mouvements.value = []
    }
  }

  async function fetchAlertes(): Promise<void> {
    try {
      const rows = await ipcInvoke<LaboArticle[]>('labo-stock:alertes', {}, { silent: true })
      alertes.value = Array.isArray(rows) ? rows : []
    } catch {
      alertes.value = []
    }
  }

  async function fetchStats(): Promise<void> {
    try {
      const result = await ipcInvoke<LaboStockStats>('labo-stock:stats', {}, { silent: true })
      if (result) stats.value = result
    } catch {
      // non bloquant
    }
  }

  async function entreeStock(payload: {
    articleId: number
    quantite: number
    numeroLot?: string
    datePeremption?: string
    fournisseurId?: number
    prixAchat?: number
    motif?: string
    reference?: string
    createdBy?: number
  }): Promise<boolean> {
    error.value = null
    try {
      await ipcInvoke('labo-stock:entree', payload, { silent: true })
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  async function sortieStock(payload: {
    articleId: number
    quantite: number
    motif?: string
    reference?: string
    createdBy?: number
  }): Promise<boolean> {
    error.value = null
    try {
      await ipcInvoke('labo-stock:sortie', payload, { silent: true })
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  async function ajustementStock(payload: {
    articleId: number
    lotId: number
    nouvelleQuantite: number
    motif?: string
    createdBy?: number
  }): Promise<boolean> {
    error.value = null
    try {
      await ipcInvoke('labo-stock:ajustement', payload, { silent: true })
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }

  // ─── Commandes ───────────────────────────────────────────────
  async function fetchCommandes(filters: { statut?: string; search?: string } = {}): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const rows = await ipcInvoke<LaboCommande[]>('labo-commande:list', filters)
      commandes.value = Array.isArray(rows) ? rows : []
    } catch (e) {
      error.value = (e as Error).message
      commandes.value = []
    } finally {
      loading.value = false
    }
  }

  async function getCommande(id: number): Promise<LaboCommande | null> {
    try {
      return await ipcInvoke<LaboCommande>('labo-commande:get', { id }, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function createCommande(dto: LaboCommande): Promise<LaboCommande | null> {
    error.value = null
    try {
      return await ipcInvoke<LaboCommande>('labo-commande:create', dto, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function updateStatutCommande(id: number, statut: LaboCommandeStatut): Promise<LaboCommande | null> {
    error.value = null
    try {
      return await ipcInvoke<LaboCommande>('labo-commande:statut', { id, statut }, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  async function receptionnerCommande(dto: {
    commandeId: number
    dateReception?: string
    numeroBon?: string
    notes?: string
    lignes: LaboReceptionLigne[]
    createdBy?: number
  }): Promise<LaboCommande | null> {
    error.value = null
    try {
      return await ipcInvoke<LaboCommande>('labo-commande:reception-create', dto, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      return null
    }
  }

  return {
    articles, lots, mouvements, alertes, commandes, stats, loading, error,
    fetchArticles, createArticle, updateArticle,
    fetchLots, fetchMouvements, fetchAlertes, fetchStats,
    entreeStock, sortieStock, ajustementStock,
    fetchCommandes, getCommande, createCommande, updateStatutCommande, receptionnerCommande,
  }
}

export const LABO_ARTICLE_CATEGORIE_LABEL: Record<LaboArticleCategorie, string> = {
  reactif: 'Réactif',
  consommable: 'Consommable',
  milieu: 'Milieu de culture',
  kit: 'Kit',
  autre: 'Autre',
}

export const LABO_COMMANDE_STATUT_LABEL: Record<LaboCommandeStatut, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  partielle: 'Partielle',
  livree: 'Livrée',
  cloturee: 'Clôturée',
  annulee: 'Annulée',
}

export const LABO_COMMANDE_STATUT_TYPE: Record<LaboCommandeStatut, 'info' | 'warning' | 'success' | 'danger' | 'primary'> = {
  brouillon: 'info',
  envoyee: 'primary',
  partielle: 'warning',
  livree: 'success',
  cloturee: 'info',
  annulee: 'danger',
}
