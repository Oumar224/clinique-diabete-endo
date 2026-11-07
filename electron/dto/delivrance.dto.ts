import type { ModePaiement } from './invoice.dto'

export type DelivranceStatut = 'a_servir' | 'partielle' | 'servie' | 'annulee'

export type DelivranceTypeVente = 'facturee' | 'gratuite'

export interface DelivranceDto {
  id?: number
  source?: string
  sourceDocumentId?: string
  patientId?: number
  statut?: DelivranceStatut
  servedBy?: number
  servedAt?: string
  motif?: string
  /** Date effective de la vente (comptabilité pharmacie). */
  dateVente?: string
  typeVente?: DelivranceTypeVente
  motifGratuite?: string
  /**
   * Montant total de la vente, FIGÉ par le serveur (prix de vente figé au
   * premier service). Source de vérité : le renderer ne doit jamais le
   * recalculer depuis le catalogue.
   */
  montantTotal?: number
  /** Somme des paiements déjà encaissés sur cette délivrance. */
  montantPaye?: number
  /** Reste à payer (`montantTotal - montantPaye`). Négatif si sur-encaissé. */
  reste?: number
  /** Statut financier calculé par le serveur. */
  statutFinancier?: StatutFinancierVente
  /**
   * Vrai si au moins une ligne servie n'a pas de prix de vente renseigné
   * (délivrance antérieure au module de comptabilité, par exemple).
   */
  prixManquant?: boolean
  createdAt?: string
}

export interface DelivranceLigneDto {
  id?: number
  delivranceId?: number
  medicamentId?: number
  libelle?: string
  quantiteDemandee?: number
  quantiteServie?: number
  lotId?: number
  /** Montants figés au moment de la délivrance (entiers, devise locale). */
  prixUnitaire?: number
  montant?: number
  coutAchatTotal?: number
  createdAt?: string
}

export interface VentePharmaciePaiementDto {
  id?: number
  delivranceId?: number
  montant?: number
  modePaiement?: ModePaiement
  datePaiement?: string
  reference?: string
  numeroRecu?: string
  createdBy?: number
  createdAt?: string
}

/** Paiement optionnel encaissé immédiatement lors de la délivrance. */
export interface ServirPaiementDto {
  montant: number
  modePaiement: ModePaiement
  datePaiement?: string
  reference?: string
}

/** Encaissement d'un paiement sur une vente déjà réalisée. */
export interface EncaisserVenteDto {
  delivranceId: number
  montant: number
  modePaiement: ModePaiement
  datePaiement?: string
  reference?: string
  createdBy?: number
}

export type StatutFinancierVente = 'gratuite' | 'sans_montant' | 'credit' | 'partielle' | 'payee'

export interface VentePharmacieLigneDto extends DelivranceLigneDto {}

export interface VentePharmacieDto {
  id: number
  dateVente?: string
  typeVente: DelivranceTypeVente
  motifGratuite?: string
  statut: DelivranceStatut
  patient: { id: number; nom?: string; prenom?: string } | null
  lignes: VentePharmacieLigneDto[]
  paiements: VentePharmaciePaiementDto[]
  montantTotal: number
  montantPaye: number
  /**
   * Reste à payer. Négatif si la vente a été encaissée au-delà de son
   * montant (anomalie comptable signalée via `anomalie`).
   */
  reste: number
  statutFinancier: StatutFinancierVente
  /** Vrai si une ligne servie n'a pas de prix de vente renseigné. */
  prixManquant: boolean
  /**
   * Anomalie comptable détectée (ex. encaissement supérieur au montant
   * facturé). Absent en fonctionnement normal.
   */
  anomalie?: string
}

/**
 * Filtres des ventes pharmacie.
 *
 * Deux périmètres coexistent et ne doivent pas être confondus :
 *  - `listVentes` (table des ventes) : périmètre PÉRIODE, borné par
 *    `dateDebut`/`dateFin` ;
 *  - `getVentesCredit` (créances) : périmètre « AS OF » `dateFin`, sans borne
 *    basse — une créance est due tant qu'elle n'est pas encaissée.
 */
export interface VentePharmacieFiltres {
  /** Borne basse (uniquement pour le périmètre période). */
  dateDebut?: string
  /** Date de référence haute (bornes inclusive). */
  dateFin?: string
  patientId?: number
  statut?: StatutFinancierVente
}

/**
 * Créances regroupées par patient — périmètre « AS OF `dateFin` » :
 * toutes les ventes facturées datées au plus tard à `dateFin` et encore
 * impayées, sans borne basse sur la date de vente.
 */
export interface VenteCreditPatientDto {
  patientId: number | null
  patientNom: string
  patientPrenom?: string
  nbVentes: number
  montantTotal: number
  montantPaye: number
  reste: number
  datePremiereVente?: string
  dateDerniereVente?: string
  /** Date de référence du calcul (as-of). */
  dateReference?: string
}

export interface SynthesePharmacieTopProduitDto {
  medicamentId?: number | null
  libelle: string
  quantite: number
  ca: number
  /** Coût d'achat total des lignes du groupe (somme de `cout_achat_total`). */
  cout: number
  /** Marge brute du groupe (`ca - cout`). */
  marge: number
}

export interface SynthesePharmacieTopMotifDto {
  motif: string
  count: number
  valeur: number
  /** Coût d'achat total des lignes gratuites du motif. */
  cout: number
}

export interface SynthesePharmacieCreancePatientDto {
  patientId: number | null
  patientNom: string
  patientPrenom?: string
  montantTotal: number
  montantPaye: number
  reste: number
}

export interface SynthesePharmacieDto {
  dateDebut?: string
  dateFin?: string
  /** Chiffre d'affaires des ventes facturées (hors gratuités). */
  caFacture: number
  /** Somme des encaissements sur la période (par date de paiement). */
  encaisse: number
  /**
   * Créances restantes sur les ventes facturées au plus tard à `dateFin`
   * (périmètre « as of », ventes annulées exclues) — identique au périmètre
   * de `getVentesCredit`.
   */
  creances: number
  gratuiteCount: number
  /** Valeur catalogue des lignes gratuites (prix de vente figé). */
  gratuiteValeur: number
  /** Coût d'achat des lignes gratuites. */
  gratuiteCout: number
  coutTotal: number
  coutFacture: number
  /** caFacture - coutFacture. */
  margeBrute: number
  /** caFacture - coutTotal (la gratuité est comptée comme un coût). */
  margeNette: number
  achats: number
  achatsPayes: number
  achatsCredit: number
  topMedicamentsCA: SynthesePharmacieTopProduitDto[]
  topMedicamentsQuantite: SynthesePharmacieTopProduitDto[]
  topMotifsGratuits: SynthesePharmacieTopMotifDto[]
  creancesParPatient: SynthesePharmacieCreancePatientDto[]
}
