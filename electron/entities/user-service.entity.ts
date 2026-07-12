export class UserServiceEntity {
  user_id?: number
  service_id?: number

  static documentType(): string { return 'UserService' }
  static documentSchema(): any { return {} }
  static register(): void { /* No Automerge sync needed */ }
}
