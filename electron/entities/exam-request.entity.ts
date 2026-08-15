import type { ExamRequestDto } from '../dto/exam-request.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { ExamRequestConverter } from '../automerge/converters/exam-request.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class ExamRequestEntity {
  @SchemaField() id?: number
  @SchemaField() patient_id?: number
  @SchemaField() encounter_id?: number 
  @SchemaField() type?: string
  @SchemaField() examen_id?: number 
  @SchemaField() exam_ids?: string 
  @SchemaField() specialite?: string 
  @SchemaField() specialty_id?: number 
  specialty_name?: string
  @SchemaField() planned_hour?: number 
  @SchemaField() planned_date?: string 
  @SchemaField() motif?: string 
  @SchemaField() statut?: string
  @SchemaField() validated_at?: string
  @SchemaField() prescripteur_id?: number 
  @SchemaField() created_by?: number 
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string
  prescripteur_nom?: string
  examen_label?: string

  static toDto(entity: ExamRequestEntity): ExamRequestDto {
    return {
      id: entity.id,
      patientId: entity.patient_id as number,
      encounterId: entity.encounter_id ?? undefined,
      type: entity.type as ExamRequestDto['type'],
      examenId: entity.examen_id ?? undefined,
      examIds: entity.exam_ids ? JSON.parse(entity.exam_ids) as number[] : [],
      specialite: entity.specialite ?? undefined,
      specialtyId: entity.specialty_id ?? undefined,
      plannedHour: entity.planned_hour ?? undefined,
      plannedDate: entity.planned_date ?? undefined,
      motif: entity.motif ?? undefined,
      statut: (entity.statut ?? 'en_attente') as ExamRequestDto['statut'],
      prescripteurId: entity.prescripteur_id ?? undefined,
      createdBy: entity.created_by ?? undefined,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
      prescripteurNom: entity.prescripteur_nom,
      examenLabel: entity.examen_label,
      specialtyName: entity.specialty_name,
    }
  }

  static toDtos(entities: ExamRequestEntity[]): ExamRequestDto[] {
    return entities.map(ExamRequestEntity.toDto)
  }

  static fromDto(dto: ExamRequestDto): ExamRequestEntity {
    const e = new ExamRequestEntity()
    if (dto.id != null) e.id = dto.id
    e.patient_id = dto.patientId
    if (dto.encounterId !== undefined) e.encounter_id = dto.encounterId
    e.type = dto.type
    if (dto.examenId !== undefined) e.examen_id = dto.examenId
    e.exam_ids = dto.examIds && dto.examIds.length > 0 ? JSON.stringify(dto.examIds) : undefined
    e.specialite = dto.specialite ?? undefined
    e.specialty_id = dto.specialtyId ?? undefined
    e.planned_hour = dto.plannedHour ?? undefined
    e.planned_date = dto.plannedDate ?? undefined
    e.motif = dto.motif ?? undefined
    e.statut = dto.statut
    if (dto.prescripteurId !== undefined) e.prescripteur_id = dto.prescripteurId
    if (dto.createdBy !== undefined) e.created_by = dto.createdBy
    return e
  }

  static documentType(): string { return 'ExamRequest' }
  static documentSchema(): AutomergeDocument<ExamRequestEntity> {
    return buildDocumentSchema(ExamRequestEntity) as AutomergeDocument<ExamRequestEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'exam_request',
      documentSchema: this.documentSchema(),
      converter: { toDocument: ExamRequestConverter.toDocument, toEntity: ExamRequestConverter.toEntity },
    })
  }
}
