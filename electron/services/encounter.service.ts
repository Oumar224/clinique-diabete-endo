import { inject, singleton } from 'tsyringe'
import type { Kysely, Transaction } from 'kysely'
import { sql } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { EncounterEntity } from '../entities/encounter.entity'
import type { EncounterCreateDto, EncounterDto, EncounterMovementCreateDto, EncounterMovementDto, EncounterUpdateDto } from '../dto/encounter.dto'
import { validateForeignKeys } from './utils/fk-validator'
import type { StayCreateDto } from '../dto/stay.dto'
import { entityEventBus } from '../automerge/event-bus'

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
      .leftJoin('care_units', 'care_units.id', 'encounters.care_unit_id')
      .leftJoin('stays as active_stay', join => join
        .onRef('active_stay.patient_id', '=', 'encounters.patient_id')
        .on('active_stay.status', '=', 'en_cours'))
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
        'encounters.care_unit_id',
        'encounters.sinistre_info',
        'encounters.notes',
        'encounters.case_type',
        'encounters.is_new_case',
        'active_stay.type as stay_type',
        'encounters.created_by',
        'encounters.created_at',
        'encounters.updated_at',
        'services.name as service_name',
        'care_units.name as care_unit_name',
      ])
      .select(sql<string>`TRIM(COALESCE(user.nom, '') || ' ' || COALESCE(user.prenom, ''))`.as('medecin_name'))
      .select(sql<string>`TRIM(COALESCE(resp.nom, '') || ' ' || COALESCE(resp.prenom, ''))`.as('responsable_name'))
      .select(sql<string>`
        CASE
          WHEN encounters.end_date IS NOT NULL AND datetime(encounters.end_date) <= datetime('now') THEN 'closed'
          ELSE encounters.status
        END
      `.as('effective_status'))
      .where('encounters.patient_id', '=', patientId)
      .orderBy('encounters.start_date', 'desc')

    if (status) {
      query = query.where(sql`
        CASE
          WHEN encounters.end_date IS NOT NULL AND datetime(encounters.end_date) <= datetime('now') THEN 'closed'
          ELSE encounters.status
        END
      `, '=', status)
    }

    const rows = await query.execute()
    return (rows as any[]).map(r => EncounterEntity.toDto({ ...(r as any), status: (r as any).effective_status || (r as any).status } as EncounterEntity))
  }

  async getById(id: number): Promise<EncounterDto | null> {
    const row = await this.db
      .selectFrom('encounters')
      .leftJoin('services', 'services.id', 'encounters.service_id')
      .leftJoin('user', 'user.id', 'encounters.medecin_id')
      .leftJoin('user as resp', 'resp.id', 'encounters.responsable_id')
      .leftJoin('care_units', 'care_units.id', 'encounters.care_unit_id')
      .leftJoin('stays as active_stay', join => join
        .onRef('active_stay.patient_id', '=', 'encounters.patient_id')
        .on('active_stay.status', '=', 'en_cours'))
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
        'encounters.care_unit_id',
        'encounters.sinistre_info',
        'encounters.notes',
        'encounters.case_type',
        'encounters.is_new_case',
        'active_stay.type as stay_type',
        'encounters.status',
        'encounters.created_by',
        'encounters.created_at',
        'encounters.updated_at',
        'services.name as service_name',
        'care_units.name as care_unit_name',
      ])
      .select(sql<string>`TRIM(COALESCE(user.nom, '') || ' ' || COALESCE(user.prenom, ''))`.as('medecin_name'))
      .select(sql<string>`TRIM(COALESCE(resp.nom, '') || ' ' || COALESCE(resp.prenom, ''))`.as('responsable_name'))
      .select(sql<string>`
        CASE
          WHEN encounters.end_date IS NOT NULL AND datetime(encounters.end_date) <= datetime('now') THEN 'closed'
          ELSE encounters.status
        END
      `.as('effective_status'))
      .where('encounters.id', '=', id)
      .executeTakeFirst()

    return row ? EncounterEntity.toDto({ ...(row as any), status: (row as any).effective_status || (row as any).status }) : null
  }

  private async validateForeignKeys(dto: EncounterCreateDto): Promise<void> {
    await validateForeignKeys(this.db as any, [
      { table: 'patient', column: 'patient_id', value: dto.patient_id, label: 'patient_id' },
      { table: 'services', column: 'service_id', value: dto.service_id, label: 'service_id' },
      { table: 'user', column: 'medecin_id', value: dto.medecin_id, label: 'medecin_id' },
      { table: 'user', column: 'responsable_id', value: dto.responsable_id, label: 'responsable_id' },
      { table: 'care_units', column: 'care_unit_id', value: dto.care_unit_id, label: 'care_unit_id' },
      { table: 'user', column: 'created_by', value: dto.created_by, label: 'created_by' },
    ])
  }

  async create(dto: EncounterCreateDto): Promise<EncounterDto> {
    await this.validateForeignKeys(dto)

    // Règle A.1: Un seul contact actif par patient à la fois
    // Un contact ne bloque la création que s'il est *effectivement* actif :
    // status='active' ET end_date NULL ou dans le futur — la même sémantique
    // que le CASE effective_status utilisé par listByPatient / getById.
    const existingActive = await this.db
      .selectFrom('encounters')
      .select('id')
      .where('patient_id', '=', dto.patient_id)
      .where(sql`
        CASE
          WHEN encounters.end_date IS NOT NULL AND datetime(encounters.end_date) <= datetime('now') THEN 'closed'
          ELSE encounters.status
        END
      `, '=', 'active')
      .executeTakeFirst()
    if (existingActive) {
      throw new Error(`Un contact actif (#${existingActive.id}) existe déjà pour ce patient. Veuillez d'abord clôturer le contact en cours.`)
    }

    const startDate = dto.start_date || new Date().toISOString()

    let endDate: string | undefined = undefined
    if (dto.contact_type === 'consultation') {
      const startMs = new Date(startDate).getTime()
      endDate = new Date(startMs + 24 * 60 * 60 * 1000).toISOString()
    } else if (dto.end_date) {
      endDate = dto.end_date
    }

    const encounter = await this.db.transaction().execute(async (trx: Transaction<DB>) => {
      const enc = await trx
        .insertInto('encounters')
        .values({
          patient_id: dto.patient_id,
          contact_type: dto.contact_type,
          contact_type_precision: dto.contact_type_precision ?? undefined,
          start_date: startDate,
          end_date: endDate,
          service_id: dto.service_id,
          medecin_id: dto.medecin_id ?? undefined,
          responsable_id: dto.responsable_id ?? undefined,
          care_unit_id: dto.care_unit_id ?? undefined,
          origin: dto.origin,
          origin_precision: dto.origin_precision ?? undefined,
          zone_situation: dto.zone_situation,
          zone_precision: dto.zone_precision ?? undefined,
          prise_en_charge: dto.prise_en_charge,
          prise_en_charge_precision: dto.prise_en_charge_precision ?? undefined,
          sinistre_info: dto.sinistre_info ?? undefined,
          notes: dto.notes ?? undefined,
          case_type: dto.case_type ?? undefined,
          is_new_case: dto.is_new_case ?? 0,
          status: 'active',
          created_by: dto.created_by ?? undefined,
        })
        .returningAll()
        .executeTakeFirst()

      if (!enc) throw new Error("Échec de la création du contact")

      if (dto.contact_type === 'hospitalisation') {
        // Créer le mouvement initial d'admission pour ce contact
        await trx
          .insertInto('encounter_movements')
          .values({
            encounter_id: enc.id,
            service_id: dto.service_id,
            step_label: 'Admission',
            entered_at: startDate,
            notes: dto.notes ?? undefined,
            created_by: dto.created_by ?? undefined,
          })
          .execute()

        // Miroir : ajouter un stay_movement d'admission dans le séjour en cours
        const activeStayForMirror = await trx
          .selectFrom('stays')
          .select(['id', 'admission_date'])
          .where('patient_id', '=', dto.patient_id)
          .where('status', '=', 'en_cours')
          .executeTakeFirst()

        if (activeStayForMirror) {
          if (dto.stay_type) {
            await trx
              .updateTable('stays')
              .set({ type: dto.stay_type })
              .where('id', '=', activeStayForMirror.id)
              .execute()
          }
          await trx
            .insertInto('stay_movements')
            .values({
              stay_id: activeStayForMirror.id,
              movement_type: 'admission',
              to_service_id: dto.service_id,
              moved_at: startDate,
              notes: dto.notes ?? undefined,
            })
            .execute()
        } else {
          // Aucun séjour actif → en créer un
          const stayDto: StayCreateDto = {
            patient_id: dto.patient_id,
            admission_date: startDate,
            mode_admission: 'programmee',
            service_id: dto.service_id,
            medecin_id: dto.medecin_id,
            notes: dto.notes,
            type: dto.stay_type,
            created_by: dto.created_by,
          }
          const stay = await trx
            .insertInto('stays')
            .values({
              patient_id: stayDto.patient_id,
              admission_date: stayDto.admission_date,
              mode_admission: stayDto.mode_admission,
              service_id: stayDto.service_id,
              medecin_id: stayDto.medecin_id ?? undefined,
              chambre: stayDto.chambre ?? undefined,
              lit: stayDto.lit ?? undefined,
              notes: stayDto.notes ?? undefined,
              type: stayDto.type ?? undefined,
              status: 'en_cours',
              created_by: stayDto.created_by ?? undefined,
            })
            .returningAll()
            .executeTakeFirst()

          if (stay) {
            await trx
              .insertInto('stay_movements')
              .values({
                stay_id: stay.id,
                movement_type: 'admission',
                to_service_id: stayDto.service_id,
                moved_at: stayDto.admission_date,
                notes: stayDto.notes ?? undefined,
              })
              .execute()
          }
        }
      }

      return enc
    })

    if (!encounter.id) throw new Error("Échec de la création du contact")
    const createdDto = (await this.getById(encounter.id))!
    entityEventBus.emitEntityChange({ entityType: 'encounter', action: 'created', id: encounter.id, entity: createdDto, source: 'local', timestamp: Date.now() })
    return createdDto
  }

  async getMovements(encounterId: number): Promise<EncounterMovementDto[]> {
    const rows = await sql<any>`
      SELECT em.*, s.name as service_name, fs.name as from_service_name
      FROM encounter_movements em
      LEFT JOIN services s ON s.id = em.service_id
      LEFT JOIN services fs ON fs.id = em.from_service_id
      WHERE em.encounter_id = ${encounterId}
      ORDER BY em.entered_at ASC
    `.execute(this.db)

    return rows.rows.map(r => ({
      id: r.id,
      encounter_id: r.encounter_id,
      from_service_id: r.from_service_id,
      from_service_name: r.from_service_name,
      service_id: r.service_id,
      service_name: r.service_name,
      step_label: r.step_label,
      entered_at: r.entered_at,
      exited_at: r.exited_at,
      motif: r.motif,
      notes: r.notes,
      created_by: r.created_by,
      created_at: r.created_at,
    }))
  }

  // A.4: Ajouter un mouvement à un contact
  async addMovement(dto: EncounterMovementCreateDto): Promise<EncounterMovementDto> {
    await this.db.transaction().execute(async (trx) => {
      const mvt = await trx
        .insertInto('encounter_movements')
        .values({
          encounter_id: dto.encounter_id,
          from_service_id: dto.from_service_id ?? undefined,
          service_id: dto.service_id,
          step_label: dto.step_label,
          entered_at: dto.entered_at,
          exited_at: dto.exited_at ?? undefined,
          motif: dto.motif ?? undefined,
          notes: dto.notes ?? undefined,
          created_by: dto.created_by ?? undefined,
        })
        .returningAll()
        .executeTakeFirst()

      if (!mvt) throw new Error("Échec de l'ajout du mouvement")

      // Créer un mouvement miroir dans stay_movements pour le séjour en cours
      const enc = await trx
        .selectFrom('encounters')
        .select('patient_id')
        .where('id', '=', dto.encounter_id)
        .executeTakeFirst()

      if (enc) {
        const activeStay = await trx
          .selectFrom('stays')
          .select('id')
          .where('patient_id', '=', enc.patient_id)
          .where('status', '=', 'en_cours')
          .executeTakeFirst()

        if (activeStay) {
          await trx
            .insertInto('stay_movements')
            .values({
              stay_id: activeStay.id,
              movement_type: 'transfert_service',
              from_service_id: dto.from_service_id ?? undefined,
              to_service_id: dto.service_id,
              moved_at: dto.entered_at,
              notes: dto.notes ?? undefined,
            })
            .execute()
        }
      }

      return mvt
    })

    const movements = await this.getMovements(dto.encounter_id!)
    const result = movements[movements.length - 1]

    // Emit events for the created encounter_movement
    if (result.id != null) {
      entityEventBus.emitEntityChange({
        entityType: 'encounter_movement',
        action: 'created',
        id: result.id,
        entity: result,
        source: 'local',
        timestamp: Date.now(),
      })
    }

    // Emit event for the stay_movement mirror if it was created
    const enc = await this.db
      .selectFrom('encounters')
      .select('patient_id')
      .where('id', '=', dto.encounter_id)
      .executeTakeFirst()
    if (enc) {
      const activeStay = await this.db
        .selectFrom('stays')
        .select(['id'])
        .where('patient_id', '=', enc.patient_id)
        .where('status', '=', 'en_cours')
        .executeTakeFirst()
      if (activeStay) {
        // A stay_movement was created inside the transaction — emit event
        const stayMvts = await sql<any>`
          SELECT * FROM stay_movements
          WHERE stay_id = ${activeStay.id}
          ORDER BY moved_at DESC
          LIMIT 1
        `.execute(this.db)
        if (stayMvts.rows.length > 0) {
          entityEventBus.emitEntityChange({
            entityType: 'stay_movement',
            action: 'created',
            id: stayMvts.rows[0].id,
            entity: stayMvts.rows[0],
            source: 'local',
            timestamp: Date.now(),
          })
        }
      }
    }

    return result
  }

  // A.4: Clôturer le mouvement en cours d'un contact (set exited_at)
  async closeCurrentMovement(encounterId: number): Promise<void> {
    const current = await sql<any>`
      SELECT id FROM encounter_movements
      WHERE encounter_id = ${encounterId}
        AND exited_at IS NULL
      ORDER BY entered_at DESC
      LIMIT 1
    `.execute(this.db)

    if (current.rows.length === 0) return

    const now = new Date().toISOString()
    await this.db
      .updateTable('encounter_movements')
      .set({ exited_at: now })
      .where('id', '=', current.rows[0].id)
      .execute()

    entityEventBus.emitEntityChange({
      entityType: 'encounter_movement',
      action: 'updated',
      id: current.rows[0].id,
      entity: { id: current.rows[0].id, exited_at: now },
      source: 'local',
      timestamp: Date.now(),
    })
  }

  async update(id: number, dto: Omit<EncounterUpdateDto, 'id'>): Promise<EncounterDto> {
    const updates: Record<string, any> = {}
    const fields: (keyof Omit<EncounterUpdateDto, 'id'>)[] = [
      'contact_type', 'contact_type_precision', 'start_date', 'end_date',
      'service_id', 'medecin_id', 'responsable_id',
      'care_unit_id', 'origin', 'origin_precision', 'zone_situation',
      'zone_precision', 'prise_en_charge', 'prise_en_charge_precision',
      'sinistre_info', 'notes', 'case_type', 'is_new_case',
    ]
    for (const f of fields) {
      if (f in dto) {
        // `case_type` est nullable : une valeur effacée doit vraiment repasser à NULL.
        updates[f] = f === 'case_type' ? ((dto as any)[f] ?? null) : ((dto as any)[f] ?? undefined)
      }
    }
    const now = new Date().toISOString()
    updates.updated_at = now

    // Vérifier que le contact n'est pas fermé (fermeture effective via end_date)
    const existingEncounter = await this.db
      .selectFrom('encounters')
      .select(['status', 'end_date', 'patient_id', 'contact_type'])
      .where('id', '=', id)
      .executeTakeFirst()
    const isClosed = existingEncounter?.status === 'closed' ||
      (existingEncounter?.end_date != null && new Date(existingEncounter.end_date) <= new Date())
    if (isClosed) {
      throw new Error("Impossible de modifier un contact fermé.")
    }

    await this.db
      .updateTable('encounters')
      .set(updates)
      .where('id', '=', id)
      .execute()

    // Le type de séjour vit dans `stays` : synchroniser le séjour actif.
    // Ne pas toucher au séjour d'un patient pour une consultation éditée.
    if ('stay_type' in dto && (dto.stay_type || dto.contact_type === 'hospitalisation') && existingEncounter?.patient_id) {
      await this.db
        .updateTable('stays')
        .set({ type: (dto.stay_type ?? null) as any })
        .where('patient_id', '=', existingEncounter.patient_id)
        .where('status', '=', 'en_cours')
        .execute()
    }

    // Partie C: Si end_date a changé, synchroniser le dossier clinic associé
    if ('end_date' in dto && dto.end_date) {
      const endDateISO = new Date(dto.end_date).toISOString()

      // Find CRH_DIABETE document type
      const docType = await this.db
        .selectFrom('clinical_document_types')
        .select('id')
        .where('code', '=', 'CRH_DIABETE')
        .executeTakeFirst()

      if (docType) {
        const docs = await this.db
          .selectFrom('patient_clinical_documents')
          .select(['id', 'form_data', 'status'])
          .where('contact_id', '=', String(id))
          .where('document_type_id', '=', docType.id as any)
          .execute()

        for (const doc of docs) {
          if (doc.status === 'signed') continue // Ne pas modifier un document signé

          let formData: Record<string, any> = {}
          try {
            formData = JSON.parse(doc.form_data || '{}')
          } catch { /* ignore */ }

          if (!formData.sortie) {
            formData.sortie = { dateSortie: '' }
          }
          formData.sortie.dateSortie = endDateISO

          await this.db
            .updateTable('patient_clinical_documents')
            .set({
              form_data: JSON.stringify(formData),
              updated_at: now,
            })
            .where('id', '=', doc.id)
            .execute()
        }
      }
    }

    const updatedDto = (await this.getById(id))!
    entityEventBus.emitEntityChange({ entityType: 'encounter', action: 'updated', id, entity: updatedDto, source: 'local', timestamp: Date.now() })
    return updatedDto
  }

  async delete(id: number): Promise<void> {
    // Vérifier que le contact n'est pas fermé (fermeture effective via end_date)
    const encounter = await this.db
      .selectFrom('encounters')
      .select(['status', 'end_date', 'patient_id', 'contact_type'])
      .where('id', '=', id)
      .executeTakeFirst()
    const isClosed = encounter?.status === 'closed' ||
      (encounter?.end_date != null && new Date(encounter.end_date) <= new Date())
    if (isClosed) {
      throw new Error("Impossible de supprimer un contact fermé.")
    }

    await this.db.transaction().execute(async (trx) => {
      // Supprimer les signatures des documents cliniques liés à ce contact
      await trx
        .deleteFrom('clinical_document_signatures')
        .where('document_id', 'in', (qb) =>
          qb.selectFrom('patient_clinical_documents')
            .select('id')
            .where('contact_id', '=', String(id)) as any
        )
        .execute()

      // Supprimer les documents cliniques liés à ce contact
      await trx
        .deleteFrom('patient_clinical_documents')
        .where('contact_id', '=', String(id))
        .execute()

      // Supprimer les mouvements du contact
      await trx
        .deleteFrom('encounter_movements')
        .where('encounter_id', '=', id)
        .execute()

      // Supprimer les demandes d'examen liées à ce contact.
      // exam_requests.encounter_id → encounters(id) est NO ACTION (071:8),
      // donc elles doivent être supprimées AVANT les encounters.
      // exam_results (081:7) et exam_request_attachments (094:7) cascadent.
      await trx
        .deleteFrom('exam_requests')
        .where('encounter_id', '=', id)
        .execute()

      // Récupérer le patient_id pour fermer le séjour associé
      const enc = await trx
        .selectFrom('encounters')
        .select('patient_id')
        .where('id', '=', id)
        .executeTakeFirst()

      if (enc) {
        // Supprimer les mouvements du séjour actif
        const stays = await trx
          .selectFrom('stays')
          .select('id')
          .where('patient_id', '=', enc.patient_id)
          .where('status', '=', 'en_cours')
          .execute()

        for (const stay of stays) {
          await trx
            .deleteFrom('stay_movements')
            .where('stay_id', '=', stay.id)
            .execute()
        }

        // Supprimer le(s) séjour(s) actif(s)
        await trx
          .deleteFrom('stays')
          .where('patient_id', '=', enc.patient_id)
          .where('status', '=', 'en_cours')
          .execute()
      }

      // Supprimer le contact
      await trx
        .deleteFrom('encounters')
        .where('id', '=', id)
        .execute()
    })
    entityEventBus.emitEntityChange({ entityType: 'encounter', action: 'deleted', id, entity: null, source: 'local', timestamp: Date.now() })
  }

  async closeEncounter(id: number): Promise<void> {
    const now = new Date().toISOString()
    await this.db.transaction().execute(async (trx) => {
      const enc = await trx
        .selectFrom('encounters')
        .select(['patient_id', 'service_id', 'end_date'])
        .where('id', '=', id)
        .executeTakeFirst()

      if (!enc) return

      const sortieDate = enc.end_date ?? now

      // Close the encounter
      await trx
        .updateTable('encounters')
        .set({
          status: 'closed',
          end_date: sql`COALESCE(end_date, ${now})`,
          updated_at: now,
        })
        .where('id', '=', id)
        .execute()

      // Close the linked stay for this patient
      await trx
        .updateTable('stays')
        .set({
          status: 'cloture',
          sortie_date: sql`COALESCE(sortie_date, ${now})`,
          updated_at: now,
        })
        .where('patient_id', '=', enc.patient_id)
        .where('status', '=', 'en_cours')
        .execute()

      // Close any open encounter_movements
      await trx
        .updateTable('encounter_movements')
        .set({ exited_at: sortieDate })
        .where('encounter_id', '=', id)
        .where('exited_at', 'is', null)
        .execute()

      // Add a sortie encounter_movement to mark the end in the timeline
      await trx
        .insertInto('encounter_movements')
        .values({
          encounter_id: id,
          service_id: enc.service_id,
          step_label: 'Sortie',
          entered_at: sortieDate,
          created_by: undefined,
        })
        .execute()
    })

    // Emit events after transaction commits
    const updatedEnc = await this.getById(id)
    entityEventBus.emitEntityChange({
      entityType: 'encounter',
      action: 'updated',
      id,
      entity: updatedEnc,
      source: 'local',
      timestamp: Date.now(),
    })

    // Emit event for the closed stay
    const encRow = await this.db
      .selectFrom('encounters')
      .select('patient_id')
      .where('id', '=', id)
      .executeTakeFirst()
    if (encRow) {
      const closedStay = await this.db
        .selectFrom('stays')
        .select(['id'])
        .where('patient_id', '=', encRow.patient_id)
        .where('status', '=', 'cloture')
        .executeTakeFirst()
      if (closedStay?.id != null) {
        entityEventBus.emitEntityChange({
          entityType: 'stay',
          action: 'updated',
          id: closedStay.id,
          entity: closedStay,
          source: 'local',
          timestamp: Date.now(),
        })
      }
    }

    // Emit event for the sortie encounter_movement
    const sortieMvt = await sql<any>`
      SELECT * FROM encounter_movements
      WHERE encounter_id = ${id}
        AND step_label = 'Sortie'
      ORDER BY entered_at DESC
      LIMIT 1
    `.execute(this.db)
    if (sortieMvt.rows.length > 0) {
      entityEventBus.emitEntityChange({
        entityType: 'encounter_movement',
        action: 'created',
        id: sortieMvt.rows[0].id,
        entity: sortieMvt.rows[0],
        source: 'local',
        timestamp: Date.now(),
      })
    }
  }
}
