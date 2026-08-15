import type { VitalSignsItemDto } from '../dto/vital-signs-item.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { VitalSignsItemConverter } from '../automerge/converters/vital-signs-item.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class VitalSignsItemEntity {
  @SchemaField() id?: number
  @SchemaField() patient_id?: number
  @SchemaField() date?: string
  @SchemaField() hour?: number
  @SchemaField() ta_systolique?: number 
  @SchemaField() ta_diastolique?: number 
  @SchemaField() frequence_cardiaque?: number 
  @SchemaField() temperature?: number 
  @SchemaField() glycemie?: number 
  @SchemaField() cetonemie?: number 
  @SchemaField() glucosurie?: string 
  @SchemaField() cetonurie?: string 
  @SchemaField() sa_o2?: number 
  @SchemaField() diurese?: number 
  @SchemaField() poids?: number 
  @SchemaField() created_by?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: VitalSignsItemEntity): VitalSignsItemDto {
    return {
      id: entity.id!,
      patientId: entity.patient_id!,
      date: entity.date!,
      hour: entity.hour!,
      taSystolique: entity.ta_systolique ?? undefined,
      taDiastolique: entity.ta_diastolique ?? undefined,
      frequenceCardiaque: entity.frequence_cardiaque ?? undefined,
      temperature: entity.temperature ?? undefined,
      glycemie: entity.glycemie ?? undefined,
      cetonemie: entity.cetonemie ?? undefined,
      glucosurie: entity.glucosurie ?? undefined,
      cetonurie: entity.cetonurie ?? undefined,
      saO2: entity.sa_o2 ?? undefined,
      diurese: entity.diurese ?? undefined,
      poids: entity.poids ?? undefined,
      createdBy: entity.created_by!,
      createdAt: entity.created_at!,
      updatedAt: entity.updated_at!,
    }
  }

  static toDtos(entities: VitalSignsItemEntity[]): VitalSignsItemDto[] {
    return entities.map(VitalSignsItemEntity.toDto)
  }

  static fromDto(dto: VitalSignsItemDto): VitalSignsItemEntity {
    const e = new VitalSignsItemEntity()
    e.id = dto.id
    e.patient_id = dto.patientId
    e.date = dto.date
    e.hour = dto.hour
    e.ta_systolique = dto.taSystolique
    e.ta_diastolique = dto.taDiastolique
    e.frequence_cardiaque = dto.frequenceCardiaque
    e.temperature = dto.temperature
    e.glycemie = dto.glycemie
    e.cetonemie = dto.cetonemie
    e.glucosurie = dto.glucosurie
    e.cetonurie = dto.cetonurie
    e.sa_o2 = dto.saO2
    e.diurese = dto.diurese
    e.poids = dto.poids
    e.created_by = dto.createdBy
    e.created_at = dto.createdAt
    e.updated_at = dto.updatedAt
    return e
  }

  static documentType(): string { return 'VitalSignsItem' }
  static documentSchema(): AutomergeDocument<VitalSignsItemEntity> { return buildDocumentSchema(VitalSignsItemEntity) as AutomergeDocument<VitalSignsItemEntity> }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'vital_signs_item',
      documentSchema: this.documentSchema(),
      converter: { toDocument: VitalSignsItemConverter.toDocument, toEntity: VitalSignsItemConverter.toEntity },
    })
  }
}
