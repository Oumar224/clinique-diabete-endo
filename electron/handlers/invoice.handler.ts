import { container } from 'tsyringe'
import { InvoiceService } from '../services/invoice.service'
import { createHandler } from '../utils/create-handler'
import type { InvoiceCreateDto, InvoicePaymentDto, InvoiceListDto, InvoiceUpdateDto } from '../dto/invoice.dto'

export function registerInvoiceHandlers() {
  createHandler('invoices:list', async (params: InvoiceListDto) => {
    return await container.resolve(InvoiceService).list(params)
  })

  createHandler('invoices:get', async ({ id }: { id: number }) => {
    return await container.resolve(InvoiceService).getById(id)
  })

  createHandler('invoices:get-by-patient', async ({ patient_id }: { patient_id: number }) => {
    return await container.resolve(InvoiceService).getByPatient(patient_id)
  })

  createHandler('invoices:create', async (dto: InvoiceCreateDto) => {
    return await container.resolve(InvoiceService).create(dto)
  })

  createHandler('invoices:update', async (dto: InvoiceUpdateDto) => {
    const { id, ...data } = dto
    return await container.resolve(InvoiceService).update(id, data)
  })

  createHandler('invoices:add-payment', async (payment: InvoicePaymentDto) => {
    return await container.resolve(InvoiceService).addPayment(payment)
  })

  createHandler('invoices:stats', async () => {
    return await container.resolve(InvoiceService).getStats()
  })
}
