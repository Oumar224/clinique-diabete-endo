export class AppSettingsEntity {
  key?: string
  value?: string

  static documentType(): string { return 'AppSettings' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
