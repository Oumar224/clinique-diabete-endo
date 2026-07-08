import type { SoinItem } from '../../src/types/soins'

export interface BlocHoraireDto {
  heure: string
  soins: SoinItem[]
}

export interface PlanSoinsDto {
  id: number
  patientId: number
  date: string
  blocs: BlocHoraireDto[]
  createdBy: number
  createdAt: string
  updatedAt: string
}
