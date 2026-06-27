import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { AttachmentTypeDto, CreateAttachmentTypeDto, UpdateAttachmentTypeDto } from '../dto/attachment-type.dto'

@singleton()
export class AttachmentTypeService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  private toDto(row: Record<string, unknown>): AttachmentTypeDto {
    if (row.created_at == null) {
      throw new Error('Erreur interne : date de création manquante')
    }
    return {
      id: row.id as number,
      name: row.name as string,
      createdAt: row.created_at as string,
    }
  }

  // ─── List attachment types ─────────────────────────────────────
  async list(): Promise<AttachmentTypeDto[]> {
    const rows = await this.db
      .selectFrom('attachment_types')
      .selectAll()
      .orderBy('name', 'asc')
      .execute()
    return rows.map(r => this.toDto(r))
  }

  // ─── Create a new attachment type ──────────────────────────────
  async create(dto: CreateAttachmentTypeDto): Promise<AttachmentTypeDto> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new Error('Le nom du type de pièce jointe est requis')
    }

    const result = await this.db
      .insertInto('attachment_types')
      .values({ name: dto.name.trim() })
      .returningAll()
      .executeTakeFirstOrThrow()

    return this.toDto(result)
  }

  // ─── Update an attachment type ─────────────────────────────────
  async update(id: number, dto: UpdateAttachmentTypeDto): Promise<AttachmentTypeDto> {
    if (id == null) throw new Error("L'identifiant du type de pièce jointe est requis")

    const existing = await this.db
      .selectFrom('attachment_types')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!existing) throw new Error('Type de pièce jointe introuvable')

    if (dto.name !== undefined) {
      if (!dto.name || dto.name.trim().length === 0) {
        throw new Error('Le nom du type de pièce jointe est requis')
      }
    }

    const updateData: Record<string, unknown> = {}
    if (dto.name !== undefined) updateData.name = dto.name.trim()

    if (Object.keys(updateData).length > 0) {
      await this.db
        .updateTable('attachment_types')
        .set(updateData)
        .where('id', '=', id)
        .execute()
    }

    const updated = await this.db
      .selectFrom('attachment_types')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!updated) throw new Error('Type de pièce jointe introuvable après mise à jour')
    return this.toDto(updated)
  }

  // ─── Delete an attachment type ─────────────────────────────────
  async delete(id: number): Promise<void> {
    if (id == null) throw new Error("L'identifiant du type de pièce jointe est requis")

    const existing = await this.db
      .selectFrom('attachment_types')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!existing) throw new Error('Type de pièce jointe introuvable')

    await this.db
      .deleteFrom('attachment_types')
      .where('id', '=', id)
      .execute()
  }
}
