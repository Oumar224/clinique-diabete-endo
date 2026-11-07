import type {
  SalaireConfigDto,
  SalaireConfigRubriqueDto,
  SalairePaiementDto,
} from '../dto/salaire.dto'
import { SchemaField } from '../automerge/utils/schema-field'

export class SalaireConfigEntity {
  @SchemaField() id?: number
  @SchemaField() user_id?: number
  @SchemaField() periode?: string
  @SchemaField() base?: number
  @SchemaField() jours_travailles?: number
  @SchemaField() created_by?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: SalaireConfigEntity): SalaireConfigDto {
    return {
      id: entity.id,
      userId: entity.user_id,
      periode: entity.periode,
      base: entity.base,
      joursTravailles: entity.jours_travailles,
      createdBy: entity.created_by,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    }
  }

  static toDtos(entities: SalaireConfigEntity[]): SalaireConfigDto[] {
    return entities.map(SalaireConfigEntity.toDto)
  }

  static fromDto(dto: SalaireConfigDto): SalaireConfigEntity {
    const e = new SalaireConfigEntity()
    e.id = dto.id
    e.user_id = dto.userId
    e.periode = dto.periode
    e.base = dto.base
    e.jours_travailles = dto.joursTravailles
    e.created_by = dto.createdBy
    e.created_at = dto.createdAt
    e.updated_at = dto.updatedAt
    return e
  }

  static documentType(): string { return 'SalaireConfig' }
}

export class SalaireConfigRubriqueEntity {
  @SchemaField() id?: number
  @SchemaField() config_id?: number
  @SchemaField() libelle?: string
  @SchemaField() type?: string
  @SchemaField() montant?: number
  @SchemaField() montant_jour?: number | null
  @SchemaField() jours?: number | null
  @SchemaField() impact_net?: number
  @SchemaField() ordre?: number
  @SchemaField() created_at?: string

  static toDto(entity: SalaireConfigRubriqueEntity): SalaireConfigRubriqueDto {
    return {
      id: entity.id,
      configId: entity.config_id,
      libelle: entity.libelle,
      type: entity.type as SalaireConfigRubriqueDto['type'],
      montant: entity.montant,
      montantJour: entity.montant_jour ?? null,
      jours: entity.jours ?? null,
      impactNet: entity.impact_net === 1,
      ordre: entity.ordre,
      createdAt: entity.created_at,
    }
  }

  static toDtos(entities: SalaireConfigRubriqueEntity[]): SalaireConfigRubriqueDto[] {
    return entities.map(SalaireConfigRubriqueEntity.toDto)
  }

  static fromDto(dto: SalaireConfigRubriqueDto): SalaireConfigRubriqueEntity {
    const e = new SalaireConfigRubriqueEntity()
    e.id = dto.id
    e.config_id = dto.configId
    e.libelle = dto.libelle
    e.type = dto.type
    e.montant = dto.montant
    e.montant_jour = dto.montantJour ?? null
    e.jours = dto.jours ?? null
    e.impact_net = dto.impactNet === false ? 0 : 1
    e.ordre = dto.ordre
    e.created_at = dto.createdAt
    return e
  }

  static documentType(): string { return 'SalaireConfigRubrique' }
}

export class SalairePaiementEntity {
  @SchemaField() id?: number
  @SchemaField() user_id?: number
  @SchemaField() periode?: string
  @SchemaField() montant_net?: number
  @SchemaField() mode_paiement?: string
  @SchemaField() date_paiement?: string
  @SchemaField() reference?: string
  @SchemaField() details?: string
  @SchemaField() created_by?: number
  @SchemaField() created_at?: string

  static toDto(entity: SalairePaiementEntity): SalairePaiementDto {
    return {
      id: entity.id,
      userId: entity.user_id,
      periode: entity.periode,
      montantNet: entity.montant_net,
      modePaiement: entity.mode_paiement as SalairePaiementDto['modePaiement'],
      datePaiement: entity.date_paiement,
      reference: entity.reference,
      details: entity.details,
      createdBy: entity.created_by,
      createdAt: entity.created_at,
    }
  }

  static toDtos(entities: SalairePaiementEntity[]): SalairePaiementDto[] {
    return entities.map(SalairePaiementEntity.toDto)
  }

  static fromDto(dto: SalairePaiementDto): SalairePaiementEntity {
    const e = new SalairePaiementEntity()
    e.id = dto.id
    e.user_id = dto.userId
    e.periode = dto.periode
    e.montant_net = dto.montantNet
    e.mode_paiement = dto.modePaiement
    e.date_paiement = dto.datePaiement
    e.reference = dto.reference
    e.details = dto.details
    e.created_by = dto.createdBy
    e.created_at = dto.createdAt
    return e
  }

  static documentType(): string { return 'SalairePaiement' }
}
