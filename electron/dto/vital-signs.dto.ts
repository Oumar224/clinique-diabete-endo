export interface VitalSignsDto {
  id?: number
  patientId?: number
  date?: string
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
