import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { EncounterEntity } from '../entities/encounter.entity'
import type { EncounterCreateDto, EncounterDto, EncounterMovementDto, EncounterUpdateDto } from '../dto/encounter.dto'

@singleton()
export class EncounterService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async listByPatient(patientId: number, status?: string): Promise<EncounterDto[]> {
    let query = this.db
      .selectFrom('encounters')
      .leftJoin('services', 'services.id', 'encounters.service_id')
      .leftJoin('user', 'user.id', 'encounters.medecin_id')
      .leftJoin('user as resp', 'resp.id', 'encounters.responsable_id')
      .leftJoin('contact_categories', 'contact_categories.id', 'encounters.contact_category_id')
      .leftJoin('care_units', 'care_units.id', 'encounters.care_unit_id')
      .select([
        'encounters.id',
        'encounters.patient_id',
        'encounters.contact_type',
        'encounters.contact_type_precision',
        'encounters.start_date',
        'encounters.end_date',
        'encounters.service_id',
        'encounters.medecin_id',
        'encounters.responsable_id',
        'encounters.origin',
        'encounters.origin_precision',
        'encounters.zone_situation',
        'encounters.zone_precision',
        'encounters.prise_en_charge',
        'encounters.prise_en_charge_precision',
        'encounters.contact_category_id',
        'encounters.care_unit_id',
        'encounters.sinistre_info',
        'encounters.notes',
        'encounters.status',
        'encounters.created_by',
        'encounters.created_at',
        'encounters.updated_at',
        'services.name as service_name',
        'care_units.name as care_unit_name',
      ])
      .select(sql<string>`TRIM(COALESCE(user.nom, '') || ' ' || COALESCE(user.prenom, ''))`.as('medecin_name'))
      .select(sql<string>`TRIM(COALESCE(resp.nom, '') || ' ' || COALESCE(resp.prenom, ''))`.as('responsable_name'))
      .select(sql<string>`contact_categories.label`.as('contact_category_label'))
      .where('encounters.patient_id', '=', patientId)
      .orderBy('encounters.start_date', 'desc')

    if (status) {
      query = query.where('encounters.status', '=', status)
    }

    const rows = await query.execute()
    return EncounterEntity.toDtos(rows as any)
  }

  async getById(id: number): Promise<EncounterDto | null> {
    const row = await this.db
      .selectFrom('encounters')
      .leftJoin('services', 'services.id', 'encounters.service_id')
      .leftJoin('user', 'user.id', 'encounters.medecin_id')
      .leftJoin('user as resp', 'resp.id', 'encounters.responsable_id')
      .leftJoin('contact_categories', 'contact_categories.id', 'encounters.contact_category_id')
      .leftJoin('care_units', 'care_units.id', 'encounters.care_unit_id')
      .select([
        'encounters.id',
        'encounters.patient_id',
        'encounters.contact_type',
        'encounters.contact_type_precision',
        'encounters.start_date',
        'encounters.end_date',
        'encounters.service_id',
        'encounters.medecin_id',
        'encounters.responsable_id',
        'encounters.origin',
        'encounters.origin_precision',
        'encounters.zone_situation',
        'encounters.zone_precision',
        'encounters.prise_en_charge',
        'encounters.prise_en_charge_precision',
        'encounters.contact_category_id',
        'encounters.care_unit_id',
        'encounters.sinistre_info',
        'encounters.notes',
        'encounters.status',
        'encounters.created_by',
        'encounters.created_at',
        'encounters.updated_at',
        'services.name as service_name',
        'care_units.name as care_unit_name',
      ])
      .select(sql<string>`TRIM(COALESCE(user.nom, '') || ' ' || COALESCE(user.prenom, ''))`.as('medecin_name'))
      .select(sql<string>`TRIM(COALESCE(resp.nom, '') || ' ' || COALESCE(resp.prenom, ''))`.as('responsable_name'))
      .select(sql<string>`contact_categories.label`.as('contact_category_label'))
      .where('encounters.id', '=', id)
      .executeTakeFirst()

    return row ? EncounterEntity.toDto(row as any) : null
  }

  async create(dto: EncounterCreateDto): Promise<EncounterDto> {
    const startDate = dto.start_date || new Date().toISOString()

    let endDate: string | null = null
    if (dto.contact_type === 'consultation') {
      const startMs = new Date(startDate).getTime()
      endDate = new Date(startMs + 24 * 60 * 60 * 1000).toISOString()
    } else if (dto.end_date) {
      endDate = dto.end_date
    }

    let result: any
    try {
      result = await this.db
        .insertInto('encounters')
        .values({
          patient_id: dto.patient_id,
          contact_type: dto.contact_type,
          contact_type_precision: dto.contact_type_precision ?? null,
          start_date: startDate,
          end_date: endDate,
          service_id: dto.service_id,
          medecin_id: dto.medecin_id ?? null,
          responsable_id: dto.responsable_id ?? null,
          contact_category_id: dto.contact_category_id ?? null,
          care_unit_id: dto.care_unit_id ?? null,
          origin: dto.origin,
          origin_precision: dto.origin_precision ?? null,
          zone_situation: dto.zone_situation,
          zone_precision: dto.zone_precision ?? null,
          prise_en_charge: dto.prise_en_charge,
          prise_en_charge_precision: dto.prise_en_charge_precision ?? null,
          sinistre_info: dto.sinistre_info ?? null,
          notes: dto.notes ?? null,
          status: 'active',
          created_by: dto.created_by ?? null,
        })
        .returningAll()
        .executeTakeFirst()
    } catch (err: any) {
      if (err?.message?.includes('FOREIGN KEY constraint failed')) {
        throw new Error('Patient ou service introuvable')
      }
      throw err
    }

    if (!result) throw new Error("Échec de la création du contact")
    return (await this.getById((result as any).id))!
  }

  async getMovements(encounterId: number): Promise<EncounterMovementDto[]> {
    const rows = await sql<any>`
      SELECT em.*, s.name as service_name
      FROM encounter_movements em
      LEFT JOIN services s ON s.id = em.service_id
      WHERE em.encounter_id = ${encounterId}
      ORDER BY em.entered_at ASC
    `.execute(this.db)

    return rows.rows.map(r => ({
      id: r.id,
      encounter_id: r.encounter_id,
      service_id: r.service_id,
      service_name: r.service_name,
      step_label: r.step_label,
      entered_at: r.entered_at,
      exited_at: r.exited_at,
      notes: r.notes,
      created_at: r.created_at,
    }))
  }

  async update(id: number, dto: Omit<EncounterUpdateDto, 'id'>): Promise<EncounterDto> {
    const updates: Record<string, any> = {}
    const fields: (keyof Omit<EncounterUpdateDto, 'id'>)[] = [
      'contact_type', 'contact_type_precision', 'start_date', 'end_date',
      'service_id', 'medecin_id', 'responsable_id', 'contact_category_id',
      'care_unit_id', 'origin', 'origin_precision', 'zone_situation',
      'zone_precision', 'prise_en_charge', 'prise_en_charge_precision',
      'sinistre_info', 'notes',
    ]
    for (const f of fields) {
      if (f in dto) {
        updates[f] = (dto as any)[f] ?? null
      }
    }
    updates.updated_at = new Date().toISOString()

    await this.db
      .updateTable('encounters')
      .set(updates)
      .where('id', '=', id)
      .execute()

    return (await this.getById(id))!
  }

  async delete(id: number): Promise<void> {
    await this.db
      .deleteFrom('encounter_movements')
      .where('encounter_id', '=', id)
      .execute()
    await this.db
      .deleteFrom('encounters')
      .where('id', '=', id)
      .execute()
  }

  async closeEncounter(id: number): Promise<void> {
    const now = new Date().toISOString()
    await this.db
      .updateTable('encounters')
      .set({
        status: 'closed',
        end_date: sql`COALESCE(end_date, ${now})`,
        updated_at: now,
      })
      .where('id', '=', id)
      .execute()
  }
}
