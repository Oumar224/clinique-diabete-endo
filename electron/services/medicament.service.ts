import { inject, singleton } from 'tsyringe'
import { sql, type Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { MedicamentEntity } from '../entities/medicament.entity'
import { TYPES_PRODUIT, UNITES_AUTORISEES, type TypeProduit } from '../dto/medicament.dto'
import { nowIso } from '../utils/date-utils'
import { entityEventBus } from '../automerge/event-bus'

export function normalizeMedicamentName(value: string | null | undefined): string {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

/**
 * Normalisation utilisée pour rapprocher un libellé libre d'ordonnance du
 * catalogue : accents, casse et ponctuation sont ignorés.
 *
 * Un espace est inséré entre lettres et chiffres pour que « 500mg » et
 * « 500 mg » produisent la même clé.
 *
 * @example
 * normalizeMedicamentLookup('Amoxicilline 500 mg') // 'amoxicilline 500 mg'
 * normalizeMedicamentLookup('AMOXICILLINE-500MG') // 'amoxicilline 500 mg'
 */
export function normalizeMedicamentLookup(value: string | null | undefined): string {
  return normalizeMedicamentName(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Clés de rapprochement d'un médicament : DCI, nom commercial, et leurs
 * combinaisons avec le dosage (ex. « amoxicilline 500 mg »).
 */
function medicamentLookupKeys(medicament: MedicamentEntity): string[] {
  const dci = normalizeMedicamentLookup(medicament.dci)
  const commercial = normalizeMedicamentLookup(medicament.nom_commercial)
  const dosage = normalizeMedicamentLookup(medicament.dosage)
  const keys = new Set<string>()
  if (dci) keys.add(dci)
  if (commercial) keys.add(commercial)
  if (dci && dosage) keys.add(`${dci} ${dosage}`)
  if (commercial && dosage) keys.add(`${commercial} ${dosage}`)
  return [...keys]
}

/**
 * Rapproche un libellé libre (ordonnance) d'un médicament du catalogue.
 *
 * Stratégie :
 * 1. correspondance exacte sur DCI, nom commercial, DCI + dosage ou nom
 *    commercial + dosage ;
 * 2. sinon, préfixe unique au mot près (le libellé commence par la clé suivie
 *    d'un espace) — couvre « Paracétamol comprimé » sans confondre deux
 *    dosages différents.
 *
 * @param libelle - Libellé brut issu de l'ordonnance.
 * @param medicaments - Catalogue (idéalement actif) à interroger.
 * @returns Le médicament correspondant, ou `null` si aucun ou ambigu.
 */
export function matchMedicamentByLibelle(
  libelle: string,
  medicaments: readonly MedicamentEntity[],
): MedicamentEntity | null {
  const needle = normalizeMedicamentLookup(libelle)
  if (!needle) return null

  // Correspondance exacte : on conserve le premier résultat du catalogue
  // (trié par DCI puis id). Un libellé réduit à une DCI partagée par plusieurs
  // dosages reste donc résolu comme auparavant ; le repli par préfixe, lui,
  // refuse l'ambiguïté.
  for (const medicament of medicaments) {
    if (medicamentLookupKeys(medicament).includes(needle)) return medicament
  }

  const unique = new Map<number, MedicamentEntity>()
  for (const medicament of medicaments) {
    const matchesPrefix = medicamentLookupKeys(medicament).some(
      (key) => key.length >= 5 && needle.startsWith(`${key} `),
    )
    if (matchesPrefix && medicament.id != null) unique.set(medicament.id, medicament)
  }
  return unique.size === 1 ? [...unique.values()][0] : null
}

export function normalizeUnitePharmacie(value: string | null | undefined): string | undefined {
  if (value == null) return undefined
  const t = String(value).trim()
  if (!t) return undefined
  if (t.toLowerCase() === 'gel') return 'gél'
  return t
}

function validatePrixField(label: string, value: number | null | undefined): number | null | undefined {
  if (value === undefined || value === null) return value === null ? null : undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Le ${label} doit être un nombre positif ou nul`)
  if (value < 0) throw new Error(`Le ${label} doit être positif ou nul`)
  return Math.round(value * 100) / 100
}

export interface MedicamentCreateData {
  dci: string
  nomCommercial?: string
  dosage?: string
  forme?: string
  uniteStock?: string
  seuilAlerte?: number
  actif?: boolean
  typeProduit?: TypeProduit
  conditionnement?: string
  contenanceQte?: number | null
  uniteContenance?: string
  autreUnitePrecision?: string
  prixAchat?: number | null
  prixVente?: number | null
  fournisseurPrincipalId?: number | null
}

export interface MedicamentUpdateData {
  dci?: string
  nomCommercial?: string
  dosage?: string
  forme?: string
  uniteStock?: string
  seuilAlerte?: number
  actif?: boolean
  typeProduit?: TypeProduit
  conditionnement?: string
  contenanceQte?: number | null
  uniteContenance?: string
  autreUnitePrecision?: string
  prixAchat?: number | null
  prixVente?: number | null
  fournisseurPrincipalId?: number | null
}

@singleton()
export class MedicamentService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async list(filters?: { actif?: boolean; search?: string; typeProduit?: TypeProduit }): Promise<MedicamentEntity[]> {
    let query = this.db.selectFrom('medicaments').selectAll()
    if (filters?.actif != null) {
      query = query.where('actif', '=', filters.actif ? 1 : 0)
    }
    if (filters?.typeProduit != null) {
      query = query.where('type_produit', '=', filters.typeProduit)
    }
    const search = filters?.search?.trim()
    if (search) {
      const pattern = `%${search}%`
      query = query.where((eb) => eb.or([eb('dci', 'like', pattern), eb('nom_commercial', 'like', pattern)]))
    }
    const rows = await query.orderBy('dci', 'asc').orderBy('id', 'asc').execute()
    return rows as unknown as MedicamentEntity[]
  }

  async getById(id: number): Promise<MedicamentEntity | null> {
    const row = await this.db
      .selectFrom('medicaments')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    return row ? (row as unknown as MedicamentEntity) : null
  }

  /**
   * Retrouve un médicament actif à partir d'un libellé libre.
   *
   * @param libelle - DCI, nom commercial, ou libellé enrichi (DCI + dosage).
   * @returns Le médicament correspondant, ou `null` si introuvable/ambigu.
   */
  async findByName(libelle: string): Promise<MedicamentEntity | null> {
    if (!normalizeMedicamentLookup(libelle)) return null
    const medicaments = await this.list({ actif: true })
    return matchMedicamentByLibelle(libelle, medicaments)
  }

  /**
   * Résout en lot des libellés libres vers des identifiants de médicaments.
   *
   * Charge le catalogue actif une seule fois, ce qui évite N requêtes lors du
   * rattachement des lignes d'une ordonnance.
   *
   * @param libelles - Libellés bruts (doublons acceptés).
   * @returns Map libellé d'origine → identifiant du médicament trouvé. Les
   *   libellés non résolus ou ambigus sont absents de la map.
   */
  async findIdsByLibelles(libelles: readonly string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>()
    const uniques = [...new Set(libelles.map((l) => l.trim()).filter(Boolean))]
    if (uniques.length === 0) return result
    const medicaments = await this.list({ actif: true })
    for (const libelle of uniques) {
      const medicament = matchMedicamentByLibelle(libelle, medicaments)
      if (medicament?.id != null) result.set(libelle, medicament.id)
    }
    return result
  }

  private async assertFournisseurActif(id: number): Promise<void> {
    let row: { actif?: number } | undefined
    try {
      row = await this.db
        .selectFrom('fournisseurs')
        .select(['actif'])
        .where('id', '=', id)
        .executeTakeFirst() as unknown as { actif?: number } | undefined
    } catch {
      throw new Error('Fournisseur introuvable')
    }
    if (!row) throw new Error('Fournisseur introuvable')
    if (Number((row as unknown as { actif: number }).actif) !== 1) throw new Error('Le fournisseur principal est inactif')
  }

  /**
   * Vérifie qu'une unité appartient au référentiel dynamique.
   *
   * Repli sur la liste historique si la table `unites_stock` n'est pas encore
   * créée (bases antérieures à la migration 119).
   */
  private async assertUniteAutorisee(unite: string, label: string): Promise<void> {
    try {
      const row = await this.db
        .selectFrom('unites_stock')
        .select('id')
        .where(sql<boolean>`lower(nom) = lower(${unite})`)
        .executeTakeFirst()
      if (row) return
    } catch {
      // Table absente : le repli statique ci-dessous prend le relais.
    }
    if ((UNITES_AUTORISEES as readonly string[]).includes(unite)) return
    throw new Error(`${label} est invalide. Ajoutez-la depuis le référentiel des unités.`)
  }

  async create(data: MedicamentCreateData): Promise<MedicamentEntity> {
    const dci = data.dci?.trim()
    if (!dci) throw new Error('La DCI du médicament est requise')
    const seuilAlerte = data.seuilAlerte ?? 0
    if (!Number.isInteger(seuilAlerte) || seuilAlerte < 0) throw new Error('Le seuil d\u2019alerte doit être un entier positif ou nul')

    const typeProduit: TypeProduit = data.typeProduit ?? 'medicament'
    if (!(TYPES_PRODUIT as readonly string[]).includes(typeProduit)) {
      throw new Error('Le type de produit est invalide (medicament, dispositif, consommable, autre)')
    }

    const uniteStock = normalizeUnitePharmacie(data.uniteStock) ?? 'cp'
    await this.assertUniteAutorisee(uniteStock, "L'unité de stock")

    const prixAchat = validatePrixField("prix d'achat", data.prixAchat)
    const prixVente = validatePrixField('prix de vente', data.prixVente)

    let conditionnement: string | null | undefined
    if (data.conditionnement !== undefined) {
      const t = data.conditionnement?.trim() || ''
      if (t.length > 200) throw new Error('Le conditionnement ne doit pas dépasser 200 caractères')
      conditionnement = t || null
    }

    const hasQte = data.contenanceQte !== undefined && data.contenanceQte !== null
    const uniteContenance = normalizeUnitePharmacie(data.uniteContenance)
    const hasUnite = uniteContenance !== undefined
    if (hasQte !== hasUnite) throw new Error('Contenance : quantité et unité vont ensemble (tout ou rien)')
    let contenanceQte: number | null | undefined
    if (hasQte && hasUnite) {
      const q = data.contenanceQte as number
      if (typeof q !== 'number' || !Number.isFinite(q) || q <= 0) {
        throw new Error('La quantité de contenance doit être un nombre strictement positif')
      }
      await this.assertUniteAutorisee(uniteContenance!, "L'unité de contenance")
      contenanceQte = q
    }

    const needsPrecision = uniteStock === 'autre' || uniteContenance === 'autre'
    let autreUnitePrecision: string | null | undefined
    if (data.autreUnitePrecision !== undefined) {
      const t = data.autreUnitePrecision?.trim() || ''
      if (needsPrecision) {
        if (t.length < 2 || t.length > 100) throw new Error('La précision de l’unité « autre » est requise (2 à 100 caractères)')
        autreUnitePrecision = t
      } else {
        autreUnitePrecision = t ? (t.length < 2 || t.length > 100 ? (() => { throw new Error('La précision de l’unité doit faire entre 2 et 100 caractères') })() : t) : null
      }
    } else if (needsPrecision) {
      throw new Error('La précision de l’unité « autre » est requise (2 à 100 caractères)')
    }

    if (data.fournisseurPrincipalId !== undefined && data.fournisseurPrincipalId !== null) {
      await this.assertFournisseurActif(data.fournisseurPrincipalId)
    }

    // Requêtes conditionnelles : ne pas inclure la clé si undefined (compat rollback sans 104)
    const values: Record<string, unknown> = {
      dci,
      nom_commercial: data.nomCommercial?.trim() || undefined,
      dosage: data.dosage?.trim() || undefined,
      forme: data.forme?.trim() || undefined,
      unite_stock: uniteStock,
      seuil_alerte: seuilAlerte,
      actif: data.actif === undefined ? 1 : data.actif ? 1 : 0,
    }
    if (typeProduit !== 'medicament') values.type_produit = typeProduit
    if (conditionnement !== undefined) values.conditionnement = conditionnement
    if (contenanceQte !== undefined) values.contenance_qte = contenanceQte
    if (uniteContenance !== undefined) values.unite_contenance = uniteContenance
    if (prixAchat !== undefined) values.prix_achat = prixAchat
    if (prixVente !== undefined) values.prix_vente = prixVente
    if (data.fournisseurPrincipalId !== undefined) values.fournisseur_principal_id = data.fournisseurPrincipalId
    if (autreUnitePrecision !== undefined) values.autre_unite_precision = autreUnitePrecision

    const result = await this.db
      .insertInto('medicaments')
      .values(values as never)
      .returningAll()
      .executeTakeFirst()
    if (!result) throw new Error('Échec de la création du médicament')
    entityEventBus.emitEntityChange({ entityType: 'medicament', action: 'created', id: (result as { id: number }).id!, entity: result, source: 'local', timestamp: Date.now() })
    return result as unknown as MedicamentEntity
  }

  async update(id: number, data: MedicamentUpdateData): Promise<MedicamentEntity> {
    const existing = await this.getById(id)
    if (!existing) throw new Error('Médicament introuvable')

    const hasField =
      data.dci !== undefined ||
      data.nomCommercial !== undefined ||
      data.dosage !== undefined ||
      data.forme !== undefined ||
      data.uniteStock !== undefined ||
      data.seuilAlerte !== undefined ||
      data.actif !== undefined ||
      data.typeProduit !== undefined ||
      data.conditionnement !== undefined ||
      data.contenanceQte !== undefined ||
      data.uniteContenance !== undefined ||
      data.autreUnitePrecision !== undefined ||
      data.prixAchat !== undefined ||
      data.prixVente !== undefined ||
      data.fournisseurPrincipalId !== undefined
    if (!hasField) throw new Error('Rien à mettre à jour')

    if (data.dci !== undefined && !data.dci.trim()) throw new Error('La DCI du médicament est requise')
    if (data.seuilAlerte !== undefined && (!Number.isInteger(data.seuilAlerte) || data.seuilAlerte < 0)) {
      throw new Error('Le seuil d\u2019alerte doit être un entier positif ou nul')
    }
    if (data.typeProduit !== undefined && !(TYPES_PRODUIT as readonly string[]).includes(data.typeProduit)) {
      throw new Error('Le type de produit est invalide (medicament, dispositif, consommable, autre)')
    }

    // Finales pour validations croisées (contenance couple, précision autre)
    const finalUniteStock = data.uniteStock !== undefined
      ? (normalizeUnitePharmacie(data.uniteStock) ?? 'cp')
      : (existing.unite_stock ?? 'cp')
    await this.assertUniteAutorisee(finalUniteStock, "L'unité de stock")

    const qteProvided = data.contenanceQte !== undefined
    const uniteProvided = data.uniteContenance !== undefined
    const finalQte: number | null | undefined = qteProvided ? data.contenanceQte : (existing.contenance_qte ?? undefined)
    const finalUnite: string | undefined = uniteProvided
      ? normalizeUnitePharmacie(data.uniteContenance)
      : (existing.unite_contenance ?? undefined)
    const finalHasQte = finalQte !== undefined && finalQte !== null
    const finalHasUnite = finalUnite !== undefined
    if (finalHasQte !== finalHasUnite) throw new Error('Contenance : quantité et unité vont ensemble (tout ou rien)')
    if (finalHasQte && finalHasUnite) {
      if (typeof finalQte !== 'number' || !Number.isFinite(finalQte) || (finalQte as number) <= 0) {
        throw new Error('La quantité de contenance doit être un nombre strictement positif')
      }
      await this.assertUniteAutorisee(finalUnite!, "L'unité de contenance")
    }

    const finalNeedsPrecision = finalUniteStock === 'autre' || finalUnite === 'autre'
    const finalPrecisionRaw: string | null | undefined = data.autreUnitePrecision !== undefined
      ? (data.autreUnitePrecision?.trim() || '')
      : (existing.autre_unite_precision ?? undefined)
    if (finalNeedsPrecision) {
      const t = (finalPrecisionRaw ?? '').trim()
      if (t.length < 2 || t.length > 100) throw new Error('La précision de l’unité « autre » est requise (2 à 100 caractères)')
    } else if (data.autreUnitePrecision !== undefined && finalPrecisionRaw) {
      const t = (finalPrecisionRaw ?? '').trim()
      if (t.length < 2 || t.length > 100) throw new Error('La précision de l’unité doit faire entre 2 et 100 caractères')
    }

    if (data.conditionnement !== undefined) {
      const t = data.conditionnement?.trim() || ''
      if (t.length > 200) throw new Error('Le conditionnement ne doit pas dépasser 200 caractères')
    }
    if (data.prixAchat !== undefined) validatePrixField("prix d'achat", data.prixAchat)
    if (data.prixVente !== undefined) validatePrixField('prix de vente', data.prixVente)
    if (data.fournisseurPrincipalId !== undefined && data.fournisseurPrincipalId !== null) {
      await this.assertFournisseurActif(data.fournisseurPrincipalId)
    }

    const updateData: Record<string, unknown> = {
      updated_at: nowIso(),
    }
    if (data.dci !== undefined) updateData.dci = data.dci.trim()
    if (data.nomCommercial !== undefined) updateData.nom_commercial = data.nomCommercial?.trim() || null
    if (data.dosage !== undefined) updateData.dosage = data.dosage?.trim() || null
    if (data.forme !== undefined) updateData.forme = data.forme?.trim() || null
    if (data.uniteStock !== undefined) updateData.unite_stock = finalUniteStock
    if (data.seuilAlerte !== undefined) updateData.seuil_alerte = data.seuilAlerte
    if (data.actif !== undefined) updateData.actif = data.actif ? 1 : 0
    // Conditionnelles Phase 1 (compat rollback)
    if (data.typeProduit !== undefined) updateData.type_produit = data.typeProduit
    if (data.conditionnement !== undefined) updateData.conditionnement = data.conditionnement?.trim() || null
    if (data.contenanceQte !== undefined) updateData.contenance_qte = data.contenanceQte
    if (data.uniteContenance !== undefined) updateData.unite_contenance = finalUnite ?? null
    if (data.autreUnitePrecision !== undefined) updateData.autre_unite_precision = (finalPrecisionRaw?.trim() || null) as unknown
    if (data.prixAchat !== undefined) {
      const v = validatePrixField("prix d'achat", data.prixAchat)
      updateData.prix_achat = v === undefined ? null : v
      if (data.prixAchat === null) updateData.prix_achat = null
    }
    if (data.prixVente !== undefined) {
      const v = validatePrixField('prix de vente', data.prixVente)
      updateData.prix_vente = v === undefined ? null : v
      if (data.prixVente === null) updateData.prix_vente = null
    }
    if (data.fournisseurPrincipalId !== undefined) updateData.fournisseur_principal_id = data.fournisseurPrincipalId

    await this.db
      .updateTable('medicaments')
      .set(updateData)
      .where('id', '=', id)
      .execute()

    const updated = await this.getById(id)
    if (!updated) throw new Error('Médicament introuvable après mise à jour')
    entityEventBus.emitEntityChange({ entityType: 'medicament', action: 'updated', id, entity: updated, source: 'local', timestamp: Date.now() })
    return updated
  }

  async deactivate(id: number): Promise<MedicamentEntity> {
    const existing = await this.getById(id)
    if (!existing) throw new Error('Médicament introuvable')

    const stock = await this.db
      .selectFrom('stock_lots')
      .select((eb) => eb.fn.sum<number | null>('quantite').as('total'))
      .where('medicament_id', '=', id)
      .executeTakeFirst()
    if (Number(stock?.total ?? 0) > 0) {
      throw new Error('Impossible de désactiver ce médicament : du stock reste en inventaire')
    }

    return this.update(id, { actif: false })
  }
}
