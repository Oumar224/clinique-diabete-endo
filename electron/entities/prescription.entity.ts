import type { PrescriptionDto, FrequenceType } from '../dto/prescription.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { PrescriptionConverter } from '../automerge/converters/prescription.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class PrescriptionEntity {
  @SchemaField() id?: number
  @SchemaField() patient_id?: number
  @SchemaField() medicament?: string
  @SchemaField() dosage?: string
  @SchemaField() voie?: string
  @SchemaField() duree?: number
  @SchemaField() duree_type?: string
  @SchemaField() frequence?: string
  @SchemaField() frequence_type?: string
  @SchemaField() prn?: number
  @SchemaField() instructions?: string 
  @SchemaField() date_prescription?: string
  @SchemaField() prescripteur_id?: number
  @SchemaField() statut?: string
  @SchemaField() type?: 'medicament' | 'soins'
  @SchemaField() prescription_type?: string
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: PrescriptionEntity): PrescriptionDto {
    return {
      id: entity.id,
      patientId: entity.patient_id,
      medicament: entity.medicament,
      dosage: entity.dosage,
      voie: entity.voie,
      duree: entity.duree,
      dureeType: (entity.duree_type ?? 'courte') as 'courte' | 'longue',
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
    e.duree_type = dto.dureeType ?? 'courte'
    e.frequence = dto.frequence?.join(',')
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
  static documentSchema(): AutomergeDocument<PrescriptionEntity> { return buildDocumentSchema(PrescriptionEntity) as AutomergeDocument<PrescriptionEntity> }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'prescription',
      documentSchema: this.documentSchema(),
      converter: { toDocument: PrescriptionConverter.toDocument, toEntity: PrescriptionConverter.toEntity },
    })
  }
}
