import type { PatientActeDto } from '../dto/patient-acte.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { PatientActeConverter } from '../automerge/converters/patient-acte.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class PatientActeEntity {
  @SchemaField() id?: number
  @SchemaField() encounter_id?: number
  @SchemaField() patient_id?: number
  @SchemaField() acte_id?: number
  @SchemaField() tarif_id?: number
  @SchemaField() quantite?: number
  @SchemaField() statut_paiement?: string
  @SchemaField() created_at?: string

  static toDto(entity: PatientActeEntity): PatientActeDto {
    return {
      id: entity.id,
      encounter_id: entity.encounter_id,
      patient_id: entity.patient_id as number,
      acte_id: entity.acte_id as number,
      tarif_id: entity.tarif_id,
      quantite: entity.quantite as number,
      statut_paiement: entity.statut_paiement as 'A_PAYER' | 'PAYE',
      created_at: entity.created_at,
      acte_code: (entity as any).acte_code,
      acte_label: (entity as any).acte_label,
      prix_unitaire: (entity as any).prix_unitaire,
      code_tarif: (entity as any).code_tarif,
    }
  }

  static toDtos(entities: PatientActeEntity[]): PatientActeDto[] { return entities.map(PatientActeEntity.toDto) }

  static fromDto(dto: PatientActeDto): PatientActeEntity {
    const e = new PatientActeEntity()
    e.id = dto.id
    e.encounter_id = dto.encounter_id
    e.patient_id = dto.patient_id
    e.acte_id = dto.acte_id
    e.tarif_id = dto.tarif_id
    e.quantite = dto.quantite
    e.statut_paiement = dto.statut_paiement
    e.created_at = dto.created_at
    return e
  }

  static documentType(): string { return 'PatientActe' }
  static documentSchema(): AutomergeDocument<PatientActeEntity> {
    return buildDocumentSchema(PatientActeEntity) as AutomergeDocument<PatientActeEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'patient_acte',
      documentSchema: this.documentSchema(),
      converter: { toDocument: PatientActeConverter.toDocument, toEntity: PatientActeConverter.toEntity },
    })
  }
}
