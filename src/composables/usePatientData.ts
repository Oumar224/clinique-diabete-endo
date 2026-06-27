import { ref, watch, type Ref } from 'vue'
import { ElMessage } from 'element-plus'

export function usePatientData<T>(
  fetchFn: (patientId: number) => Promise<T>,
  patientId: Ref<number | string | undefined>,
) {
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function load(id: number) {
    if (!id) {
      loading.value = false
      data.value = null
      return
    }
    loading.value = true
    error.value = null
    try {
      data.value = await fetchFn(id)
    } catch (e) {
      const msg = (e as Error).message
      error.value = msg
      ElMessage.error(`Erreur de chargement: ${msg}`)
    } finally {
      loading.value = false
    }
  }

  watch(patientId, (val) => {
    const id = Number(val)
    if (id) load(id)
  }, { immediate: true })

  return { data, loading, error, refetch: () => load(Number(patientId.value)) }
}
