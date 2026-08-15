export interface VitalSignsItemDto {
  id?: number
  patientId?: number
  date?: string
  hour?: number
  taSystolique?: number 
  taDiastolique?: number 
  frequenceCardiaque?: number 
  temperature?: number 
  glycemie?: number 
  cetonemie?: number 
  glucosurie?: string 
  cetonurie?: string 
  saO2?: number 
  diurese?: number 
  poids?: number 
  createdBy?: number
  createdAt?: string
  updatedAt?: string
}
