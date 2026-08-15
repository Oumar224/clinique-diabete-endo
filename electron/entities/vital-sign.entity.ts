import type { VitalSignsDto } from '../dto/vital-signs.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { VitalSignConverter } from '../automerge/converters/vital-sign.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class VitalSignEntity {
  @SchemaField() id?: number
  @SchemaField() patient_id?: number
  @SchemaField() date?: string
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

  static toDto(entity: VitalSignEntity): VitalSignsDto {
    return {
      id: entity.id,
      patientId: entity.patient_id,
      date: entity.date,
      taSystolique: entity.ta_systolique,
      taDiastolique: entity.ta_diastolique,
      frequenceCardiaque: entity.frequence_cardiaque,
      temperature: entity.temperature,
      glycemie: entity.glycemie,
      cetonemie: entity.cetonemie,
      glucosurie: entity.glucosurie,
      cetonurie: entity.cetonurie,
      saO2: entity.sa_o2,
      diurese: entity.diurese,
      poids: entity.poids,
      createdBy: entity.created_by,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    } as VitalSignsDto
  }

  static toDtos(entities: VitalSignEntity[]): VitalSignsDto[] {
    return entities.map(VitalSignEntity.toDto)
  }

  static fromDto(dto: VitalSignsDto): VitalSignEntity {
    const e = new VitalSignEntity()
    e.id = dto.id
    e.patient_id = dto.patientId
    e.date = dto.date
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

  static documentType(): string { return 'VitalSign' }
  static documentSchema(): AutomergeDocument<VitalSignEntity> { return buildDocumentSchema(VitalSignEntity) as AutomergeDocument<VitalSignEntity> }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'vital_sign',
      documentSchema: this.documentSchema(),
      converter: { toDocument: VitalSignConverter.toDocument, toEntity: VitalSignConverter.toEntity },
    })
  }
}
