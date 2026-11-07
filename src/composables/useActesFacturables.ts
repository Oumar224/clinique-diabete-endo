import { computed, ref } from 'vue'
import { useMedicalActs } from '@/composables/useMedicalActs'
import { useConfigTarifs } from '@/composables/useConfigTarifs'

/**
 * Acte médical facturable : acte actif + tarif STANDARD résolu.
 *
 * @description Snapshot prix Phase 1 (UI seule) : le prix est figé dans la
 * ligne de facture au moment de la sélection. Aucune FK acte/tarif n'est
 * persistée — `_acteId` / `_tarifId` restent en mémoire locale pour Phase 2.
 */
export interface ActeFacturable {
  id: number
  code: string
  label: string
  prixStandard: number
  tarifId?: number
  serviceName?: string
}

/** Code tarif standard — vérifié via TarifsTab / useConfigTarifs (défaut `createTarif`). */
export const CODE_TARIF_STANDARD = 'TARIF.STANDARD'

const loaded = ref(false)
const loading = ref(false)
const loadError = ref<string | null>(null)

export function useActesFacturables() {
  const { acts, fetchActs } = useMedicalActs()
  const { tarifs, fetchTarifs } = useConfigTarifs()

  const actesFacturables = computed<ActeFacturable[]>(() => {
    const prixByActeId = new Map<number, { prix: number; tarifId?: number }>()
    for (const t of tarifs.value) {
      // Dernier tarif listé gagne (fetchTarifs filtré sur TARIF.STANDARD).
      if (t.acte_id != null) prixByActeId.set(t.acte_id, { prix: t.prix_unitaire, tarifId: t.id })
    }
    const out: ActeFacturable[] = []
    for (const a of acts.value) {
      if (a.id == null) continue
      if (a.is_active === false) continue
      const found = prixByActeId.get(a.id)
      if (!found) {
        console.warn(`[facturation] acte sans tarif STANDARD exclu : ${a.code} (id=${a.id})`)
        continue
      }
      out.push({
        id: a.id,
        code: a.code,
        label: a.label,
        prixStandard: found.prix,
        tarifId: found.tarifId,
        serviceName: a.service_name,
      })
    }
    out.sort((x, y) => x.code.localeCompare(y.code, 'fr'))
    return out
  })

  const prixByActeId = computed(() => {
    const m = new Map<number, number>()
    for (const a of actesFacturables.value) m.set(a.id, a.prixStandard)
    return m
  })

  function findById(acteId: number | null | undefined): ActeFacturable | undefined {
    if (acteId == null) return undefined
    return actesFacturables.value.find(a => a.id === acteId)
  }

  /**
   * Charge actes actifs + tarifs STANDARD en parallèle, lazy + cache mémoire.
   * Appelé à l'ouverture du dialog — ne recharge plus ensuite (Phase 1).
   */
  async function ensureLoaded(): Promise<void> {
    if (loaded.value || loading.value) return
    loading.value = true
    loadError.value = null
    try {
      await Promise.all([
        fetchActs({ activeOnly: true }),
        fetchTarifs(undefined, CODE_TARIF_STANDARD),
      ])
      loaded.value = true
    } catch (e) {
      loadError.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  return {
    actesFacturables,
    prixByActeId,
    loading,
    loaded,
    loadError,
    ensureLoaded,
    findById,
  }
}
