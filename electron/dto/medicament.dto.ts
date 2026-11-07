export type TypeProduit = 'medicament' | 'dispositif' | 'consommable' | 'autre'

export const TYPES_PRODUIT: readonly TypeProduit[] = ['medicament', 'dispositif', 'consommable', 'autre'] as const

/** Unités fermées Phase 1 — 13 valeurs autorisées (alignées frontend). */
export const UNITES_AUTORISEES: readonly string[] = [
  'cp',
  'gél',
  'stylo',
  'plaquette',
  'blister',
  'tube',
  'flacon',
  'ampoule',
  'mL',
  'mg',
  'UI',
  'boîte',
  'autre',
] as const

export type UnitePharmacie = (typeof UNITES_AUTORISEES)[number]

export interface MedicamentDto {
  id?: number
  dci?: string
  nomCommercial?: string
  dosage?: string
  forme?: string
  uniteStock?: string
  seuilAlerte?: number
  actif?: boolean
  createdAt?: string
  updatedAt?: string
  /** Phase 1 — catalogue unique. Requis, défaut 'medicament'. */
  typeProduit?: TypeProduit
  /** Phase 1 — texte libre. Ex : 'boîte de 30 comprimés'. */
  conditionnement?: string
  /** Phase 1 — couple contenance tout-ou-rien avec uniteContenance. */
  contenanceQte?: number | null
  uniteContenance?: string
  /** Phase 1 — précision obligatoire si uniteStock ou uniteContenance == 'autre'. */
  autreUnitePrecision?: string
  /** Phase 1 — prix optionnels (NULLables), obligatoires en Phase 2. */
  prixAchat?: number | null
  prixVente?: number | null
  fournisseurPrincipalId?: number | null
}
