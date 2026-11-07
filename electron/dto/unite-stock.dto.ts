/** Référentiel des unités de stock (pharmacie et laboratoire). */
export interface UniteStockDto {
  id?: number
  nom?: string
  ordre?: number
  createdAt?: string
}

export interface UniteStockCreateDto {
  nom?: string
}
