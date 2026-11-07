import type { ModePaiement } from './invoice.dto'

export type SalaireRubriqueType = 'fixe' | 'journalier'

export interface SalaireConfigRubriqueDto {
  id?: number
  configId?: number
  libelle?: string
  type?: SalaireRubriqueType
  montant?: number
  montantJour?: number | null
  /**
   * Nombre de jours appliqué à une rubrique journalière.
   * `null`/absent ⇒ utilise les jours travaillés de la configuration.
   */
  jours?: number | null
  impactNet?: boolean
  ordre?: number
  createdAt?: string
}

export interface SalaireConfigDto {
  id?: number
  userId?: number
  /** Période de paie au format YYYY-MM. */
  periode?: string
  base?: number
  joursTravailles?: number
  createdBy?: number
  createdAt?: string
  updatedAt?: string
  rubriques?: SalaireConfigRubriqueDto[]
}

export interface SalairePaiementDto {
  id?: number
  userId?: number
  periode?: string
  montantNet?: number
  modePaiement?: ModePaiement
  datePaiement?: string
  reference?: string
  /** Audit JSON (détail du calcul : base, rubriques, retenues…). */
  details?: string
  createdBy?: number
  createdAt?: string
}

export interface SalaireConfigRubriqueCreateDto {
  libelle: string
  type: SalaireRubriqueType
  montant?: number
  montantJour?: number | null
  /** Jours explicites d'une rubrique journalière (null ⇒ jours travaillés). */
  jours?: number | null
  impactNet?: boolean
  ordre?: number
}

export interface SalaireConfigCreateDto {
  userId: number
  periode: string
  base?: number
  joursTravailles?: number
  createdBy?: number
  rubriques?: SalaireConfigRubriqueCreateDto[]
}

/** Rubrique de paie validée, telle qu'exposée par l'API. */
export interface SalaireRubriqueDto extends SalaireConfigRubriqueCreateDto {
  id?: number
  configId?: number
  createdAt?: string
}

/** Employé (utilisateur actif non ADMIN) + sa configuration pour une période. */
export interface SalaireConfigRowDto {
  userId: number
  nom: string
  prenom: string
  role: string
  config: SalaireConfigDto | null
}

/** Ligne de la feuille de paie d'une période. */
export interface SalairePaieRowDto extends SalaireConfigRowDto {
  montantNet: number
  paye: boolean
  paiement: SalairePaiementDto | null
  datePaiement?: string
  modePaiement?: ModePaiement
  reference?: string
}

export interface SalairePayerDto {
  userId: number
  periode: string
  modePaiement: ModePaiement
  datePaiement: string
  reference?: string
  createdBy?: number
}

export interface SalairePayerBulkDto {
  periode: string
  /**
   * Budget demandé par le renderer. Ce n'est qu'une demande : le budget
   * effectif est plafonné au solde de caisse (lorsque celui-ci est connu et
   * positif).
   */
  montantDisponible: number
  modePaiement: ModePaiement
  datePaiement: string
  createdBy?: number
}

export interface PayerBulkResultDto {
  /** Nombre de salariés effectivement payés. */
  paid: number
  /** Nombre de salariés éligibles non payés (net dépassant le budget restant). */
  skipped: number
  totalPaye: number
  /** Budget non consommé (sur le budget EFFECTIF). */
  reste: number
  /** Budget demandé par le renderer. */
  budgetDemande?: number
  /**
   * Budget réellement appliqué : plafonné au solde de caisse lorsque celui-ci
   * est connu et positif, sinon égal au budget demandé.
   */
  budgetEffectif?: number
}

export interface SalaireHistoriqueFiltres {
  userId?: number
  periodeDebut?: string
  periodeFin?: string
}

export interface SalaireHistoriqueRowDto extends SalairePaiementDto {
  nom?: string
  prenom?: string
  role?: string
}

export interface SalairePaiementCreateDto {
  userId: number
  periode: string
  montantNet: number
  modePaiement: ModePaiement
  datePaiement: string
  reference?: string
  details?: string
  createdBy?: number
}

/** Identité d'un employé pour la fiche de paie. */
export interface SalairePayslipEmployeeDto {
  userId: number
  nom: string
  prenom: string
  role: string
  fonction?: string
  service?: string
  telephone?: string
  typeContrat?: string
  tempsTravail: 'PLEIN' | 'PARTIEL'
  numeroSecuriteSociale?: string
  dateDebutContrat?: string
}

/** Rubrique calculée d'une fiche de paie. */
export interface SalairePayslipRubriqueDto {
  libelle: string
  type: SalaireRubriqueType
  /** Montant fixe (type fixe) ou montant journalier (type journalier). */
  montant: number
  montantJour: number | null
  /** Jours effectivement appliqués (journalier uniquement). */
  jours: number | null
  impactNet: boolean
  /** Montant total de la rubrique ajouté au bulletin. */
  montantCalcule: number
}

/** Fiche de paie d'un employé pour une période. */
export interface SalairePayslipDto {
  employee: SalairePayslipEmployeeDto
  periode: string
  base: number
  joursTravailles: number
  rubriques: SalairePayslipRubriqueDto[]
  /** Base + toutes les rubriques (y compris informatives). */
  totalMensuel: number
  /** Somme des rubriques informatives (sans impact sur le net). */
  totalInformations: number
  /** Net à payer : base + rubriques avec impact net. */
  netAPayer: number
  /** Paiement enregistré pour la période, s'il existe. */
  paiement: SalairePaiementDto | null
}
