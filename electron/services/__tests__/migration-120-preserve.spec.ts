import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Kysely } from 'kysely'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { NodeSqliteDialect } from '../../driver/node-sqlite-dialect'
import { MigrationService } from '../migration.service'

describe('migration 120 preserve exam data', () => {
  let db: Kysely<any>
  let dir: string
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-m120-'))
    db = new Kysely<any>({ dialect: new NodeSqliteDialect(path.join(dir, 't.db')) })
  })
  afterEach(async () => {
    await db.destroy().catch(() => {})
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('keeps exam_results and attachments when rebuilding exam_requests', async () => {
    await new MigrationService(db).runMigrationsTo('119-create-unites-stock')

    const p = await db.insertInto('patient').values({
      civilite: 'M', nom: 'X', prenom: 'Y', date_naissance: '1990-01-01',
      nir: 'N120', telephone: '1',
    }).returning('id').executeTakeFirstOrThrow()
    const exam = await db.insertInto('lab_exams').values({
      category_id: 1, name: 'Glycémie', is_active: 1, sort_order: 1,
    }).returning('id').executeTakeFirstOrThrow()
    const req = await db.insertInto('exam_requests').values({
      patient_id: p.id, type: 'laboratoire', examen_id: exam.id, statut: 'en_attente',
    }).returning('id').executeTakeFirstOrThrow()
    const param = await db.insertInto('exam_parameters').values({
      exam_id: exam.id, name: 'Valeur', unit: 'g/l', input_type: 'numeric', sort_order: 1,
    }).returning('id').executeTakeFirstOrThrow()
    await db.insertInto('exam_results').values({
      exam_request_id: req.id, parameter_id: param.id, value: '1.0',
    }).execute()
    await db.insertInto('exam_request_attachments').values({
      exam_request_id: req.id, display_name: 'a', file_name: 'a.pdf',
      mime_type: 'application/pdf', file_data: 'x',
    }).execute()

    await new MigrationService(db).runMigrations()

    const results = await db.selectFrom('exam_results').selectAll().execute()
    const attachments = await db.selectFrom('exam_request_attachments').selectAll().execute()
    const requests = await db.selectFrom('exam_requests').selectAll().execute()
    expect(requests).toHaveLength(1)
    expect(requests[0].numero).toMatch(/^LB-\d{8}-\d{4}$/)
    expect(results).toHaveLength(1)
    expect(attachments).toHaveLength(1)

    // La clé étrangère doit toujours pointer vers le nouveau parent :
    // supprimer la demande doit cascader sur les résultats et pièces jointes.
    await db.deleteFrom('exam_requests').where('id', '=', req.id).execute()
    expect(await db.selectFrom('exam_results').selectAll().execute()).toHaveLength(0)
    expect(await db.selectFrom('exam_request_attachments').selectAll().execute()).toHaveLength(0)
  })
})
