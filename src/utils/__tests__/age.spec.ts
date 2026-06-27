import { describe, it, expect } from 'vitest'
import { calculateAge } from '../age'

describe('calculateAge', () => {
  it('calculates age correctly for a past date', () => {
    const age = calculateAge('1990-05-15')
    const currentYear = new Date().getFullYear()
    const expected = currentYear - 1990 - (new Date() < new Date(`${currentYear}-05-15`) ? 1 : 0)
    expect(age).toBe(expected)
    expect(age).toBeGreaterThan(30)
    expect(age).toBeLessThan(60)
  })

  it('returns 0 for today\'s date', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(calculateAge(today)).toBe(0)
  })

  it('handles birthdate that hasn\'t occurred yet this year', () => {
    const lastYear = (new Date().getFullYear() - 1) + '-12-31'
    const age = calculateAge(lastYear)
    // A person born Dec 31 last year is either 0 or 1 depending on today's date
    expect(age).toBeGreaterThanOrEqual(0)
    expect(age).toBeLessThanOrEqual(1)
  })

  it('returns correct age for Jan 1 birthdate', () => {
    const age = calculateAge('2000-01-01')
    const expected = new Date().getFullYear() - 2000
    expect(age).toBe(expected)
  })

  it('returns NaN for empty string', () => {
    const result = calculateAge('')
    expect(Number.isNaN(result)).toBe(true)
  })

  it('returns NaN for invalid date string', () => {
    const result = calculateAge('not-a-date')
    expect(Number.isNaN(result)).toBe(true)
  })

  it('handles future birthdate (birthday later this year)', () => {
    const age = calculateAge(`${new Date().getFullYear() - 1}-12-31`)
    // Born Dec 31 last year
    const today = new Date()
    const birthdayThisYear = new Date(today.getFullYear(), 11, 31) // Dec 31
    const expected = today >= birthdayThisYear ? 1 : 0
    expect(age).toBe(expected)
  })

  it('returns 0 for birthdate yesterday (newborn)', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split('T')[0]
    const age = calculateAge(dateStr)
    expect(age).toBe(0)
  })

  it('handles leap year birthdate (Feb 29)', () => {
    const age = calculateAge('2000-02-29')
    expect(age).toBeGreaterThanOrEqual(0)
  })
})
