import { ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'

/** Modes de règlement du laboratoire, alignés sur `electron/dto/laboratoire.dto.ts`. */
export type LaboModePaiement = 'espece' | 'mobile_money' | 'carte' | 'virement' | 'cheque' | 'exonere'

export interface LaboComptabilitePaiementDto {
  id: number
  examRequestId: number
  numero: string | null
  patient: string
  externe: boolean
  montant: number
  modePaiement: LaboModePaiement
  datePaiement: string
  reference: string | null
}

export interface LaboComptabiliteImpayeDto {
  id: number
  numero: string | null
  patient: string
  externe: boolean
  date: string | null
  montant: number
  montantPaye: number
  reste: number
  statutPaiement: 'non_paye' | 'partiel' | 'paye' | 'exonere'
}

export interface LaboComptabiliteModeDto {
  mode: LaboModePaiement
  count: number
  montant: number
}

export interface LaboComptabiliteTopExamenDto {
  examenId: number | null
  libelle: string
  count: number
  montant: number
}

/** Synthèse renvoyée par le canal IPC `labo:comptabilite`. */
export interface LaboComptabiliteSyntheseDto {
  dateDebut: string | null
  dateFin: string | null
  demandes: number
  realisees: number
  annulees: number
  internes: number
  externes: number
  caFacture: number
  encaisse: number
  creances: number
  exonerations: number
  impayesCount: number
  parMode: LaboComptabiliteModeDto[]
  topExamens: LaboComptabiliteTopExamenDto[]
  paiements: LaboComptabilitePaiementDto[]
  impayes: LaboComptabiliteImpayeDto[]
}

/** Libellés français des modes de règlement laboratoire. */
export const LABO_MODE_PAIEMENT_LABEL: Record<LaboModePaiement, string> = {
  espece: 'Espèces',
  mobile_money: 'Mobile Money',
  carte: 'Carte',
  virement: 'Virement',
  cheque: 'Chèque',
  exonere: 'Exonération',
}

export const LABO_MODES_PAIEMENT: LaboModePaiement[] = [
  'espece',
  'mobile_money',
  'carte',
  'virement',
  'cheque',
  'exonere',
]

export interface EncaisserLaboParams {
  id: number
  montant: number
  modePaiement: LaboModePaiement
  datePaiement?: string
  reference?: string
}

function dateParams(dateDebut?: string, dateFin?: string): { dateDebut?: string; dateFin?: string } {
  const params: { dateDebut?: string; dateFin?: string } = {}
  if (dateDebut) params.dateDebut = dateDebut
  if (dateFin) params.dateFin = dateFin
  return params
}

/**
 * Accès aux données comptables du laboratoire.
 *
 * Canaux IPC consommés :
 * - `labo:comptabilite` — synthèse de la période ;
 * - `labo:paiement` — encaissement d'une demande.
 *
 * Les montants sont des entiers GNF. Les erreurs sont capturées dans `error`
 * afin que l'onglet affiche un état d'erreur sans se démonter.
 */
export function useLaboratoireComptabilite() {
  const synthese = ref<LaboComptabiliteSyntheseDto | null>(null)
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

  function clearError(): void {
    error.value = null
  }

  /**
   * Charge la synthèse comptable de la période (`labo:comptabilite`).
   *
   * @param dateDebut - Borne basse incluse (`AAAA-MM-JJ`).
   * @param dateFin - Borne haute incluse (`AAAA-MM-JJ`).
   * @returns La synthèse, ou `null` si le canal a échoué.
   */
  async function fetchSynthese(
    dateDebut?: string,
    dateFin?: string,
  ): Promise<LaboComptabiliteSyntheseDto | null> {
    return track(async () => {
      error.value = null
      try {
        synthese.value = (await ipcInvoke<LaboComptabiliteSyntheseDto>(
          'labo:comptabilite',
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
   * Enregistre un encaissement sur une demande de laboratoire (`labo:paiement`).
   *
   * @param params - Demande, montant, mode et date de règlement.
   * @returns La synthèse rafraîchie, ou `null` si le rechargement échoue.
   * @throws L'erreur backend si l'encaissement est refusé.
   */
  async function encaisser(params: EncaisserLaboParams): Promise<void> {
    saving.value = true
    error.value = null
    try {
      const exonere = params.modePaiement === 'exonere'
      await ipcInvoke('labo:paiement', {
        id: params.id,
        montant: exonere ? undefined : params.montant,
        modePaiement: params.modePaiement,
        datePaiement: params.datePaiement,
        reference: params.reference,
        exonere,
      }, { silent: true })
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      saving.value = false
    }
  }

  return {
    synthese,
    loading,
    saving,
    error,
    clearError,
    fetchSynthese,
    encaisser,
  }
}
