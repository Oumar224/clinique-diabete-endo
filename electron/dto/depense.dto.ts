import type { ModePaiement } from './invoice.dto'

export type DepenseSource = 'manuel' | 'stock_entree'
export type DepenseStatutPaiement = 'payee' | 'credit'

/**
 * Date de référence d'une dépense (défaut M1).
 *
 * - `ecriture` : la date d'ÉCRITURE de la dépense (`depense.date`). C'est la
 *   date comptable de l'engagement. **C'est la référence à utiliser pour les
 *   achats pharmacie** (`source = 'stock_entree'`) : leur date d'écriture est
 *   la date de réception/entrée en stock, alors que leur décaissement peut
 *   survenir plus tard (achat à crédit) ou jamais.
 * - `decaissement` : la date de DÉCAISSEMENT EFFECTIF. Seules les dépenses
 *   `statut_paiement = 'payee'` sont datées (`COALESCE(date_paiement, date)`) ;
 *   une dépense à crédit n'apparaît dans AUCUNE période de décaissement.
 *   C'est la seule référence qui RECONCILIE avec le journal de caisse, dont
 *   les sorties utilisent la même population.
 *
 * Une même dépense ne doit jamais être attribuée à deux périodes différentes :
 * la référence utilisée est toujours explicite et retournée dans la réponse.
 */
export type DepenseDateReference = 'ecriture' | 'decaissement'

export interface DepenseCategorieDto {
  id?: number
  code?: string
  nom?: string
  couleur?: string
  actif?: boolean
  ordre?: number
  createdAt?: string
  updatedAt?: string
}

export interface DepenseDto {
  id?: number
  date?: string
  categorieId?: number
  /** Libellé de la catégorie (jointure, lecture seule). */
  categorieNom?: string
  /** Code de la catégorie (jointure, lecture seule). */
  categorieCode?: string
  /** Couleur de la catégorie (jointure, lecture seule). */
  categorieCouleur?: string | null
  libelle?: string
  montant?: number
  modePaiement?: ModePaiement | null
  fournisseurId?: number | null
  fournisseurNom?: string
  reference?: string
  notes?: string
  source?: DepenseSource
  sourceId?: number | null
  statutPaiement?: DepenseStatutPaiement
  datePaiement?: string
  createdBy?: number
  createdAt?: string
  updatedAt?: string
}

export interface DepenseCategorieCreateDto {
  /** Généré à partir de `nom` (slug unique) lorsqu'il est absent. */
  code?: string
  nom: string
  couleur?: string
  actif?: boolean
  ordre?: number
}

export interface DepenseCategorieUpdateDto {
  nom?: string
  couleur?: string | null
  actif?: boolean
  ordre?: number
}

export interface DepenseCreateDto {
  date: string
  categorieId: number
  libelle: string
  montant: number
  modePaiement?: ModePaiement | null
  fournisseurId?: number | null
  fournisseurNom?: string
  reference?: string
  notes?: string
  statutPaiement?: DepenseStatutPaiement
  datePaiement?: string
  createdBy?: number
}

export interface DepenseUpdateDto {
  date?: string
  categorieId?: number
  libelle?: string
  montant?: number
  modePaiement?: ModePaiement | null
  fournisseurId?: number | null
  fournisseurNom?: string | null
  reference?: string | null
  notes?: string | null
  statutPaiement?: DepenseStatutPaiement
  datePaiement?: string | null
}

export interface DepenseListFiltres {
  dateDebut?: string
  dateFin?: string
  categorieId?: number
  statutPaiement?: DepenseStatutPaiement
  source?: DepenseSource
  search?: string
  /**
   * Date de référence utilisée pour borner la période.
   * Défaut : `ecriture` pour la liste opérationnelle.
   */
  dateReference?: DepenseDateReference
}

export interface DepenseMarquerPayeeDto {
  datePaiement?: string
  modePaiement: ModePaiement
}

/** Entrée interne : dépense générée automatiquement par une entrée de stock. */
export interface DepenseStockEntryInput {
  date: string
  libelle: string
  montant: number
  fournisseurId?: number | null
  fournisseurNom?: string
  reference?: string
  sourceId: number
  createdBy?: number
  /**
   * Statut de la dépense générée. Défaut historique `payee` pour rester
   * compatible avec les appels existants ; les entrées de stock passent
   * explicitement `credit`.
   */
  statutPaiement?: DepenseStatutPaiement
}

export interface DepenseSyntheseCategorieDto {
  categorieId?: number
  code?: string
  nom?: string
  couleur?: string | null
  total: number
  count: number
}

export interface DepenseSyntheseFournisseurDto {
  fournisseurNom: string
  total: number
  count: number
}

export interface DepenseSyntheseDto {
  total: number
  totalPaye: number
  totalCredit: number
  count: number
  parCategorie: DepenseSyntheseCategorieDto[]
  parFournisseur: DepenseSyntheseFournisseurDto[]
  /**
   * Date de référence effectivement utilisée pour le calcul.
   * Défaut : `decaissement` (reconcilie avec le journal de caisse).
   */
  dateReference: DepenseDateReference
}
