export type LaboArticleCategorie = 'reactif' | 'consommable' | 'milieu' | 'kit' | 'autre'

export interface LaboArticleDto {
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
  createdAt?: string
  updatedAt?: string
  /** Lecture : stock total toutes les lignes de lots confondues. */
  stockTotal?: number
}

export interface LaboStockLotDto {
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
  updatedAt?: string
}

export interface LaboMouvementStockDto {
  id?: number
  articleId?: number
  articleNom?: string
  lotId?: number | null
  type?: 'entree' | 'sortie' | 'ajustement'
  quantite?: number
  motif?: string
  reference?: string
  createdBy?: number | null
  createdAt?: string
}

export interface LaboCommandeLigneDto {
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

export interface LaboCommandeDto {
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
  createdAt?: string
  updatedAt?: string
  lignes?: LaboCommandeLigneDto[]
  /** Pourcentage reçu calculé (0–100). */
  avancement?: number
}

export interface LaboReceptionLigneDto {
  id?: number
  receptionId?: number
  ligneId?: number
  quantite?: number
  numeroLot?: string
  datePeremption?: string | null
}

export interface LaboCommandeReceptionDto {
  id?: number
  commandeId?: number
  dateReception?: string
  numeroBon?: string
  notes?: string
  createdBy?: number | null
  createdAt?: string
  lignes?: LaboReceptionLigneDto[]
}

export type LaboModePaiement = 'espece' | 'mobile_money' | 'carte' | 'virement' | 'cheque' | 'exonere'

export interface LaboPaiementDto {
  id?: number
  examRequestId?: number
  montant?: number
  modePaiement?: LaboModePaiement
  datePaiement?: string
  reference?: string
  createdBy?: number | null
  createdAt?: string
}

/** Encaissement enrichi (demande + identité) pour la comptabilité laboratoire. */
export interface LaboComptabilitePaiementDto {
  id: number
  examRequestId: number
  numero: string | null
  patient: string
  externe: boolean
  montant: number
  modePaiement: LaboModePaiement
  datePaiement: string
  reference: string | null
}

/** Demande de laboratoire restant à encaisser. */
export interface LaboComptabiliteImpayeDto {
  id: number
  numero: string | null
  patient: string
  externe: boolean
  date: string | null
  montant: number
  montantPaye: number
  reste: number
  statutPaiement: 'non_paye' | 'partiel' | 'paye' | 'exonere'
}

export interface LaboComptabiliteModeDto {
  mode: LaboModePaiement
  count: number
  montant: number
}

export interface LaboComptabiliteTopExamenDto {
  examenId: number | null
  libelle: string
  count: number
  montant: number
}

/**
 * Synthèse comptable de la période pour le laboratoire.
 *
 * `caFacture` et `impayes` sont bornés par la date planifiée de la demande,
 * tandis que `encaisse`, `parMode` et `paiements` sont bornés par la date
 * d'encaissement. Les deux périmètres peuvent donc différer sur une période
 * glissante, comme pour la synthèse pharmacie.
 */
export interface LaboComptabiliteSyntheseDto {
  dateDebut: string | null
  dateFin: string | null
  demandes: number
  realisees: number
  annulees: number
  internes: number
  externes: number
  caFacture: number
  encaisse: number
  creances: number
  exonerations: number
  impayesCount: number
  parMode: LaboComptabiliteModeDto[]
  topExamens: LaboComptabiliteTopExamenDto[]
  paiements: LaboComptabilitePaiementDto[]
  impayes: LaboComptabiliteImpayeDto[]
}
