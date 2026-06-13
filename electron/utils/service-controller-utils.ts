import type { ServiceControllerResultType } from '../@types/service-controller-result'

function safeStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) =>
    typeof val === 'bigint' ? Number(val) : val
  )
}

export class ServiceControllerUtils {
  static async controllerAdvice(serviceRunner: () => Promise<unknown>): Promise<ServiceControllerResultType> {
    try {
      const result = await serviceRunner()
      return { success: true, data: JSON.parse(safeStringify(result)), message: '' }
    } catch (error: unknown) {
      return { success: false, data: null, message: (error as Error).message }
    }
  }
}
