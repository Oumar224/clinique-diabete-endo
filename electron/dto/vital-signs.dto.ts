export interface VitalSignsDto {
  id: number
  patientId: number
  date: string
  taSystolique: number | null
  taDiastolique: number | null
  frequenceCardiaque: number | null
  temperature: number | null
  glycemie: number | null
  cetonemie: number | null
  glucosurie: string | null
  cetonurie: string | null
  saO2: number | null
  diurese: number | null
  poids: number | null
  createdBy: number
  createdAt: string
  updatedAt: string
}
