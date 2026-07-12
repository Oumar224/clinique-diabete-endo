export interface ClinicalDocumentSignatureDTO {
  id: string
  documentId: string
  userId: string
  signatureHash: string
  signedAt: string
}

export class ClinicalDocumentSignatureEntity {
  id?: string
  document_id?: string
  user_id?: string
  signature_hash?: string
  signed_at?: string

  static toDto(entity: ClinicalDocumentSignatureEntity): ClinicalDocumentSignatureDTO {
    return {
      id: entity.id!,
      documentId: entity.document_id!,
      userId: entity.user_id!,
      signatureHash: entity.signature_hash!,
      signedAt: entity.signed_at!,
    }
  }

  static toDtos(entities: ClinicalDocumentSignatureEntity[]): ClinicalDocumentSignatureDTO[] {
    return entities.map(ClinicalDocumentSignatureEntity.toDto)
  }

  static fromDto(dto: ClinicalDocumentSignatureDTO): ClinicalDocumentSignatureEntity {
    const e = new ClinicalDocumentSignatureEntity()
    e.id = dto.id
    e.document_id = dto.documentId
    e.user_id = dto.userId
    e.signature_hash = dto.signatureHash
    e.signed_at = dto.signedAt
    return e
  }

  static documentType(): string {
    return 'ClinicalDocumentSignature'
  }

  static documentSchema(): unknown {
    return {}
  }

  static register(): void {
    /* No Automerge sync needed */
  }
}
