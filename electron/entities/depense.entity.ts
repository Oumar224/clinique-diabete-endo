import type { DepenseCategorieDto, DepenseDto } from '../dto/depense.dto'
import { SchemaField } from '../automerge/utils/schema-field'

export class DepenseCategorieEntity {
  @SchemaField() id?: number
  @SchemaField() code?: string
  @SchemaField() nom?: string
  @SchemaField() couleur?: string
  @SchemaField() actif?: number
  @SchemaField() ordre?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: DepenseCategorieEntity): DepenseCategorieDto {
    return {
      id: entity.id,
      code: entity.code,
      nom: entity.nom,
      couleur: entity.couleur,
      actif: entity.actif === 1,
      ordre: entity.ordre,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    }
  }

  static toDtos(entities: DepenseCategorieEntity[]): DepenseCategorieDto[] {
    return entities.map(DepenseCategorieEntity.toDto)
  }

  static fromDto(dto: DepenseCategorieDto): DepenseCategorieEntity {
    const e = new DepenseCategorieEntity()
    e.id = dto.id
    e.code = dto.code
    e.nom = dto.nom
    e.couleur = dto.couleur
    e.actif = dto.actif === false ? 0 : 1
    e.ordre = dto.ordre
    e.created_at = dto.createdAt
    e.updated_at = dto.updatedAt
    return e
  }

  static documentType(): string { return 'DepenseCategorie' }
}

export class DepenseEntity {
  @SchemaField() id?: number
  @SchemaField() date?: string
  @SchemaField() categorie_id?: number
  @SchemaField() libelle?: string
  @SchemaField() montant?: number
  @SchemaField() mode_paiement?: string
  @SchemaField() fournisseur_id?: number | null
  @SchemaField() fournisseur_nom?: string
  @SchemaField() reference?: string
  @SchemaField() notes?: string
  @SchemaField() source?: string
  @SchemaField() source_id?: number | null
  @SchemaField() statut_paiement?: string
  @SchemaField() date_paiement?: string
  @SchemaField() created_by?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: DepenseEntity): DepenseDto {
    const extra = entity as unknown as Record<string, unknown>
    const categorieNom =
      (extra['categorie_nom'] as string | undefined) ??
      (extra['categorieNom'] as string | undefined)
    const categorieCode =
      (extra['categorie_code'] as string | undefined) ??
      (extra['categorieCode'] as string | undefined)
    const categorieCouleur =
      (extra['categorie_couleur'] as string | null | undefined) ??
      (extra['categorieCouleur'] as string | null | undefined)
    return {
      id: entity.id,
      date: entity.date,
      categorieId: entity.categorie_id,
      categorieNom,
      categorieCode,
      categorieCouleur: categorieCouleur ?? null,
      libelle: entity.libelle,
      montant: entity.montant,
      modePaiement: (entity.mode_paiement ?? null) as DepenseDto['modePaiement'],
      fournisseurId: entity.fournisseur_id ?? null,
      fournisseurNom: entity.fournisseur_nom ?? undefined,
      reference: entity.reference ?? undefined,
      notes: entity.notes ?? undefined,
      source: entity.source as DepenseDto['source'],
      sourceId: entity.source_id ?? null,
      statutPaiement: entity.statut_paiement as DepenseDto['statutPaiement'],
      datePaiement: entity.date_paiement ?? undefined,
      createdBy: entity.created_by,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    }
  }

  static toDtos(entities: DepenseEntity[]): DepenseDto[] {
    return entities.map(DepenseEntity.toDto)
  }

  static fromDto(dto: DepenseDto): DepenseEntity {
    const e = new DepenseEntity()
    e.id = dto.id
    e.date = dto.date
    e.categorie_id = dto.categorieId
    e.libelle = dto.libelle
    e.montant = dto.montant
    e.mode_paiement = dto.modePaiement ?? undefined
    e.fournisseur_id = dto.fournisseurId ?? null
    e.fournisseur_nom = dto.fournisseurNom
    e.reference = dto.reference
    e.notes = dto.notes
    e.source = dto.source
    e.source_id = dto.sourceId ?? null
    e.statut_paiement = dto.statutPaiement
    e.date_paiement = dto.datePaiement
    e.created_by = dto.createdBy
    e.created_at = dto.createdAt
    e.updated_at = dto.updatedAt
    return e
  }

  static documentType(): string { return 'Depense' }
}
