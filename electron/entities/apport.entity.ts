import type {
  ApportDto,
  ApportRemboursementDto,
  ApportStatut,
  ApportType,
} from '../dto/apport.dto'
import type { ModePaiement } from '../dto/invoice.dto'

export class ApportEntity {
  id?: number
  reference?: string
  type?: ApportType
  libelle?: string
  montant?: number
  date_apport?: string
  mode_paiement?: ModePaiement
  statut?: ApportStatut
  notes?: string | null
  created_by?: number | null
  created_at?: string
  updated_at?: string

  static toDto(entity: ApportEntity): ApportDto {
    return {
      id: entity.id,
      reference: entity.reference,
      type: entity.type,
      libelle: entity.libelle,
      montant: entity.montant,
      dateApport: entity.date_apport,
      modePaiement: entity.mode_paiement,
      statut: entity.statut,
      notes: entity.notes ?? null,
      createdBy: entity.created_by ?? null,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    }
  }

  static toDtos(entities: ApportEntity[]): ApportDto[] {
    return entities.map(ApportEntity.toDto)
  }
}

export class ApportRemboursementEntity {
  id?: number
  apport_id?: number
  montant?: number
  date_remboursement?: string
  mode_paiement?: ModePaiement
  reference?: string | null
  notes?: string | null
  created_by?: number | null
  created_at?: string

  static toDto(entity: ApportRemboursementEntity): ApportRemboursementDto {
    return {
      id: entity.id,
      apportId: entity.apport_id,
      montant: entity.montant,
      dateRemboursement: entity.date_remboursement,
      modePaiement: entity.mode_paiement,
      reference: entity.reference ?? null,
      notes: entity.notes ?? null,
      createdBy: entity.created_by ?? null,
      createdAt: entity.created_at,
    }
  }

  static toDtos(entities: ApportRemboursementEntity[]): ApportRemboursementDto[] {
    return entities.map(ApportRemboursementEntity.toDto)
  }
}
