import type { EntityRegistration } from './utils/entity-types'

export class EntityRegistry {
  private static instance: EntityRegistry
  private registrations = new Map<string, EntityRegistration>()

  static getInstance(): EntityRegistry {
    if (!EntityRegistry.instance) {
      EntityRegistry.instance = new EntityRegistry()
    }
    return EntityRegistry.instance
  }

  register(config: EntityRegistration): void {
    this.registrations.set(config.type, config)
  }

  get(type: string): EntityRegistration | undefined {
    return this.registrations.get(type)
  }

  getAll(): EntityRegistration[] {
    return Array.from(this.registrations.values())
  }

  getAllTypes(): string[] {
    return Array.from(this.registrations.keys())
  }

  has(type: string): boolean {
    return this.registrations.has(type)
  }

  clear(): void {
    this.registrations.clear()
  }
}
