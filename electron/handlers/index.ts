import { registerAuthHandlers } from './auth.handler'
import { registerPatientHandlers } from './patient.handler'
import { registerAppointmentHandlers } from './appointment.handler'
import { registerSettingsHandlers } from './settings.handler'
import { registerSessionHandlers } from './session.handler'
import { registerInvoiceHandlers } from './invoice.handler'
import { registerEmailHandlers } from './email.handler'
import { registerIdentityHandlers } from './identity.handler'
import { registerExportHandlers } from './export.handler'
import { registerUserAttachmentHandlers } from './user-attachment.handler'
import { registerPatientAttachmentHandlers } from './patient-attachment.handler'
import { registerDocumentAttachmentHandlers } from './document-attachment.handler'
import { registerAttachmentTypeHandlers } from './attachment-type.handler'
import { registerFormDraftHandlers } from './form-draft.handler'
import { registerPatientCareHandlers } from './patient-care.handler'
import { registerPrescriptionHandlers } from './prescription.handler'
import { registerConservateurHandlers } from './conservateur.handler'
import { registerEncounterHandlers } from './encounter.handler'
import { registerStayHandlers } from './stay.handler'
import { registerPatientActeHandlers } from './patient-acte.handler'
import { registerCareUnitHandlers } from './care-unit.handler'
import { registerContactOriginHandlers } from './contact-origin.handler'
import { registerInsuranceHandlers } from './insurance.handler'
import { registerClinicalDocumentHandlers } from './clinical-document.handler'
import { registerExamTypeHandlers } from './exam-type.handler'
import { registerExamRequestHandlers } from './exam-request.handler'
import { registerExamParameterHandlers } from './exam-parameter.handler'
import { registerExamResultHandlers } from './exam-result.handler'
import { registerOrdonnanceLibreHandlers } from './ordonnance-libre.handler'
import { registerSpecialtyHandlers } from './specialty.handler'
import { registerSyncHandlers } from './sync.handler'
import { registerMedicamentHandlers } from './medicament.handler'
import { registerStockHandlers } from './stock.handler'
import { registerFournisseurHandlers } from './fournisseur.handler'
import { registerUniteStockHandlers } from './unite-stock.handler'
import { registerLaboratoireHandlers } from './laboratoire.handler'
import { registerLaboratoireStockHandlers } from './laboratoire-stock.handler'
import { registerDispensationHandlers } from './dispensation.handler'
import { registerDashboardHandlers } from './dashboard.handler'
import { registerSalaireHandlers } from './salaire.handler'
import { registerDepenseHandlers } from './depense.handler'
import { registerCaisseHandlers } from './caisse.handler'
import { registerIndicateursHandlers } from './indicateurs.handler'
import { registerCommandeHandlers } from './commande.handler'
import { registerApportHandlers } from './apport.handler'

export function registerAllHandlers(): void {
  registerAuthHandlers()
  registerPatientHandlers()
  registerAppointmentHandlers()
  registerSettingsHandlers()
  registerSessionHandlers()
  registerInvoiceHandlers()
  registerEmailHandlers()
  registerIdentityHandlers()
  registerExportHandlers()
  registerUserAttachmentHandlers()
  registerPatientAttachmentHandlers()
  registerDocumentAttachmentHandlers()
  registerAttachmentTypeHandlers()
  registerFormDraftHandlers()
  registerPatientCareHandlers()
  registerPrescriptionHandlers()
  registerConservateurHandlers()
  registerEncounterHandlers()
  registerStayHandlers()
  registerPatientActeHandlers()
  registerCareUnitHandlers()
  registerContactOriginHandlers()
  registerInsuranceHandlers()
  registerClinicalDocumentHandlers()
  registerExamTypeHandlers()
  registerExamRequestHandlers()
  registerExamParameterHandlers()
  registerExamResultHandlers()
  registerSpecialtyHandlers()
  registerOrdonnanceLibreHandlers()
  registerMedicamentHandlers()
  registerStockHandlers()
  registerFournisseurHandlers()
  registerUniteStockHandlers()
  registerLaboratoireHandlers()
  registerLaboratoireStockHandlers()
  registerDispensationHandlers()
  registerDashboardHandlers()
  registerSalaireHandlers()
  registerDepenseHandlers()
  registerCaisseHandlers()
  registerIndicateursHandlers()
  registerCommandeHandlers()
  registerApportHandlers()
  registerSyncHandlers()
}
