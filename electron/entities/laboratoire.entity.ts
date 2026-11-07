import type {
  LaboArticleDto,
  LaboStockLotDto,
  LaboMouvementStockDto,
  LaboCommandeDto,
  LaboCommandeLigneDto,
  LaboCommandeReceptionDto,
  LaboReceptionLigneDto,
  LaboPaiementDto,
} from '../dto/laboratoire.dto'
import { SchemaField } from '../automerge/utils/schema-field'

// ─── Article (catalogue laboratoire) ──────────────────────────────
export class LaboArticleEntity {
  @SchemaField() id?: number
  @SchemaField() code?: string | null
  @SchemaField() nom?: string
  @SchemaField() categorie?: string
  @SchemaField() unite_stock?: string
  @SchemaField() seuil_alerte?: number
  @SchemaField() prix_achat?: number | null
  @SchemaField() prix_vente?: number | null
  @SchemaField() fournisseur_principal_id?: number | null
  @SchemaField() actif?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string
  fournisseur_nom?: string
  stock_total?: number

  static toDto(e: LaboArticleEntity): LaboArticleDto {
    return {
      id: e.id,
      code: e.code ?? undefined,
      nom: e.nom,
      categorie: (e.categorie ?? 'reactif') as LaboArticleDto['categorie'],
      uniteStock: e.unite_stock ?? 'unité',
      seuilAlerte: e.seuil_alerte ?? 5,
      prixAchat: e.prix_achat ?? null,
      prixVente: e.prix_vente ?? null,
      fournisseurPrincipalId: e.fournisseur_principal_id ?? null,
      fournisseurNom: e.fournisseur_nom,
      actif: Boolean(e.actif ?? 1),
      createdAt: e.created_at,
      updatedAt: e.updated_at,
      stockTotal: Number(e.stock_total ?? 0),
    }
  }
  static toDtos(rows: LaboArticleEntity[]): LaboArticleDto[] { return rows.map(LaboArticleEntity.toDto) }
  static documentType(): string { return 'LaboArticle' }
}

// ─── Lot de stock ─────────────────────────────────────────────────
export class LaboStockLotEntity {
  @SchemaField() id?: number
  @SchemaField() article_id?: number
  @SchemaField() numero_lot?: string | null
  @SchemaField() quantite?: number
  @SchemaField() quantite_restante?: number
  @SchemaField() date_peremption?: string | null
  @SchemaField() fournisseur_id?: number | null
  @SchemaField() prix_achat?: number | null
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  article_nom?: string
  unite_stock?: string

  static toDto(e: LaboStockLotEntity): LaboStockLotDto {
    return {
      id: e.id,
      articleId: e.article_id,
      articleNom: e.article_nom,
      uniteStock: e.unite_stock,
      numeroLot: e.numero_lot ?? undefined,
      quantite: e.quantite ?? 0,
      quantiteRestante: e.quantite_restante ?? 0,
      datePeremption: e.date_peremption ?? undefined,
      fournisseurId: e.fournisseur_id ?? null,
      prixAchat: e.prix_achat ?? null,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    }
  }
  static toDtos(rows: LaboStockLotEntity[]): LaboStockLotDto[] { return rows.map(LaboStockLotEntity.toDto) }
  static documentType(): string { return 'LaboStockLot' }
}

// ─── Mouvement de stock ───────────────────────────────────────────
export class LaboMouvementStockEntity {
  @SchemaField() id?: number
  @SchemaField() article_id?: number
  @SchemaField() lot_id?: number | null
  @SchemaField() type?: string
  @SchemaField() quantite?: number
  @SchemaField() motif?: string | null
  @SchemaField() reference?: string | null
  @SchemaField() created_by?: number | null
  @SchemaField() created_at?: string

  article_nom?: string

  static toDto(e: LaboMouvementStockEntity): LaboMouvementStockDto {
    return {
      id: e.id,
      articleId: e.article_id,
      articleNom: e.article_nom,
      lotId: e.lot_id ?? null,
      type: e.type as LaboMouvementStockDto['type'],
      quantite: e.quantite ?? 0,
      motif: e.motif ?? undefined,
      reference: e.reference ?? undefined,
      createdBy: e.created_by ?? null,
      createdAt: e.created_at,
    }
  }
  static toDtos(rows: LaboMouvementStockEntity[]): LaboMouvementStockDto[] { return rows.map(LaboMouvementStockEntity.toDto) }
  static documentType(): string { return 'LaboMouvementStock' }
}

// ─── Commande ─────────────────────────────────────────────────────
export class LaboCommandeEntity {
  @SchemaField() id?: number
  @SchemaField() numero?: string
  @SchemaField() fournisseur_id?: number | null
  @SchemaField() statut?: string
  @SchemaField() date_commande?: string
  @SchemaField() date_livraison_prevue?: string | null
  @SchemaField() montant_total?: number
  @SchemaField() notes?: string | null
  @SchemaField() created_by?: number | null
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  fournisseur_nom?: string
  avancement?: number

  static toDto(e: LaboCommandeEntity, lignes?: LaboCommandeLigneDto[]): LaboCommandeDto {
    return {
      id: e.id,
      numero: e.numero,
      fournisseurId: e.fournisseur_id ?? null,
      fournisseurNom: e.fournisseur_nom,
      statut: (e.statut ?? 'brouillon') as LaboCommandeDto['statut'],
      dateCommande: e.date_commande,
      dateLivraisonPrevue: e.date_livraison_prevue ?? null,
      montantTotal: e.montant_total ?? 0,
      notes: e.notes ?? undefined,
      createdBy: e.created_by ?? null,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
      lignes,
      avancement: e.avancement,
    }
  }
  static toDtos(rows: LaboCommandeEntity[]): LaboCommandeDto[] { return rows.map((r) => LaboCommandeEntity.toDto(r)) }
  static documentType(): string { return 'LaboCommande' }
}

export class LaboCommandeLigneEntity {
  @SchemaField() id?: number
  @SchemaField() commande_id?: number
  @SchemaField() article_id?: number
  @SchemaField() quantite?: number
  @SchemaField() quantite_recue?: number
  @SchemaField() prix_unitaire?: number

  article_nom?: string
  unite_stock?: string

  static toDto(e: LaboCommandeLigneEntity): LaboCommandeLigneDto {
    return {
      id: e.id,
      commandeId: e.commande_id,
      articleId: e.article_id,
      articleNom: e.article_nom,
      uniteStock: e.unite_stock,
      quantite: e.quantite ?? 0,
      quantiteRecue: e.quantite_recue ?? 0,
      prixUnitaire: e.prix_unitaire ?? 0,
      montantLigne: Number(((e.quantite ?? 0) * (e.prix_unitaire ?? 0)).toFixed(2)),
    }
  }
  static toDtos(rows: LaboCommandeLigneEntity[]): LaboCommandeLigneDto[] { return rows.map(LaboCommandeLigneEntity.toDto) }
  static documentType(): string { return 'LaboCommandeLigne' }
}

// ─── Réception ────────────────────────────────────────────────────
export class LaboCommandeReceptionEntity {
  @SchemaField() id?: number
  @SchemaField() commande_id?: number
  @SchemaField() date_reception?: string
  @SchemaField() numero_bon?: string | null
  @SchemaField() notes?: string | null
  @SchemaField() created_by?: number | null
  @SchemaField() created_at?: string

  static toDto(e: LaboCommandeReceptionEntity, lignes?: LaboReceptionLigneDto[]): LaboCommandeReceptionDto {
    return {
      id: e.id,
      commandeId: e.commande_id,
      dateReception: e.date_reception,
      numeroBon: e.numero_bon ?? undefined,
      notes: e.notes ?? undefined,
      createdBy: e.created_by ?? null,
      createdAt: e.created_at,
      lignes,
    }
  }
  static toDtos(rows: LaboCommandeReceptionEntity[]): LaboCommandeReceptionDto[] { return rows.map((r) => LaboCommandeReceptionEntity.toDto(r)) }
  static documentType(): string { return 'LaboCommandeReception' }
}

export class LaboReceptionLigneEntity {
  @SchemaField() id?: number
  @SchemaField() reception_id?: number
  @SchemaField() ligne_id?: number
  @SchemaField() quantite?: number
  @SchemaField() numero_lot?: string | null
  @SchemaField() date_peremption?: string | null

  static toDto(e: LaboReceptionLigneEntity): LaboReceptionLigneDto {
    return {
      id: e.id,
      receptionId: e.reception_id,
      ligneId: e.ligne_id,
      quantite: e.quantite ?? 0,
      numeroLot: e.numero_lot ?? undefined,
      datePeremption: e.date_peremption ?? null,
    }
  }
  static toDtos(rows: LaboReceptionLigneEntity[]): LaboReceptionLigneDto[] { return rows.map(LaboReceptionLigneEntity.toDto) }
  static documentType(): string { return 'LaboReceptionLigne' }
}

// ─── Encaissement laboratoire ─────────────────────────────────────
export class LaboPaiementEntity {
  @SchemaField() id?: number
  @SchemaField() exam_request_id?: number
  @SchemaField() montant?: number
  @SchemaField() mode_paiement?: string
  @SchemaField() date_paiement?: string
  @SchemaField() reference?: string | null
  @SchemaField() created_by?: number | null
  @SchemaField() created_at?: string

  static toDto(e: LaboPaiementEntity): LaboPaiementDto {
    return {
      id: e.id,
      examRequestId: e.exam_request_id,
      montant: e.montant ?? 0,
      modePaiement: (e.mode_paiement ?? 'espece') as LaboPaiementDto['modePaiement'],
      datePaiement: e.date_paiement,
      reference: e.reference ?? undefined,
      createdBy: e.created_by ?? null,
      createdAt: e.created_at,
    }
  }
  static toDtos(rows: LaboPaiementEntity[]): LaboPaiementDto[] { return rows.map(LaboPaiementEntity.toDto) }
  static documentType(): string { return 'LaboPaiement' }
}
