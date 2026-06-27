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
}
