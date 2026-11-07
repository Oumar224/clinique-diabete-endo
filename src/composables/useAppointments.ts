import { ipcInvoke } from '@/utils/ipc'

export interface AppointmentDto {
  id?: number
  patient_id?: number
  patient_nom?: string
  date?: string
  time?: string
  motif?: string
  status?: 'confirmed' | 'pending' | 'cancelled' | 'done'
  medecin_id?: number
  medecin_name?: string
  service_id?: number
  service_name?: string
  care_unit_id?: number
  care_unit_name?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface AppointmentCreateDto {
  patient_id: number
  date: string
  time: string
  motif?: string
  status?: 'confirmed' | 'pending' | 'cancelled' | 'done'
  medecin_id?: number | null
  service_id?: number | null
  care_unit_id?: number | null
  notes?: string | null
}

export async function listAppointments(params?: {
  date?: string
  date_debut?: string
  date_fin?: string
  medecin_id?: number
  status?: string
} | string): Promise<AppointmentDto[]> {
  const payload = typeof params === 'string' ? { date: params } : (params ?? {})
  return ipcInvoke<AppointmentDto[]>('appointments:list', payload)
}

export async function listAppointmentsByPatient(patientId: number): Promise<AppointmentDto[]> {
  return ipcInvoke<AppointmentDto[]>('appointments:list-by-patient', { patient_id: patientId })
}

export async function getAppointment(id: number): Promise<AppointmentDto> {
  return ipcInvoke<AppointmentDto>('appointments:get', { id })
}

export async function createAppointment(data: AppointmentCreateDto): Promise<AppointmentDto> {
  return ipcInvoke<AppointmentDto>('appointments:create', data)
}

export async function updateAppointment(id: number, data: Partial<AppointmentCreateDto>): Promise<AppointmentDto> {
  return ipcInvoke<AppointmentDto>('appointments:update', { id, ...data })
}

export async function deleteAppointment(id: number): Promise<void> {
  await ipcInvoke('appointments:delete', { id })
}

export async function updateAppointmentStatus(id: number, status: AppointmentDto['status']): Promise<void> {
  await ipcInvoke('appointments:update-status', { id, status })
}

/**
 * Convertit une Date en ISO YYYY-MM-DD (heure locale, sans décalage UTC).
 *
 * @param d - Date à convertir.
 * @returns Chaîne ISO YYYY-MM-DD.
 */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

/**
 * Convertit "HH:mm" en minutes depuis minuit.
 *
 * @param t - Heure au format HH:mm.
 * @returns Minutes depuis minuit (NaN si invalide).
 */
export function timeToMinutes(t?: string): number {
  if (!t) return NaN
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN
  return h * 60 + m
}

/**
 * Détecte un conflit horaire pour un même médecin.
 * Fenêtre de chevauchement basée sur `durationMin` (30 par défaut).
 *
 * @param list - RDV existants (même date).
 * @param candidate - Candidat { date, time, medecin_id }.
 * @param durationMin - Durée d'un créneau en minutes. Default `30`.
 * @param excludeId - Id à ignorer (édition).
 * @returns Le RDV en conflit ou `undefined`.
 */
export function findTimeConflict(
  list: AppointmentDto[],
  candidate: { date?: string; time?: string; medecin_id?: number | null },
  durationMin = 30,
  excludeId?: number,
): AppointmentDto | undefined {
  if (!candidate.date || !candidate.time || candidate.medecin_id == null) return undefined
  const cStart = timeToMinutes(candidate.time)
  if (Number.isNaN(cStart)) return undefined
  const cEnd = cStart + durationMin
  return list.find((a) => {
    if (excludeId != null && a.id === excludeId) return false
    if (a.date !== candidate.date) return false
    if (a.medecin_id == null || a.medecin_id !== candidate.medecin_id) return false
    const aStart = timeToMinutes(a.time)
    if (Number.isNaN(aStart)) return false
    const aEnd = aStart + durationMin
    return cStart < aEnd && aStart < cEnd
  })
}
