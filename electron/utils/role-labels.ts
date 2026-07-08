const ROLE_LABELS: Record<string, string> = {
  MEDECIN: 'Médecin',
  SECRETAIRE: 'Secrétaire',
  PHARMACIEN: 'Pharmacien',
  COMPTABLE: 'Comptable',
  ADMIN: 'Administrateur',
  INFIRMIER: 'Infirmier d\'État',
}

export function roleLabel(role?: string): string {
  return ROLE_LABELS[role || ''] || role || ''
}
