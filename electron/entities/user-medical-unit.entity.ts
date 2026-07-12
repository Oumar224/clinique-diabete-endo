export class UserMedicalUnitEntity {
  user_id?: number
  medical_unit_id?: number

  static documentType(): string { return 'UserMedicalUnit' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
