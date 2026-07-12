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
import * as PatientTrustedPerson from '../migrations/019-patient-trusted-person'
import * as TrustedPersonResidenceCode from '../migrations/020-trusted-person-residence-code'
import * as CiviliteAllowEmpty from '../migrations/021-civilite-allow-empty'
import * as PatientSite from '../migrations/022-patient-site'
import * as PatientAttachmentCategory from '../migrations/023-patient-attachment-category'
import * as UniqueTrustedPersonPatient from '../migrations/024-unique-trusted-person-patient'
import * as AttachmentTypes from '../migrations/025-attachment-types'
import * as RemoveMutuelle from '../migrations/026-remove-mutuelle'
import * as AddAssuranceMutuelle from '../migrations/027-add-assurance-mutuelle'
import * as FormDrafts from '../migrations/028-form-drafts'
import * as PatientConsentementEtude from '../migrations/029-patient-consentement-etude'
import * as UserAttachmentType from '../migrations/030-user-attachment-type'
import * as PatientCare from '../migrations/031-patient-care'
import * as SeedPlanSoins from '../migrations/032-seed-plan-soins'
import * as Prescriptions from '../migrations/033-prescriptions'
import * as SeedWeekPlanSoins from '../migrations/034-seed-week-plan-soins'
import * as SeedVitalSignsRange from '../migrations/035-seed-vital-signs-range'
import * as VitalSignsNewColumns from '../migrations/042-vital-signs-new-columns'
import * as VitalSignsItems from '../migrations/043-vital-signs-items'
import * as LabExamTables from '../migrations/044-lab-exam-tables'
import * as ConservateurTables from '../migrations/045-conservateurs-tables'
import * as ServiceHierarchy from '../migrations/046-service-hierarchy'
import * as ServiceHierarchyV2 from '../migrations/047-service-hierarchy-v2'
import * as SeedFonctions from '../migrations/048-seed-fonctions'
import * as SeedLocalites from '../migrations/049-seed-localites'
import * as CreateEncounters from '../migrations/050-create-encounters'
import * as CreateStays from '../migrations/051-create-stays'
import * as RestructureTarifs from '../migrations/052-restructure-tarifs'
import * as PatientClinicalDocuments from '../migrations/053-patient-clinical-documents'
import * as CreateCareUnits from '../migrations/054-create-care-units'
import * as RestructureServices from '../migrations/055-restructure-services'
import * as AddActeDeclencheToDocTypes from '../migrations/056-add-acte-declenche-to-doc-types'
import * as ContactOrigins from '../migrations/057-contact-origins'
import * as Insurances from '../migrations/058-insurances'
import * as ContactCategories from '../migrations/059-contact-categories'
import * as PrescriptionFrequenceType from '../migrations/060-prescription-frequence-type'
import * as EncounterNewFields from '../migrations/061-encounter-new-fields'
import * as PrescriptionType from '../migrations/062-prescription-type'
import * as AddCareUnitToEncounters from '../migrations/062-add-care-unit-to-encounters'
import * as VoieTypeDispositifType from '../migrations/063-voie-type-dispositif-type'
import * as SeedCrhDiabete from '../migrations/064-seed-crh-diabete'
import * as AddPrescriptionType from '../migrations/065-add-prescription-type'
import * as FixEncounterConstraints from '../migrations/066-fix-encounter-constraints'
import * as CleanupOrphanedPlanItems from '../migrations/067-cleanup-orphaned-plan-items'
import * as FixDocumentTypes from '../migrations/068-fix-document-types'
import * as ExamCategoriesTypes from '../migrations/069-exam-categories-types'
import * as AddCareUnitToEncountersFix from '../migrations/070-add-care-unit-to-encounters-fix'
import * as CreateExamRequests from '../migrations/071-create-exam-requests'
import * as SeedLabExamData from '../migrations/072-seed-lab-exam-data'
import * as SeedDispositifVoieData from '../migrations/073-seed-dispositif-voie-data'

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
      '019-patient-trusted-person': PatientTrustedPerson,
      '020-trusted-person-residence-code': TrustedPersonResidenceCode,
      '021-civilite-allow-empty': CiviliteAllowEmpty,
      '022-patient-site': PatientSite,
      '023-patient-attachment-category': PatientAttachmentCategory,
      '024-unique-trusted-person-patient': UniqueTrustedPersonPatient,
      '025-attachment-types': AttachmentTypes,
      '026-remove-mutuelle': RemoveMutuelle,
      '027-add-assurance-mutuelle': AddAssuranceMutuelle,
      '028-form-drafts': FormDrafts,
      '029-patient-consentement-etude': PatientConsentementEtude,
      '030-user-attachment-type': UserAttachmentType,
      '031-patient-care': PatientCare,
      '032-seed-plan-soins': SeedPlanSoins,
      '033-prescriptions': Prescriptions,
      '034-seed-week-plan-soins': SeedWeekPlanSoins,
      '035-seed-vital-signs-range': SeedVitalSignsRange,
      '042-vital-signs-new-columns': VitalSignsNewColumns,
      '043-vital-signs-items': VitalSignsItems,
      '044-lab-exam-tables': LabExamTables,
      '045-conservateurs-tables': ConservateurTables,
      '046-service-hierarchy': ServiceHierarchy,
      '047-service-hierarchy-v2': ServiceHierarchyV2,
      '048-seed-fonctions': SeedFonctions,
      '049-seed-localites': SeedLocalites,
      '050-create-encounters': CreateEncounters,
      '051-create-stays': CreateStays,
      '052-restructure-tarifs': RestructureTarifs,
      '053-patient-clinical-documents': PatientClinicalDocuments,
      '054-create-care-units': CreateCareUnits,
      '055-restructure-services': RestructureServices,
      '056-add-acte-declenche-to-doc-types': AddActeDeclencheToDocTypes,
      '057-contact-origins': ContactOrigins,
      '058-insurances': Insurances,
      '059-contact-categories': ContactCategories,
      '060-prescription-frequence-type': PrescriptionFrequenceType,
      '061-encounter-new-fields': EncounterNewFields,
      '062-add-care-unit-to-encounters': AddCareUnitToEncounters,
      '062-prescription-type': PrescriptionType,
      '063-voie-type-dispositif-type': VoieTypeDispositifType,
      '064-seed-crh-diabete': SeedCrhDiabete,
      '065-add-prescription-type': AddPrescriptionType,
      '066-fix-encounter-constraints': FixEncounterConstraints,
      '067-cleanup-orphaned-plan-items': CleanupOrphanedPlanItems,
      '068-fix-document-types': FixDocumentTypes,
      '069-exam-categories-types': ExamCategoriesTypes,
      '070-add-care-unit-to-encounters-fix': AddCareUnitToEncountersFix,
      '071-create-exam-requests': CreateExamRequests,
      '072-seed-lab-exam-data': SeedLabExamData,
      '073-seed-dispositif-voie-data': SeedDispositifVoieData,
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
      console.error('[CDE] Migration failed, continuing:', error)
      // Don't throw — let the app continue with partial migrations
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
