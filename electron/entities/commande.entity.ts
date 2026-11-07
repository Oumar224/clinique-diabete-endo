import type {
  CommandeDto,
  CommandeLigneDto,
  CommandeReceptionAttachmentDto,
  CommandeReceptionDto,
  CommandeReceptionLigneDto,
  CommandeStatut,
} from '../dto/commande.dto'

/**
 * Entités locales des bons de commande (pas de synchronisation Automerge :
 * ces tables sont propres au poste et suivent le stock).
 */
export class CommandeEntity {
  id?: number
  numero?: string
  fournisseur_id?: number
  date_commande?: string
  date_prevue?: string | null
  periode?: string | null
  urgence?: number
  statut?: CommandeStatut
  notes?: string | null
  created_by?: number | null
  created_at?: string
  updated_at?: string

  static toDto(entity: CommandeEntity): CommandeDto {
    return {
      id: entity.id,
      numero: entity.numero,
      fournisseurId: entity.fournisseur_id,
      dateCommande: entity.date_commande,
      datePrevue: entity.date_prevue ?? null,
      periode: entity.periode ?? null,
      urgence: entity.urgence === 1,
      statut: entity.statut,
      notes: entity.notes ?? null,
      createdBy: entity.created_by ?? null,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    }
  }

  static toDtos(entities: CommandeEntity[]): CommandeDto[] {
    return entities.map(CommandeEntity.toDto)
  }
}

export class CommandeLigneEntity {
  id?: number
  commande_id?: number
  medicament_id?: number
  designation?: string
  forme?: string | null
  dosage?: string | null
  conditionnement?: string | null
  unite?: string | null
  cmm?: number
  stock_restant?: number
  quantite_commandee?: number
  quantite_livree?: number
  ordre?: number
  created_at?: string

  static toDto(entity: CommandeLigneEntity): CommandeLigneDto {
    const commandee = entity.quantite_commandee ?? 0
    const livree = entity.quantite_livree ?? 0
    return {
      id: entity.id,
      commandeId: entity.commande_id,
      medicamentId: entity.medicament_id,
      designation: entity.designation,
      forme: entity.forme ?? null,
      dosage: entity.dosage ?? null,
      conditionnement: entity.conditionnement ?? null,
      unite: entity.unite ?? null,
      cmm: entity.cmm ?? 0,
      stockRestant: entity.stock_restant ?? 0,
      quantiteCommandee: commandee,
      quantiteLivree: livree,
      resteALivrer: Math.max(0, commandee - livree),
      ordre: entity.ordre ?? 0,
    }
  }

  static toDtos(entities: CommandeLigneEntity[]): CommandeLigneDto[] {
    return entities.map(CommandeLigneEntity.toDto)
  }
}

export class CommandeReceptionEntity {
  id?: number
  commande_id?: number
  date_reception?: string
  ref_bl?: string | null
  notes?: string | null
  created_by?: number | null
  created_at?: string

  static toDto(entity: CommandeReceptionEntity): CommandeReceptionDto {
    return {
      id: entity.id,
      commandeId: entity.commande_id,
      dateReception: entity.date_reception,
      refBl: entity.ref_bl ?? null,
      notes: entity.notes ?? null,
      createdBy: entity.created_by ?? null,
      createdAt: entity.created_at,
      lignes: [],
      attachments: [],
    }
  }
}

export class CommandeReceptionLigneEntity {
  id?: number
  reception_id?: number
  commande_ligne_id?: number
  quantite_recue?: number
  created_at?: string

  static toDto(entity: CommandeReceptionLigneEntity): CommandeReceptionLigneDto {
    return {
      id: entity.id,
      receptionId: entity.reception_id,
      commandeLigneId: entity.commande_ligne_id,
      quantiteRecue: entity.quantite_recue ?? 0,
    }
  }
}

export class CommandeReceptionAttachmentEntity {
  id?: number
  reception_id?: number
  file_name?: string
  file_type?: string
  file_size?: number
  file_data?: string
  uploaded_by?: number | null
  created_at?: string

  static toDto(entity: CommandeReceptionAttachmentEntity): CommandeReceptionAttachmentDto {
    return {
      id: entity.id,
      receptionId: entity.reception_id,
      fileName: entity.file_name,
      fileType: entity.file_type,
      fileSize: entity.file_size,
      uploadedBy: entity.uploaded_by ?? null,
      createdAt: entity.created_at,
    }
  }

  static toDtos(entities: CommandeReceptionAttachmentEntity[]): CommandeReceptionAttachmentDto[] {
    return entities.map(CommandeReceptionAttachmentEntity.toDto)
  }
}
