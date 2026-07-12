import { container } from 'tsyringe'
import { createHandler } from '../utils/create-handler'
import { PlanSoinsService } from '../services/plan-soins.service'
import { VitalSignsService } from '../services/vital-signs.service'
import { VitalSignsItemService } from '../services/vital-signs-item.service'
import { DispositifsService } from '../services/dispositifs.service'
import { VitalSignEntity } from '../entities/vital-sign.entity'
import type { VitalSignsDto } from '../dto/vital-signs.dto'
import { VitalSignsItemEntity } from '../entities/vital-signs-item.entity'
import type { VitalSignsItemDto } from '../dto/vital-signs-item.dto'
import { DispositifEntity } from '../entities/dispositif.entity'
import type { DispositifDto } from '../dto/dispositif.dto'

export function registerPatientCareHandlers() {
  // ── Plan de Soins ────────────────────────────────────────────────
  createHandler('plan-soins:list', async (params: { patientId: number; date: string }) => {
    const { patientId, date } = params
    if (!patientId) throw new Error('patientId requis')
    const service = container.resolve(PlanSoinsService)
    const result = await service.getByPatientAndDate(patientId, date)
    // 🔍 Trace every soin's prescriptionId in the raw service output
    if (result?.blocs) {
      for (const bloc of result.blocs) {
        for (const soin of bloc.soins) {
          console.log(`[IPC plan-soins:list] date=${date} soin id=${soin.id} medicament="${soin.medicament}" prescriptionId=${soin.prescriptionId} (typeof=${typeof soin.prescriptionId})`);
        }
      }
    } else {
      console.log(`[IPC plan-soins:list] date=${date} NO RESULT (null)`);
    }
    return result
  })

  createHandler('plan-soins:valider', async (params: { soinId: number; validePar: string }) => {
    const { soinId, validePar } = params
    const service = container.resolve(PlanSoinsService)
    return await service.validerSoin(soinId, validePar)
  })

  createHandler('plan-soins:suspendre', async (params: { soinId: number; motif: string }) => {
    const { soinId, motif } = params
    const service = container.resolve(PlanSoinsService)
    return await service.suspendreSoin(soinId, motif)
  })

  createHandler('plan-soins:valides', async (params: { patientId: number; startDate: string; endDate: string }) => {
    const { patientId, startDate, endDate } = params
    if (!patientId) throw new Error('patientId requis')
    const service = container.resolve(PlanSoinsService)
    return await service.listValidesByPatientAndDateRange(patientId, startDate, endDate)
  })

  createHandler('plan-soins:reprise', async (params: { soinId: number }) => {
    const { soinId } = params
    const service = container.resolve(PlanSoinsService)
    return await service.reprendreSoin(soinId)
  })

  createHandler('plan-soins:suspendre-prescription', async (params: { prescriptionId: number; motif: string }) => {
    const { prescriptionId, motif } = params
    const service = container.resolve(PlanSoinsService)
    return await service.suspendrePrescription(prescriptionId, motif)
  })

  createHandler('plan-soins:reprendre-prescription', async (params: { prescriptionId: number }) => {
    const { prescriptionId } = params
    const service = container.resolve(PlanSoinsService)
    return await service.reprendrePrescription(prescriptionId)
  })

  // ── Signes Vitaux ────────────────────────────────────────────────
  createHandler('vital-signs:get-today', async (params: { patientId: number }) => {
    const { patientId } = params
    if (!patientId) throw new Error('patientId requis')
    const service = container.resolve(VitalSignsService)
    const entity = await service.getToday(patientId)
    return entity ? VitalSignEntity.toDto(entity) : null
  })

  createHandler('vital-signs:list', async (params: { patientId: number; startDate: string; endDate: string }) => {
    const { patientId, startDate, endDate } = params
    if (!patientId) throw new Error('patientId requis')
    const service = container.resolve(VitalSignsService)
    const entities = await service.listByPatientAndDateRange(patientId, startDate, endDate)
    return VitalSignEntity.toDtos(entities)
  })

  createHandler('vital-signs:save', async (dto: VitalSignsDto) => {
    const entity = VitalSignEntity.fromDto(dto)
    const service = container.resolve(VitalSignsService)
    const saved = await service.save(entity)
    return VitalSignEntity.toDto(saved)
  })

  // ── Signes Vitaux par heure ──────────────────────────────────────
  createHandler('vital-signs-items:list', async (params: { patientId: number; startDate: string; endDate: string }) => {
    const { patientId, startDate, endDate } = params
    if (!patientId) throw new Error('patientId requis')
    const service = container.resolve(VitalSignsItemService)
    const entities = await service.listByPatientAndDateRange(patientId, startDate, endDate)
    return VitalSignsItemEntity.toDtos(entities)
  })

  createHandler('vital-signs-items:save', async (dto: VitalSignsItemDto) => {
    const entity = VitalSignsItemEntity.fromDto(dto)
    const service = container.resolve(VitalSignsItemService)
    const saved = await service.save(entity)
    return VitalSignsItemEntity.toDto(saved)
  })

  // ── Dispositifs d'accès ──────────────────────────────────────────
  createHandler('dispositifs:list', async (params: { patientId: number }) => {
    const { patientId } = params
    if (!patientId) throw new Error('patientId requis')
    const service = container.resolve(DispositifsService)
    const entities = await service.list(patientId)
    return DispositifEntity.toDtos(entities)
  })

  createHandler('dispositifs:create', async (dto: DispositifDto) => {
    const entity = DispositifEntity.fromDto(dto)
    const service = container.resolve(DispositifsService)
    const created = await service.create(entity)
    return DispositifEntity.toDto(created)
  })

  createHandler('dispositifs:delete', async (params: { id: number }) => {
    const { id } = params
    const service = container.resolve(DispositifsService)
    await service.delete(id)
  })
}
