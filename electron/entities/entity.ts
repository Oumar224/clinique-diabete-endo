export interface Entity {
  name?: string
  documentType?: () => string
  documentSchema?: () => any
  register?: () => void
  dropSchema?: (db: any) => Promise<void>
  recreateSchema?: (db: any) => Promise<void>
}
