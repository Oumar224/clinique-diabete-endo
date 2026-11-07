import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Interval between `now` refreshes (ms). One minute is enough to move the
 * "past" boundary without a reload while keeping the timer negligible.
 */
const PAST_SLOTS_TICK_MS = 60_000

export interface PastSlotsApi {
  /** `true` when an appointment start is strictly before `now` (local time). */
  isPastAppointment: (isoDate: string | null | undefined, time: string | null | undefined) => boolean
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_RE = /^(\d{1,2}):(\d{2})/

/**
 * Parses a local `YYYY-MM-DD` key into a local-midnight `Date`.
 *
 * Uses the `Date(y, m, d)` constructor (never `Date.parse`) so the value is
 * interpreted in the user's local timezone, matching the agenda columns.
 *
 * @param isoDate - Date key in `YYYY-MM-DD` format.
 * @returns Local-midnight date, or `null` when the key is invalid.
 */
function parseLocalIsoDate(isoDate: string | null | undefined): Date | null {
  if (!isoDate) return null
  const match = ISO_DATE_RE.exec(isoDate)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day, 0, 0, 0, 0)
  // Reject overflow (e.g. 2026-02-31) produced by the Date constructor.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

/**
 * Parses a local `HH:mm` time into hours/minutes.
 *
 * @param time - Time in `HH:mm` format.
 * @returns `{ hours, minutes }`, or `null` when the value is invalid.
 */
function parseLocalTime(time: string | null | undefined): { hours: number; minutes: number } | null {
  if (!time) return null
  const match = TIME_RE.exec(time)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return { hours, minutes }
}

/**
 * Reactive "is this appointment in the past?" helper for the RDV blocks.
 *
 * A single internal `now` reference is refreshed every
 * {@link PAST_SLOTS_TICK_MS} so the boundary moves on its own. All comparisons
 * use local time only.
 *
 * @remarks
 * - Only the appointment block itself is flagged; grid headers and hour cells
 *   are never marked past.
 * - An appointment is past when its start time is strictly before `now`.
 * - The interval is cleaned up on unmount.
 *
 * @returns The per-block past helper.
 *
 * @example
 * const { isPastAppointment } = usePastSlots()
 * isPastAppointment('2026-10-19', '09:00') // true on 2026-10-21 12:30
 */
export function usePastSlots(): PastSlotsApi {
  const now = ref(new Date())
  let timer: ReturnType<typeof setInterval> | null = null

  const tick = () => {
    now.value = new Date()
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    timer = setInterval(tick, PAST_SLOTS_TICK_MS)
  })

  onBeforeUnmount(() => {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  })

  const isPastAppointment = (
    isoDate: string | null | undefined,
    time: string | null | undefined,
  ): boolean => {
    const dayStart = parseLocalIsoDate(isoDate)
    if (!dayStart) return false
    const parsed = parseLocalTime(time) ?? { hours: 0, minutes: 0 }
    const start = new Date(dayStart)
    start.setHours(parsed.hours, parsed.minutes, 0, 0)
    return start.getTime() < now.value.getTime()
  }

  return { isPastAppointment }
}
