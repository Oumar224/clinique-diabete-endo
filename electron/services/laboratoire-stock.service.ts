import { inject, singleton } from 'tsyringe'
import { sql, type Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import {
  LaboArticleEntity,
  LaboStockLotEntity,
  LaboMouvementStockEntity,
  LaboCommandeEntity,
  LaboCommandeLigneEntity,
  LaboCommandeReceptionEntity,
  LaboReceptionLigneEntity,
} from '../entities/laboratoire.entity'
import type {
  LaboArticleDto,
  LaboCommandeDto,
  LaboCommandeStatut,
  LaboMouvementStockDto,
  LaboStockLotDto,
  LaboCommandeReceptionDto,
} from '../dto/laboratoire.dto'

const CATEGORIES = ['reactif', 'consommable', 'milieu', 'kit', 'autre'] as const
const STATUTS_COMMANDE: readonly LaboCommandeStatut[] = [
  'brouillon', 'envoyee', 'partielle', 'livree', 'cloturee', 'annulee',
]

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function nowIso(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

@singleton()
export class LaboratoireStockService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  // ═══════════════════════ Articles ═══════════════════════

  async listArticles(filters: { search?: string; categorie?: string; actif?: boolean } = {}): Promise<LaboArticleEntity[]> {
    let query = this.db
      .selectFrom('labo_articles')
      .leftJoin('fournisseurs', 'fournisseurs.id', 'labo_articles.fournisseur_principal_id')
      .selectAll('labo_articles')
      .select([
        'fournisseurs.nom as fournisseur_nom',
        sql<number>`(
          SELECT COALESCE(SUM(l.quantite_restante), 0)
          FROM labo_stock_lots l
          WHERE l.article_id = labo_articles.id
        )`.as('stock_total'),
      ])

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`
      query = query.where((eb) => eb.or([
        eb('labo_articles.nom', 'like', term),
        eb('labo_articles.code', 'like', term),
      ]))
    }
    if (filters.categorie) query = query.where('labo_articles.categorie', '=', filters.categorie)
    if (filters.actif !== undefined) query = query.where('labo_articles.actif', '=', filters.actif ? 1 : 0)

    const rows = await query.orderBy('labo_articles.nom', 'asc').execute()
    return rows as unknown as LaboArticleEntity[]
  }

  async createArticle(dto: LaboArticleDto): Promise<LaboArticleEntity> {
    const nom = dto.nom?.trim()
    if (!nom) throw new Error("Le nom de l'article est requis")
    if (dto.categorie && !(CATEGORIES as readonly string[]).includes(dto.categorie)) {
      throw new Error('Catégorie invalide')
    }
    if (dto.seuilAlerte !== undefined && (!Number.isInteger(dto.seuilAlerte) || dto.seuilAlerte < 0)) {
      throw new Error("Le seuil d'alerte doit être un entier positif ou nul")
    }
    if (dto.prixAchat != null && dto.prixAchat < 0) throw new Error('Le prix d’achat doit être positif')
    if (dto.prixVente != null && dto.prixVente < 0) throw new Error('Le prix de vente doit être positif')

    const created = await this.db
      .insertInto('labo_articles')
      .values({
        code: dto.code?.trim() || null,
        nom,
        categorie: dto.categorie ?? 'reactif',
        unite_stock: dto.uniteStock?.trim() || 'unité',
        seuil_alerte: dto.seuilAlerte ?? 5,
        prix_achat: dto.prixAchat ?? null,
        prix_vente: dto.prixVente ?? null,
        fournisseur_principal_id: dto.fournisseurPrincipalId ?? null,
        actif: dto.actif === false ? 0 : 1,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    return { ...created, stock_total: 0 } as unknown as LaboArticleEntity
  }

  async updateArticle(id: number, dto: Partial<LaboArticleDto>): Promise<LaboArticleEntity> {
    const existing = await this.db.selectFrom('labo_articles').select('id').where('id', '=', id).executeTakeFirst()
    if (!existing) throw new Error('Article introuvable')

    const patch: Record<string, unknown> = { updated_at: nowIso() }
    if (dto.nom !== undefined) {
      if (!dto.nom.trim()) throw new Error("Le nom de l'article est requis")
      patch.nom = dto.nom.trim()
    }
    if (dto.code !== undefined) patch.code = dto.code?.trim() || null
    if (dto.categorie !== undefined) {
      if (!(CATEGORIES as readonly string[]).includes(dto.categorie)) throw new Error('Catégorie invalide')
      patch.categorie = dto.categorie
    }
    if (dto.uniteStock !== undefined) patch.unite_stock = dto.uniteStock.trim() || 'unité'
    if (dto.seuilAlerte !== undefined) patch.seuil_alerte = dto.seuilAlerte
    if (dto.prixAchat !== undefined) patch.prix_achat = dto.prixAchat
    if (dto.prixVente !== undefined) patch.prix_vente = dto.prixVente
    if (dto.fournisseurPrincipalId !== undefined) patch.fournisseur_principal_id = dto.fournisseurPrincipalId
    if (dto.actif !== undefined) patch.actif = dto.actif ? 1 : 0

    await this.db.updateTable('labo_articles').set(patch).where('id', '=', id).execute()
    const rows = await this.listArticles({ actif: undefined })
    const found = rows.find((r) => r.id === id)
    if (!found) throw new Error('Article introuvable')
    return found
  }

  // ═══════════════════════ Lots & mouvements ═══════════════════════

  async listLots(filters: { articleId?: number; includeEmpty?: boolean } = {}): Promise<LaboStockLotEntity[]> {
    let query = this.db
      .selectFrom('labo_stock_lots')
      .innerJoin('labo_articles', 'labo_articles.id', 'labo_stock_lots.article_id')
      .selectAll('labo_stock_lots')
      .select([
        'labo_articles.nom as article_nom',
        'labo_articles.unite_stock as unite_stock',
      ])
    if (filters.articleId) query = query.where('labo_stock_lots.article_id', '=', filters.articleId)
    if (!filters.includeEmpty) query = query.where('labo_stock_lots.quantite_restante', '>', 0)
    const rows = await query
      .orderBy(sql`labo_stock_lots.date_peremption IS NULL`, 'asc')
      .orderBy('labo_stock_lots.date_peremption', 'asc')
      .orderBy('labo_stock_lots.id', 'asc')
      .execute()
    return rows as unknown as LaboStockLotEntity[]
  }

  async listMouvements(filters: { articleId?: number; limit?: number } = {}): Promise<LaboMouvementStockEntity[]> {
    let query = this.db
      .selectFrom('labo_mouvements_stock')
      .innerJoin('labo_articles', 'labo_articles.id', 'labo_mouvements_stock.article_id')
      .selectAll('labo_mouvements_stock')
      .select('labo_articles.nom as article_nom')
    if (filters.articleId) query = query.where('labo_mouvements_stock.article_id', '=', filters.articleId)
    const rows = await query
      .orderBy('labo_mouvements_stock.created_at', 'desc')
      .orderBy('labo_mouvements_stock.id', 'desc')
      .limit(filters.limit ?? 200)
      .execute()
    return rows as unknown as LaboMouvementStockEntity[]
  }

  async entreeStock(payload: {
    articleId: number
    quantite: number
    numeroLot?: string
    datePeremption?: string
    fournisseurId?: number
    prixAchat?: number
    motif?: string
    reference?: string
    createdBy?: number
  }): Promise<LaboStockLotEntity> {
    if (!payload.articleId) throw new Error('Article requis')
    if (!Number.isInteger(payload.quantite) || payload.quantite <= 0) {
      throw new Error('La quantité doit être un entier strictement positif')
    }
    await this.assertArticle(payload.articleId)

    return this.db.transaction().execute(async (trx) => {
      const lot = await trx
        .insertInto('labo_stock_lots')
        .values({
          article_id: payload.articleId,
          numero_lot: payload.numeroLot?.trim() || null,
          quantite: payload.quantite,
          quantite_restante: payload.quantite,
          date_peremption: payload.datePeremption || null,
          fournisseur_id: payload.fournisseurId ?? null,
          prix_achat: payload.prixAchat ?? null,
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      await trx.insertInto('labo_mouvements_stock').values({
        article_id: payload.articleId,
        lot_id: lot.id!,
        type: 'entree',
        quantite: payload.quantite,
        motif: payload.motif ?? 'Entrée en stock',
        reference: payload.reference ?? null,
        created_by: payload.createdBy ?? null,
      }).execute()

      const article = await trx
        .selectFrom('labo_articles').select(['nom', 'unite_stock']).where('id', '=', payload.articleId)
        .executeTakeFirst()
      return { ...lot, article_nom: article?.nom, unite_stock: article?.unite_stock } as unknown as LaboStockLotEntity
    })
  }

  async sortieStock(payload: {
    articleId: number
    quantite: number
    motif?: string
    reference?: string
    createdBy?: number
  }): Promise<void> {
    if (!payload.articleId) throw new Error('Article requis')
    if (!Number.isInteger(payload.quantite) || payload.quantite <= 0) {
      throw new Error('La quantité doit être un entier strictement positif')
    }
    await this.assertArticle(payload.articleId)

    await this.db.transaction().execute(async (trx) => {
      const lots = await trx
        .selectFrom('labo_stock_lots')
        .selectAll()
        .where('article_id', '=', payload.articleId)
        .where('quantite_restante', '>', 0)
        .orderBy(sql`date_peremption IS NULL`, 'asc')
        .orderBy('date_peremption', 'asc')
        .orderBy('id', 'asc')
        .execute()

      const dispo = lots.reduce((sum, l) => sum + (l.quantite_restante ?? 0), 0)
      if (dispo < payload.quantite) {
        throw new Error(`Stock insuffisant : ${dispo} disponible(s), ${payload.quantite} demandé(s)`)
      }

      let restant = payload.quantite
      for (const lot of lots) {
        if (restant <= 0) break
        const dispoLot = lot.quantite_restante ?? 0
        if (dispoLot <= 0) continue
        const pris = Math.min(dispoLot, restant)
        await trx
          .updateTable('labo_stock_lots')
          .set({ quantite_restante: dispoLot - pris, updated_at: nowIso() })
          .where('id', '=', lot.id!)
          .execute()
        restant -= pris
      }

      await trx.insertInto('labo_mouvements_stock').values({
        article_id: payload.articleId,
        lot_id: null,
        type: 'sortie',
        quantite: payload.quantite,
        motif: payload.motif ?? 'Sortie de stock',
        reference: payload.reference ?? null,
        created_by: payload.createdBy ?? null,
      }).execute()
    })
  }

  async ajustementStock(payload: {
    articleId: number
    lotId: number
    nouvelleQuantite: number
    motif?: string
    createdBy?: number
  }): Promise<void> {
    if (!Number.isInteger(payload.nouvelleQuantite) || payload.nouvelleQuantite < 0) {
      throw new Error('La quantité ajustée doit être un entier positif ou nul')
    }
    const lot = await this.db
      .selectFrom('labo_stock_lots')
      .selectAll()
      .where('id', '=', payload.lotId)
      .where('article_id', '=', payload.articleId)
      .executeTakeFirst()
    if (!lot) throw new Error('Lot introuvable')

    const delta = payload.nouvelleQuantite - (lot.quantite_restante ?? 0)
    if (delta === 0) return

    await this.db.transaction().execute(async (trx) => {
      await trx.updateTable('labo_stock_lots')
        .set({ quantite_restante: payload.nouvelleQuantite, updated_at: nowIso() })
        .where('id', '=', payload.lotId)
        .execute()
      await trx.insertInto('labo_mouvements_stock').values({
        article_id: payload.articleId,
        lot_id: payload.lotId,
        type: 'ajustement',
        quantite: delta,
        motif: payload.motif ?? 'Ajustement inventaire',
        reference: null,
        created_by: payload.createdBy ?? null,
      }).execute()
    })
  }

  /** Articles sous le seuil d'alerte (stock restant ≤ seuil). */
  async listAlertes(): Promise<LaboArticleEntity[]> {
    const rows = await this.db
      .selectFrom('labo_articles')
      .selectAll('labo_articles')
      .select(
        sql<number>`(
          SELECT COALESCE(SUM(l.quantite_restante), 0)
          FROM labo_stock_lots l WHERE l.article_id = labo_articles.id
        )`.as('stock_total'),
      )
      .where('actif', '=', 1)
      .where(
        sql<boolean>`(
          SELECT COALESCE(SUM(l.quantite_restante), 0)
          FROM labo_stock_lots l WHERE l.article_id = labo_articles.id
        ) <= labo_articles.seuil_alerte`,
      )
      .orderBy('labo_articles.nom', 'asc')
      .execute()
    return rows as unknown as LaboArticleEntity[]
  }

  private async assertArticle(articleId: number): Promise<void> {
    const row = await this.db.selectFrom('labo_articles').select('id').where('id', '=', articleId).executeTakeFirst()
    if (!row) throw new Error('Article introuvable')
  }

  // ═══════════════════════ Commandes ═══════════════════════

  async nextNumeroCommande(date = today()): Promise<string> {
    const compact = date.replace(/-/g, '')
    const prefix = `LBC-${compact}`
    const row = await sql<{ maxSeq: number | null }>`
      SELECT MAX(CAST(substr(numero, 14) AS INTEGER)) AS maxSeq
      FROM labo_commandes WHERE numero LIKE ${`${prefix}-%`}
    `.execute(this.db)
    const next = Number(row.rows[0]?.maxSeq ?? 0) + 1
    return `${prefix}-${String(next).padStart(4, '0')}`
  }

  async listCommandes(filters: { statut?: string; search?: string } = {}): Promise<LaboCommandeEntity[]> {
    let query = this.db
      .selectFrom('labo_commandes')
      .leftJoin('fournisseurs', 'fournisseurs.id', 'labo_commandes.fournisseur_id')
      .selectAll('labo_commandes')
      .select('fournisseurs.nom as fournisseur_nom')
    if (filters.statut) query = query.where('labo_commandes.statut', '=', filters.statut)
    if (filters.search?.trim()) query = query.where('labo_commandes.numero', 'like', `%${filters.search.trim()}%`)
    const rows = await query
      .orderBy('labo_commandes.date_commande', 'desc')
      .orderBy('labo_commandes.id', 'desc')
      .execute()
    return rows as unknown as LaboCommandeEntity[]
  }

  async getCommande(id: number): Promise<LaboCommandeDto> {
    const row = await this.db
      .selectFrom('labo_commandes')
      .leftJoin('fournisseurs', 'fournisseurs.id', 'labo_commandes.fournisseur_id')
      .selectAll('labo_commandes')
      .select('fournisseurs.nom as fournisseur_nom')
      .where('labo_commandes.id', '=', id)
      .executeTakeFirst()
    if (!row) throw new Error('Commande introuvable')

    const lignes = await this.db
      .selectFrom('labo_commande_lignes')
      .innerJoin('labo_articles', 'labo_articles.id', 'labo_commande_lignes.article_id')
      .selectAll('labo_commande_lignes')
      .select(['labo_articles.nom as article_nom', 'labo_articles.unite_stock as unite_stock'])
      .where('labo_commande_lignes.commande_id', '=', id)
      .orderBy('labo_commande_lignes.id', 'asc')
      .execute()

    const ligneDtos = LaboCommandeLigneEntity.toDtos(lignes as unknown as LaboCommandeLigneEntity[])
    const commande = row as unknown as LaboCommandeEntity
    const totalQte = (lignes as any[]).reduce((s, l) => s + (l.quantite ?? 0), 0)
    const totalRecue = (lignes as any[]).reduce((s, l) => s + (l.quantite_recue ?? 0), 0)
    commande.avancement = totalQte > 0 ? Math.round((totalRecue / totalQte) * 100) : 0
    return LaboCommandeEntity.toDto(commande, ligneDtos)
  }

  async createCommande(dto: LaboCommandeDto, createdBy?: number): Promise<LaboCommandeDto> {
    if (!dto.fournisseurId) throw new Error('Le fournisseur est requis')
    if (!dto.lignes || dto.lignes.length === 0) throw new Error('Au moins une ligne est requise')
    for (const l of dto.lignes) {
      if (!l.articleId) throw new Error('Article requis sur chaque ligne')
      if (!Number.isInteger(l.quantite) || (l.quantite ?? 0) <= 0) {
        throw new Error('Chaque ligne doit avoir une quantité strictement positive')
      }
    }

    const dateCommande = dto.dateCommande || today()
    const numero = await this.nextNumeroCommande(dateCommande)
    const montantTotal = dto.lignes.reduce((s, l) => s + (l.quantite ?? 0) * (l.prixUnitaire ?? 0), 0)

    const commandeId = await this.db.transaction().execute(async (trx) => {
      const commande = await trx
        .insertInto('labo_commandes')
        .values({
          numero,
          fournisseur_id: dto.fournisseurId!,
          statut: 'brouillon',
          date_commande: dateCommande,
          date_livraison_prevue: dto.dateLivraisonPrevue ?? null,
          montant_total: montantTotal,
          notes: dto.notes ?? null,
          created_by: createdBy ?? null,
        })
        .returning('id')
        .executeTakeFirstOrThrow()

      for (const l of dto.lignes!) {
        await trx.insertInto('labo_commande_lignes').values({
          commande_id: commande.id!,
          article_id: l.articleId!,
          quantite: l.quantite!,
          quantite_recue: 0,
          prix_unitaire: l.prixUnitaire ?? 0,
        }).execute()
      }
      return commande.id!
    })

    return this.getCommande(commandeId)
  }

  async updateStatutCommande(id: number, statut: LaboCommandeStatut): Promise<LaboCommandeDto> {
    if (!STATUTS_COMMANDE.includes(statut)) throw new Error('Statut de commande invalide')
    const existing = await this.db.selectFrom('labo_commandes').select('id').where('id', '=', id).executeTakeFirst()
    if (!existing) throw new Error('Commande introuvable')
    await this.db.updateTable('labo_commandes').set({ statut, updated_at: nowIso() }).where('id', '=', id).execute()
    return this.getCommande(id)
  }

  // ═══════════════════════ Réceptions ═══════════════════════

  async listReceptions(commandeId: number): Promise<LaboCommandeReceptionDto[]> {
    const receptions = await this.db
      .selectFrom('labo_commande_receptions')
      .selectAll()
      .where('commande_id', '=', commandeId)
      .orderBy('date_reception', 'desc')
      .execute()
    if (receptions.length === 0) return []
    const ids = receptions.map((r) => r.id!)
    const lignes = await this.db
      .selectFrom('labo_commande_reception_lignes')
      .selectAll()
      .where('reception_id', 'in', ids)
      .execute()
    return receptions.map((r) => LaboCommandeReceptionEntity.toDto(
      r as unknown as LaboCommandeReceptionEntity,
      LaboReceptionLigneEntity.toDtos(
        lignes.filter((l) => l.reception_id === r.id) as unknown as LaboReceptionLigneEntity[],
      ),
    ))
  }

  /**
   * Réceptionne une commande : crée les lots de stock, met à jour les
   * quantités reçues et recalcule le statut (partielle / livrée).
   * Le tout dans une seule transaction.
   */
  async enregistrerReception(
    dto: LaboCommandeReceptionDto & { lignes?: Array<{ ligneId: number; quantite: number; numeroLot?: string; datePeremption?: string }> },
    createdBy?: number,
  ): Promise<LaboCommandeDto> {
    if (!dto.commandeId) throw new Error('Commande requise')
    if (!dto.lignes || dto.lignes.length === 0) throw new Error('Au moins une ligne de réception est requise')
    for (const l of dto.lignes) {
      if (!l.ligneId) throw new Error('Ligne de commande requise')
      if (!Number.isInteger(l.quantite) || l.quantite <= 0) {
        throw new Error('Chaque quantité reçue doit être un entier strictement positif')
      }
    }

    const commande = await this.getCommande(dto.commandeId)
    if (commande.statut === 'annulee' || commande.statut === 'cloturee') {
      throw new Error('Cette commande ne peut plus être réceptionnée')
    }

    await this.db.transaction().execute(async (trx) => {
      const reception = await trx
        .insertInto('labo_commande_receptions')
        .values({
          commande_id: dto.commandeId!,
          date_reception: dto.dateReception || today(),
          numero_bon: dto.numeroBon?.trim() || null,
          notes: dto.notes ?? null,
          created_by: createdBy ?? null,
        })
        .returning('id')
        .executeTakeFirstOrThrow()

      for (const l of dto.lignes!) {
        const ligne = commande.lignes?.find((x) => x.id === l.ligneId)
        if (!ligne) throw new Error('Ligne de commande introuvable')
        const dejaRecue = ligne.quantiteRecue ?? 0
        const restant = (ligne.quantite ?? 0) - dejaRecue
        if (l.quantite > restant) {
          throw new Error(`Quantité reçue supérieure au reste à livrer pour « ${ligne.articleNom ?? 'article'} »`)
        }

        await trx.insertInto('labo_commande_reception_lignes').values({
          reception_id: reception.id!,
          ligne_id: l.ligneId,
          quantite: l.quantite,
          numero_lot: l.numeroLot?.trim() || null,
          date_peremption: l.datePeremption || null,
        }).execute()

        await trx.updateTable('labo_commande_lignes')
          .set({ quantite_recue: dejaRecue + l.quantite })
          .where('id', '=', l.ligneId)
          .execute()

        // Création du lot de stock correspondant
        const lot = await trx.insertInto('labo_stock_lots').values({
          article_id: ligne.articleId!,
          numero_lot: l.numeroLot?.trim() || null,
          quantite: l.quantite,
          quantite_restante: l.quantite,
          date_peremption: l.datePeremption || null,
          fournisseur_id: commande.fournisseurId ?? null,
          prix_achat: ligne.prixUnitaire ?? null,
        }).returning('id').executeTakeFirstOrThrow()

        await trx.insertInto('labo_mouvements_stock').values({
          article_id: ligne.articleId!,
          lot_id: lot.id!,
          type: 'entree',
          quantite: l.quantite,
          motif: `Réception commande ${commande.numero ?? ''}`.trim(),
          reference: dto.numeroBon ?? null,
          created_by: createdBy ?? null,
        }).execute()
      }
    })

    // Recalcul du statut global
    const maj = await this.getCommande(dto.commandeId)
    const lignes = maj.lignes ?? []
    const totalQte = lignes.reduce((s, l) => s + (l.quantite ?? 0), 0)
    const totalRecue = lignes.reduce((s, l) => s + (l.quantiteRecue ?? 0), 0)
    const nouveauStatut: LaboCommandeStatut = totalRecue <= 0
      ? 'envoyee'
      : (totalRecue >= totalQte ? 'livree' : 'partielle')
    await this.db.updateTable('labo_commandes')
      .set({ statut: nouveauStatut, updated_at: nowIso() })
      .where('id', '=', dto.commandeId)
      .execute()

    return this.getCommande(dto.commandeId)
  }

  /** Indicateurs pour l'onglet stock. */
  async stats(): Promise<{ articles: number; alertes: number; lots: number; valeurStock: number; commandesEnCours: number }> {
    const row = await sql<{
      articles: number; alertes: number; lots: number; valeur: number; commandes: number
    }>`
      SELECT
        (SELECT COUNT(*) FROM labo_articles WHERE actif = 1) AS articles,
        (SELECT COUNT(*) FROM labo_articles a WHERE a.actif = 1 AND
          (SELECT COALESCE(SUM(l.quantite_restante), 0) FROM labo_stock_lots l WHERE l.article_id = a.id) <= a.seuil_alerte
        ) AS alertes,
        (SELECT COUNT(*) FROM labo_stock_lots WHERE quantite_restante > 0) AS lots,
        (SELECT COALESCE(SUM(l.quantite_restante * COALESCE(l.prix_achat, 0)), 0) FROM labo_stock_lots l) AS valeur,
        (SELECT COUNT(*) FROM labo_commandes WHERE statut IN ('brouillon','envoyee','partielle')) AS commandes
    `.execute(this.db)
    const r = row.rows[0]
    return {
      articles: Number(r?.articles ?? 0),
      alertes: Number(r?.alertes ?? 0),
      lots: Number(r?.lots ?? 0),
      valeurStock: Number(r?.valeur ?? 0),
      commandesEnCours: Number(r?.commandes ?? 0),
    }
  }
}

export type { LaboArticleDto, LaboStockLotDto, LaboMouvementStockDto }
