import { inject, singleton } from 'tsyringe'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { LocaliteDto, LocaliteCreateDto } from '../dto/localite.dto'

interface LocaliteRaw {
  code: string
  name: string
  type?: string  // optional — only used by importFromData for user-provided JSON
  region?: string
  children?: LocaliteRaw[]
}

// Depth index → DB type — type is inferred from tree position in JSON
const LOCALITE_TYPES_BY_DEPTH = ['region', 'prefecture', 'commune'] as const

@singleton()
export class LocaliteService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  private toDto(row: Record<string, unknown>): LocaliteDto {
    return { ...row, is_active: !!row.is_active } as unknown as LocaliteDto
  }

  // ─── List localités (optionally only active) ──────────────────
  async list(activeOnly = false): Promise<LocaliteDto[]> {
    let query = this.db
      .selectFrom('localites')
      .selectAll()
      .orderBy('name', 'asc')

    if (activeOnly) {
      query = query.where('is_active', '=', 1)
    }

    const rows = await query.execute()
    return rows.map(r => this.toDto(r))
  }

  // ─── Get hierarchical tree ────────────────────────────────────
  async getTree(): Promise<LocaliteDto[]> {
    const all = await this.list()

    // Build a map of id -> dto
    const map = new Map<number, LocaliteDto>()
    for (const loc of all) {
      if (loc.id != null) {
        map.set(loc.id, { ...loc, children: [] })
      }
    }

    const roots: LocaliteDto[] = []

    for (const loc of map.values()) {
      if (loc.parent_id != null && map.has(loc.parent_id)) {
        const parent = map.get(loc.parent_id)!
        if (!parent.children) parent.children = []
        parent.children.push(loc)
      } else {
        roots.push(loc)
      }
    }

    return roots
  }

  // ─── Get single localité ─────────────────────────────────────
  async getById(id: number): Promise<LocaliteDto | null> {
    const row = await this.db
      .selectFrom('localites')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return row ? this.toDto(row) : null
  }

  // ─── Get single localité by code ──────────────────────────────
  async getByCode(code: string): Promise<LocaliteDto | null> {
    const row = await this.db
      .selectFrom('localites')
      .selectAll()
      .where('code', '=', code)
      .executeTakeFirst()

    return row ? this.toDto(row) : null
  }

  // ─── Get children of a localité ───────────────────────────────
  async getChildren(parentId: number): Promise<LocaliteDto[]> {
    const rows = await this.db
      .selectFrom('localites')
      .selectAll()
      .where('parent_id', '=', parentId)
      .orderBy('name', 'asc')
      .execute()

    return rows.map(r => this.toDto(r))
  }

  // ─── Import from gn-localites.json (idempotent) ───────────────
  async importFromJson(): Promise<number> {
    // En production (bundle main.js) : __dirname = dist-electron/
    // En vitest : __dirname = electron/services/
    const candidates = [
      join(__dirname, 'data/gn-localites.json'),
      join(__dirname, '../data/gn-localites.json'),
    ]

    const dataPath = candidates.find(p => existsSync(p))
    if (!dataPath) {
      throw new Error(
        `Fichier gn-localites.json introuvable. Chemins testés : ${candidates.join(', ')}`
      )
    }

    const raw = readFileSync(dataPath, 'utf-8')
    let regions: LocaliteRaw[]
    try {
      regions = JSON.parse(raw)
    } catch {
      throw new Error('Le fichier gn-localites.json est invalide')
    }

    let importedCount = 0

    await this.db.transaction().execute(async (trx) => {
      // Remove all existing localities before re-importing to avoid
      // stale records when codes or types change in the JSON source
      await trx.deleteFrom('localites').execute()

      // Helper: recurse into children, inferring type from tree depth
      const insertTree = async (
        parentId: number | null,
        items: LocaliteRaw[],
        depth: number,
        regionName: string,
      ): Promise<void> => {
        const type = LOCALITE_TYPES_BY_DEPTH[depth]
        for (const item of items) {
          const result = await trx
            .insertInto('localites')
            .values({
              code: item.code,
              name: item.name,
              type,
              parent_id: parentId,
              country: 'GN',
              is_active: 1,
              region: depth === 0 ? undefined : regionName,
            })
            .returningAll()
            .executeTakeFirst()

          if (!result) continue
          importedCount++

          if (item.children && item.children.length > 0) {
            await insertTree(result.id!, item.children, depth + 1, depth === 0 ? item.name : regionName)
          }
        }
      }

      await insertTree(null, regions, 0, '')
    })

    // Backfill region for rows imported before the field existed
    await this.backfillRegions()

    return importedCount
  }

  // ─── Import from raw JSON data (any country) ─────────────────
  async importFromData(data: string, countryCode: string): Promise<number> {
    if (!countryCode || countryCode.trim().length === 0) {
      throw new Error('Le code pays est requis')
    }
    if (!data || data.trim().length === 0) {
      throw new Error('Les données JSON sont vides')
    }

    const country = countryCode.trim().toUpperCase()
    let topLevel: LocaliteRaw[]
    try {
      topLevel = JSON.parse(data)
    } catch {
      throw new Error('Le fichier JSON est invalide')
    }

    if (!Array.isArray(topLevel)) {
      throw new Error('Le fichier JSON doit contenir un tableau')
    }

    // Detect if top-level items are regions or prefectures
    const hasRegions = topLevel.some(item => item.type === 'region')

    let importedCount = 0
    await this.db.transaction().execute(async (trx) => {
      for (const item of topLevel) {
        if (!item.code || !item.name) continue

        // Insert top-level item (region or prefecture)
        const itemType = hasRegions ? 'region' : (item.type || 'prefecture')
        const itemResult = await trx
          .insertInto('localites')
          .values({
            code: item.code,
            name: item.name,
            type: itemType,
            parent_id: null,
            country,
            is_active: 1,
          })
          .onConflict((oc) => oc.doNothing())
          .returningAll()
          .executeTakeFirst()

        if (itemResult) importedCount++

        const itemRow = itemResult ?? await trx
          .selectFrom('localites')
          .selectAll()
          .where('code', '=', item.code)
          .executeTakeFirst()

        if (!itemRow || !item.children) continue

        for (const child of item.children) {
          if (!child.code || !child.name) continue

          const childResult = await trx
            .insertInto('localites')
            .values({
              code: child.code,
              name: child.name,
              type: child.type || (hasRegions ? 'prefecture' : 'commune'),
              parent_id: itemRow.id,
              country,
              is_active: 1,
              region: hasRegions ? item.name : child.region,
            })
            .onConflict((oc) => oc.doNothing())
            .returningAll()
            .executeTakeFirst()

          if (childResult) importedCount++

          // Handle 3rd level (prefecture → commune/sous_prefecture)
          if (!hasRegions) continue
          const childRow = childResult ?? await trx
            .selectFrom('localites')
            .selectAll()
            .where('code', '=', child.code)
            .executeTakeFirst()

          if (!childRow || !child.children) continue

          for (const grandchild of child.children) {
            if (!grandchild.code || !grandchild.name) continue

            const grandResult = await trx
              .insertInto('localites')
              .values({
                code: grandchild.code,
                name: grandchild.name,
                type: grandchild.type || 'commune',
                parent_id: childRow.id,
                country,
                is_active: 1,
                region: item.name,
              })
              .onConflict((oc) => oc.doNothing())
              .returningAll()
              .executeTakeFirst()

            if (grandResult) importedCount++
          }
        }
      }
    })

    return importedCount
  }

  // ─── Backfill region column for rows imported before the field existed
  //      Resolves region from the immediate parent (one level up).
  //      Calling this after importFromJson() ensures 2-pass convergence
  //      for 3-level legacy data (commune → prefecture → region). ──
  async backfillRegions(): Promise<number> {
    const rows = await this.db
      .selectFrom('localites')
      .selectAll()
      .where('region', 'is', null)
      .where('type', '!=', 'region')
      .execute()

    let updated = 0
    for (const row of rows) {
      if (!row.parent_id) continue
      const parent = await this.db
        .selectFrom('localites')
        .selectAll()
        .where('id', '=', row.parent_id)
        .executeTakeFirst()
      if (!parent) continue

      if (parent.type === 'region') {
        await this.db
          .updateTable('localites')
          .set({ region: parent.name })
          .where('id', '=', row.id)
          .execute()
        updated++
      } else if (parent.region) {
        await this.db
          .updateTable('localites')
          .set({ region: parent.region })
          .where('id', '=', row.id)
          .execute()
        updated++
      }
    }
    return updated
  }

  // ─── Toggle active/inactive ──────────────────────────────────
  async toggle(id: number, isActive: boolean): Promise<LocaliteDto> {
    if (id == null) throw new Error("L'identifiant de la localité est requis")
    const existing = await this.getById(id)
    if (!existing) throw new Error('Localité introuvable')

    await this.db
      .updateTable('localites')
      .set({
        is_active: isActive ? 1 : 0,
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      })
      .where('id', '=', id)
      .execute()

    const updated = await this.getById(id)
    if (!updated) throw new Error('Localité introuvable après mise à jour')
    return updated
  }

  // ─── Search by name or code ───────────────────────────────────
  async search(query: string): Promise<LocaliteDto[]> {
    if (!query || query.trim().length === 0) {
      return []
    }

    const term = `%${query.trim()}%`

    const rows = await this.db
      .selectFrom('localites')
      .selectAll()
      .where((eb) =>
        eb('name', 'like', term).or('code', 'like', term)
      )
      .orderBy('name', 'asc')
      .limit(50)
      .execute()

    return rows.map(r => this.toDto(r))
  }

  // ─── Create localité (for future use) ─────────────────────────
  async create(dto: LocaliteCreateDto): Promise<LocaliteDto> {
    this.validateName(dto.name)
    this.validateCode(dto.code)

    try {
      const existing = await this.db
        .selectFrom('localites')
        .selectAll()
        .where('code', '=', dto.code.trim().toUpperCase())
        .executeTakeFirst()

      if (existing) {
        throw new Error(`Le code "${dto.code.trim().toUpperCase()}" est déjà utilisé`)
      }

      const result = await this.db
        .insertInto('localites')
        .values({
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          type: dto.type,
          parent_id: dto.parent_id ?? null,
          country: dto.country?.trim().toUpperCase() || 'GN',
          is_active: 1,
          region: dto.region ?? undefined,
        })
        .returningAll()
        .executeTakeFirst()

      if (!result) throw new Error("Échec de la création de la localité")
      return this.toDto(result)
    } catch (err: any) {
      if (err?.message?.includes('no such table') || err?.message?.includes('no such column')) {
        throw new Error("La base de données n'est pas initialisée correctement. Contactez l'administrateur.")
      }
      throw err
    }
  }

  // ─── Validation ──────────────────────────────────────────────
  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Le nom de la localité est requis')
    }
    if (name.trim().length > 200) {
      throw new Error('Le nom de la localité ne peut pas dépasser 200 caractères')
    }
  }

  private validateCode(code: string): void {
    if (!code || code.trim().length === 0) {
      throw new Error('Le code de la localité est requis')
    }
    if (code.trim().length > 20) {
      throw new Error('Le code de la localité ne peut pas dépasser 20 caractères')
    }
  }
}
