import type { ExamRequestDto } from '../dto/exam-request.dto'

export class ExamRequestEntity {
  id?: number
  patient_id?: number
  encounter_id?: number | null
  type?: string
  examen_id?: number | null
  exam_ids?: string | null
  motif?: string | null
  statut?: string
  prescripteur_id?: number | null
  created_by?: number | null
  created_at?: string
  updated_at?: string
  prescripteur_nom?: string
  examen_label?: string

  static toDto(entity: ExamRequestEntity): ExamRequestDto {
    return {
      id: entity.id,
      patientId: entity.patient_id as number,
      encounterId: entity.encounter_id ?? null,
      type: entity.type as ExamRequestDto['type'],
      examenId: entity.examen_id ?? null,
      examIds: entity.exam_ids ? JSON.parse(entity.exam_ids) as number[] : [],
      motif: entity.motif ?? undefined,
      statut: (entity.statut ?? 'en_attente') as ExamRequestDto['statut'],
      prescripteurId: entity.prescripteur_id ?? null,
      createdBy: entity.created_by ?? null,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
      prescripteurNom: entity.prescripteur_nom,
      examenLabel: entity.examen_label,
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
    e.exam_ids = dto.examIds && dto.examIds.length > 0 ? JSON.stringify(dto.examIds) : null
    e.motif = dto.motif ?? null
    e.statut = dto.statut
    if (dto.prescripteurId !== undefined) e.prescripteur_id = dto.prescripteurId
    if (dto.createdBy !== undefined) e.created_by = dto.createdBy
    return e
  }

  static documentType(): string { return 'ExamRequest' }
  static documentSchema(): any { return {} }
  static register(): void {}
}
