export interface AdmissionData {
  dateEntree: string
  serviceAccueil: string
  motifHospitalisation: string
  medecinTraitantNom: string
  interneIPANom: string
}

export interface AutonomieSL {
  alimentation: string
  hygiene: string
  habillage: string
  deplacement: string
  continence: string
}

export interface AllergieEntry {
  libelle: string
  type: 'Médicamenteuse' | 'Alimentaire' | 'Latex' | 'Piqûre' | 'Autre'
}

export interface AntecedentEntry {
  libelle: string
  annee: string
  type: 'Familiale' | 'Personnelle'
  categorie?: string
}

export interface ModeVieAtcdData {
  situationFamiliale: string
  isolement: boolean
  hebergement: string
  commentaireVie: string
  autonomieSL: AutonomieSL
  comprehensionFrancais: boolean
  tabagisme: string
  tabagismeDetail: string
  alcool: boolean
  alcoolDetail: string
  cannabis: boolean
  cannabisDetail: string
  allergies: AllergieEntry[]
  antecedents: AntecedentEntry[]
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
  cetonurie: string | null
  glucosurie: string | null
  cetonemie: number | null
  poids: number | null
  taille: number | null
  saO2?: number | null
  diurese?: number | null
}

export interface GlasgowHistoryEntry {
  _key: string
  date: string
  ouvertureYeux: number
  reponseVerbale: number
  reponseMotrice: number
}

export interface VitalSignsHistoryEntry {
  _key: string
  date: string
  taSystolique: number | null
  taDiastolique: number | null
  frequenceCardiaque: number | null
  temperature: number | null
  glycemie: number | null
  cetonurie: string | null
  glucosurie: string | null
  cetonemie: number | null
  poids: number | null
  taille: number | null
  hour?: number | null
  saO2?: number | null
  diurese?: number | null
}

export interface DouleurHistoryEntry {
  _key: string
  date: string
  score: number
}

export interface BilanInitialData {
  histoireRecent: string
  traitementEntree: string
  glasgow: GlasgowData
  examenPhysique: ExamenPhysique
  scoreDouleur: number | null
  examenPhysiqueTexte: string
  conclusionEntree: string
  projetSoin: string
  glasgowHistory: GlasgowHistoryEntry[]
  vitalSignsHistory: VitalSignsHistoryEntry[]
  douleurHistory: DouleurHistoryEntry[]
}

export interface ExamenImagerie {
  _key: string
  date: string
  type: string
  typeLibre: string
  resultat: string
}

export interface BilanBioResult {
  id?: number
  examRequestId?: number
  parameterId?: number
  examName?: string
  parameterName?: string
  parameterUnit?: string
  parameterInputType?: string
  parameterReferenceValues?: Record<string, unknown> | null
  value?: string
  isNormal?: boolean
  filledAt?: string
  createdAt?: string
  requestDate?: string
  requestStatus?: string
}

export interface BilanBio {
  dateFrom: string
  dateTo: string
  results: BilanBioResult[]
}

export interface ExamensComplementairesData {
  imagerieTests: ExamenImagerie[]
  bilanBio: BilanBio
}

export interface EvolutionAvisItem {
  _key: string
  date: string
  specialite: string
  motif: string
}

export interface EvolutionMedicaleData {
  journalEvolution: string
  avis?: EvolutionAvisItem[]
}

export interface RdvSuivi {
  _key: string
  date: string
  heure: string
  intitule: string
  lieuPraticien: string
}

export type PrescriptionSortieCategorie = 'medicament' | 'soins' | 'examen' | 'avis'

export interface PrescriptionSortie {
  _key: string
  categorie?: PrescriptionSortieCategorie
  medicament: string
  dosage: string
  unite: string
  voie: string
  duree: number
  dureeType?: 'courte' | 'longue'
  frequence: string[]
  frequenceType: string
  instructions: string
  formeGalenique: string
  momentPrises: string[]
  renouvellement: boolean
  nbRenouvellements: number
  examen?: string
  specialite?: string
  motif?: string
}

export interface SortieData {
  dateSortie: string
  destinationSortie: string
  infoPatientFamille: boolean
  produitsSanguins: boolean
  bmrBhre: boolean
  conclusionSortie: string
  rdvSuivi: RdvSuivi[]
}

export interface CrhChampMeta {
  updatedAt: string
}

export interface CrhFormMeta {
  champs: Record<string, CrhChampMeta>
}

export interface CrhDiabeteFormData {
  admission: AdmissionData
  modeVieAtcd: ModeVieAtcdData
  ficheDiabete: FicheDiabeteData
  bilanInitial: BilanInitialData
  examensComplementaires: ExamensComplementairesData
  evolutionMedicale: EvolutionMedicaleData
  ordonnanceSortie: PrescriptionSortie[]
  sortie: SortieData
  meta: CrhFormMeta
}

export function createDefaultFormData(): CrhDiabeteFormData {
  return {
    admission: {
      dateEntree: '',
      serviceAccueil: '',
      motifHospitalisation: '',
      medecinTraitantNom: '',
      interneIPANom: '',
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
        continence: 'Continence urinaire',
      },
      comprehensionFrancais: false,
      tabagisme: 'Non-fumeur',
      tabagismeDetail: '',
      alcool: false,
      alcoolDetail: '',
      cannabis: false,
      cannabisDetail: '',
      allergies: [],
      antecedents: [],
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
      histoireRecent: '',
      traitementEntree: '',
      glasgow: {
        ouvertureYeux: 4,
        reponseVerbale: 5,
        reponseMotrice: 6,
      },
      examenPhysique: {
        taSystolique: null,
        taDiastolique: null,
        frequenceCardiaque: null,
        temperature: null,
        glycemie: null,
        cetonurie: null,
        glucosurie: null,
        cetonemie: null,
        poids: null,
        taille: null,
        saO2: null,
        diurese: null,
      },
      scoreDouleur: null,
      examenPhysiqueTexte: '',
      conclusionEntree: '',
      projetSoin: '',
      glasgowHistory: [],
      vitalSignsHistory: [],
      douleurHistory: [],
    },
    examensComplementaires: {
      imagerieTests: [],
      bilanBio: { dateFrom: '', dateTo: '', results: [] },
    },
    evolutionMedicale: {
      journalEvolution: '',
      avis: [],
    },
    ordonnanceSortie: [],
    sortie: {
      dateSortie: '',
      destinationSortie: '',
      infoPatientFamille: false,
      produitsSanguins: false,
      bmrBhre: false,
      conclusionSortie: '',
      rdvSuivi: [],
    },
    meta: { champs: {} },
  }
}
