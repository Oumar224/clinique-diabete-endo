import { type Kysely, type Migration, type MigrationProvider, Migrator, sql } from 'kysely'
import * as InitialSchema from '../migrations/001-initial-schema'
import * as FixUserSchema from '../migrations/002-fix-user-schema'
import * as AddSettings from '../migrations/003-add-settings'
import * as InvoiceSchema from '../migrations/004-invoice'
import * as SettingsTables from '../migrations/005-settings-tables'
import * as SettingsExtensions from '../migrations/006-settings-extensions'
import * as UserMedicalUnits from '../migrations/007-user-medical-units'
import * as EmailConfig from '../migrations/008-email-config'
import * as Fonctions from '../migrations/009-fonctions'
import * as Localites from '../migrations/010-localites'
import * as RemoveMedicalUnitFields from '../migrations/011-remove-medical-unit-fields'
import * as AddInfirmierRole from '../migrations/012-add-infirmier-role'
import * as UserAttachments from '../migrations/013-user-attachments'
import * as PatientPhotoNip from '../migrations/014-patient-photo-nip'
import * as PatientAttachments from '../migrations/015-patient-attachments'
import * as PatientResidenceBirthplace from '../migrations/016-patient-residence-birthplace'
import * as AddRegionType from '../migrations/017-add-region-type'
import * as AddPatientRegion from '../migrations/018-add-patient-region'

class StaticMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    return {
      '001-initial-schema': InitialSchema,
      '002-fix-user-schema': FixUserSchema,
      '003-add-settings': AddSettings,
      '004-invoice': InvoiceSchema,
      '005-settings-tables': SettingsTables,
      '006-settings-extensions': SettingsExtensions,
      '007-user-medical-units': UserMedicalUnits,
      '008-email-config': EmailConfig,
      '009-fonctions': Fonctions,
      '010-localites': Localites,
      '011-remove-medical-unit-fields': RemoveMedicalUnitFields,
      '012-add-infirmier-role': AddInfirmierRole,
      '013-user-attachments': UserAttachments,
      '014-patient-photo-nip': PatientPhotoNip,
      '015-patient-attachments': PatientAttachments,
      '016-patient-residence-birthplace': PatientResidenceBirthplace,
      '017-add-region-type': AddRegionType,
      '018-add-patient-region': AddPatientRegion,
    }
  }
}

export class MigrationService {
  private migrator: Migrator
  private db: Kysely<unknown>

  constructor(db: Kysely<unknown>) {
    this.db = db
    this.migrator = new Migrator({
      db,
      provider: new StaticMigrationProvider(),
    })
  }

  async runMigrations(): Promise<void> {
    const { error, results } = await this.migrator.migrateToLatest()
    if (error) {
      console.error('[CDE] Migration failed:', error)
      throw error
    }
    if (results) {
      for (const r of results) {
        console.log(`[CDE] Migration "${r.migrationName}": ${r.direction} - ${r.status}`)
      }
    }
  }

  async destroyMigrationTables(): Promise<void> {
    await sql`DROP TABLE IF EXISTS kysely_migration`.execute(this.db)
    await sql`DROP TABLE IF EXISTS kysely_migration_lock`.execute(this.db)
  }
}
