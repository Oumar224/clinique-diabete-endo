import type { PrescriptionDto, FrequenceType } from '../dto/prescription.dto'

export class PrescriptionEntity {
  id?: number
  patient_id?: number
  medicament?: string
  dosage?: string
  voie?: string
  duree?: number
  frequence?: string
  frequence_type?: string
  prn?: number
  instructions?: string | null
  date_prescription?: string
  prescripteur_id?: number
  statut?: string
  type?: 'medicament' | 'soins'
  prescription_type?: string
  created_at?: string
  updated_at?: string

  static toDto(entity: PrescriptionEntity): PrescriptionDto {
    return {
      id: entity.id,
      patientId: entity.patient_id,
      medicament: entity.medicament,
      dosage: entity.dosage,
      voie: entity.voie,
      duree: entity.duree,
      frequence: entity.frequence ? entity.frequence.split(',') : [],
      frequenceType: (entity.frequence_type ?? 'moments') as FrequenceType,
      prn: entity.prn === 1,
      instructions: entity.instructions,
      datePrescription: entity.date_prescription,
      prescripteurId: entity.prescripteur_id,
      prescripteurNom: undefined,
      prescripteurRole: undefined,
      statut: entity.statut,
      type: entity.type ?? (entity.prescription_type as 'medicament' | 'soins') ?? 'medicament',
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    } as PrescriptionDto
  }

  static toDtos(entities: PrescriptionEntity[]): PrescriptionDto[] {
    return entities.map(PrescriptionEntity.toDto)
  }

  static fromDto(dto: PrescriptionDto): PrescriptionEntity {
    const e = new PrescriptionEntity()
    e.id = dto.id
    e.patient_id = dto.patientId
    e.medicament = dto.medicament
    e.dosage = dto.dosage
    e.voie = dto.voie
    e.duree = dto.duree
    e.frequence = dto.frequence.join(',')
    e.frequence_type = dto.frequenceType ?? 'moments'
    e.prn = dto.prn ? 1 : 0
    e.instructions = dto.instructions
    e.date_prescription = dto.datePrescription
    e.prescripteur_id = dto.prescripteurId
    e.statut = dto.statut
    e.type = dto.type
    e.created_at = dto.createdAt
    e.updated_at = dto.updatedAt
    return e
  }

  static documentType(): string { return 'Prescription' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
