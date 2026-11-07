/**
 * Reçu de service — document remis au patient pour une prestation réalisée
 * au laboratoire ou à la pharmacie.
 *
 * Il est commun aux deux modules afin que le rendu (aperçu et PDF) soit
 * strictement identique : mêmes en-têtes, même tableau de prestations, mêmes
 * totaux et mêmes signatures.
 */
export interface RecuServiceLigneDto {
  label: string
  quantite: number
  prixUnitaire: number
  montant: number
}

export interface RecuServicePaiementDto {
  date: string
  montant: number
  mode: string
  reference?: string | null
  numeroRecu?: string | null
}

export type RecuServiceStatutPaiement = 'non_paye' | 'partiel' | 'paye' | 'exonere'

export interface RecuServiceDto {
  /** Numéro du reçu (numéro de la demande labo ou référence de la vente). */
  ref: string
  /** Date de la prestation (AAAA-MM-JJ). */
  date: string
  service: 'laboratoire' | 'pharmacie'
  /** Origine de la demande, pour le laboratoire. */
  origine?: 'Interne' | 'Externe'
  patientNom?: string
  patientPrenom?: string
  patientNip?: string | null
  patientTelephone?: string | null
  prescripteur?: string | null
  /** Libellé lisible du statut de la demande (laboratoire). */
  statut?: string | null
  statutPaiement: RecuServiceStatutPaiement
  /**
   * Demande interne non réglée : les honoraires sont portés au dossier patient.
   * Le laboratoire n'encaisse rien, donc aucun reste dû n'est affiché.
   */
  factureAuDossier?: boolean
  lignes: RecuServiceLigneDto[]
  paiements: RecuServicePaiementDto[]
  montantTotal: number
  montantPaye: number
  reste: number
  caissier?: string | null
}
