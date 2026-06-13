import path from 'node:path'
import { container } from 'tsyringe'
import { app } from 'electron'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import { SettingsService } from '../services/settings.service'
import { ServiceService } from '../services/service.service'
import { MedicalActService } from '../services/medical-act.service'
import { SystemService } from '../services/system.service'
import { CurrencyService } from '../services/currency.service'
import { createHandler } from '../utils/create-handler'

// ─── Supported currencies (matching frontend currency.config.ts) ──
const SUPPORTED_CURRENCIES = [
  { code: 'GNF', symbol: 'GNF', name: 'Franc Guinéen', locale: 'fr-FR', decimals: 0 },
  { code: 'EUR', symbol: '€',   name: 'Euro',            locale: 'fr-FR', decimals: 2 },
  { code: 'USD', symbol: '$',   name: 'Dollar US',       locale: 'en-US', decimals: 2 },
  { code: 'XOF', symbol: 'CFA', name: 'Franc CFA',       locale: 'fr-FR', decimals: 0 },
]

export function registerSettingsHandlers() {
  // ════════════════════════════════════════════════════════════════
  // EXISTING: settings:get / settings:set (backward compatible)
  // ════════════════════════════════════════════════════════════════
  createHandler('settings:get', async ({ key }: { key: string }) => {
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const service = new SettingsService(db as never)
    return { value: await service.getSetting(key) }
  })

  createHandler('settings:set', async ({ key, value }: { key: string; value: string }) => {
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const service = new SettingsService(db as never)
    await service.setSetting(key, value)
    return { success: true }
  })

  // ════════════════════════════════════════════════════════════════
  // CURRENCY (legacy — constant-based, backward compatible)
  // ════════════════════════════════════════════════════════════════
  createHandler('currency:list', async () => {
    return await container.resolve(CurrencyService).list()
  })

  createHandler('currency:get', async () => {
    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const service = new SettingsService(db as never)
    const code = await service.getSetting('currency')
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === code) ?? SUPPORTED_CURRENCIES[0]
    return currency
  })

  createHandler('currency:set', async ({ code }: { code: string }) => {
    const valid = SUPPORTED_CURRENCIES.find(c => c.code === code)
    if (!valid) throw new Error(`Devise non prise en charge : ${code}`)

    const db = container.resolve(AppDatabaseDatasource).getInstance()
    const service = new SettingsService(db as never)
    await service.setSetting('currency', code)
    return { success: true, currency: valid }
  })

  // ════════════════════════════════════════════════════════════════
  // CURRENCIES (DB-backed CRUD)
  // ════════════════════════════════════════════════════════════════
  createHandler('currencies:list', async ({ activeOnly }: { activeOnly?: boolean } = {}) => {
    return await container.resolve(CurrencyService).list(activeOnly)
  })

  createHandler('currencies:get', async ({ code }: { code: string }) => {
    return await container.resolve(CurrencyService).getByCode(code)
  })

  createHandler('currencies:create', async (dto: { code: string; name: string; symbol: string; decimals?: number }) => {
    return await container.resolve(CurrencyService).create(dto)
  })

  createHandler('currencies:update', async ({ code, ...dto }: { code: string; name?: string; symbol?: string; decimals?: number; is_active?: boolean }) => {
    return await container.resolve(CurrencyService).update(code, dto)
  })

  createHandler('currencies:delete', async ({ code }: { code: string }) => {
    await container.resolve(CurrencyService).delete(code)
    return { success: true }
  })

  createHandler('currencies:get-default', async () => {
    const code = await container.resolve(CurrencyService).getDefault()
    return { code }
  })

  createHandler('currencies:set-default', async ({ code }: { code: string }) => {
    await container.resolve(CurrencyService).setDefault(code)
    return { success: true }
  })

  // ════════════════════════════════════════════════════════════════
  // SERVICES (clinic services CRUD)
  // ════════════════════════════════════════════════════════════════
  createHandler('services:list', async ({ activeOnly }: { activeOnly?: boolean } = {}) => {
    return await container.resolve(ServiceService).list(activeOnly)
  })

  createHandler('services:get', async ({ id }: { id: number }) => {
    return await container.resolve(ServiceService).getById(id)
  })

  createHandler('services:create', async (dto: { name: string; description?: string | null; duration?: number; color?: string | null }) => {
    return await container.resolve(ServiceService).create(dto)
  })

  createHandler('services:update', async (dto: { id: number; name?: string; description?: string | null; duration?: number; color?: string | null }) => {
    return await container.resolve(ServiceService).update(dto)
  })

  createHandler('services:toggle', async ({ id, is_active }: { id: number; is_active: boolean }) => {
    return await container.resolve(ServiceService).toggle(id, is_active)
  })

  createHandler('services:delete', async ({ id }: { id: number }) => {
    await container.resolve(ServiceService).delete(id)
    return { success: true }
  })

  createHandler('services:reorder', async ({ ids }: { ids: number[] }) => {
    return await container.resolve(ServiceService).reorder(ids)
  })

  // ════════════════════════════════════════════════════════════════
  // MEDICAL ACTS
  // ════════════════════════════════════════════════════════════════
  createHandler('acts:list', async ({ activeOnly }: { activeOnly?: boolean } = {}) => {
    return await container.resolve(MedicalActService).list(activeOnly)
  })

  createHandler('acts:get', async ({ id }: { id: number }) => {
    return await container.resolve(MedicalActService).getById(id)
  })

  createHandler('acts:get-by-service', async ({ service_id }: { service_id: number }) => {
    return await container.resolve(MedicalActService).getByService(service_id)
  })

  createHandler('acts:create', async (dto: { code: string; label: string; price: number; currency_code?: string; service_id: number }) => {
    return await container.resolve(MedicalActService).create(dto)
  })

  createHandler('acts:update', async (dto: { id: number; code?: string; label?: string; price?: number; currency_code?: string; service_id?: number; is_active?: boolean }) => {
    return await container.resolve(MedicalActService).update(dto)
  })

  createHandler('acts:delete', async ({ id }: { id: number }) => {
    await container.resolve(MedicalActService).delete(id)
    return { deleted: true }
  })

  createHandler('acts:price-history', async ({ actId }: { actId: number }) => {
    return await container.resolve(MedicalActService).getPriceHistory(actId)
  })

  // ════════════════════════════════════════════════════════════════
  // SYSTEM
  // ════════════════════════════════════════════════════════════════
  createHandler('system:get-info', async () => {
    const system = container.resolve(SystemService)
    const info = await system.getAppInfo()
    const stats = await system.getDbStats()
    return {
      ...info,
      db_size_bytes: stats.db_size_bytes,
      db_size_human: stats.db_size_human,
      record_counts: stats.record_counts,
    }
  })

  createHandler('system:db-stats', async () => {
    return await container.resolve(SystemService).getDbStats()
  })

  createHandler('system:backup', async ({ targetPath }: { targetPath?: string } = {}) => {
    return await container.resolve(SystemService).backup(targetPath)
  })

  createHandler('system:restore', async ({ filePath }: { filePath: string }) => {
    const resolved = path.resolve(filePath)
    if (!resolved.endsWith('.db')) {
      throw new Error('Le fichier de sauvegarde doit avoir l\'extension .db')
    }
    return await container.resolve(SystemService).restore(resolved)
  })

  createHandler('system:info', async () => {
    return await container.resolve(SystemService).getAppInfo()
  })

  // App restart (called after restore)
  createHandler('app:restart', async () => {
    app.relaunch()
    app.exit()
  })
}
