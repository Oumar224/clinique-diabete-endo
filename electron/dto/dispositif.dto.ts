export interface DispositifDto {
  id: number
  patientId: number
  type: string
  datePose: string
  aspect: string
  volumeMl: number | null
  createdBy: number
  createdAt: string
  updatedAt: string
}
