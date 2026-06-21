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
      return { success: true, data: json ? JSON.parse(json) : null, message: '' }
    } catch (error: unknown) {
      return { success: false, data: null, message: (error as Error).message }
    }
  }
}
