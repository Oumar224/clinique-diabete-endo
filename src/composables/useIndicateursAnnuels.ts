import { computed, ref } from 'vue'
import { ipcInvoke } from '@/utils/ipc'
import { useAuth } from '@/composables/useAuth'
import {
  METRIC_KEYS,
  type IndicateursAnnuelsDto,
  type IndicateursMensuelsDto,
  type IndicateursTotaux,
  type IndicateursYearRow,
  type MetricKey,
} from '@/types/indicateurs'

const CURRENT_YEAR = new Date().getFullYear()

/**
 * État et actions de l'écran « Indicateurs annuels ».
 *
 * La lecture (`indicateurs:annuels`) est ouverte aux rôles comptables ; les
 * mutations (`indicateurs:set-manuel` / `indicateurs:clear-manuel`) sont
 * réservées à ADMIN côté backend. `isAdmin` ne sert qu'à masquer l'édition
 * dans l'interface — l'autorisation réelle reste serveur.
 */
export function useIndicateursAnnuels() {
  const { user } = useAuth()

  const lignes = ref<IndicateursYearRow[]>([])
  const totaux = ref<IndicateursTotaux | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const range = ref({ fromYear: CURRENT_YEAR - 4, toYear: CURRENT_YEAR })

  // Détail mensuel : cache par année + états de chargement/erreur par année.
  // Le cache vit dans le composable afin qu'un repli puis une nouvelle
  // ouverture de la même année ne redéclenche jamais l'IPC.
  const mensuels = ref<Record<number, IndicateursMensuelsDto>>({})
  const mensuelLoading = ref<Record<number, boolean>>({})
  const mensuelErrors = ref<Record<number, string>>({})
  const mensuelRequests = new Map<number, Promise<IndicateursMensuelsDto | null>>()

  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  /** `true` dès qu'au moins une valeur (hors ligne vide) est disponible. */
  const hasData = computed(() =>
    lignes.value.some((ligne) => METRIC_KEYS.some((metric) => ligne[metric] != null)),
  )

  /**
   * Charge les indicateurs de la période demandée.
   *
   * Les erreurs sont conservées dans `error` et ne sont pas remontées par un
   * toast global (`silent: true`) : l'écran affiche son propre encart et un
   * bouton « Réessayer ».
   *
   * @param fromYear - Première année incluse.
   * @param toYear - Dernière année incluse.
   */
  async function fetchStats(fromYear: number, toYear: number): Promise<void> {
    range.value = { fromYear, toYear }
    loading.value = true
    error.value = null
    try {
      const data = await ipcInvoke<IndicateursAnnuelsDto>(
        'indicateurs:annuels',
        { fromYear, toYear },
        { silent: true },
      )
      lignes.value = data.lignes
      totaux.value = data.totaux
    } catch (e) {
      error.value = (e as Error).message || 'Impossible de charger les indicateurs annuels'
      lignes.value = []
      totaux.value = null
    } finally {
      loading.value = false
    }
  }

  /** Recharge la dernière période demandée. */
  async function refresh(): Promise<void> {
    await fetchStats(range.value.fromYear, range.value.toYear)
  }

  /**
   * Charge le détail mensuel d'une année, en cache pour la durée de vie de
   * l'écran.
   *
   * L'appel IPC n'est déclenché qu'une fois par année : un second appel
   * pendant le chargement partage la promesse en cours, et un appel après
   * succès retourne directement la copie mise en cache.
   *
   * `indicateurs:mensuels` est calculé côté backend : les erreurs restent
   * locales à l'année (`mensuelErrors`) pour que l'écran affiche un encart
   * inline avec « Réessayer », sans casser le tableau annuel.
   *
   * @param annee - Année du détail mensuel.
   * @returns Le détail mensuel, ou `null` si le chargement a échoué.
   */
  async function fetchMensuel(annee: number): Promise<IndicateursMensuelsDto | null> {
    const cached = mensuels.value[annee]
    if (cached) return cached

    const inFlight = mensuelRequests.get(annee)
    if (inFlight) return inFlight

    mensuelLoading.value = { ...mensuelLoading.value, [annee]: true }
    const nextErrors = { ...mensuelErrors.value }
    delete nextErrors[annee]
    mensuelErrors.value = nextErrors

    const request = (async (): Promise<IndicateursMensuelsDto | null> => {
      try {
        const data = await ipcInvoke<IndicateursMensuelsDto>(
          'indicateurs:mensuels',
          { annee },
          { silent: true },
        )
        if (!data || !Array.isArray(data.lignes)) {
          throw new Error('Réponse du détail mensuel invalide')
        }
        mensuels.value = { ...mensuels.value, [annee]: data }
        return data
      } catch (e) {
        mensuelErrors.value = {
          ...mensuelErrors.value,
          [annee]: (e as Error).message || 'Impossible de charger le détail mensuel',
        }
        return null
      } finally {
        const nextLoading = { ...mensuelLoading.value }
        delete nextLoading[annee]
        mensuelLoading.value = nextLoading
        mensuelRequests.delete(annee)
      }
    })()

    mensuelRequests.set(annee, request)
    return request
  }

  /**
   * Enregistre une valeur manuelle (réservé ADMIN côté backend), puis
   * rafraîchit les lignes et les totaux.
   *
   * @returns `true` si l'écriture a réussi.
   */
  async function setManuel(annee: number, metric: MetricKey, value: number): Promise<boolean> {
    saving.value = true
    error.value = null
    try {
      await ipcInvoke('indicateurs:set-manuel', { annee, metric, value })
      await fetchStats(range.value.fromYear, range.value.toYear)
      return true
    } catch (e) {
      error.value = (e as Error).message || "Impossible d'enregistrer la valeur"
      return false
    } finally {
      saving.value = false
    }
  }

  /**
   * Supprime une surcharge manuelle : la valeur calculée reprend la main.
   *
   * @returns `true` si la suppression a réussi.
   */
  async function clearManuel(annee: number, metric: MetricKey): Promise<boolean> {
    saving.value = true
    error.value = null
    try {
      await ipcInvoke('indicateurs:clear-manuel', { annee, metric })
      await fetchStats(range.value.fromYear, range.value.toYear)
      return true
    } catch (e) {
      error.value = (e as Error).message || 'Impossible de supprimer la valeur saisie'
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    lignes,
    totaux,
    loading,
    saving,
    error,
    range,
    mensuels,
    mensuelLoading,
    mensuelErrors,
    isAdmin,
    hasData,
    fetchStats,
    fetchMensuel,
    refresh,
    setManuel,
    clearManuel,
  }
}
