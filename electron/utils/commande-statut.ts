const COMMANDE_STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  partielle: 'Partielle',
  livree: 'Livrée',
  cloturee: 'Clôturée',
  annulee: 'Annulée',
}

/** Libellé français d'un statut de bon de commande (fallback : valeur brute). */
export function commandeStatutLabel(statut?: string | null): string {
  if (!statut) return '—'
  return COMMANDE_STATUT_LABELS[statut] ?? statut
}
