// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useContactFormLogic, CONTACT_TYPE_OPTIONS } from '../useContactFormLogic'

describe('useContactFormLogic', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T10:30:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('CONTACT_TYPE_OPTIONS', () => {
    it('contient exactement 2 options', () => {
      expect(CONTACT_TYPE_OPTIONS).toHaveLength(2)
    })

    it('contient consultation en premier', () => {
      expect(CONTACT_TYPE_OPTIONS[0]).toEqual({ value: 'consultation', label: 'Consultation' })
    })

    it('contient hospitalisation en second', () => {
      expect(CONTACT_TYPE_OPTIONS[1]).toEqual({ value: 'hospitalisation', label: 'Hospitalisation' })
    })
  })

  describe('showOriginPrecision', () => {
    it('retourne false pour chaîne vide', () => {
      const { form, showOriginPrecision } = useContactFormLogic()
      form.value.origin = ''
      expect(showOriginPrecision.value).toBe(false)
    })

    it('retourne true pour centre_sante', () => {
      const { form, showOriginPrecision } = useContactFormLogic()
      form.value.origin = 'centre_sante'
      expect(showOriginPrecision.value).toBe(true)
    })

    it('retourne true pour poste_sante', () => {
      const { form, showOriginPrecision } = useContactFormLogic()
      form.value.origin = 'poste_sante'
      expect(showOriginPrecision.value).toBe(true)
    })

    it('retourne true pour clinique_privee', () => {
      const { form, showOriginPrecision } = useContactFormLogic()
      form.value.origin = 'clinique_privee'
      expect(showOriginPrecision.value).toBe(true)
    })

    it('retourne true pour autre', () => {
      const { form, showOriginPrecision } = useContactFormLogic()
      form.value.origin = 'autre'
      expect(showOriginPrecision.value).toBe(true)
    })

    it('retourne false pour auto_refere', () => {
      const { form, showOriginPrecision } = useContactFormLogic()
      form.value.origin = 'auto_refere'
      expect(showOriginPrecision.value).toBe(false)
    })

    it('retourne false pour domicile', () => {
      const { form, showOriginPrecision } = useContactFormLogic()
      form.value.origin = 'domicile'
      expect(showOriginPrecision.value).toBe(false)
    })

    it('retourne false pour assurance', () => {
      const { form, showOriginPrecision } = useContactFormLogic()
      form.value.origin = 'assurance'
      expect(showOriginPrecision.value).toBe(false)
    })
  })

  describe('showAssuranceField', () => {
    it('retourne true pour "assurance"', () => {
      const { form, showAssuranceField } = useContactFormLogic()
      form.value.prise_en_charge = 'assurance'
      expect(showAssuranceField.value).toBe(true)
    })

    it('retourne false pour "individuel"', () => {
      const { form, showAssuranceField } = useContactFormLogic()
      form.value.prise_en_charge = 'individuel'
      expect(showAssuranceField.value).toBe(false)
    })

    it('retourne false pour chaîne vide', () => {
      const { form, showAssuranceField } = useContactFormLogic()
      form.value.prise_en_charge = ''
      expect(showAssuranceField.value).toBe(false)
    })
  })

  describe('resetForm', () => {
    it('réinitialise tous les champs aux valeurs par défaut', () => {
      const { form, resetForm } = useContactFormLogic()

      form.value.contact_type = 'urgence'
      form.value.end_date = '2025-06-20T14:30'
      form.value.origin = 'domicile'
      form.value.origin_precision = 'Centre de santé de Matam'
      form.value.zone_situation = 'hors_zone'
      form.value.zone_precision = 'Préfecture de Boké'
      form.value.prise_en_charge = 'assurance'
      form.value.prise_en_charge_precision = 'AT du 15/05'
      form.value.sinistre_info = 'AXA-2025-123'
      form.value.notes = 'Patient à suivre'
      form.value.service_id = 5
      form.value.service_name = 'Médecine Générale'
      form.value.medecin_id = 12
      form.value.medecin_name = 'Dr. Diallo'
      form.value.responsable_id = 8
      form.value.responsable_name = 'Dr. Sow'
      form.value.contact_category_id = 3
      form.value.assurance_id = 3
      form.value.care_unit_id = 5

      resetForm()

      expect(form.value.contact_type).toBe('')
      expect(form.value.origin).toBe('')
      expect(form.value.origin_precision).toBe('')
      expect(form.value.zone_situation).toBe('')
      expect(form.value.zone_precision).toBe('')
      expect(form.value.prise_en_charge).toBe('')
      expect(form.value.prise_en_charge_precision).toBe('')
      expect(form.value.sinistre_info).toBe('')
      expect(form.value.notes).toBe('')
      expect(form.value.service_id).toBeNull()
      expect(form.value.service_name).toBe('')
      expect(form.value.medecin_id).toBeNull()
      expect(form.value.medecin_name).toBe('')
      expect(form.value.assurance_id).toBeNull()
      expect(form.value.end_date).toBe('')
      expect(form.value.responsable_id).toBeNull()
      expect(form.value.responsable_name).toBe('')
      expect(form.value.contact_category_id).toBeNull()
      expect(form.value.care_unit_id).toBeNull()
    })
  })

  describe('endDateFormatted', () => {
    it('retourne la date de début + 24h formatée en français pour un contact de type consultation', () => {
      const { form, endDateFormatted } = useContactFormLogic()
      form.value.contact_type = 'consultation'
      form.value.start_date = '2025-06-15T10:30'
      expect(endDateFormatted.value).toContain('16/06/2025')
    })

    it('retourne la date de début + 24h formatée en français quand contact_type est vide', () => {
      const { form, endDateFormatted } = useContactFormLogic()
      form.value.start_date = '2025-06-15T10:30'
      expect(endDateFormatted.value).toContain('16/06/2025')
    })

    it('retourne la date de début + 24h pour hospitalisation sans end_date', () => {
      const { form, endDateFormatted } = useContactFormLogic()
      form.value.contact_type = 'hospitalisation'
      form.value.start_date = '2025-06-15T10:30'
      form.value.end_date = ''
      expect(endDateFormatted.value).toContain('16/06/2025')
    })

    it('retourne la date de fin explicite pour hospitalisation avec end_date', () => {
      const { form, endDateFormatted } = useContactFormLogic()
      form.value.contact_type = 'hospitalisation'
      form.value.start_date = '2025-06-15T10:30'
      form.value.end_date = '2025-06-20T14:30'
      expect(endDateFormatted.value).toContain('20/06/2025')
    })

    it('retourne une chaîne vide si start_date est vide', () => {
      const { form, endDateFormatted } = useContactFormLogic()
      form.value.start_date = ''
      expect(endDateFormatted.value).toBe('')
    })
  })

  describe('valeurs initiales du formulaire', () => {
    it('initialise le formulaire avec les valeurs par défaut', () => {
      const { form } = useContactFormLogic()
      expect(form.value.contact_type).toBe('')
      expect(form.value.origin).toBe('')
      expect(form.value.zone_situation).toBe('')
      expect(form.value.prise_en_charge).toBe('')
      expect(form.value.assurance_id).toBeNull()
      expect(form.value.start_date).toBe(new Date().toISOString().slice(0, 16))
      expect(form.value.end_date).toBe('')
      expect(form.value.responsable_id).toBeNull()
      expect(form.value.responsable_name).toBe('')
      expect(form.value.contact_category_id).toBeNull()
      expect(form.value.care_unit_id).toBeNull()
    })
  })
})
