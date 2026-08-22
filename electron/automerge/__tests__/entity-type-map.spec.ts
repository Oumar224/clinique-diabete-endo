import "reflect-metadata"
import { describe, it, expect } from "vitest"
import { ENTITY_TYPE_MAP, getEntityTypeForTable } from "../entity-type-map"

describe("entity-type-map", () => {
  describe("ENTITY_TYPE_MAP", () => {
    it("should contain all expected entity type keys", () => {
      const expectedKeys = [
        "patient", "user", "appointment", "invoice", "invoice_item",
        "invoice_payment", "session", "app_settings", "currency", "service",
        "medical_act", "act_price_history", "medical_unit", "site", "specialty",
        "email_config", "fonction", "localite", "conservateur_stockage",
        "conservateur_champ_localisation", "user_specialty", "user_site",
        "user_service", "user_medical_unit", "user_favorite_service",
        "attachment_type", "patient_attachment", "user_attachment", "form_draft",
        "trusted_person", "vital_sign", "vital_signs_item", "plan_soins",
        "plan_soins_item", "prescription", "dispositif", "contact_origin",
        "insurance", "voie_type", "dispositif_type",
        "encounter", "encounter_movement", "stay", "stay_movement",
        "config_tarif", "patient_acte", "care_unit", "clinical_document_type",
        "clinical_document", "clinical_document_signature", "exam_category",
        "exam_type", "exam_request", "document_attachment", "exam_request_attachment",
      ]
      expect(Object.keys(ENTITY_TYPE_MAP)).toHaveLength(expectedKeys.length)
      for (const key of expectedKeys) {
        expect(ENTITY_TYPE_MAP).toHaveProperty(key)
      }
    })

    it("each entry should have type, tableName, documentSchema, and converter", () => {
      for (const [key, registration] of Object.entries(ENTITY_TYPE_MAP)) {
        expect(registration).toHaveProperty("type")
        expect(registration).toHaveProperty("tableName")
        expect(registration).toHaveProperty("documentSchema")
        expect(registration).toHaveProperty("converter")
        expect(typeof registration.type).toBe("string")
        expect(typeof registration.tableName).toBe("string")
        expect(typeof registration.converter.toDocument).toBe("function")
        expect(typeof registration.converter.toEntity).toBe("function")
      }
    })

    it("each entry's type should match its key in the map", () => {
      for (const [key, registration] of Object.entries(ENTITY_TYPE_MAP)) {
        expect(registration.type).toBe(key)
      }
    })

    it("should have patient registration with correct table name", () => {
      const patient = ENTITY_TYPE_MAP["patient"]
      expect(patient.type).toBe("patient")
      expect(patient.tableName).toBe("patient")
    })

    it("should have service registration with pluralized table name", () => {
      const service = ENTITY_TYPE_MAP["service"]
      expect(service.type).toBe("service")
      expect(service.tableName).toBe("services")
    })

    it("should have clinical_document registration with custom table name", () => {
      const clinicalDoc = ENTITY_TYPE_MAP["clinical_document"]
      expect(clinicalDoc.type).toBe("clinical_document")
      expect(clinicalDoc.tableName).toBe("patient_clinical_documents")
    })
  })

  describe("getEntityTypeForTable", () => {
    it("should return the entity type for a known table name", () => {
      expect(getEntityTypeForTable("patient")).toBe("patient")
      expect(getEntityTypeForTable("services")).toBe("service")
      expect(getEntityTypeForTable("medical_acts")).toBe("medical_act")
      expect(getEntityTypeForTable("patient_clinical_documents")).toBe("clinical_document")
    })

    it("should return undefined for an unknown table name", () => {
      expect(getEntityTypeForTable("nonexistent_table")).toBeUndefined()
    })

    it("should return undefined for an empty string", () => {
      expect(getEntityTypeForTable("")).toBeUndefined()
    })
  })
})
