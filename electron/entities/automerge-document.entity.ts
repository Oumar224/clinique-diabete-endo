export class AutomergeDocumentEntity {
  document_id?: string
  data?: Uint8Array
  last_modified?: number

  static documentType(): string {
    return 'AutomergeDocument'
  }

  static documentSchema(): any {
    return {}
  }

  static register(): void {
    // Storage only - no registration needed in EntityRegistry
  }
}
