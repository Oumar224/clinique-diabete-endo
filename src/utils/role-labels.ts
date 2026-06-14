/**
 * Map des libellés en français pour chaque rôle utilisateur.
 *
 * @remarks Utilisé dans les tableaux et formulaires pour afficher
 * un libellé lisible à la place du code brut (ex. `MEDECIN` → `Médecin`).
 */
export const ROLE_LABELS: Record<string, string> = {
  MEDECIN: 'Médecin',
  SECRETAIRE: 'Secrétaire',
  PHARMACIEN: 'Pharmacien',
  COMPTABLE: 'Comptable',
  ADMIN: 'Administrateur',
}
