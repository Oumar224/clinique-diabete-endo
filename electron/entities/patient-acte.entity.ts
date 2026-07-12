import type { PatientActeDto } from '../dto/patient-acte.dto'

export class PatientActeEntity {
  id?: number
  encounter_id?: number
  patient_id?: number
  acte_id?: number
  tarif_id?: number
  quantite?: number
  statut_paiement?: string
  created_at?: string

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
  static documentSchema(): any { return {} }
  static register(): void {}
}
