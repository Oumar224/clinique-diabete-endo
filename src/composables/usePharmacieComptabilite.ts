import { computed, ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'
import type { ModePaiement } from './useSalaires'

export type { ModePaiement }
export { MODES_PAIEMENT } from './useSalaires'

/** Type de vente pharmacie, aligné sur `electron/dto/delivrance.dto.ts`. */
export type DelivranceTypeVente = 'facturee' | 'gratuite'

/** Statut financier d'une vente pharmacie. */
export type StatutFinancierVente = 'gratuite' | 'sans_montant' | 'credit' | 'partielle' | 'payee'

export interface VentePharmaciePaiementDto {
  id?: number
  delivranceId?: number
  montant?: number
  modePaiement?: ModePaiement
  datePaiement?: string
  reference?: string
  numeroRecu?: string
  createdBy?: number
  createdAt?: string
}

export interface VentePharmacieLigneDto {
  id?: number
  delivranceId?: number
  medicamentId?: number
  libelle?: string
  quantiteDemandee?: number
  quantiteServie?: number
  lotId?: number
  prixUnitaire?: number
  montant?: number
  coutAchatTotal?: number
  createdAt?: string
}

export interface VentePharmacieDto {
  id: number
  dateVente?: string
  typeVente: DelivranceTypeVente
  motifGratuite?: string
  statut: 'a_servir' | 'partielle' | 'servie' | 'annulee'
  patient: { id: number; nom?: string; prenom?: string } | null
  lignes: VentePharmacieLigneDto[]
  paiements: VentePharmaciePaiementDto[]
  montantTotal: number
  montantPaye: number
  reste: number
  statutFinancier: StatutFinancierVente
  /** Vrai si une ligne servie n'a pas de prix de vente renseigné. */
  prixManquant: boolean
}

export interface VentePharmacieFiltres {
  dateDebut?: string
  dateFin?: string
  patientId?: number
  statut?: StatutFinancierVente
}

export interface VenteCreditPatientDto {
  patientId: number | null
  patientNom: string
  patientPrenom?: string
  nbVentes: number
  montantTotal: number
  montantPaye: number
  reste: number
  datePremiereVente?: string
  dateDerniereVente?: string
  /** Date d'arrêté utilisée par le backend (ventes antérieures incluses). */
  dateReference?: string
}

/**
 * Produit du classement « top médicaments ».
 *
 * Le coût d'achat et la marge sont fournis par
 * `dispensation:synthese-comptable` ; le renderer ne les recalcule plus.
 */
export interface TopMedicamentDto {
  medicamentId: number | null
  libelle: string
  quantite: number
  ca: number
  /** Coût d'achat ; `null` si la donnée n'est pas disponible. */
  cout: number | null
  /** Marge (CA − coût) ; `null` si la donnée n'est pas disponible. */
  marge: number | null
}

/**
 * Agrégat de gratuité par motif.
 *
 * Le coût est fourni par `dispensation:synthese-comptable`.
 */
export interface TopMotifGratuitDto {
  motif: string
  count: number
  valeur: number
  cout: number | null
}

/** Produit renvoyé par `dispensation:synthese-comptable` (contrat brut). */
export interface SynthesePharmacieTopProduitDto {
  medicamentId?: number | null
  libelle: string
  quantite: number
  ca: number
  cout?: number | null
  marge?: number | null
}

/** Motif de gratuité renvoyé par `dispensation:synthese-comptable` (contrat brut). */
export interface SynthesePharmacieTopMotifDto {
  motif: string
  count: number
  valeur: number
  cout?: number | null
}

export interface SynthesePharmacieCreancePatientDto {
  patientId: number | null
  patientNom: string
  patientPrenom?: string
  montantTotal: number
  montantPaye: number
  reste: number
}

export interface SynthesePharmacieDto {
  dateDebut?: string
  dateFin?: string
  caFacture: number
  encaisse: number
  creances: number
  gratuiteCount: number
  gratuiteValeur: number
  gratuiteCout: number
  coutTotal: number
  coutFacture: number
  margeBrute: number
  margeNette: number
  achats: number
  achatsPayes: number
  achatsCredit: number
  topMedicamentsCA: SynthesePharmacieTopProduitDto[]
  topMedicamentsQuantite: SynthesePharmacieTopProduitDto[]
  topMotifsGratuits: SynthesePharmacieTopMotifDto[]
  creancesParPatient: SynthesePharmacieCreancePatientDto[]
}

export interface EncaisserVenteParams {
  delivranceId: number
  montant: number
  modePaiement: ModePaiement
  datePaiement?: string
  reference?: string
  createdBy?: number
}

/** Dépense minimale consommée pour l'agrégat « achats par fournisseur ». */
export interface DepensePharmacieDto {
  id?: number
  date?: string
  libelle?: string
  montant?: number
  fournisseurId?: number | null
  fournisseurNom?: string
  reference?: string
  source?: string
  statutPaiement?: 'payee' | 'credit'
}

export interface DepenseSyntheseFournisseurDto {
  fournisseurNom: string
  total: number
  count: number
}

/** Date de référence utilisée par le backend pour borner la période. */
export type DepenseDateReference = 'ecriture' | 'decaissement'

export interface DepenseSynthesePharmacieDto {
  total: number
  totalPaye: number
  totalCredit: number
  count: number
  parCategorie?: { categorieId?: number; code?: string; nom?: string; couleur?: string | null; total: number; count: number }[]
  parFournisseur?: DepenseSyntheseFournisseurDto[]
  /**
   * Référence temporelle effectivement appliquée par le backend.
   * `decaissement` (défaut) ne compte que les dépenses payées ; `ecriture`
   * compte les dépenses payées ET à crédit.
   */
  dateReference?: DepenseDateReference
}

/** Agrégat achats par fournisseur calculé à partir des dépenses `stock_entree`. */
export interface AchatFournisseurDto {
  fournisseurId: number | null
  fournisseurNom: string
  total: number
  paye: number
  credit: number
  count: number
}

export interface AchatsPharmacieDto {
  synthese: DepenseSynthesePharmacieDto
  fournisseurs: AchatFournisseurDto[]
}

const SYNTHESE_VIDE: DepenseSynthesePharmacieDto = {
  total: 0,
  totalPaye: 0,
  totalCredit: 0,
  count: 0,
  parCategorie: [],
  parFournisseur: [],
  dateReference: 'ecriture',
}

/** Construit les paramètres de période IPC en omettant les valeurs vides. */
function dateParams(dateDebut?: string, dateFin?: string): { dateDebut?: string; dateFin?: string } {
  const params: { dateDebut?: string; dateFin?: string } = {}
  if (dateDebut) params.dateDebut = dateDebut
  if (dateFin) params.dateFin = dateFin
  return params
}

/**
 * Accès aux données de comptabilité pharmacie.
 *
 * Canaux IPC consommés :
 * - `dispensation:synthese-comptable` — agrégats financiers de la période ;
 * - `dispensation:ventes` — détail des ventes (et ventes d'un patient) ;
 * - `dispensation:ventes-credit` — créances regroupées par patient ;
 * - `depense:synthese` — achats pharmacie (`source = 'stock_entree'`) ;
 * - `dispensation:encaisser` — encaissement d'un paiement sur une vente.
 *
 * Tous les montants sont des entiers GNF. Les erreurs IPC sont capturées
 * dans `error` et les fonctions de lecture renvoient `null` / `[]` afin que
 * l'écran puisse afficher un état d'erreur sans démonter l'onglet.
 */
export function usePharmacieComptabilite() {
  const synthese = ref<SynthesePharmacieDto | null>(null)
  const ventes = ref<VentePharmacieDto[]>([])
  const ventesCredit = ref<VenteCreditPatientDto[]>([])
  const achats = ref<AchatsPharmacieDto | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  let pending = 0

  /** Signale une opération en vol et bascule `loading` sans doublon. */
  async function track<T>(task: () => Promise<T>): Promise<T> {
    pending += 1
    loading.value = true
    try {
      return await task()
    } finally {
      pending -= 1
      loading.value = pending > 0
    }
  }

  /** Vide le dernier message d'erreur (à appeler avant un nouveau chargement). */
  function clearError(): void {
    error.value = null
  }

  /**
   * Charge la synthèse comptable de la période (`dispensation:synthese-comptable`).
   *
   * @param dateDebut - Borne basse incluse (format `YYYY-MM-DD`).
   * @param dateFin - Borne haute incluse (format `YYYY-MM-DD`).
   * @returns La synthèse, ou `null` si le canal a échoué.
   */
  async function fetchSynthese(dateDebut?: string, dateFin?: string): Promise<SynthesePharmacieDto | null> {
    return track(async () => {
      error.value = null
      try {
        synthese.value = (await ipcInvoke<SynthesePharmacieDto>(
          'dispensation:synthese-comptable',
          dateParams(dateDebut, dateFin),
          { silent: true },
        )) ?? null
        return synthese.value
      } catch (e) {
        error.value = (e as Error).message
        synthese.value = null
        return null
      }
    })
  }

  /**
   * Charge le détail des ventes de la période (`dispensation:ventes`).
   *
   * @param filtres - Période, patient et statut financier optionnels.
   * @returns Les ventes, ou `[]` si le canal a échoué.
   */
  async function fetchVentes(filtres: VentePharmacieFiltres = {}): Promise<VentePharmacieDto[]> {
    return track(async () => {
      try {
        ventes.value = (await ipcInvoke<VentePharmacieDto[]>(
          'dispensation:ventes',
          filtres as Record<string, unknown>,
          { silent: true },
        )) ?? []
        return ventes.value
      } catch (e) {
        error.value = (e as Error).message
        ventes.value = []
        return []
      }
    })
  }

  /**
   * Récupère les ventes d'un patient sans écraser la liste affichée dans
   * l'onglet (utilisé par le dialogue « Créances par patient »).
   *
   * @param patientId - Identifiant du patient.
   * @param dateFin - Borne haute de recherche.
   * @returns Les ventes du patient, ou `[]` si le canal a échoué.
   */
  async function findVentesForPatient(patientId: number, dateFin?: string): Promise<VentePharmacieDto[]> {
    return track(async () => {
      try {
        const params: VentePharmacieFiltres = { patientId }
        if (dateFin) params.dateFin = dateFin
        return (await ipcInvoke<VentePharmacieDto[]>(
          'dispensation:ventes',
          params as Record<string, unknown>,
          { silent: true },
        )) ?? []
      } catch (e) {
        error.value = (e as Error).message
        return []
      }
    })
  }

  /**
   * Charge les créances regroupées par patient (`dispensation:ventes-credit`).
   *
   * @param dateDebut - Borne basse incluse (format `YYYY-MM-DD`).
   * @param dateFin - Borne haute incluse (format `YYYY-MM-DD`).
   * @returns Les créances par patient, ou `[]` si le canal a échoué.
   */
  async function fetchVentesCredit(dateDebut?: string, dateFin?: string): Promise<VenteCreditPatientDto[]> {
    return track(async () => {
      try {
        ventesCredit.value = (await ipcInvoke<VenteCreditPatientDto[]>(
          'dispensation:ventes-credit',
          dateParams(dateDebut, dateFin),
          { silent: true },
        )) ?? []
        return ventesCredit.value
      } catch (e) {
        error.value = (e as Error).message
        ventesCredit.value = []
        return []
      }
    })
  }

  /**
   * Charge les achats pharmacie (`depense:synthese`, source `stock_entree`).
   *
   * La période est bornée par la **date d'écriture** (`dateReference:
   * 'ecriture'`) : la synthèse `decaissement` par défaut ne contient que les
   * dépenses payées et ferait disparaître les achats à crédit. Le total
   * affiché reste ainsi `payé + crédit`, cohérent avec la répartition.
   *
   * Le canal backend n'expose qu'un total par fournisseur ; la répartition
   * « payé / à crédit » par fournisseur est donc obtenue en rejouant la même
   * synthèse filtrée sur le statut de paiement (même référence de date).
   *
   * @param dateDebut - Borne basse incluse (format `YYYY-MM-DD`).
   * @param dateFin - Borne haute incluse (format `YYYY-MM-DD`).
   * @returns L'agrégat achats, ou `null` si le canal a échoué.
   */
  async function fetchAchats(dateDebut?: string, dateFin?: string): Promise<AchatsPharmacieDto | null> {
    return track(async () => {
      try {
        const base = {
          ...dateParams(dateDebut, dateFin),
          source: 'stock_entree' as const,
          dateReference: 'ecriture' as const,
        }
        const [all, payes, credits] = await Promise.all([
          ipcInvoke<DepenseSynthesePharmacieDto>('depense:synthese', base, { silent: true }),
          ipcInvoke<DepenseSynthesePharmacieDto>(
            'depense:synthese',
            { ...base, statutPaiement: 'payee' },
            { silent: true },
          ),
          ipcInvoke<DepenseSynthesePharmacieDto>(
            'depense:synthese',
            { ...base, statutPaiement: 'credit' },
            { silent: true },
          ),
        ])

        const parFournisseur = new Map<string, AchatFournisseurDto>()
        const ensure = (nom: string): AchatFournisseurDto => {
          const existing = parFournisseur.get(nom)
          if (existing) return existing
          const created: AchatFournisseurDto = {
            fournisseurId: null,
            fournisseurNom: nom,
            total: 0,
            paye: 0,
            credit: 0,
            count: 0,
          }
          parFournisseur.set(nom, created)
          return created
        }

        for (const ligne of all?.parFournisseur ?? []) {
          const cible = ensure(ligne.fournisseurNom)
          cible.total = ligne.total
          cible.count = ligne.count
        }
        for (const ligne of payes?.parFournisseur ?? []) {
          ensure(ligne.fournisseurNom).paye = ligne.total
        }
        for (const ligne of credits?.parFournisseur ?? []) {
          ensure(ligne.fournisseurNom).credit = ligne.total
        }

        achats.value = {
          synthese: all ?? SYNTHESE_VIDE,
          fournisseurs: Array.from(parFournisseur.values()).sort(
            (a, b) => b.total - a.total || a.fournisseurNom.localeCompare(b.fournisseurNom),
          ),
        }
        return achats.value
      } catch (e) {
        error.value = (e as Error).message
        achats.value = null
        return null
      }
    })
  }

  /**
   * Enregistre un encaissement sur une vente à crédit (`dispensation:encaisser`).
   *
   * @param params - Delivrance, montant encaissé, mode et date de paiement.
   * @returns La vente mise à jour.
   * @throws L'erreur backend si l'encaissement est refusé.
   */
  async function encaisser(params: EncaisserVenteParams): Promise<VentePharmacieDto> {
    saving.value = true
    error.value = null
    try {
      const result = await ipcInvoke<VentePharmacieDto>('dispensation:encaisser', params, { silent: true })
      if (!result) throw new Error('Encaissement refusé')
      return result
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  /** Top médicaments classés par chiffre d'affaires (DTO backend). */
  const topMedicamentsCA = computed<TopMedicamentDto[]>(() =>
    (synthese.value?.topMedicamentsCA ?? []).map((row) => ({
      medicamentId: row.medicamentId ?? null,
      libelle: row.libelle,
      quantite: row.quantite,
      ca: row.ca,
      cout: row.cout ?? null,
      marge: row.marge ?? null,
    })),
  )

  /** Top médicaments classés par quantité dispensée (DTO backend). */
  const topMedicamentsQuantite = computed<TopMedicamentDto[]>(() =>
    (synthese.value?.topMedicamentsQuantite ?? []).map((row) => ({
      medicamentId: row.medicamentId ?? null,
      libelle: row.libelle,
      quantite: row.quantite,
      ca: row.ca,
      cout: row.cout ?? null,
      marge: row.marge ?? null,
    })),
  )

  /** Gratuités regroupées par motif (valeur catalogue + coût backend). */
  const topMotifsGratuits = computed<TopMotifGratuitDto[]>(() =>
    (synthese.value?.topMotifsGratuits ?? []).map((row) => ({
      motif: row.motif,
      count: row.count,
      valeur: row.valeur,
      cout: row.cout ?? null,
    })),
  )

  return {
    synthese,
    ventes,
    ventesCredit,
    achats,
    loading,
    saving,
    error,
    topMedicamentsCA,
    topMedicamentsQuantite,
    topMotifsGratuits,
    clearError,
    fetchSynthese,
    fetchVentes,
    findVentesForPatient,
    fetchVentesCredit,
    fetchAchats,
    encaisser,
  }
}
