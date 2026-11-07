import { inject, singleton } from 'tsyringe'
import { sql, type Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { UniteStockEntity } from '../entities/unite-stock.entity'

const MAX_NOM_LENGTH = 40

/**
 * Référentiel des unités de stock.
 *
 * Volontairement minimal : on ajoute une unité, on n'en supprime pas (les
 * produits historiques y font référence via leur colonne texte).
 */
@singleton()
export class UniteStockService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async list(): Promise<UniteStockEntity[]> {
    const rows = await this.db
      .selectFrom('unites_stock')
      .selectAll()
      .orderBy('ordre', 'asc')
      .orderBy('nom', 'asc')
      .execute()
    return rows as unknown as UniteStockEntity[]
  }

  /**
   * Crée une unité (ou retourne l'unité existante à l'identique).
   *
   * Le retour de l'existante rend l'ajout rapide idempotent : ressaisir « cp »
   * ne produit pas d'erreur bloquante côté formulaire.
   */
  async create(nom: string): Promise<UniteStockEntity> {
    const clean = nom?.trim()
    if (!clean) throw new Error("Le nom de l'unité est requis")
    if (clean.length > MAX_NOM_LENGTH) {
      throw new Error(`Le nom de l'unité ne doit pas dépasser ${MAX_NOM_LENGTH} caractères`)
    }

    const existing = await this.db
      .selectFrom('unites_stock')
      .selectAll()
      .where(sql<boolean>`lower(nom) = lower(${clean})`)
      .executeTakeFirst()
    if (existing) return existing as unknown as UniteStockEntity

    const maxRow = await this.db
      .selectFrom('unites_stock')
      .select((eb) => eb.fn.max<number>('ordre').as('max_ordre'))
      .executeTakeFirst()
    const ordre = Number(maxRow?.max_ordre ?? 0) + 1

    const created = await this.db
      .insertInto('unites_stock')
      .values({ nom: clean, ordre })
      .returningAll()
      .executeTakeFirstOrThrow()
    return created as unknown as UniteStockEntity
  }
}
