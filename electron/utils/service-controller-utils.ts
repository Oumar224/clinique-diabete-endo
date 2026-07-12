import type { ServiceControllerResultType } from '../@types/service-controller-result'

function safeStringify(value: unknown): string {
  if (value == null) return 'null'
  return JSON.stringify(value, (_key, val) =>
    typeof val === 'bigint' ? Number(val) : val
  )
}

export class ServiceControllerUtils {
  static async controllerAdvice(serviceRunner: () => Promise<unknown>): Promise<ServiceControllerResultType> {
    try {
      const result = await serviceRunner()
      const json = safeStringify(result)
      // 🔍 Trace: does the raw result have undefined keys?
      if (result && typeof result === 'object' && 'blocs' in (result as any)) {
        const blocs = (result as any).blocs as any[]
        if (blocs) {
          for (const bloc of blocs) {
            for (const soin of bloc.soins || []) {
              const hasPrescriptionId = 'prescriptionId' in soin
              const val = soin.prescriptionId
              console.log(`[safeStringify] BEFORE: soin.id=${soin.id} hasPrescriptionId=${hasPrescriptionId} value=%o (${typeof val})`, val)
            }
          }
        }
      }
      // 🔍 Trace: what does the JSON string look like (check if prescriptionId survived)?
      if (json && json.includes('bloc')) {
        console.log(`[safeStringify] JSON (first 500 chars):`, json.substring(0, 500))
      }
      const parsed = json ? JSON.parse(json) : null
      // 🔍 Trace: AFTER parse, check prescriptionId
      if (parsed && typeof parsed === 'object' && 'blocs' in parsed) {
        const blocs = parsed.blocs as any[]
        if (blocs) {
          for (const bloc of blocs) {
            for (const soin of bloc.soins || []) {
              const hasPrescriptionId = 'prescriptionId' in soin
              const val = soin.prescriptionId
              console.log(`[safeStringify] AFTER: soin.id=${soin.id} hasPrescriptionId=${hasPrescriptionId} value=%o (${typeof val})`, val)
            }
          }
        }
      }
      return { success: true, data: parsed, message: '' }
    } catch (error: unknown) {
      const message = (error as Error)?.message || (error as Error)?.name || 'Erreur inconnue'
      return { success: false, data: null, message }
    }
  }
}
