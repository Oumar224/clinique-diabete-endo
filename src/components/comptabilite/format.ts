/**
 * Formatage des montants dans les tableaux de comptabilité.
 *
 * L'unité monétaire est affichée une seule fois dans l'en-tête de colonne
 * (`Montant (GNF)`), les cellules ne contiennent que le nombre groupé.
 *
 * @param value - Montant en unité mineure de la devise (GNF : entier).
 * @returns Le montant groupé (`12 500`) ou `—` si la valeur est absente.
 */
export function formatMontant(value: number | null | undefined): string {
  if (value == null) return '—'
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return Math.round(amount).toLocaleString('fr-FR')
}

/**
 * Formate une quantité (unités de stock, articles commandés).
 *
 * Les quantités sont des entiers : aucun symbole monétaire n'est ajouté.
 * L'unité est portée par l'en-tête ou le libellé de la série.
 *
 * @param value - Quantité en unités.
 * @returns La quantité groupée (`1 250`) ou `—` si la valeur est absente.
 */
export function formatQuantite(value: number | null | undefined): string {
  if (value == null) return '—'
  const quantite = Number(value)
  if (!Number.isFinite(quantite)) return '—'
  return Math.round(quantite).toLocaleString('fr-FR')
}
