/**
 * Préfixes téléphoniques internationaux associés aux devises de l'application.
 *
 * @remarks La clé est le code ISO 4217 de la devise, la valeur est l'indicatif
 * téléphonique international (ex. `GNF` → `+224` pour la Guinée).
 *
 * Note: plusieurs pays d'Afrique de l'Ouest partagent la même devise (XOF)
 * mais ont des indicatifs téléphoniques différents. Cette table ne couvre
 * qu'un sous-ensemble — préférer {@link WEST_AFRICAN_COUNTRY_CODES} pour
 * une liste exhaustive.
 */
export const CURRENCY_PHONE_CODES: Record<string, string> = {
  GNF: '+224',
  XOF: '+221',
  EUR: '+33',
  USD: '+1',
}

/**
 * Liste des indicatifs téléphoniques des pays d'Afrique de l'Ouest.
 * Utilisée pour la sélection de code pays dans les formulaires.
 */
export const WEST_AFRICAN_COUNTRY_CODES: string[] = [
  '+224', // Guinée
  '+221', // Sénégal
  '+225', // Côte d'Ivoire
  '+226', // Burkina Faso
  '+227', // Niger
  '+228', // Togo
  '+229', // Bénin
  '+223', // Mali
  '+245', // Guinée-Bissau
]
