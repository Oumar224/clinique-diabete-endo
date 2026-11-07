import { inject, singleton } from 'tsyringe'
import { type Kysely, type RawBuilder, type Transaction, sql } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { ModePaiement } from '../dto/invoice.dto'
import type {
  DepenseCategorieCreateDto,
  DepenseCategorieDto,
  DepenseCategorieUpdateDto,
  DepenseCreateDto,
  DepenseDateReference,
  DepenseDto,
  DepenseListFiltres,
  DepenseMarquerPayeeDto,
  DepenseSource,
  DepenseStatutPaiement,
  DepenseStockEntryInput,
  DepenseSyntheseCategorieDto,
  DepenseSyntheseDto,
  DepenseSyntheseFournisseurDto,
  DepenseUpdateDto,
} from '../dto/depense.dto'
import { DepenseCategorieEntity, DepenseEntity } from '../entities/depense.entity'
import { todayIso } from '../utils/date-utils'

type DbExecutor = Kysely<DB> | Transaction<DB>

const MODES_PAIEMENT: readonly ModePaiement[] = [
  'espèces',
  'carte_bancaire',
  'chèque',
  'virement',
  'mobile_money',
  'assurance',
  'autre',
]

const STATUTS: readonly DepenseStatutPaiement[] = ['payee', 'credit']
const SOURCES: readonly DepenseSource[] = ['manuel', 'stock_entree']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Référence de date par défaut de la LISTE opérationnelle : date d'écriture.
 * La SYNTHÈSE utilise `decaissement` (cf. `getSynthese`) pour réconcilier avec
 * le journal de caisse.
 */
const DATE_REFERENCE_LISTE: DepenseDateReference = 'ecriture'
const DATE_REFERENCE_SYNTHESE: DepenseDateReference = 'decaissement'

/** Ligne de dépense jointe (catégorie + fournisseur optionnel). */
type DepenseJoinedRow = DepenseEntity & {
  categorie_code?: string | null
  categorie_nom?: string | null
  categorie_couleur?: string | null
  fournisseur_join_nom?: string | null
}

function isUniqueViolation(error: unknown): boolean {
  if ((error as { code?: string })?.code === 'SQLITE_CONSTRAINT_UNIQUE') return true
  return /UNIQUE constraint failed/i.test((error as Error)?.message ?? '')
}

function isDbExecutor(value: unknown): value is DbExecutor {
  return typeof (value as { selectFrom?: unknown })?.selectFrom === 'function'
}

function assertPositiveInt(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} invalide`)
  }
  return value
}

function assertDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    throw new Error(`${field} invalide (format attendu AAAA-MM-JJ)`)
  }
  return value
}

function assertMontant(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Montant invalide')
  }
  const montant = Math.round(value)
  if (montant < 0) throw new Error('Le montant ne peut pas être négatif')
  return montant
}

function assertMode(value: unknown): ModePaiement {
  if (typeof value !== 'string' || !MODES_PAIEMENT.includes(value as ModePaiement)) {
    throw new Error('Mode de paiement invalide')
  }
  return value as ModePaiement
}

function assertStatut(value: unknown): DepenseStatutPaiement {
  if (typeof value !== 'string' || !STATUTS.includes(value as DepenseStatutPaiement)) {
    throw new Error('Statut de paiement invalide')
  }
  return value as DepenseStatutPaiement
}

function requireLibelle(value: unknown): string {
  const libelle = typeof value === 'string' ? value.trim() : ''
  if (!libelle) throw new Error('Le libellé est requis')
  return libelle
}

function assertDateReference(value: unknown, fallback: DepenseDateReference): DepenseDateReference {
  if (value == null) return fallback
  if (value !== 'ecriture' && value !== 'decaissement') {
    throw new Error('Référence de date invalide (attendu : ecriture ou decaissement)')
  }
  return value
}

/**
 * Expression SQL de la date de référence d'une dépense (défaut M1).
 *
 * - `ecriture`    : `depense.date` (date d'écriture comptable).
 * - `decaissement`: uniquement la date de DÉCAISSEMENT EFFECTIF, c'est-à-dire
 *   `COALESCE(date_paiement, date)` pour une dépense PAYÉE, et `NULL` pour une
 *   dépense à CRÉDIT. Une dépense non payée n'a pas encore quitté la caisse :
 *   elle ne doit donc apparaître dans AUCUNE période de décaissement.
 *
 * C'est exactement la population du journal de caisse
 * (`caisse.service.ts`, `statut_paiement = 'payee'`), ce qui garantit
 * `synthese.decaissement === caisse.sorties` sur la même période.
 */
function dateReferenceExpr(
  reference: DepenseDateReference,
  alias: string,
): RawBuilder<unknown> {
  const table = sql.ref(alias)
  return reference === 'decaissement'
    ? sql`CASE WHEN ${table}.statut_paiement = 'payee' THEN COALESCE(${table}.date_paiement, ${table}.date) END`
    : sql`${table}.date`
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'categorie'
}

function trimOrUndefined(value: string | null | undefined): string | undefined {
  if (value == null) return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

@singleton()
export class DepenseService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  // ─── Catégories ──────────────────────────────────────────────────────

  async listCategories(includeInactive = false): Promise<DepenseCategorieDto[]> {
    let query = this.db.selectFrom('depense_categorie').selectAll()
    if (!includeInactive) {
      query = query.where('actif', '=', 1)
    }
    const rows = await query.orderBy('ordre', 'asc').orderBy('nom', 'asc').execute()
    return rows.map((row) => DepenseCategorieEntity.toDto(row as any))
  }

  private async generateUniqueCode(executor: DbExecutor, base: string): Promise<string> {
    let code = base
    let suffix = 2
    while (suffix < 1000) {
      const existing = await executor
        .selectFrom('depense_categorie')
        .select('id')
        .where('code', '=', code)
        .executeTakeFirst()
      if (!existing) return code
      code = `${base}-${suffix++}`
    }
    throw new Error('Impossible de générer un code de catégorie unique')
  }

  async createCategorie(dto: DepenseCategorieCreateDto): Promise<DepenseCategorieDto> {
    const nom = requireLibelle(dto?.nom)
    const ordre = dto.ordre == null ? 0 : assertMontant(dto.ordre)
    const couleur = trimOrUndefined(dto.couleur)
    const actif = dto.actif === false ? 0 : 1
    const requestedCode = trimOrUndefined(dto.code)

    return this.db.transaction().execute(async (trx) => {
      let code: string
      if (requestedCode) {
        code = slugify(requestedCode)
        const duplicate = await trx
          .selectFrom('depense_categorie')
          .select('id')
          .where('code', '=', code)
          .executeTakeFirst()
        if (duplicate) throw new Error('Le code de catégorie existe déjà')
      } else {
        code = await this.generateUniqueCode(trx, slugify(nom))
      }

      const inserted = await trx
        .insertInto('depense_categorie')
        .values({ code, nom, couleur, actif, ordre })
        .returningAll()
        .executeTakeFirstOrThrow()

      return DepenseCategorieEntity.toDto(inserted as any)
    })
  }

  async updateCategorie(id: number, dto: DepenseCategorieUpdateDto): Promise<DepenseCategorieDto> {
    const categorieId = assertPositiveInt(id, 'Catégorie')

    return this.db.transaction().execute(async (trx) => {
      const existing = await trx
        .selectFrom('depense_categorie')
        .select('id')
        .where('id', '=', categorieId)
        .executeTakeFirst()
      if (!existing) throw new Error('Catégorie de dépense introuvable')

      const set: Record<string, unknown> = { updated_at: sql`datetime('now')` }
      if (dto.nom !== undefined) set.nom = requireLibelle(dto.nom)
      if (dto.couleur !== undefined) set.couleur = trimOrUndefined(dto.couleur) ?? null
      if (dto.actif !== undefined) set.actif = dto.actif ? 1 : 0
      if (dto.ordre !== undefined) set.ordre = assertMontant(dto.ordre)
      // `code` est volontairement immuable.

      const updated = await trx
        .updateTable('depense_categorie')
        .set(set as any)
        .where('id', '=', categorieId)
        .returningAll()
        .executeTakeFirstOrThrow()

      return DepenseCategorieEntity.toDto(updated as any)
    })
  }

  async deleteCategorie(id: number): Promise<{ deleted: true }> {
    const categorieId = assertPositiveInt(id, 'Catégorie')

    return this.db.transaction().execute(async (trx) => {
      const existing = await trx
        .selectFrom('depense_categorie')
        .select('id')
        .where('id', '=', categorieId)
        .executeTakeFirst()
      if (!existing) throw new Error('Catégorie de dépense introuvable')

      const used = await trx
        .selectFrom('depense')
        .select((eb) => eb.fn.countAll<number>().as('total'))
        .where('categorie_id', '=', categorieId)
        .executeTakeFirst()

      if (Number(used?.total ?? 0) > 0) {
        throw new Error('Impossible de supprimer une catégorie utilisée par des dépenses')
      }

      await trx.deleteFrom('depense_categorie').where('id', '=', categorieId).execute()
      return { deleted: true as const }
    })
  }

  // ─── Dépenses ────────────────────────────────────────────────────────

  /**
   * La table `fournisseurs` n'existe que si la migration 103 est appliquée.
   * La migration 108 a été conçue pour fonctionner SANS elle (pas de clé
   * étrangère), et `stock.service.ts` protège déjà ses propres requêtes.
   * `DepenseService` doit faire de même (défaut M8) : on sonde UNE fois la
   * présence de la table (résultat mis en cache) et on dégrade proprement —
   * pas de jointure, repli sur `depense.fournisseur_nom`, aucune résolution
   * de fournisseur.
   */
  private hasFournisseursCache?: boolean
  private hasFournisseursPromise?: Promise<boolean>

  private async hasFournisseurs(executor?: DbExecutor): Promise<boolean> {
    // La présence de la table est un fait stable : on met en cache AUSSI le
    // résultat négatif (table absente), sinon chaque requête re-sonde.
    if (this.hasFournisseursCache !== undefined) return this.hasFournisseursCache
    if (!this.hasFournisseursPromise) {
      this.hasFournisseursPromise = (async () => {
        try {
          const result = await sql<{ name: string }>`
            SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'fournisseurs'
          `.execute(executor ?? this.db)
          const exists = result.rows.length > 0
          this.hasFournisseursCache = exists
          return exists
        } catch (error) {
          // Échec de la sonde : on ne cache RIEN (nouvel essai au prochain
          // appel) et on dégrade comme si la table était absente.
          console.warn('[CDE][DepenseService] Sonde `fournisseurs` échouée :', error)
          return false
        } finally {
          this.hasFournisseursPromise = undefined
        }
      })()
    }
    return this.hasFournisseursPromise
  }

  /**
   * Requête « dépense + catégorie », avec jointure `fournisseurs` CONDITIONNELLE.
   *
   * Écrit en SQL brut : la jointure ne peut pas être construite
   * conditionnellement avec le query builder Kysely sans dupliquer toute la
   * chaîne de filtres.
   */
  private async selectDepenses(
    executor: DbExecutor,
    filtres?: DepenseListFiltres,
    id?: number,
  ): Promise<DepenseJoinedRow[]> {
    const dateReference = assertDateReference(
      filtres?.dateReference,
      DATE_REFERENCE_LISTE,
    )
    const withFournisseurs = await this.hasFournisseurs(executor)
    const dateExpr = dateReferenceExpr(dateReference, 'dep')

    const conditions: RawBuilder<unknown>[] = []
    if (id != null) conditions.push(sql`dep.id = ${id}`)
    if (filtres?.dateDebut) conditions.push(sql`${dateExpr} >= ${filtres.dateDebut}`)
    if (filtres?.dateFin) conditions.push(sql`${dateExpr} <= ${filtres.dateFin}`)
    if (filtres?.categorieId != null) {
      conditions.push(sql`dep.categorie_id = ${filtres.categorieId}`)
    }
    if (filtres?.statutPaiement) {
      conditions.push(sql`dep.statut_paiement = ${filtres.statutPaiement}`)
    }
    if (filtres?.source) {
      conditions.push(sql`dep.source = ${filtres.source}`)
    }
    const search = trimOrUndefined(filtres?.search)
    if (search) {
      const pattern = `%${search}%`
      conditions.push(sql`(
        dep.libelle LIKE ${pattern}
        OR dep.reference LIKE ${pattern}
        OR dep.fournisseur_nom LIKE ${pattern}
      )`)
    }

    const rows = await sql<DepenseJoinedRow>`
      SELECT
        dep.*,
        dc.code AS categorie_code,
        dc.nom AS categorie_nom,
        dc.couleur AS categorie_couleur,
        ${withFournisseurs ? sql`f.nom AS fournisseur_join_nom` : sql`NULL AS fournisseur_join_nom`}
      FROM depense dep
      INNER JOIN depense_categorie dc ON dc.id = dep.categorie_id
      ${withFournisseurs ? sql`LEFT JOIN fournisseurs f ON f.id = dep.fournisseur_id` : sql``}
      ${conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``}
      ORDER BY ${dateExpr} DESC, dep.id DESC
    `.execute(executor)

    return rows.rows
  }

  private async load(executor: DbExecutor, id: number): Promise<DepenseDto> {
    const rows = await this.selectDepenses(executor, undefined, id)
    const row = rows[0]
    if (!row) throw new Error('Dépense introuvable')
    return DepenseEntity.toDto(row)
  }

  private async assertCategorieExists(executor: DbExecutor, id: number): Promise<void> {
    const categorie = await executor
      .selectFrom('depense_categorie')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst()
    if (!categorie) throw new Error('Catégorie de dépense introuvable')
  }

  private async resolveFournisseurNom(
    executor: DbExecutor,
    fournisseurId: number | null,
    fournisseurNom: string | undefined,
  ): Promise<{ fournisseurId: number | null; fournisseurNom: string | undefined }> {
    if (fournisseurId == null) return { fournisseurId: null, fournisseurNom }
    // Table `fournisseurs` absente (base pré-pharmacie) : aucune résolution
    // possible, on conserve l'identifiant et le nom dénormalisé (défaut M8).
    if (!(await this.hasFournisseurs(executor))) {
      return { fournisseurId, fournisseurNom }
    }
    const fournisseur = await executor
      .selectFrom('fournisseurs')
      .select(['id', 'nom'])
      .where('id', '=', fournisseurId)
      .executeTakeFirst()
    if (!fournisseur) throw new Error('Fournisseur introuvable')
    return {
      fournisseurId,
      fournisseurNom: fournisseurNom ?? trimOrUndefined(fournisseur.nom),
    }
  }

  async list(filtres?: DepenseListFiltres): Promise<DepenseDto[]> {
    if (filtres?.dateDebut) assertDate(filtres.dateDebut, 'Date de début')
    if (filtres?.dateFin) assertDate(filtres.dateFin, 'Date de fin')
    if (filtres?.statutPaiement != null) assertStatut(filtres.statutPaiement)
    if (filtres?.source != null && !SOURCES.includes(filtres.source)) {
      throw new Error('Source de dépense invalide')
    }
    // La liste opérationnelle reste sur la date d'ÉCRITURE par défaut ; la
    // référence de décaissement est explicite et optionnelle (défaut M1).
    assertDateReference(filtres?.dateReference, DATE_REFERENCE_LISTE)

    const rows = await this.selectDepenses(this.db, filtres)
    return rows.map((row) => DepenseEntity.toDto(row))
  }

  async getById(id: number): Promise<DepenseDto> {
    return this.load(this.db, assertPositiveInt(id, 'Dépense'))
  }

  async create(dto: DepenseCreateDto): Promise<DepenseDto> {
    const date = assertDate(dto?.date, 'Date')
    const categorieId = assertPositiveInt(dto?.categorieId, 'Catégorie')
    const libelle = requireLibelle(dto?.libelle)
    const montant = assertMontant(dto?.montant)
    // N10 : une dépense MANUELLE doit être strictement positive (le chemin
    // automatique « entrée de stock » ignore déjà les montants nuls).
    if (montant <= 0) throw new Error('Le montant doit être supérieur à zéro')
    const statutPaiement = assertStatut(dto.statutPaiement ?? 'payee')
    const modePaiement = dto.modePaiement == null ? null : assertMode(dto.modePaiement)
    const fournisseurId =
      dto.fournisseurId == null ? null : assertPositiveInt(dto.fournisseurId, 'Fournisseur')

    let datePaiement: string | undefined
    if (statutPaiement === 'payee') {
      datePaiement = dto.datePaiement
        ? assertDate(dto.datePaiement, 'Date de paiement')
        : date
    }

    return this.db.transaction().execute(async (trx) => {
      await this.assertCategorieExists(trx, categorieId)
      const fournisseur = await this.resolveFournisseurNom(
        trx,
        fournisseurId,
        trimOrUndefined(dto.fournisseurNom),
      )

      const inserted = await trx
        .insertInto('depense')
        .values({
          date,
          categorie_id: categorieId,
          libelle,
          montant,
          mode_paiement: modePaiement ?? undefined,
          fournisseur_id: fournisseur.fournisseurId,
          fournisseur_nom: fournisseur.fournisseurNom,
          reference: trimOrUndefined(dto.reference),
          notes: trimOrUndefined(dto.notes),
          source: 'manuel',
          statut_paiement: statutPaiement,
          date_paiement: datePaiement,
          created_by: dto.createdBy,
        })
        .returning('id')
        .executeTakeFirstOrThrow()

      return this.load(trx, inserted.id as number)
    })
  }

  async update(id: number, dto: DepenseUpdateDto): Promise<DepenseDto> {
    const depenseId = assertPositiveInt(id, 'Dépense')

    return this.db.transaction().execute(async (trx) => {
      const existing = await trx
        .selectFrom('depense')
        .selectAll()
        .where('id', '=', depenseId)
        .executeTakeFirst()
      if (!existing) throw new Error('Dépense introuvable')

      const set: Record<string, unknown> = { updated_at: sql`datetime('now')` }

      if (dto.date !== undefined) set.date = assertDate(dto.date, 'Date')
      if (dto.libelle !== undefined) set.libelle = requireLibelle(dto.libelle)
      if (dto.montant !== undefined) {
        const montant = assertMontant(dto.montant)
        // N10 : une dépense MANUELLE reste strictement positive.
        if ((existing.source ?? 'manuel') === 'manuel' && montant <= 0) {
          throw new Error('Le montant doit être supérieur à zéro')
        }
        set.montant = montant
      }

      if (dto.categorieId !== undefined) {
        const categorieId = assertPositiveInt(dto.categorieId, 'Catégorie')
        await this.assertCategorieExists(trx, categorieId)
        set.categorie_id = categorieId
      }

      if (dto.modePaiement !== undefined) {
        set.mode_paiement =
          dto.modePaiement == null ? null : assertMode(dto.modePaiement)
      }

      if (dto.fournisseurId !== undefined) {
        if (dto.fournisseurId === null) {
          set.fournisseur_id = null
        } else {
          const fournisseurId = assertPositiveInt(dto.fournisseurId, 'Fournisseur')
          if (await this.hasFournisseurs(trx)) {
            const fournisseur = await trx
              .selectFrom('fournisseurs')
              .select(['id', 'nom'])
              .where('id', '=', fournisseurId)
              .executeTakeFirst()
            if (!fournisseur) throw new Error('Fournisseur introuvable')
            set.fournisseur_id = fournisseurId
            // Garde le nom dénormalisé synchronisé si l'appelant ne le fournit pas.
            if (dto.fournisseurNom === undefined) {
              set.fournisseur_nom = trimOrUndefined(fournisseur.nom) ?? null
            }
          } else {
            // Table `fournisseurs` absente (défaut M8) : aucune validation
            // possible, l'identifiant est conservé tel quel.
            set.fournisseur_id = fournisseurId
          }
        }
      }
      if (dto.fournisseurNom !== undefined) {
        set.fournisseur_nom = trimOrUndefined(dto.fournisseurNom) ?? null
      }
      if (dto.reference !== undefined) {
        set.reference = trimOrUndefined(dto.reference) ?? null
      }
      if (dto.notes !== undefined) {
        set.notes = trimOrUndefined(dto.notes) ?? null
      }

      const statutPaiement =
        dto.statutPaiement !== undefined
          ? assertStatut(dto.statutPaiement)
          : (existing.statut_paiement as DepenseStatutPaiement)
      if (dto.statutPaiement !== undefined) set.statut_paiement = statutPaiement

      if (statutPaiement === 'credit') {
        set.date_paiement = null
      } else if (dto.datePaiement !== undefined) {
        set.date_paiement =
          dto.datePaiement === null
            ? (set.date as string | undefined) ?? existing.date
            : assertDate(dto.datePaiement, 'Date de paiement')
      } else if (!existing.date_paiement) {
        set.date_paiement = (set.date as string | undefined) ?? existing.date
      }

      await trx.updateTable('depense').set(set as any).where('id', '=', depenseId).execute()
      return this.load(trx, depenseId)
    })
  }

  async delete(id: number): Promise<{ deleted: true }> {
    const depenseId = assertPositiveInt(id, 'Dépense')
    const existing = await this.db
      .selectFrom('depense')
      .select(['id', 'source'])
      .where('id', '=', depenseId)
      .executeTakeFirst()
    if (!existing) throw new Error('Dépense introuvable')
    // N9 : une dépense générée par une entrée de stock est LIÉE au mouvement
    // de stock : la supprimer laisserait le stock et la comptabilité
    // incohérents. L'interface masquait le bouton ; l'IPC doit aussi refuser.
    if (existing.source === 'stock_entree') {
      throw new Error(
        'Impossible de supprimer une dépense issue d\'une entrée de stock : elle est liée au mouvement de stock.',
      )
    }
    const result = await this.db.deleteFrom('depense').where('id', '=', depenseId).executeTakeFirst()
    if (Number(result.numDeletedRows ?? 0) === 0) throw new Error('Dépense introuvable')
    return { deleted: true }
  }

  async marquerPayee(id: number, dto: DepenseMarquerPayeeDto): Promise<DepenseDto> {
    const depenseId = assertPositiveInt(id, 'Dépense')
    const modePaiement = assertMode(dto?.modePaiement)

    return this.db.transaction().execute(async (trx) => {
      const existing = await trx
        .selectFrom('depense')
        .selectAll()
        .where('id', '=', depenseId)
        .executeTakeFirst()
      if (!existing) throw new Error('Dépense introuvable')

      // N11 : une dépense DÉJÀ payée doit voir APPLIQUÉE la nouvelle date et le
      // nouveau mode de paiement (sinon l'appelant croit avoir une erreur
      // alors que la ligne n'a pas bougé). Sans date fournie, on conserve la
      // date de paiement existante ; à défaut, on prend aujourd'hui.
      const datePaiement = dto.datePaiement
        ? assertDate(dto.datePaiement, 'Date de paiement')
        : (existing.date_paiement ?? todayIso())

      await trx
        .updateTable('depense')
        .set({
          statut_paiement: 'payee',
          date_paiement: datePaiement,
          mode_paiement: modePaiement,
          updated_at: sql`datetime('now')`,
        })
        .where('id', '=', depenseId)
        .execute()

      return this.load(trx, depenseId)
    })
  }

  async getSynthese(filtres?: DepenseListFiltres): Promise<DepenseSyntheseDto> {
    if (filtres?.dateDebut) assertDate(filtres.dateDebut, 'Date de début')
    if (filtres?.dateFin) assertDate(filtres.dateFin, 'Date de fin')
    if (filtres?.statutPaiement != null) assertStatut(filtres.statutPaiement)
    if (filtres?.source != null && !SOURCES.includes(filtres.source)) {
      throw new Error('Source de dépense invalide')
    }
    // M1 : la SYNTHÈSE utilise par défaut la date de DÉCAISSEMENT — c'est la
    // seule date qui réconcilie avec le journal de caisse (mêmes sorties).
    // La date d'écriture reste accessible via `dateReference: 'ecriture'`.
    const dateReference = assertDateReference(
      filtres?.dateReference,
      DATE_REFERENCE_SYNTHESE,
    )

    const rows = await this.selectDepenses(this.db, { ...filtres, dateReference })

    let total = 0
    let totalPaye = 0
    let totalCredit = 0
    const parCategorieMap = new Map<number, DepenseSyntheseCategorieDto>()
    const parFournisseurMap = new Map<string, DepenseSyntheseFournisseurDto>()

    for (const row of rows) {
      const montant = Number(row.montant ?? 0)
      total += montant
      if (row.statut_paiement === 'payee') totalPaye += montant
      if (row.statut_paiement === 'credit') totalCredit += montant

      const categorieId = Number(row.categorie_id)
      const categorie = parCategorieMap.get(categorieId) ?? {
        categorieId,
        code: row.categorie_code ?? undefined,
        nom: row.categorie_nom ?? undefined,
        couleur: row.categorie_couleur ?? null,
        total: 0,
        count: 0,
      }
      categorie.total += montant
      categorie.count += 1
      parCategorieMap.set(categorieId, categorie)

      const fournisseurNom =
        trimOrUndefined(row.fournisseur_nom) ??
        trimOrUndefined(row.fournisseur_join_nom) ??
        'Non renseigné'
      const fournisseur = parFournisseurMap.get(fournisseurNom) ?? {
        fournisseurNom,
        total: 0,
        count: 0,
      }
      fournisseur.total += montant
      fournisseur.count += 1
      parFournisseurMap.set(fournisseurNom, fournisseur)
    }

    const parCategorie = Array.from(parCategorieMap.values()).sort(
      (a, b) => b.total - a.total || String(a.nom ?? '').localeCompare(String(b.nom ?? '')),
    )
    const parFournisseur = Array.from(parFournisseurMap.values()).sort(
      (a, b) => b.total - a.total || a.fournisseurNom.localeCompare(b.fournisseurNom),
    )

    return {
      total,
      totalPaye,
      totalCredit,
      count: rows.length,
      parCategorie,
      parFournisseur,
      dateReference,
    }
  }

  /**
   * Crée (une seule fois par `sourceId`) la dépense correspondant à une entrée
   * de stock. Idempotent : un doublon renvoie la dépense existante.
   * Retourne `null` si le montant est nul (aucune dépense à créer).
   *
   * La dépense est créée en `credit` lorsque l'appelant le demande (chemin
   * entrée de stock) ; sans option, on conserve le comportement historique
   * `payee` pour ne pas casser les appelants existants.
   *
   * Un executeur (transaction) peut être fourni pour que l'insertion soit
   * atomique avec l'entrée de stock. Sans executeur, une transaction locale
   * est ouverte.
   */
  async createFromStockEntry(input: DepenseStockEntryInput): Promise<DepenseDto | null>
  async createFromStockEntry(executor: DbExecutor, input: DepenseStockEntryInput): Promise<DepenseDto | null>
  async createFromStockEntry(
    first: DbExecutor | DepenseStockEntryInput,
    second?: DepenseStockEntryInput,
  ): Promise<DepenseDto | null> {
    const externalExecutor = isDbExecutor(first) ? first : undefined
    const input = (externalExecutor ? second : (first as DepenseStockEntryInput)) ?? ({} as DepenseStockEntryInput)

    const montant = assertMontant(input.montant)
    if (montant <= 0) return null

    const date = assertDate(input.date, 'Date')
    const libelle = requireLibelle(input.libelle)
    const sourceId = assertPositiveInt(input.sourceId, 'Source')
    const fournisseurId =
      input.fournisseurId == null ? null : assertPositiveInt(input.fournisseurId, 'Fournisseur')
    const statutPaiement = assertStatut(input.statutPaiement ?? 'payee')

    const run = async (trx: DbExecutor): Promise<DepenseDto> => {
      const existing = await trx
        .selectFrom('depense')
        .select('id')
        .where('source', '=', 'stock_entree')
        .where('source_id', '=', sourceId)
        .executeTakeFirst()
      if (existing) return this.load(trx, existing.id as number)

      let categorie = await trx
        .selectFrom('depense_categorie')
        .select(['id', 'code', 'nom'])
        .where('code', '=', 'pharmacie')
        .executeTakeFirst()

      if (!categorie) {
        categorie = await trx
          .insertInto('depense_categorie')
          .values({ code: 'pharmacie', nom: 'Pharmacie', actif: 1, ordre: 0 })
          .returning(['id', 'code', 'nom'])
          .executeTakeFirstOrThrow()
      }

      const fournisseur = await this.resolveFournisseurNom(
        trx,
        fournisseurId,
        trimOrUndefined(input.fournisseurNom),
      )

      try {
        const inserted = await trx
          .insertInto('depense')
          .values({
            date,
            categorie_id: categorie.id as number,
            libelle,
            montant,
            fournisseur_id: fournisseur.fournisseurId,
            fournisseur_nom: fournisseur.fournisseurNom,
            reference: trimOrUndefined(input.reference),
            source: 'stock_entree',
            source_id: sourceId,
            statut_paiement: statutPaiement,
            date_paiement: statutPaiement === 'payee' ? date : undefined,
            created_by: input.createdBy,
          })
          .returning('id')
          .executeTakeFirstOrThrow()

        return this.load(trx, inserted.id as number)
      } catch (error) {
        if (!isUniqueViolation(error)) throw error
        // Course concurrente : une autre transaction a inséré la même source.
        const raced = await trx
          .selectFrom('depense')
          .select('id')
          .where('source', '=', 'stock_entree')
          .where('source_id', '=', sourceId)
          .executeTakeFirst()
        if (!raced) throw error
        return this.load(trx, raced.id as number)
      }
    }

    return externalExecutor
      ? run(externalExecutor)
      : this.db.transaction().execute(run)
  }
}
