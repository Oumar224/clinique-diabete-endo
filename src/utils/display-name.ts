/**
 * Construit le nom complet affiché d'un utilisateur ou d'un médecin.
 *
 * @param nom - Nom de famille (sera mis en majuscules).
 * @param prenom - Prénom.
 * @param titlePrefix - Préfixe de titre optionnel (ex. `Dr`, `Pr`).
 * @returns Chaîne formatée avec le préfixe, le nom en majuscules et le prénom,
 *          séparés par des espaces. Les espaces superflus sont retirés.
 * @example
 * formatDisplayName('Diallo', 'Mamadou', 'Dr')
 * // => 'Dr DIALLO Mamadou'
 *
 * @example
 * formatDisplayName('Bah', 'Aissatou')
 * // => 'BAH Aissatou'
 */
export function formatDisplayName(nom: string, prenom: string, titlePrefix?: string): string {
  return [titlePrefix, nom?.toUpperCase(), prenom].filter(Boolean).join(' ')
}
