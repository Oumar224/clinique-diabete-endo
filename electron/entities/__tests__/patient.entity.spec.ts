import { describe, it, expect } from 'vitest'
import { PatientEntity } from '../patient.entity'

describe('PatientEntity.toDto', () => {
  it('handles null allergies', () => {
    const entity = new PatientEntity()
    entity.allergies = null as any
    const dto = PatientEntity.toDto(entity)
    expect(dto.allergies).toEqual([])
  })

  it('handles empty string allergies', () => {
    const entity = new PatientEntity()
    entity.allergies = ''
    const dto = PatientEntity.toDto(entity)
    expect(dto.allergies).toEqual([])
  })

  it('handles whitespace-only allergies', () => {
    const entity = new PatientEntity()
    entity.allergies = '   '
    const dto = PatientEntity.toDto(entity)
    expect(dto.allergies).toEqual([])
  })

  it('parses valid JSON allergies', () => {
    const entity = new PatientEntity()
    entity.allergies = '["Pénicilline", "Sulfamides"]'
    const dto = PatientEntity.toDto(entity)
    expect(dto.allergies).toEqual(['Pénicilline', 'Sulfamides'])
  })

  it('parses valid empty JSON array', () => {
    const entity = new PatientEntity()
    entity.allergies = '[]'
    const dto = PatientEntity.toDto(entity)
    expect(dto.allergies).toEqual([])
  })

  it('handles undefined allergies', () => {
    const entity = new PatientEntity()
    entity.allergies = undefined
    const dto = PatientEntity.toDto(entity)
    expect(dto.allergies).toEqual([])
  })

  it('handles single-element allergies array', () => {
    const entity = new PatientEntity()
    entity.allergies = '["Aspirine"]'
    const dto = PatientEntity.toDto(entity)
    expect(dto.allergies).toEqual(['Aspirine'])
  })

  it('handles allergies with special characters', () => {
    const entity = new PatientEntity()
    entity.allergies = '["Pénicilline G", "Sulfaméthoxazole"]'
    const dto = PatientEntity.toDto(entity)
    expect(dto.allergies).toEqual(['Pénicilline G', 'Sulfaméthoxazole'])
  })
})
