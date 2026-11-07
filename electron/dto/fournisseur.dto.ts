export interface FournisseurDto {
  id?: number
  nom?: string
  contact?: string
  telephone?: string
  email?: string
  adresse?: string
  actif?: boolean
  /** Fournisseur « Pharmacie Centrale de Guinée » (unique). */
  estPharmacieCentrale?: boolean
  createdAt?: string
  updatedAt?: string
}
