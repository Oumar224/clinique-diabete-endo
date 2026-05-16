type ExcludeMethods<T> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K]
}

export type AutomergeDocument<T> = ExcludeMethods<T> & {
  automergeId: string
  localId?: number
  lastModified: number
  modifiedBy: string
}

export interface EntityRegistration {
  type: string
  tableName: string
  documentSchema: Record<string, unknown>
  converter: { toDocument: (entity: any) => any; toEntity: (doc: any) => any }
}

export type ChangeCallback = (id: string, entityType: string, changes: unknown) => void
