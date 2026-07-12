export interface AdmissionData {
  nom: string
  prenom: string
  sexe: string
  dateNaissance: string
  ipp: string
  dateEntree: string
  serviceAccueil: string
}

export interface AutonomieSL {
  alimentation: string
  hygiene: string
  habillage: string
  deplacement: string
  continence: string
}

export interface ModeVieAtcdData {
  situationFamiliale: string
  isolement: boolean
  hebergement: string
  commentaireVie: string
  autonomieSL: AutonomieSL
  comprehensionFrancais: boolean
  priseEnCharge: string
  tabagisme: string
  alcool: boolean
  alcoolDetail: string
  cannabis: boolean
  cannabisDetail: string
  allergies: string
  antecedentsMedicaux: string
}

export interface FicheDiabeteData {
  dateDiagnostic: string
  poidsForme: number | null
  poidsJuillet2024: number | null
  poidsDecembre2025: number | null
  hba1c: number | null
  hba1cDate: string
  hdl: number | null
  ldl: number | null
  triglycerides: number | null
  retinopathie: string
  creatininemie: number | null
  neuropathie: boolean
  podologiqueGrade: number | null
  amputation: boolean
  amputationDetail: string
  insuffisanceCardiaque: boolean
  ntProBNP: number | null
  aomi: boolean
  ischemicCritique: string
}

export interface GlasgowData {
  ouvertureYeux: number
  reponseVerbale: number
  reponseMotrice: number
}

export interface ExamenPhysique {
  taSystolique: number | null
  taDiastolique: number | null
  frequenceCardiaque: number | null
  temperature: number | null
  glycemie: number | null
  descriptionPlaie: string
}

export interface BilanInitialData {
  motifHospitalisation: string
  histoireRecent: string
  glasgow: GlasgowData
  examenPhysique: ExamenPhysique
  conclusionEntree: string
}

export interface ActeInterventionnel {
  _key: string
  date: string
  type: string
  operateur: string
  compteRendu: string
  conclusion: string
}

export interface EchographieCardiaque {
  fevg: number | null
  hypokinesie: string
  autre: string
}

export interface ExamensComplementairesData {
  radioPied: string
  ecgRepos: string
  echographieCardiaque: EchographieCardiaque
  actesInterventionnels: ActeInterventionnel[]
}

export interface EvolutionMedicaleData {
  infoPatientFamille: boolean
  produitsSanguins: boolean
  bmrBhre: boolean
  journalEvolution: string
}

export interface RdvSuivi {
  _key: string
  date: string
  heure: string
  intitule: string
  lieuPraticien: string
}

export interface SortieData {
  dateSortie: string
  destinationSortie: string
  conclusionSortie: string
  rdvSuivi: RdvSuivi[]
}

export interface CrhDiabeteFormData {
  admission: AdmissionData
  modeVieAtcd: ModeVieAtcdData
  ficheDiabete: FicheDiabeteData
  bilanInitial: BilanInitialData
  examensComplementaires: ExamensComplementairesData
  evolutionMedicale: EvolutionMedicaleData
  sortie: SortieData
}

export function createDefaultFormData(): CrhDiabeteFormData {
  return {
    admission: {
      nom: '',
      prenom: '',
      sexe: '',
      dateNaissance: '',
      ipp: '',
      dateEntree: '',
      serviceAccueil: '',
    },
    modeVieAtcd: {
      situationFamiliale: '',
      isolement: false,
      hebergement: '',
      commentaireVie: '',
      autonomieSL: {
        alimentation: 'Autonome',
        hygiene: 'Autonome',
        habillage: 'Autonome',
        deplacement: 'Autonome',
        continence: 'Continue',
      },
      comprehensionFrancais: false,
      priseEnCharge: '',
      tabagisme: 'Non-fumeur',
      alcool: false,
      alcoolDetail: '',
      cannabis: false,
      cannabisDetail: '',
      allergies: '',
      antecedentsMedicaux: '',
    },
    ficheDiabete: {
      dateDiagnostic: '',
      poidsForme: null,
      poidsJuillet2024: null,
      poidsDecembre2025: null,
      hba1c: null,
      hba1cDate: '',
      hdl: null,
      ldl: null,
      triglycerides: null,
      retinopathie: 'Absente',
      creatininemie: null,
      neuropathie: false,
      podologiqueGrade: null,
      amputation: false,
      amputationDetail: '',
      insuffisanceCardiaque: false,
      ntProBNP: null,
      aomi: false,
      ischemicCritique: '',
    },
    bilanInitial: {
      motifHospitalisation: '',
      histoireRecent: '',
      glasgow: {
        ouvertureYeux: 0,
        reponseVerbale: 0,
        reponseMotrice: 0,
      },
      examenPhysique: {
        taSystolique: null,
        taDiastolique: null,
        frequenceCardiaque: null,
        temperature: null,
        glycemie: null,
        descriptionPlaie: '',
      },
      conclusionEntree: '',
    },
    examensComplementaires: {
      radioPied: '',
      ecgRepos: '',
      echographieCardiaque: {
        fevg: null,
        hypokinesie: '',
        autre: '',
      },
      actesInterventionnels: [],
    },
    evolutionMedicale: {
      infoPatientFamille: false,
      produitsSanguins: false,
      bmrBhre: false,
      journalEvolution: '',
    },
    sortie: {
      dateSortie: '',
      destinationSortie: '',
      conclusionSortie: '',
      rdvSuivi: [],
    },
  }
}
