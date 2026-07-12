export class UserSiteEntity {
  user_id?: number
  site_id?: number

  static documentType(): string { return 'UserSite' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
