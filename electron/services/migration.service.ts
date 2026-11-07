import { type Kysely, type Migration, type MigrationProvider, type MigrationResult, type MigrationResultSet, Migrator, sql } from 'kysely'
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
import * as AddExamRequestSpecialite from '../migrations/074-add-exam-request-specialite'
import * as AddExamRequestSpecialtyId from '../migrations/075-add-exam-request-specialty-id'
import * as AddExamRequestPlannedHourDate from '../migrations/076-add-exam-request-planned-hour-date'
import * as EncounterMovementsNewFields from '../migrations/077-encounter-movements-new-fields'
import * as PatientClinicalDocumentsSource from '../migrations/078-patient-clinical-documents-source'
import * as SeedOrdonnanceLibre from '../migrations/079-seed-ordonnance-libre'
import * as CreateExamParameters from '../migrations/080-create-exam-parameters'
import * as CreateExamResults from '../migrations/081-create-exam-results'
import * as AddValidatedAtToExamRequests from '../migrations/082-add-validated-at-to-exam-requests'
import * as RemoveContactCategory from '../migrations/085-contact-category-remove'
import * as CloseExpiredActiveEncounters from '../migrations/086-close-expired-active-encounters'
import * as AddServiceCareUnitToAppointments from '../migrations/087-add-service-care-unit-to-appointments'
import * as SeedCrcDiabete from '../migrations/088-seed-crc-diabete'
import * as AddContactTypesToDocumentTypes from '../migrations/089-add-contact-types-to-document-types'
import * as CreateDocumentAttachments from '../migrations/090-create-document-attachments'
import * as AddPrescriptionDureeType from '../migrations/091-add-prescription-duree-type'
import * as AddClinicalDocumentSite from '../migrations/092-add-clinical-document-site'
import * as AddExamRequestResultatRealized from '../migrations/093-add-exam-request-resultat-realized'
import * as CreateExamRequestAttachments from '../migrations/094-create-exam-request-attachments'
import * as Repair021PatientScramble from '../migrations/095-repair-021-patient-scramble'
import * as CreateMedicaments from '../migrations/096-create-medicaments'
import * as CreateStockLots from '../migrations/097-create-stock-lots'
import * as CreateMouvementsStock from '../migrations/098-create-mouvements-stock'
import * as CreateDelivrances from '../migrations/099-create-delivrances'
import * as FixPharmacieTextReferences from '../migrations/100-fix-pharmacie-text-references'
import * as AddDelivranceMotif from '../migrations/101-add-delivrance-motif'
import * as AddMedicamentsActifCheck from '../migrations/102-add-medicaments-actif-check'
import * as CreateFournisseurs from '../migrations/103-create-fournisseurs'
import * as PharmacieFondationPrixConditionnement from '../migrations/104-pharmacie-fondation-prix-conditionnement'
import * as InvoicePro from '../migrations/105-invoice-pro'
import * as FixVoieLabels from '../migrations/106-fix-voie-labels'
import * as CreateSalaires from '../migrations/107-create-salaires'
import * as CreateDepenses from '../migrations/108-create-depenses'
import * as PharmacieComptabilite from '../migrations/109-pharmacie-comptabilite'
import * as AnnualIndicators from '../migrations/110-annual-indicators'
import * as IndicateursCasEtSoins from '../migrations/111-indicateurs-cas-et-soins'
import * as CreateCommandes from '../migrations/113-create-commandes'
import * as CreateCommandeReceptions from '../migrations/114-create-commande-receptions'
import * as CreateApports from '../migrations/115-create-apports'
import * as CreateStockLotAttachments from '../migrations/116-create-stock-lot-attachments'
import * as CommandeConstraints from '../migrations/117-commande-constraints'
import * as AddSalaireRubriqueJours from '../migrations/112-add-salaire-rubrique-jours'
import * as AddUserTempsTravailNss from '../migrations/118-add-user-temps-travail-nss'
import * as CreateUnitesStock from '../migrations/119-create-unites-stock'
import * as LaboExamRequestsExterne from '../migrations/120-labo-exam-requests-externe'
import * as CreateLaboStock from '../migrations/121-create-laboratoire-stock'
import * as CreateLaboPaiements from '../migrations/122-create-labo-paiements'
import * as LabExamPrix from '../migrations/123-lab-exam-prix'
import * as SeedCrcObesite from '../migrations/124-seed-crc-obesite'
import * as SeedCrcGesta from '../migrations/125-seed-crc-gesta'

export const MIGRATIONS: Record<string, Migration> = {
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
  '074-add-exam-request-specialite': AddExamRequestSpecialite,
  '075-add-exam-request-specialty-id': AddExamRequestSpecialtyId,
  '076-add-exam-request-planned-hour-date': AddExamRequestPlannedHourDate,
  '077-encounter-movements-new-fields': EncounterMovementsNewFields,
  '078-patient-clinical-documents-source': PatientClinicalDocumentsSource,
  '079-seed-ordonnance-libre': SeedOrdonnanceLibre,
  '080-create-exam-parameters': CreateExamParameters,
  '081-create-exam-results': CreateExamResults,
  '082-add-validated-at-to-exam-requests': AddValidatedAtToExamRequests,
  '085-contact-category-remove': RemoveContactCategory,
  '086-close-expired-active-encounters': CloseExpiredActiveEncounters,
  '087-add-service-care-unit-to-appointments': AddServiceCareUnitToAppointments,
  '088-seed-crc-diabete': SeedCrcDiabete,
  '089-add-contact-types-to-document-types': AddContactTypesToDocumentTypes,
  '090-create-document-attachments': CreateDocumentAttachments,
  '091-add-prescription-duree-type': AddPrescriptionDureeType,
  '092-add-clinical-document-site': AddClinicalDocumentSite,
  '093-add-exam-request-resultat-realized': AddExamRequestResultatRealized,
  '094-create-exam-request-attachments': CreateExamRequestAttachments,
  '095-repair-021-patient-scramble': Repair021PatientScramble,
  '096-create-medicaments': CreateMedicaments,
  '097-create-stock-lots': CreateStockLots,
  '098-create-mouvements-stock': CreateMouvementsStock,
  '099-create-delivrances': CreateDelivrances,
  '100-fix-pharmacie-text-references': FixPharmacieTextReferences,
  '101-add-delivrance-motif': AddDelivranceMotif,
  '102-add-medicaments-actif-check': AddMedicamentsActifCheck,
  '103-create-fournisseurs': CreateFournisseurs,
  '104-pharmacie-fondation-prix-conditionnement': PharmacieFondationPrixConditionnement,
  '105-invoice-pro': InvoicePro,
  '106-fix-voie-labels': FixVoieLabels,
  '107-create-salaires': CreateSalaires,
  '108-create-depenses': CreateDepenses,
  '109-pharmacie-comptabilite': PharmacieComptabilite,
  '110-annual-indicators': AnnualIndicators,
  '111-indicateurs-cas-et-soins': IndicateursCasEtSoins,
  '113-create-commandes': CreateCommandes,
  '114-create-commande-receptions': CreateCommandeReceptions,
  '115-create-apports': CreateApports,
  '116-create-stock-lot-attachments': CreateStockLotAttachments,
  '117-commande-constraints': CommandeConstraints,
  '112-add-salaire-rubrique-jours': AddSalaireRubriqueJours,
  '118-add-user-temps-travail-nss': AddUserTempsTravailNss,
  '119-create-unites-stock': CreateUnitesStock,
  '120-labo-exam-requests-externe': LaboExamRequestsExterne,
  '121-create-laboratoire-stock': CreateLaboStock,
  '122-create-labo-paiements': CreateLaboPaiements,
  '123-lab-exam-prix': LabExamPrix,
  '124-seed-crc-obesite': SeedCrcObesite,
  '125-seed-crc-gesta': SeedCrcGesta,
}

class StaticMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    return MIGRATIONS
  }
}

/**
 * Result of a successful migration run.
 *
 * CONTRACT: `runMigrations()` / `runMigrationsTo()` THROW on any failure
 * (see `runMigrator`), so the returned status always has `success === true`
 * and `failed === []`. `applied` counts the migrations applied in this run
 * (0 when the DB is already up to date). The `success`/`failed` fields are
 * kept for callers and tests that read them; do not branch on them expecting
 * a non-throwing error path — failures surface as thrown errors.
 */
export interface MigrationRunStatus {
  success: boolean
  applied: number
  failed: string[]
}

export class MigrationService {
  private migrator: Migrator
  private db: Kysely<unknown>

  constructor(db: Kysely<unknown>, provider?: MigrationProvider) {
    this.db = db
    this.migrator = new Migrator({
      db,
      provider: provider ?? new StaticMigrationProvider(),
    })
  }

  async runMigrations(): Promise<MigrationRunStatus> {
    return this.runMigrator(() => this.migrator.migrateToLatest())
  }

  /**
   * Migrates to an arbitrary target migration.
   *
   * WARNING: if the target is already executed, Kysely rolls back the
   * migrations after it by running their `down()` (DROP/DELETE...). Never use
   * this method in production with a target lower than the latest migration.
   */
  async runMigrationsTo(target: string): Promise<MigrationRunStatus> {
    return this.runMigrator(() => this.migrator.migrateTo(target))
  }

  private async runMigrator(run: () => Promise<MigrationResultSet>): Promise<MigrationRunStatus> {
    let error: unknown
    let results: MigrationResult[] | undefined
    try {
      const result = await run()
      error = result.error
      results = result.results
    } catch (err) {
      error = err
    }

    const failed = (results ?? []).filter(r => r.status === 'Error')
    // If `run()` threw — or returned an error without a result set — Kysely
    // could not even determine which migrations to execute (e.g. "corrupted
    // migrations"). Synthesize a failure entry so the status reports it and
    // the [CDE] MIGRATION FAILED warn below is emitted.
    if (error != null && results === undefined && failed.length === 0) {
      failed.push({ migrationName: 'unknown', direction: 'Up', status: 'Error' })
    }
    for (const r of failed) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[CDE] MIGRATION FAILED: ${r.migrationName}: ${message}`)
    }

    if (results) {
      for (const r of results) {
        console.log(`[CDE] Migration "${r.migrationName}": ${r.direction} - ${r.status}`)
      }
    }

    if (failed.length > 0 || error != null) {
      const message = error instanceof Error ? error.message : String(error)
      const names = failed.map(r => r.migrationName).join(', ') || 'unknown'
      throw new Error(`[CDE] Migration failed: ${names}${message ? ` — ${message}` : ''}`)
    }

    return {
      success: true,
      applied: (results ?? []).filter(r => r.status === 'Success').length,
      failed: [],
    }
  }

  async destroyMigrationTables(): Promise<void> {
    await sql`DROP TABLE IF EXISTS kysely_migration`.execute(this.db)
    await sql`DROP TABLE IF EXISTS kysely_migration_lock`.execute(this.db)
  }
}
