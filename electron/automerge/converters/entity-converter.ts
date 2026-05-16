import type { AutomergeDocument } from '../utils/entity-types'

export class EntityConverter {
  static toDocument<T extends { id?: number }>(entity: T): AutomergeDocument<T> {
    const entityData = entity as Record<string, unknown>
    const doc: Record<string, unknown> = {
      automergeId: '',
      localId: entityData.id,
      lastModified: Date.now(),
      modifiedBy: 'local',
    }
    for (const [key, value] of Object.entries(entityData)) {
      if (key !== 'id' && typeof value !== 'function') {
        doc[key] = value
      }
    }
    return doc as AutomergeDocument<T>
  }

  static toEntity<T>(doc: AutomergeDocument<T>, EntityClass: new () => T): T {
    const entity = new EntityClass()
    const docData = doc as Record<string, unknown>
    for (const [key, value] of Object.entries(docData)) {
      if (!['automergeId', 'localId', 'lastModified', 'modifiedBy'].includes(key)) {
        ;(entity as Record<string, unknown>)[key] = value
      }
    }
    if (doc.localId) (entity as Record<string, unknown>).id = doc.localId
    return entity
  }
}
