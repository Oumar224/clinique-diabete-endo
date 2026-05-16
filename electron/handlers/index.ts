import { registerAuthHandlers } from './auth.handler'
import { registerPatientHandlers } from './patient.handler'
import { registerAppointmentHandlers } from './appointment.handler'
import { registerSettingsHandlers } from './settings.handler'
import { registerSessionHandlers } from './session.handler'
import { registerInvoiceHandlers } from './invoice.handler'

export function registerAllHandlers(): void {
  registerAuthHandlers()
  registerPatientHandlers()
  registerAppointmentHandlers()
  registerSettingsHandlers()
  registerSessionHandlers()
  registerInvoiceHandlers()
}
