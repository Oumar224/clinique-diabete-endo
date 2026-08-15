import type { EntityRegistration } from './utils/entity-types'
import { buildDocumentSchema } from './utils/schema-field'

import { PatientEntity } from '../entities/patient.entity'
import { UserEntity } from '../entities/user.entity'
import { AppointmentEntity } from '../entities/appointment.entity'
import { InvoiceEntity } from '../entities/invoice.entity'
import { InvoiceItemEntity } from '../entities/invoice-item.entity'
import { InvoicePaymentEntity } from '../entities/invoice-payment.entity'
import { SessionEntity } from '../entities/session.entity'
import { AppSettingsEntity } from '../entities/app-settings.entity'
import { CurrencyEntity } from '../entities/currency.entity'
import { ServiceEntity } from '../entities/service.entity'
import { MedicalActEntity } from '../entities/medical-act.entity'
import { ActPriceHistoryEntity } from '../entities/act-price-history.entity'
import { MedicalUnitEntity } from '../entities/medical-unit.entity'
import { SiteEntity } from '../entities/site.entity'
import { SpecialtyEntity } from '../entities/specialty.entity'
import { EmailConfigEntity } from '../entities/email-config.entity'
import { FonctionEntity } from '../entities/fonction.entity'
import { LocaliteEntity } from '../entities/localite.entity'
import { ConservateurStockageEntity } from '../entities/conservateur-stockage.entity'
import { ConservateurChampLocalisationEntity } from '../entities/conservateur-champ-localisation.entity'
import { UserSpecialtyEntity } from '../entities/user-specialty.entity'
import { UserSiteEntity } from '../entities/user-site.entity'
import { UserServiceEntity } from '../entities/user-service.entity'
import { UserMedicalUnitEntity } from '../entities/user-medical-unit.entity'
import { UserFavoriteServiceEntity } from '../entities/user-favorite-service.entity'
import { AttachmentTypeEntity } from '../entities/attachment-type.entity'
import { PatientAttachmentEntity } from '../entities/patient-attachment.entity'
import { UserAttachmentEntity } from '../entities/user-attachment.entity'
import { FormDraftEntity } from '../entities/form-draft.entity'
import { TrustedPersonEntity } from '../entities/trusted-person.entity'
import { VitalSignEntity } from '../entities/vital-sign.entity'
import { VitalSignsItemEntity } from '../entities/vital-signs-item.entity'
import { PlanSoinsEntity, PlanSoinsItemEntity } from '../entities/plan-soins.entity'
import { PrescriptionEntity } from '../entities/prescription.entity'
import { DispositifEntity } from '../entities/dispositif.entity'
import { ContactOriginEntity } from '../entities/contact-origin.entity'
import { InsuranceEntity } from '../entities/insurance.entity'
import { VoieTypeEntity } from '../entities/voie-type.entity'
import { DispositifTypeEntity } from '../entities/dispositif-type.entity'
import { EncounterEntity, EncounterMovementEntity } from '../entities/encounter.entity'
import { StayEntity, StayMovementEntity } from '../entities/stay.entity'
import { ConfigTarifEntity } from '../entities/config-tarif.entity'
import { PatientActeEntity } from '../entities/patient-acte.entity'
import { CareUnitEntity } from '../entities/care-unit.entity'
import { ClinicalDocumentTypeEntity } from '../entities/clinical-document-type.entity'
import { ClinicalDocumentEntity } from '../entities/clinical-document.entity'
import { ClinicalDocumentSignatureEntity } from '../entities/clinical-document-signature.entity'
import { ExamCategoryEntity } from '../entities/exam-category.entity'
import { ExamTypeEntity } from '../entities/exam-type.entity'
import { ExamRequestEntity } from '../entities/exam-request.entity'

import { PatientConverter } from './converters/patient.converter'
import { UserConverter } from './converters/user.converter'
import { AppointmentConverter } from './converters/appointment.converter'
import { InvoiceConverter } from './converters/invoice.converter'
import { InvoiceItemConverter } from './converters/invoice-item.converter'
import { InvoicePaymentConverter } from './converters/invoice-payment.converter'
import { SessionConverter } from './converters/session.converter'
import { AppSettingsConverter } from './converters/app-settings.converter'
import { CurrencyConverter } from './converters/currency.converter'
import { ServiceConverter } from './converters/service.converter'
import { MedicalActConverter } from './converters/medical-act.converter'
import { ActPriceHistoryConverter } from './converters/act-price-history.converter'
import { MedicalUnitConverter } from './converters/medical-unit.converter'
import { SiteConverter } from './converters/site.converter'
import { SpecialtyConverter } from './converters/specialty.converter'
import { EmailConfigConverter } from './converters/email-config.converter'
import { FonctionConverter } from './converters/fonction.converter'
import { LocaliteConverter } from './converters/localite.converter'
import { ConservateurStockageConverter } from './converters/conservateur-stockage.converter'
import { ConservateurChampLocalisationConverter } from './converters/conservateur-champ-localisation.converter'
import { UserSpecialtyConverter } from './converters/user-specialty.converter'
import { UserSiteConverter } from './converters/user-site.converter'
import { UserServiceConverter } from './converters/user-service.converter'
import { UserMedicalUnitConverter } from './converters/user-medical-unit.converter'
import { UserFavoriteServiceConverter } from './converters/user-favorite-service.converter'
import { AttachmentTypeConverter } from './converters/attachment-type.converter'
import { PatientAttachmentConverter } from './converters/patient-attachment.converter'
import { UserAttachmentConverter } from './converters/user-attachment.converter'
import { FormDraftConverter } from './converters/form-draft.converter'
import { TrustedPersonConverter } from './converters/trusted-person.converter'
import { VitalSignConverter } from './converters/vital-sign.converter'
import { VitalSignsItemConverter } from './converters/vital-signs-item.converter'
import { PlanSoinsConverter } from './converters/plan-soins.converter'
import { PlanSoinsItemConverter } from './converters/plan-soins-item.converter'
import { PrescriptionConverter } from './converters/prescription.converter'
import { DispositifConverter } from './converters/dispositif.converter'
import { ContactOriginConverter } from './converters/contact-origin.converter'
import { InsuranceConverter } from './converters/insurance.converter'
import { VoieTypeConverter } from './converters/voie-type.converter'
import { DispositifTypeConverter } from './converters/dispositif-type.converter'
import { EncounterConverter } from './converters/encounter.converter'
import { EncounterMovementConverter } from './converters/encounter-movement.converter'
import { StayConverter } from './converters/stay.converter'
import { StayMovementConverter } from './converters/stay-movement.converter'
import { ConfigTarifConverter } from './converters/config-tarif.converter'
import { PatientActeConverter } from './converters/patient-acte.converter'
import { CareUnitConverter } from './converters/care-unit.converter'
import { ClinicalDocumentTypeConverter } from './converters/clinical-document-type.converter'
import { ClinicalDocumentConverter } from './converters/clinical-document.converter'
import { ClinicalDocumentSignatureConverter } from './converters/clinical-document-signature.converter'
import { ExamCategoryConverter } from './converters/exam-category.converter'
import { ExamTypeConverter } from './converters/exam-type.converter'
import { ExamRequestConverter } from './converters/exam-request.converter'

function reg(
  type: string,
  tableName: string,
  EntityClass: any,
  converter: { toDocument: (e: any) => any; toEntity: (d: any) => any },
): EntityRegistration {
  return {
    type,
    tableName,
    documentSchema: buildDocumentSchema(EntityClass),
    converter,
  }
}

export const ENTITY_TYPE_MAP: Record<string, EntityRegistration> = {
  patient: reg('patient', 'patient', PatientEntity, PatientConverter),
  user: reg('user', 'user', UserEntity, UserConverter),
  appointment: reg('appointment', 'appointment', AppointmentEntity, AppointmentConverter),
  invoice: reg('invoice', 'invoice', InvoiceEntity, InvoiceConverter),
  invoice_item: reg('invoice_item', 'invoice_item', InvoiceItemEntity, InvoiceItemConverter),
  invoice_payment: reg('invoice_payment', 'invoice_payment', InvoicePaymentEntity, InvoicePaymentConverter),
  session: reg('session', 'session', SessionEntity, SessionConverter),
  app_settings: reg('app_settings', 'app_settings', AppSettingsEntity, AppSettingsConverter),
  currency: reg('currency', 'currency', CurrencyEntity, CurrencyConverter),
  service: reg('service', 'services', ServiceEntity, ServiceConverter),
  medical_act: reg('medical_act', 'medical_acts', MedicalActEntity, MedicalActConverter),
  act_price_history: reg('act_price_history', 'act_price_history', ActPriceHistoryEntity, ActPriceHistoryConverter),
  medical_unit: reg('medical_unit', 'medical_units', MedicalUnitEntity, MedicalUnitConverter),
  site: reg('site', 'sites', SiteEntity, SiteConverter),
  specialty: reg('specialty', 'specialties', SpecialtyEntity, SpecialtyConverter),
  email_config: reg('email_config', 'email_config', EmailConfigEntity, EmailConfigConverter),
  fonction: reg('fonction', 'fonctions', FonctionEntity, FonctionConverter),
  localite: reg('localite', 'localites', LocaliteEntity, LocaliteConverter),
  conservateur_stockage: reg('conservateur_stockage', 'conservateurs_stockage', ConservateurStockageEntity, ConservateurStockageConverter),
  conservateur_champ_localisation: reg('conservateur_champ_localisation', 'conservateurs_champs_localisation', ConservateurChampLocalisationEntity, ConservateurChampLocalisationConverter),
  user_specialty: reg('user_specialty', 'user_specialties', UserSpecialtyEntity, UserSpecialtyConverter),
  user_site: reg('user_site', 'user_sites', UserSiteEntity, UserSiteConverter),
  user_service: reg('user_service', 'user_services', UserServiceEntity, UserServiceConverter),
  user_medical_unit: reg('user_medical_unit', 'user_medical_units', UserMedicalUnitEntity, UserMedicalUnitConverter),
  user_favorite_service: reg('user_favorite_service', 'user_favorite_services', UserFavoriteServiceEntity, UserFavoriteServiceConverter),
  attachment_type: reg('attachment_type', 'attachment_types', AttachmentTypeEntity, AttachmentTypeConverter),
  patient_attachment: reg('patient_attachment', 'patient_attachments', PatientAttachmentEntity, PatientAttachmentConverter),
  user_attachment: reg('user_attachment', 'user_attachments', UserAttachmentEntity, UserAttachmentConverter),
  form_draft: reg('form_draft', 'form_drafts', FormDraftEntity, FormDraftConverter),
  trusted_person: reg('trusted_person', 'trusted_persons', TrustedPersonEntity, TrustedPersonConverter),
  vital_sign: reg('vital_sign', 'vital_signs', VitalSignEntity, VitalSignConverter),
  vital_signs_item: reg('vital_signs_item', 'vital_signs_items', VitalSignsItemEntity, VitalSignsItemConverter),
  plan_soins: reg('plan_soins', 'plan_soins', PlanSoinsEntity, PlanSoinsConverter),
  plan_soins_item: reg('plan_soins_item', 'plan_soins_items', PlanSoinsItemEntity, PlanSoinsItemConverter),
  prescription: reg('prescription', 'prescriptions', PrescriptionEntity, PrescriptionConverter),
  dispositif: reg('dispositif', 'dispositifs', DispositifEntity, DispositifConverter),
  contact_origin: reg('contact_origin', 'contact_origins', ContactOriginEntity, ContactOriginConverter),
  insurance: reg('insurance', 'insurances', InsuranceEntity, InsuranceConverter),
  voie_type: reg('voie_type', 'voie_types', VoieTypeEntity, VoieTypeConverter),
  dispositif_type: reg('dispositif_type', 'dispositif_types', DispositifTypeEntity, DispositifTypeConverter),
  encounter: reg('encounter', 'encounters', EncounterEntity, EncounterConverter),
  encounter_movement: reg('encounter_movement', 'encounter_movements', EncounterMovementEntity, EncounterMovementConverter),
  stay: reg('stay', 'stays', StayEntity, StayConverter),
  stay_movement: reg('stay_movement', 'stay_movements', StayMovementEntity, StayMovementConverter),
  config_tarif: reg('config_tarif', 'config_tarifs', ConfigTarifEntity, ConfigTarifConverter),
  patient_acte: reg('patient_acte', 'patient_actes', PatientActeEntity, PatientActeConverter),
  care_unit: reg('care_unit', 'care_units', CareUnitEntity, CareUnitConverter),
  clinical_document_type: reg('clinical_document_type', 'clinical_document_types', ClinicalDocumentTypeEntity, ClinicalDocumentTypeConverter),
  clinical_document: reg('clinical_document', 'patient_clinical_documents', ClinicalDocumentEntity, ClinicalDocumentConverter),
  clinical_document_signature: reg('clinical_document_signature', 'clinical_document_signatures', ClinicalDocumentSignatureEntity, ClinicalDocumentSignatureConverter),
  exam_category: reg('exam_category', 'exam_categories', ExamCategoryEntity, ExamCategoryConverter),
  exam_type: reg('exam_type', 'exam_types', ExamTypeEntity, ExamTypeConverter),
  exam_request: reg('exam_request', 'exam_requests', ExamRequestEntity, ExamRequestConverter),
}

const TABLE_TO_TYPE = new Map(
  Object.entries(ENTITY_TYPE_MAP).map(([type, reg]) => [reg.tableName, type])
)

export function getEntityTypeForTable(tableName: string): string | undefined {
  return TABLE_TO_TYPE.get(tableName)
}
