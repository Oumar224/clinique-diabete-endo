export class UserSpecialtyEntity {
  user_id?: number
  specialty_id?: number

  static documentType(): string { return 'UserSpecialty' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
