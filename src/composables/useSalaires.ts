import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

/**
 * Types alignés sur `electron/dto/salaire.dto.ts`.
 *
 * Tous les montants sont des entiers GNF.
 */

export type SalaireRubriqueType = 'fixe' | 'journalier'

export type ModePaiement =
  | 'espèces'
  | 'carte_bancaire'
  | 'chèque'
  | 'virement'
  | 'mobile_money'
  | 'assurance'
  | 'autre'

/** Modes de paiement acceptés par le backend, avec libellés d'affichage. */
export const MODES_PAIEMENT: ReadonlyArray<{ value: ModePaiement; label: string }> = [
  { value: 'espèces', label: 'Espèces' },
  { value: 'carte_bancaire', label: 'Carte bancaire' },
  { value: 'chèque', label: 'Chèque' },
  { value: 'virement', label: 'Virement' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'assurance', label: 'Assurance' },
  { value: 'autre', label: 'Autre' },
]

export interface SalaireRubrique {
  id?: number
  configId?: number
  libelle?: string
  type?: SalaireRubriqueType
  montant?: number
  montantJour?: number | null
  /** Jours explicites d'une rubrique journalière (null ⇒ jours travaillés). */
  jours?: number | null
  impactNet?: boolean
  ordre?: number
  createdAt?: string
}

export interface SalaireConfig {
  id?: number
  userId?: number
  /** Période de paie au format YYYY-MM. */
  periode?: string
  base?: number
  joursTravailles?: number
  createdBy?: number
  createdAt?: string
  updatedAt?: string
  rubriques?: SalaireRubrique[]
}

export interface SalairePaiement {
  id?: number
  userId?: number
  periode?: string
  montantNet?: number
  modePaiement?: ModePaiement
  datePaiement?: string
  reference?: string
  details?: string
  createdBy?: number
  createdAt?: string
}

export interface SalaireConfigRow {
  userId: number
  nom: string
  prenom: string
  role: string
  config: SalaireConfig | null
}

export interface SalairePaieRow extends SalaireConfigRow {
  montantNet: number
  paye: boolean
  paiement: SalairePaiement | null
  datePaiement?: string
  modePaiement?: ModePaiement
  reference?: string
}

export interface SalaireRubriqueCreate {
  libelle: string
  type: SalaireRubriqueType
  montant?: number
  montantJour?: number | null
  /** Jours explicites d'une rubrique journalière (null ⇒ jours travaillés). */
  jours?: number | null
  impactNet?: boolean
  ordre?: number
}

export interface SalaireConfigCreate {
  userId: number
  periode: string
  base?: number
  joursTravailles?: number
  createdBy?: number
  rubriques?: SalaireRubriqueCreate[]
}

export interface SalairePayerPayload {
  userId: number
  periode: string
  modePaiement: ModePaiement
  datePaiement: string
  reference?: string
  createdBy?: number
}

export interface SalairePayerBulkPayload {
  periode: string
  montantDisponible: number
  modePaiement: ModePaiement
  datePaiement: string
  createdBy?: number
}

export interface PayerBulkResult {
  paid: number
  skipped: number
  totalPaye: number
  reste: number
}

export interface SalaireHistoriqueFiltres {
  userId?: number
  periodeDebut?: string
  periodeFin?: string
}

/** Rubrique calculée d'une fiche de paie. */
export interface SalairePayslipRubrique {
  libelle: string
  type: SalaireRubriqueType
  montant: number
  montantJour: number | null
  jours: number | null
  impactNet: boolean
  montantCalcule: number
}

/** Fiche de paie d'un employé pour une période (miroir du backend). */
export interface SalairePayslip {
  employee: {
    userId: number
    nom: string
    prenom: string
    role: string
    fonction?: string
    service?: string
    telephone?: string
    typeContrat?: string
    dateDebutContrat?: string
    tempsTravail?: 'PLEIN' | 'PARTIEL'
    numeroSecuriteSociale?: string
  }
  periode: string
  base: number
  joursTravailles: number
  rubriques: SalairePayslipRubrique[]
  totalMensuel: number
  totalInformations: number
  netAPayer: number
  paiement: SalairePaiement | null
}

export interface SalaireHistoriqueRow extends SalairePaiement {
  nom?: string
  prenom?: string
  role?: string
}

/**
 * Calcule le net d'une configuration de salaire.
 *
 * Miroir exact de `computeSalaireNet` du backend :
 * `base + Σ(rubriques fixes impactant le net) + Σ(montant journalier × jours)`.
 * Utilisé uniquement pour l'aperçu live du formulaire.
 *
 * @param config - Configuration (base, jours travaillés, rubriques).
 * @returns Le net arrondi en GNF.
 */
export function computeSalaireNet(
  config: Pick<SalaireConfig, 'base' | 'joursTravailles' | 'rubriques'>,
): number {
  const base = Number(config.base ?? 0)
  const jours = Number(config.joursTravailles ?? 0)
  let net = Number.isFinite(base) ? base : 0

  for (const rubrique of config.rubriques ?? []) {
    if (rubrique.impactNet === false) continue
    if (rubrique.type === 'fixe') {
      const montant = Number(rubrique.montant ?? 0)
      if (Number.isFinite(montant)) net += montant
    } else if (rubrique.type === 'journalier') {
      const montantJour = Number(rubrique.montantJour ?? 0)
      const joursRubrique = rubrique.jours == null ? jours : Number(rubrique.jours)
      if (Number.isFinite(montantJour) && Number.isFinite(joursRubrique)) {
        net += montantJour * joursRubrique
      }
    }
  }

  return Math.round(net)
}


/**
 * Rubriques de paie proposées par défaut dans le formulaire de configuration.
 *
 * Elles ne sont PAS un modèle global : elles sont copiées dans le formulaire à
 * l'ouverture pour une nouvelle configuration, puis restent modifiables.
 * « Salaire de base » n'en fait pas partie : il correspond au champ `base`.
 */
export const SALAIRES_RUBRIQUES_DEFAUT: ReadonlyArray<SalaireRubriqueCreate> = [
  { libelle: 'Prime de responsabilité', type: 'fixe', montant: 0, impactNet: true, ordre: 0 },
  {
    libelle: 'Prime de transport',
    type: 'journalier',
    montant: 0,
    montantJour: 0,
    jours: 24,
    impactNet: false,
    ordre: 1,
  },
  { libelle: "Prime forfaitaire heures supplémentaires", type: 'fixe', montant: 0, impactNet: true, ordre: 2 },
  { libelle: 'Prime de Garde', type: 'fixe', montant: 0, impactNet: true, ordre: 3 },
  { libelle: 'Prime de rendement', type: 'fixe', montant: 0, impactNet: true, ordre: 4 },
]

/** Copie neuve des rubriques standard (évite de partager l'objet constant). */
export function buildDefaultRubriques(): SalaireRubriqueCreate[] {
  return SALAIRES_RUBRIQUES_DEFAUT.map((rubrique) => ({ ...rubrique }))
}

export function useSalaires() {
  const paie = ref<SalairePaieRow[]>([])
  const configs = ref<SalaireConfigRow[]>([])
  const historique = ref<SalaireHistoriqueRow[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function run<T>(task: () => Promise<T>, state: 'loading' | 'saving' = 'loading'): Promise<T> {
    const target = state === 'saving' ? saving : loading
    target.value = true
    error.value = null
    try {
      return await task()
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      target.value = false
    }
  }

  /** Charge la feuille de paie d'une période (`salaire:paie`). */
  async function fetchPaie(periode: string): Promise<SalairePaieRow[]> {
    const rows = await run(() => ipcInvoke<SalairePaieRow[]>('salaire:paie', { periode }))
    paie.value = rows ?? []
    return paie.value
  }

  /** Charge les configurations d'une période (`salaire:configs`). */
  async function fetchConfigs(periode: string): Promise<SalaireConfigRow[]> {
    const rows = await run(() => ipcInvoke<SalaireConfigRow[]>('salaire:configs', { periode }))
    configs.value = rows ?? []
    return configs.value
  }

  /** Charge la fiche de paie d'un employé (`salaire:payslip`). */
  async function fetchPayslip(userId: number, periode: string): Promise<SalairePayslip> {
    return run(() => ipcInvoke<SalairePayslip>('salaire:payslip', { userId, periode }))
  }

  /** Crée ou remplace la configuration d'un employé (`salaire:config:save`). */
  async function saveConfig(dto: SalaireConfigCreate): Promise<SalaireConfig> {
    return run(() => ipcInvoke<SalaireConfig>('salaire:config:save', dto), 'saving')
  }

  /** Copie les configurations du mois précédent (`salaire:config:copy-previous`). */
  async function copyPreviousMonth(periode: string): Promise<{ copied: number; skipped: number }> {
    return run(() => ipcInvoke<{ copied: number; skipped: number }>('salaire:config:copy-previous', { periode }), 'saving')
  }

  /** Paie un employé (`salaire:payer`). */
  async function payer(dto: SalairePayerPayload): Promise<SalairePaiement> {
    return run(() => ipcInvoke<SalairePaiement>('salaire:payer', dto), 'saving')
  }

  /** Paie les employés couverts par un budget (`salaire:payer-bulk`). */
  async function payerBulk(dto: SalairePayerBulkPayload): Promise<PayerBulkResult> {
    return run(() => ipcInvoke<PayerBulkResult>('salaire:payer-bulk', dto), 'saving')
  }

  /** Charge l'historique des paiements (`salaire:historique`). */
  async function fetchHistorique(filtres: SalaireHistoriqueFiltres = {}): Promise<SalaireHistoriqueRow[]> {
    const rows = await run(() => ipcInvoke<SalaireHistoriqueRow[]>('salaire:historique', filtres))
    historique.value = rows ?? []
    return historique.value
  }

  /**
   * Charge l'historique des paiements d'un employé (`salaire:historique`).
   *
   * Contrairement à `fetchHistorique`, n'écrase pas la ref partagée
   * `historique` : le résultat est destiné au cache local du tableau.
   *
   * @param userId - Identifiant de l'employé.
   * @returns Les paiements de l'employé, du plus récent au plus ancien.
   */
  async function fetchPaiementsEmploye(userId: number): Promise<SalaireHistoriqueRow[]> {
    // Sans `userId`, `salaire:historique` renvoie la paie de TOUS les employés.
    if (!Number.isInteger(userId)) return []
    return (await ipcInvoke<SalaireHistoriqueRow[]>('salaire:historique', { userId })) ?? []
  }

  return {
    paie,
    configs,
    historique,
    loading,
    saving,
    error,
    fetchPaie,
    fetchConfigs,
    fetchPayslip,
    saveConfig,
    copyPreviousMonth,
    payer,
    payerBulk,
    fetchHistorique,
    fetchPaiementsEmploye,
  }
}
