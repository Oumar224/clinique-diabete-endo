import type { ServiceControllerResultType } from '../@types/service-controller-result'

export class ServiceControllerUtils {
  static async controllerAdvice(serviceRunner: () => Promise<unknown>): Promise<ServiceControllerResultType> {
    try {
      const result = await serviceRunner()
      return { success: true, data: JSON.parse(JSON.stringify(result)), message: '' }
    } catch (error: unknown) {
      return { success: false, data: null, message: (error as Error).message }
    }
  }
}
