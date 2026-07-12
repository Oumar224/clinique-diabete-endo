import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { AttachmentTypeEntity } from '../entities/attachment-type.entity'

@singleton()
export class AttachmentTypeService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  // ─── List attachment types ─────────────────────────────────────
  async list(): Promise<AttachmentTypeEntity[]> {
    return await this.db
      .selectFrom('attachment_types')
      .selectAll()
      .orderBy('name', 'asc')
      .execute()
  }

  // ─── Create a new attachment type ──────────────────────────────
  async create(entity: AttachmentTypeEntity): Promise<AttachmentTypeEntity> {
    if (!entity.name || entity.name.trim().length === 0) {
      throw new Error('Le nom du type de pièce jointe est requis')
    }

    return await this.db
      .insertInto('attachment_types')
      .values({ name: entity.name.trim() })
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  // ─── Update an attachment type ─────────────────────────────────
  async update(entity: AttachmentTypeEntity): Promise<AttachmentTypeEntity> {
    if (entity.id == null) throw new Error("L'identifiant du type de pièce jointe est requis")

    const existing = await this.db
      .selectFrom('attachment_types')
      .selectAll()
      .where('id', '=', entity.id)
      .executeTakeFirst()

    if (!existing) throw new Error('Type de pièce jointe introuvable')

    if (entity.name !== undefined) {
      if (!entity.name || entity.name.trim().length === 0) {
        throw new Error('Le nom du type de pièce jointe est requis')
      }
    }

    const updateData: Record<string, unknown> = {}
    if (entity.name !== undefined) updateData.name = entity.name.trim()

    if (Object.keys(updateData).length > 0) {
      await this.db
        .updateTable('attachment_types')
        .set(updateData)
        .where('id', '=', entity.id)
        .execute()
    }

    const updated = await this.db
      .selectFrom('attachment_types')
      .selectAll()
      .where('id', '=', entity.id)
      .executeTakeFirst()

    if (!updated) throw new Error('Type de pièce jointe introuvable après mise à jour')
    return updated
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
