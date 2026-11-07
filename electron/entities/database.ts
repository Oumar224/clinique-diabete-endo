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
import { MedicamentEntity } from './medicament.entity'
import { StockLotEntity } from './stock-lot.entity'
import { FournisseurEntity } from './fournisseur.entity'
import { UniteStockEntity } from './unite-stock.entity'
import {
  LaboArticleEntity,
  LaboStockLotEntity,
  LaboMouvementStockEntity,
  LaboCommandeEntity,
  LaboCommandeLigneEntity,
  LaboCommandeReceptionEntity,
  LaboReceptionLigneEntity,
  LaboPaiementEntity,
} from './laboratoire.entity'
import { MouvementStockEntity } from './mouvement-stock.entity'
import { DelivranceEntity, DelivranceLigneEntity } from './delivrance.entity'
import { SalaireConfigEntity, SalaireConfigRubriqueEntity, SalairePaiementEntity } from './salaire.entity'
import { DepenseCategorieEntity, DepenseEntity } from './depense.entity'
import { VentePharmaciePaiementEntity } from './vente-pharmacie-paiement.entity'
import { AnnualIndicatorEntity } from './annual-indicator.entity'
import {
  CommandeEntity,
  CommandeLigneEntity,
  CommandeReceptionAttachmentEntity,
  CommandeReceptionEntity,
  CommandeReceptionLigneEntity,
} from './commande.entity'
import { ApportEntity, ApportRemboursementEntity } from './apport.entity'
import { StockLotAttachmentEntity } from './stock-lot-attachment.entity'
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
  medicaments: MedicamentEntity
  stock_lots: StockLotEntity
  fournisseurs: FournisseurEntity
  unites_stock: UniteStockEntity
  mouvements_stock: MouvementStockEntity
  delivrances: DelivranceEntity
  delivrance_lignes: DelivranceLigneEntity
  salaire_config: SalaireConfigEntity
  salaire_config_rubrique: SalaireConfigRubriqueEntity
  salaire_paiement: SalairePaiementEntity
  depense_categorie: DepenseCategorieEntity
  depense: DepenseEntity
  vente_pharmacie_paiement: VentePharmaciePaiementEntity
  annual_indicator: AnnualIndicatorEntity
  commandes: CommandeEntity
  commande_lignes: CommandeLigneEntity
  commande_receptions: CommandeReceptionEntity
  commande_reception_lignes: CommandeReceptionLigneEntity
  commande_reception_attachments: CommandeReceptionAttachmentEntity
  apports: ApportEntity
  apport_remboursements: ApportRemboursementEntity
  stock_lot_attachments: StockLotAttachmentEntity
  labo_articles: LaboArticleEntity
  labo_stock_lots: LaboStockLotEntity
  labo_mouvements_stock: LaboMouvementStockEntity
  labo_commandes: LaboCommandeEntity
  labo_commande_lignes: LaboCommandeLigneEntity
  labo_commande_receptions: LaboCommandeReceptionEntity
  labo_commande_reception_lignes: LaboReceptionLigneEntity
  labo_paiements: LaboPaiementEntity
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
  MedicamentEntity,
  StockLotEntity,
  FournisseurEntity,
  UniteStockEntity,
  MouvementStockEntity,
  DelivranceEntity,
  DelivranceLigneEntity,
  SalaireConfigEntity,
  SalaireConfigRubriqueEntity,
  SalairePaiementEntity,
  DepenseCategorieEntity,
  DepenseEntity,
  VentePharmaciePaiementEntity,
  CommandeEntity as unknown as Entity,
  CommandeLigneEntity as unknown as Entity,
  CommandeReceptionEntity as unknown as Entity,
  CommandeReceptionLigneEntity as unknown as Entity,
  CommandeReceptionAttachmentEntity as unknown as Entity,
  ApportEntity as unknown as Entity,
  ApportRemboursementEntity as unknown as Entity,
  StockLotAttachmentEntity as unknown as Entity,
  LaboArticleEntity as unknown as Entity,
  LaboStockLotEntity as unknown as Entity,
  LaboMouvementStockEntity as unknown as Entity,
  LaboCommandeEntity as unknown as Entity,
  LaboCommandeLigneEntity as unknown as Entity,
  LaboCommandeReceptionEntity as unknown as Entity,
  LaboReceptionLigneEntity as unknown as Entity,
  LaboPaiementEntity as unknown as Entity,
]
