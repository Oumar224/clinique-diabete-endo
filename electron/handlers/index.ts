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
import { registerContactCategoryHandlers } from './contact-category.handler'
import { registerClinicalDocumentHandlers } from './clinical-document.handler'
import { registerExamTypeHandlers } from './exam-type.handler'

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
  registerContactCategoryHandlers()
  registerClinicalDocumentHandlers()
  registerExamTypeHandlers()
}
