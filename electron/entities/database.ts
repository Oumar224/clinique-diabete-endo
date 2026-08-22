import { UserEntity } from './user.entity'
import { PatientEntity } from './patient.entity'
import { AppointmentEntity } from './appointment.entity'
import { AutomergeDocumentEntity } from './automerge-document.entity'
import { InvoiceEntity } from './invoice.entity'
import { VitalSignEntity } from './vital-sign.entity'
import { VitalSignsItemEntity } from './vital-signs-item.entity'
import { PlanSoinsEntity, PlanSoinsItemEntity } from './plan-soins.entity'
import { PrescriptionEntity } from './prescription.entity'
import { DispositifEntity } from './dispositif.entity'
import { TrustedPersonEntity } from './trusted-person.entity'
import { PatientAttachmentEntity } from './patient-attachment.entity'
import { DocumentAttachmentEntity } from './document-attachment.entity'
import { UserAttachmentEntity } from './user-attachment.entity'
import { AttachmentTypeEntity } from './attachment-type.entity'
import { FormDraftEntity } from './form-draft.entity'
import { SessionEntity } from './session.entity'
import { InvoiceItemEntity } from './invoice-item.entity'
import { InvoicePaymentEntity } from './invoice-payment.entity'
import { CurrencyEntity } from './currency.entity'
import { ServiceEntity } from './service.entity'
import { MedicalActEntity } from './medical-act.entity'
import { ActPriceHistoryEntity } from './act-price-history.entity'
import { ConfigTarifEntity } from './config-tarif.entity'
import { PatientActeEntity } from './patient-acte.entity'
import { MedicalUnitEntity } from './medical-unit.entity'
import { SiteEntity } from './site.entity'
import { SpecialtyEntity } from './specialty.entity'
import { EmailConfigEntity } from './email-config.entity'
import { FonctionEntity } from './fonction.entity'
import { LocaliteEntity } from './localite.entity'
import { ConservateurStockageEntity } from './conservateur-stockage.entity'
import { ConservateurChampLocalisationEntity } from './conservateur-champ-localisation.entity'
import { AppSettingsEntity } from './app-settings.entity'
import { UserSpecialtyEntity } from './user-specialty.entity'
import { UserSiteEntity } from './user-site.entity'
import { UserServiceEntity } from './user-service.entity'
import { UserMedicalUnitEntity } from './user-medical-unit.entity'
import { UserFavoriteServiceEntity } from './user-favorite-service.entity'
import { ContactOriginEntity } from './contact-origin.entity'
import { InsuranceEntity } from './insurance.entity'
import { VoieTypeEntity } from './voie-type.entity'
import { DispositifTypeEntity } from './dispositif-type.entity'
import { EncounterEntity, EncounterMovementEntity } from './encounter.entity'
import {StayEntity, StayMovementEntity} from './stay.entity'
import { CareUnitEntity } from './care-unit.entity'
import { ClinicalDocumentTypeEntity } from './clinical-document-type.entity'
import { ClinicalDocumentEntity } from './clinical-document.entity'
import { ClinicalDocumentSignatureEntity } from './clinical-document-signature.entity'
import { ExamCategoryEntity } from './exam-category.entity'
import { ExamTypeEntity } from './exam-type.entity'
import { ExamRequestEntity } from './exam-request.entity'
import { ExamRequestAttachmentEntity } from './exam-request-attachment.entity'
import { ExamParameterEntity } from './exam-parameter.entity'
import { ExamResultEntity } from './exam-result.entity'
import type { Entity } from './entity'

export interface ServiceSiteEntity {
  service_id: number
  site_id: number
}

export interface DB {
  user: UserEntity
  patient: PatientEntity
  appointment: AppointmentEntity & { service_name?: string; care_unit_name?: string; medecin_name?: string }
  session: SessionEntity
  app_settings: AppSettingsEntity
  invoice: InvoiceEntity
  invoice_item: InvoiceItemEntity
  invoice_payment: InvoicePaymentEntity
  automerge_documents: AutomergeDocumentEntity
  currency: CurrencyEntity
  services: ServiceEntity
  medical_acts: MedicalActEntity
  act_price_history: ActPriceHistoryEntity
  medical_units: MedicalUnitEntity
  sites: SiteEntity
  specialties: SpecialtyEntity
  user_specialties: UserSpecialtyEntity
  user_sites: UserSiteEntity
  user_services: UserServiceEntity
  user_medical_units: UserMedicalUnitEntity
  email_config: EmailConfigEntity
  fonctions: FonctionEntity
  localites: LocaliteEntity
  user_attachments: UserAttachmentEntity
  patient_attachments: PatientAttachmentEntity
  document_attachments: DocumentAttachmentEntity
  attachment_types: AttachmentTypeEntity
  form_drafts: FormDraftEntity
  plan_soins: PlanSoinsEntity
  plan_soins_items: PlanSoinsItemEntity
  prescriptions: PrescriptionEntity
  vital_signs: VitalSignEntity
  vital_signs_items: VitalSignsItemEntity
  dispositifs: DispositifEntity
  trusted_persons: TrustedPersonEntity
  conservateurs_stockage: ConservateurStockageEntity
  conservateurs_champs_localisation: ConservateurChampLocalisationEntity
  service_sites: ServiceSiteEntity
  user_favorite_services: UserFavoriteServiceEntity
  contact_origins: ContactOriginEntity
  insurances: InsuranceEntity
  voie_types: VoieTypeEntity
  dispositif_types: DispositifTypeEntity
  encounters: EncounterEntity
  encounter_movements: EncounterMovementEntity
  stays: StayEntity
  stay_movements: StayMovementEntity
  config_tarifs: ConfigTarifEntity
  patient_actes: PatientActeEntity
  care_units: CareUnitEntity
  clinical_document_types: ClinicalDocumentTypeEntity
  patient_clinical_documents: ClinicalDocumentEntity
  clinical_document_signatures: ClinicalDocumentSignatureEntity
  exam_categories: ExamCategoryEntity
  exam_types: ExamTypeEntity
  lab_exam_categories: ExamCategoryEntity
  lab_exams: ExamTypeEntity
  exam_requests: ExamRequestEntity
  exam_request_attachments: ExamRequestAttachmentEntity
  exam_parameters: ExamParameterEntity
  exam_results: ExamResultEntity
}

export const ENTITIES: Entity[] = [
  AutomergeDocumentEntity,
  UserEntity,
  PatientEntity,
  AppointmentEntity,
  InvoiceEntity,
  SessionEntity,
  InvoiceItemEntity,
  InvoicePaymentEntity,
  CurrencyEntity,
  ServiceEntity,
  MedicalActEntity,
  ActPriceHistoryEntity,
  MedicalUnitEntity,
  SiteEntity,
  SpecialtyEntity,
  EmailConfigEntity,
  FonctionEntity,
  LocaliteEntity,
  ConservateurStockageEntity,
  ConservateurChampLocalisationEntity,
  AppSettingsEntity,
  UserSpecialtyEntity,
  UserSiteEntity,
  UserServiceEntity,
  UserMedicalUnitEntity,
  UserFavoriteServiceEntity,
  AttachmentTypeEntity,
  PatientAttachmentEntity,
  DocumentAttachmentEntity,
  UserAttachmentEntity,
  FormDraftEntity,
  TrustedPersonEntity,
  VitalSignEntity,
  VitalSignsItemEntity,
  PlanSoinsEntity,
  PrescriptionEntity,
  DispositifEntity,
  ContactOriginEntity,
  InsuranceEntity,
  VoieTypeEntity,
  DispositifTypeEntity,
  EncounterEntity,
  EncounterMovementEntity,
  StayEntity,
  StayMovementEntity,
  ConfigTarifEntity,
  PatientActeEntity,
  CareUnitEntity,
  ClinicalDocumentTypeEntity,
  ClinicalDocumentEntity,
  ClinicalDocumentSignatureEntity,
  ExamCategoryEntity,
  ExamTypeEntity,
  ExamRequestEntity,
  ExamRequestAttachmentEntity,
  ExamParameterEntity,
  ExamResultEntity,
]
