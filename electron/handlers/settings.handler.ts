import path from 'node:path'
import { container } from 'tsyringe'
import { app } from 'electron'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import { SettingsService } from '../services/settings.service'
import { ServiceService } from '../services/service.service'
import { MedicalActService } from '../services/medical-act.service'
import { SystemService } from '../services/system.service'
import { CurrencyService } from '../services/currency.service'
import { MedicalUnitService } from '../services/medical-unit.service'
import { SiteService } from '../services/site.service'
import { SpecialtyService } from '../services/specialty.service'
import { FonctionService } from '../services/fonction.service'
import { LocaliteService } from '../services/localite.service'
import { CurrencyEntity } from '../entities/currency.entity'
import type { CurrencyDto, TarifBulkUpdateDto } from '../dto/settings.dto'
import { ServiceEntity } from '../entities/service.entity'
import type { ServiceDto } from '../dto/settings.dto'
import { MedicalActEntity } from '../entities/medical-act.entity'
import { ConfigTarifEntity } from '../entities/config-tarif.entity'
import type { MedicalActDto, TarifDto } from '../dto/settings.dto'
import { ConfigTarifService } from '../services/config-tarif.service'
import { MedicalUnitEntity } from '../entities/medical-unit.entity'
import type { MedicalUnitDto } from '../dto/medical-unit.dto'
import { SiteEntity } from '../entities/site.entity'
import type { SiteDto } from '../dto/site.dto'
import { SpecialtyEntity } from '../entities/specialty.entity'
import type { SpecialtyDto } from '../dto/specialty.dto'
import { FonctionEntity } from '../entities/fonction.entity'
import type { FonctionDto } from '../dto/settings.dto'
import { LocaliteEntity } from '../entities/localite.entity'
import { VoieTypeEntity } from '../entities/voie-type.entity'
import { DispositifTypeEntity } from '../entities/dispositif-type.entity'
import { VoieTypeService } from '../services/voie-type.service'
import { DispositifTypeService } from '../services/dispositif-type.service'
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
    const service = container.resolve(SettingsService)
    return { value: await service.getSetting(key) }
  })

  createHandler('settings:set', async ({ key, value }: { key: string; value: string }) => {
    const service = container.resolve(SettingsService)
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
    const entities = await container.resolve(CurrencyService).list(activeOnly)
    return CurrencyEntity.toDtos(entities)
  })

  createHandler('currencies:get', async ({ code }: { code: string }) => {
    const entity = await container.resolve(CurrencyService).getByCode(code)
    return entity ? CurrencyEntity.toDto(entity) : null
  })

  createHandler('currencies:create', async (dto: CurrencyDto) => {
    const entity = CurrencyEntity.fromDto(dto)
    const created = await container.resolve(CurrencyService).create(entity)
    return CurrencyEntity.toDto(created)
  })

  createHandler('currencies:update', async (dto: CurrencyDto) => {
    const entity = CurrencyEntity.fromDto(dto)
    const updated = await container.resolve(CurrencyService).update(entity)
    return CurrencyEntity.toDto(updated)
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
    const entities = await container.resolve(ServiceService).list(activeOnly)
    return ServiceEntity.toDtos(entities)
  })

  createHandler('services:get', async ({ id }: { id: number }) => {
    const entity = await container.resolve(ServiceService).getById(id)
    return entity ? ServiceEntity.toDto(entity) : null
  })

  createHandler('services:create', async (dto: ServiceDto) => {
    const entity = ServiceEntity.fromDto(dto)
    const created = await container.resolve(ServiceService).create(entity)
    return ServiceEntity.toDto(created)
  })

  createHandler('services:update', async (dto: ServiceDto) => {
    const entity = ServiceEntity.fromDto(dto)
    const updated = await container.resolve(ServiceService).update(entity)
    return ServiceEntity.toDto(updated)
  })

  createHandler('services:toggle', async ({ id, is_active }: { id: number; is_active: boolean }) => {
    const entity = await container.resolve(ServiceService).toggle(id, is_active)
    return ServiceEntity.toDto(entity)
  })

  createHandler('services:delete', async ({ id }: { id: number }) => {
    await container.resolve(ServiceService).delete(id)
    return { success: true }
  })

  createHandler('services:reorder', async ({ ids }: { ids: number[] }) => {
    const entities = await container.resolve(ServiceService).reorder(ids)
    return ServiceEntity.toDtos(entities)
  })

  createHandler('services:list-by-site', async ({ siteId }: { siteId: number }) => {
    const entities = await container.resolve(ServiceService).listBySite(siteId)
    return ServiceEntity.toDtos(entities)
  })

  createHandler('services:get-sites', async ({ id }: { id: number }) => {
    return await container.resolve(ServiceService).getSites(id)
  })

  // ════════════════════════════════════════════════════════════════
  // SERVICE FAVORITES
  // ════════════════════════════════════════════════════════════════

  createHandler('favorites:list', async ({ userId }: { userId: number }) => {
    const entities = await container.resolve(ServiceService).getFavorites(userId)
    return ServiceEntity.toDtos(entities)
  })

  createHandler('favorites:add', async ({ userId, serviceId }: { userId: number; serviceId: number }) => {
    await container.resolve(ServiceService).addFavorite(userId, serviceId)
    return { success: true }
  })

  createHandler('favorites:remove', async ({ userId, serviceId }: { userId: number; serviceId: number }) => {
    await container.resolve(ServiceService).removeFavorite(userId, serviceId)
    return { success: true }
  })

  // ════════════════════════════════════════════════════════════════
  // MEDICAL ACTS
  // ════════════════════════════════════════════════════════════════
  createHandler('acts:list', async ({ activeOnly }: { activeOnly?: boolean } = {}) => {
    const entities = await container.resolve(MedicalActService).list(activeOnly)
    return MedicalActEntity.toDtos(entities)
  })

  createHandler('acts:get', async ({ id }: { id: number }) => {
    const entity = await container.resolve(MedicalActService).getById(id)
    return entity ? MedicalActEntity.toDto(entity) : null
  })

  createHandler('acts:get-by-service', async ({ service_id }: { service_id: number }) => {
    const entities = await container.resolve(MedicalActService).getByService(service_id)
    return MedicalActEntity.toDtos(entities)
  })

  createHandler('acts:create', async (dto: MedicalActDto) => {
    const entity = MedicalActEntity.fromDto(dto)
    const created = await container.resolve(MedicalActService).create(entity)
    return MedicalActEntity.toDto(created)
  })

  createHandler('acts:update', async (dto: MedicalActDto) => {
    const entity = MedicalActEntity.fromDto(dto)
    const updated = await container.resolve(MedicalActService).update(entity)
    return MedicalActEntity.toDto(updated)
  })

  createHandler('acts:delete', async ({ id }: { id: number }) => {
    await container.resolve(MedicalActService).delete(id)
    return { deleted: true }
  })

  // ════════════════════════════════════════════════════════════════
  // CONFIG TARIFS (pricing)
  // ════════════════════════════════════════════════════════════════
  createHandler('tarifs:list', async ({ acteId, codeTarif }: { acteId?: number; codeTarif?: string } = {}) => {
    const entities = await container.resolve(ConfigTarifService).list(acteId, codeTarif)
    return ConfigTarifEntity.toDtos(entities)
  })

  createHandler('tarifs:get-active', async ({ acteId, codeTarif }: { acteId: number; codeTarif?: string }) => {
    const entity = await container.resolve(ConfigTarifService).getActiveTarif(acteId, codeTarif ?? 'TARIF.STANDARD')
    return entity ? ConfigTarifEntity.toDto(entity) : null
  })

  createHandler('tarifs:create', async (dto: TarifDto) => {
    const created = await container.resolve(ConfigTarifService).create({
      acte_id: dto.acte_id,
      code_tarif: dto.code_tarif,
      prix_unitaire: dto.prix_unitaire,
      date_application: dto.date_application,
    })
    return ConfigTarifEntity.toDto(created)
  })

  createHandler('tarifs:update', async ({ id, ...dto }: { id: number } & Partial<TarifDto>) => {
    const entity = await container.resolve(ConfigTarifService).update(id, dto)
    return ConfigTarifEntity.toDto(entity)
  })

  createHandler('tarifs:bulk-update', async (dto: TarifBulkUpdateDto) => {
    const entities = await container.resolve(ConfigTarifService).bulkUpdate(dto)
    return ConfigTarifEntity.toDtos(entities)
  })

  createHandler('tarifs:delete', async ({ id }: { id: number }) => {
    await container.resolve(ConfigTarifService).delete(id)
    return { deleted: true }
  })

  createHandler('tarifs:price-history', async ({ acteId }: { acteId: number }) => {
    const entities = await container.resolve(ConfigTarifService).getPriceHistory(acteId)
    return ConfigTarifEntity.toDtos(entities)
  })

  // ════════════════════════════════════════════════════════════════
  // MEDICAL UNITS
  // ════════════════════════════════════════════════════════════════
  createHandler('medical-units:list', async ({ activeOnly }: { activeOnly?: boolean } = {}) => {
    const entities = await container.resolve(MedicalUnitService).list(activeOnly)
    return MedicalUnitEntity.toDtos(entities)
  })

  createHandler('medical-units:get', async ({ id }: { id: number }) => {
    const entity = await container.resolve(MedicalUnitService).getById(id)
    return entity ? MedicalUnitEntity.toDto(entity) : null
  })

  createHandler('medical-units:create', async (dto: MedicalUnitDto) => {
    const entity = MedicalUnitEntity.fromDto(dto)
    const created = await container.resolve(MedicalUnitService).create(entity)
    return MedicalUnitEntity.toDto(created)
  })

  createHandler('medical-units:update', async (dto: MedicalUnitDto) => {
    const entity = MedicalUnitEntity.fromDto(dto)
    const updated = await container.resolve(MedicalUnitService).update(entity)
    return MedicalUnitEntity.toDto(updated)
  })

  createHandler('medical-units:toggle', async ({ id, is_active }: { id: number; is_active: boolean }) => {
    const entity = await container.resolve(MedicalUnitService).toggle(id, is_active)
    return MedicalUnitEntity.toDto(entity)
  })

  createHandler('medical-units:delete', async ({ id }: { id: number }) => {
    await container.resolve(MedicalUnitService).delete(id)
    return { success: true }
  })

  // ════════════════════════════════════════════════════════════════
  // SITES
  // ════════════════════════════════════════════════════════════════
  createHandler('sites:list', async ({ activeOnly }: { activeOnly?: boolean } = {}) => {
    const entities = await container.resolve(SiteService).list(activeOnly)
    return SiteEntity.toDtos(entities)
  })

  createHandler('sites:get', async ({ id }: { id: number }) => {
    const entity = await container.resolve(SiteService).getById(id)
    return entity ? SiteEntity.toDto(entity) : null
  })

  createHandler('sites:create', async (dto: SiteDto) => {
    const entity = SiteEntity.fromDto(dto)
    const created = await container.resolve(SiteService).create(entity)
    return SiteEntity.toDto(created)
  })

  createHandler('sites:update', async (dto: SiteDto) => {
    const entity = SiteEntity.fromDto(dto)
    const updated = await container.resolve(SiteService).update(entity)
    return SiteEntity.toDto(updated)
  })

  createHandler('sites:toggle', async ({ id, is_active }: { id: number; is_active: boolean }) => {
    const entity = await container.resolve(SiteService).toggle(id, is_active)
    return SiteEntity.toDto(entity)
  })

  createHandler('sites:set-default', async ({ id }: { id: number }) => {
    const entity = await container.resolve(SiteService).setDefault(id)
    return SiteEntity.toDto(entity)
  })

  createHandler('sites:delete', async ({ id }: { id: number }) => {
    await container.resolve(SiteService).delete(id)
    return { success: true }
  })

  // ════════════════════════════════════════════════════════════════
  // SPECIALTIES
  // ════════════════════════════════════════════════════════════════
  createHandler('specialties:list', async ({ activeOnly }: { activeOnly?: boolean } = {}) => {
    const entities = await container.resolve(SpecialtyService).list(activeOnly)
    return SpecialtyEntity.toDtos(entities)
  })

  createHandler('specialties:get', async ({ id }: { id: number }) => {
    const entity = await container.resolve(SpecialtyService).getById(id)
    return entity ? SpecialtyEntity.toDto(entity) : null
  })

  createHandler('specialties:create', async (dto: SpecialtyDto) => {
    const entity = SpecialtyEntity.fromDto(dto)
    const created = await container.resolve(SpecialtyService).create(entity)
    return SpecialtyEntity.toDto(created)
  })

  createHandler('specialties:update', async (dto: SpecialtyDto) => {
    const entity = SpecialtyEntity.fromDto(dto)
    const updated = await container.resolve(SpecialtyService).update(entity)
    return SpecialtyEntity.toDto(updated)
  })

  createHandler('specialties:toggle', async ({ id, is_active }: { id: number; is_active: boolean }) => {
    const entity = await container.resolve(SpecialtyService).toggle(id, is_active)
    return SpecialtyEntity.toDto(entity)
  })

  createHandler('specialties:delete', async ({ id }: { id: number }) => {
    await container.resolve(SpecialtyService).delete(id)
    return { success: true }
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

  // ════════════════════════════════════════════════════════════════
  // FONCTIONS
  // ════════════════════════════════════════════════════════════════
  createHandler('fonctions:list', async ({ activeOnly }: { activeOnly?: boolean } = {}) => {
    const entities = await container.resolve(FonctionService).list(activeOnly)
    return FonctionEntity.toDtos(entities)
  })

  createHandler('fonctions:get', async ({ id }: { id: number }) => {
    const entity = await container.resolve(FonctionService).getById(id)
    return entity ? FonctionEntity.toDto(entity) : null
  })

  createHandler('fonctions:create', async (dto: FonctionDto) => {
    const entity = FonctionEntity.fromDto(dto)
    const created = await container.resolve(FonctionService).create(entity)
    return FonctionEntity.toDto(created)
  })

  createHandler('fonctions:update', async (dto: FonctionDto) => {
    const entity = FonctionEntity.fromDto(dto)
    const updated = await container.resolve(FonctionService).update(entity)
    return FonctionEntity.toDto(updated)
  })

  createHandler('fonctions:toggle', async ({ id }: { id: number }) => {
    const entity = await container.resolve(FonctionService).toggle(id)
    return FonctionEntity.toDto(entity)
  })

  createHandler('fonctions:delete', async ({ id }: { id: number }) => {
    await container.resolve(FonctionService).delete(id)
    return { success: true }
  })

  // ════════════════════════════════════════════════════════════════
  // LOCALITÉS (Guinea administrative divisions)
  // ════════════════════════════════════════════════════════════════
  createHandler('localites:list', async ({ activeOnly }: { activeOnly?: boolean } = {}) => {
    const entities = await container.resolve(LocaliteService).list(activeOnly)
    return LocaliteEntity.toDtos(entities)
  })

  createHandler('localites:get-tree', async () => {
    return await container.resolve(LocaliteService).getTree()
  })

  createHandler('localites:get', async ({ id }: { id: number }) => {
    const entity = await container.resolve(LocaliteService).getById(id)
    return entity ? LocaliteEntity.toDto(entity) : null
  })

  createHandler('localites:get-by-code', async ({ code }: { code: string }) => {
    const entity = await container.resolve(LocaliteService).getByCode(code)
    return entity ? LocaliteEntity.toDto(entity) : null
  })

  createHandler('localites:search', async ({ query }: { query: string }) => {
    const entities = await container.resolve(LocaliteService).search(query)
    return LocaliteEntity.toDtos(entities)
  })

  createHandler('localites:import', async () => {
    return await container.resolve(LocaliteService).importFromJson()
  })

  createHandler('localites:import-data', async ({ data, country }: { data: string; country: string }) =>
    container.resolve(LocaliteService).importFromData(data, country))

  createHandler('localites:toggle', async ({ id, is_active }: { id: number; is_active: boolean }) => {
    const entity = await container.resolve(LocaliteService).toggle(id, is_active)
    return LocaliteEntity.toDto(entity)
  })

  // ════════════════════════════════════════════════════════════════
  // VOIE TYPES (administration routes catalog)
  // ════════════════════════════════════════════════════════════════
  createHandler('voie-types:list', async ({ activeOnly }: { activeOnly?: boolean } = {}) => {
    const entities = await container.resolve(VoieTypeService).list(activeOnly)
    return VoieTypeEntity.toDtos(entities)
  })

  createHandler('voie-types:create', async (dto: { label: string }) => {
    const entity = new VoieTypeEntity()
    entity.label = dto.label
    const created = await container.resolve(VoieTypeService).create(entity)
    return VoieTypeEntity.toDto(created)
  })

  createHandler('voie-types:delete', async ({ id }: { id: number }) => {
    await container.resolve(VoieTypeService).delete(id)
    return { success: true }
  })

  // ════════════════════════════════════════════════════════════════
  // DISPOSITIF TYPES (device / access route catalog)
  // ════════════════════════════════════════════════════════════════
  createHandler('dispositif-types:list', async ({ activeOnly }: { activeOnly?: boolean } = {}) => {
    const entities = await container.resolve(DispositifTypeService).list(activeOnly)
    return DispositifTypeEntity.toDtos(entities)
  })

  createHandler('dispositif-types:create', async (dto: { label: string }) => {
    const entity = new DispositifTypeEntity()
    entity.label = dto.label
    const created = await container.resolve(DispositifTypeService).create(entity)
    return DispositifTypeEntity.toDto(created)
  })

  createHandler('dispositif-types:delete', async ({ id }: { id: number }) => {
    await container.resolve(DispositifTypeService).delete(id)
    return { success: true }
  })

  // App restart (called after restore)
  createHandler('app:restart', async () => {
    app.relaunch()
    app.exit()
  })
}
