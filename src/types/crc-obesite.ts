import type {
  AdmissionData,
  AllergieEntry,
  AntecedentEntry,
  ExamensComplementairesData,
  PrescriptionSortie,
} from './crc-diabete'

export interface InformationsComplementairesData {
  profession: string
  residence: string
  villageNaissance: string
  sousPrefecture: string
  prefecture: string
  telephones: string
  mail: string
  personneConfiance: string
  lienParente: string
  telephoneConfiance: string
  typeContact: 'ancien' | 'nouveau' | 'premier' | ''
  premierContactMotif: 'diabete' | 'endocrino' | 'obesite' | ''
  mecanismeContact: Array<'patient' | 'clinique' | 'assurance' | 'internet' | 'autres'>
  mecanismeAutres: string
  medecinAccueil: string
}

export interface TentativePertePoids {
  _key: string
  methode: string
  resultatKg: number | null
}

export interface MotifProfilData {
  motifs: Array<'perte_poids' | 'bilan' | 'chirurgie'>
  prisePoidsMois: number | null
  prisePoidsAnnee: number | null
  poidsPlusBas: number | null
  poidsPlusHaut: number | null
  tentatives: TentativePertePoids[]
}

export interface AntecedentsObesiteData {
  medicaux: string[]
  medicauxAutres: string
  chirurgicaux: string
  traitements: string[]
  traitementsAutres: string
  familiaux: string[]
  familiauxAutres: string
  allergies: AllergieEntry[]
  antecedents: AntecedentEntry[]
  tabac: boolean
  alcool: boolean
  alcoolDetail: string
  addictionsAutres: string
}

export interface ParametresCliniquesObesite {
  glycemieJeun: number | null
  glycemiePostPrandiale: number | null
  cetonemie: number | null
  cetonurie: string
  glycosurie: string
  taSystolique: number | null
  taDiastolique: number | null
  frequenceCardiaque: number | null
  temperature: number | null
  saO2: number | null
  poids: number | null
  taille: number | null
  tourTaille: number | null
  tourHanche: number | null
}

export type VitalSignsObesiteEntry = ParametresCliniquesObesite & {
  _key: string
  date: string
}

export interface BilanInitialObesiteData {
  examenPhysique: ParametresCliniquesObesite
  vitalSignsHistory: VitalSignsObesiteEntry[]
}

export interface ApportLigne {
  _key: string
  repas: 'matin' | 'midi' | 'soir' | 'grignotage'
  aliment: string
  categorie: 'glucides' | 'lipides' | 'protides' | 'autres'
  quantite: number | null
  unite: string
  equivalentParGramme: number | null
  kcalManuel: number | null
  objectifKcal: number | null
}

export interface ApportsTableData {
  lignes: ApportLigne[]
  objectifJourKcal: number | null
}

export interface ComportementAlimentaireData {
  petitDejeuner: string
  dejeuner: string
  diner: string
  grignotage: string
  mangeVite: boolean
  satiate: boolean
  hyperphagie: boolean
  grignotageEmotionnel: boolean
  hyperphagieFrequenceSemaine: number | null
  boissons: string
  boissonsQuantite: string
  complementsNutritionnels: 'non' | 'oral' | 'parentéral' | ''
  complementsDetail: string
  apports: ApportsTableData
  activitePhysique: boolean
  activiteType: string
  activiteDureeMin: number | null
  activiteFrequence: number | null
  activiteFrequenceUnite: string
}

export interface PsySocialData {
  ressentiPoids: string
  consultations: Array<'psychologue' | 'nutritionniste' | 'autre'>
  consultationsAutres: string
  stressNiveau: number | null
  situationProfessionnelle: 'travail_poste' | 'sedentaire' | ''
  soutienMaison: string
  difficulteAchatFruitsLegumes: boolean
}

export interface ObjectifsPonderauxData {
  poidsCible: number | null
  tourTailleCible: number | null
  tourHancheCible: number | null
  delaiMois: number | null
  delaiAnnee: number | null
}

export interface ConclusionObesiteData {
  examenClinique: string
  typeConclusion: 'surpoids' | 'obesite' | ''
  imc: number | null
  origine: string
  terrain: string
  facteursAggravants: string
  commentaires: string
}

export interface NiveauTherapeutique {
  etapes: string[]
  commentaire: string
}

export interface ProjetTherapeutiqueData {
  niveau: 1 | 2 | 3 | null
  niveaux: Record<'1' | '2' | '3', NiveauTherapeutique>
}

export interface SuiviObesiteData {
  dateConsultation: string
  plaintes: string
  parametres: ParametresCliniquesObesite
  autres: string
  apports: ApportsTableData
  examenCliniqueJour: string
  conclusion: string
  controlePonderal: 'non_ameliore' | 'en_cours' | 'ameliore_stable' | 'reprise' | ''
  facteursFavorisants: 'non_identifie' | 'identifie' | ''
  facteursDetail: string
  rappelEducatif: string[]
  intensification: boolean
  intensificationDetail: string
  commentaires: string
}

export interface EvolutionPonderaleLigne {
  _key: string
  date: string
  poids: number | null
  imc: number | null
  tourTaille: number | null
  tourHanche: number | null
  commentaires: string
}

export interface EvolutionPonderaleData {
  lignes: EvolutionPonderaleLigne[]
}

export interface CrcObesiteFormData {
  admission: AdmissionData
  informationsComplementaires: InformationsComplementairesData
  motifProfil: MotifProfilData
  modeVieAtcd: AntecedentsObesiteData
  bilanInitial: BilanInitialObesiteData
  comportementAlimentaire: ComportementAlimentaireData
  psySocial: PsySocialData
  objectifsPonderaux: ObjectifsPonderauxData
  conclusion: ConclusionObesiteData
  projetTherapeutique: ProjetTherapeutiqueData
  suivi: SuiviObesiteData
  evolutionPonderale: EvolutionPonderaleData
  examensComplementaires: ExamensComplementairesData
  ordonnanceSortie: PrescriptionSortie[]
}

export function createDefaultFormData(): CrcObesiteFormData {
  return {
    admission: {
      dateEntree: '',
      serviceAccueil: '',
      motifHospitalisation: '',
      medecinTraitantNom: '',
      interneIPANom: '',
    },
    informationsComplementaires: {
      profession: '',
      residence: '',
      villageNaissance: '',
      sousPrefecture: '',
      prefecture: '',
      telephones: '',
      mail: '',
      personneConfiance: '',
      lienParente: '',
      telephoneConfiance: '',
      typeContact: '',
      premierContactMotif: '',
      mecanismeContact: [],
      mecanismeAutres: '',
      medecinAccueil: '',
    },
    motifProfil: {
      motifs: [],
      prisePoidsMois: null,
      prisePoidsAnnee: null,
      poidsPlusBas: null,
      poidsPlusHaut: null,
      tentatives: [],
    },
    modeVieAtcd: {
      medicaux: [],
      medicauxAutres: '',
      chirurgicaux: '',
      traitements: [],
      traitementsAutres: '',
      familiaux: [],
      familiauxAutres: '',
      allergies: [],
      antecedents: [],
      tabac: false,
      alcool: false,
      alcoolDetail: '',
      addictionsAutres: '',
    },
    bilanInitial: {
      examenPhysique: {
        glycemieJeun: null,
        glycemiePostPrandiale: null,
        cetonemie: null,
        cetonurie: '',
        glycosurie: '',
        taSystolique: null,
        taDiastolique: null,
        frequenceCardiaque: null,
        temperature: null,
        saO2: null,
        poids: null,
        taille: null,
        tourTaille: null,
        tourHanche: null,
      },
      vitalSignsHistory: [],
    },
    comportementAlimentaire: {
      petitDejeuner: '',
      dejeuner: '',
      diner: '',
      grignotage: '',
      mangeVite: false,
      satiate: false,
      hyperphagie: false,
      grignotageEmotionnel: false,
      hyperphagieFrequenceSemaine: null,
      boissons: '',
      boissonsQuantite: '',
      complementsNutritionnels: '',
      complementsDetail: '',
      apports: {
        lignes: [],
        objectifJourKcal: null,
      },
      activitePhysique: false,
      activiteType: '',
      activiteDureeMin: null,
      activiteFrequence: null,
      activiteFrequenceUnite: '',
    },
    psySocial: {
      ressentiPoids: '',
      consultations: [],
      consultationsAutres: '',
      stressNiveau: null,
      situationProfessionnelle: '',
      soutienMaison: '',
      difficulteAchatFruitsLegumes: false,
    },
    objectifsPonderaux: {
      poidsCible: null,
      tourTailleCible: null,
      tourHancheCible: null,
      delaiMois: null,
      delaiAnnee: null,
    },
    conclusion: {
      examenClinique: '',
      typeConclusion: '',
      imc: null,
      origine: '',
      terrain: '',
      facteursAggravants: '',
      commentaires: '',
    },
    projetTherapeutique: {
      niveau: null,
      niveaux: {
        '1': { etapes: [], commentaire: '' },
        '2': { etapes: [], commentaire: '' },
        '3': { etapes: [], commentaire: '' },
      },
    },
    suivi: {
      dateConsultation: '',
      plaintes: '',
      parametres: {
        glycemieJeun: null,
        glycemiePostPrandiale: null,
        cetonemie: null,
        cetonurie: '',
        glycosurie: '',
        taSystolique: null,
        taDiastolique: null,
        frequenceCardiaque: null,
        temperature: null,
        saO2: null,
        poids: null,
        taille: null,
        tourTaille: null,
        tourHanche: null,
      },
      autres: '',
      apports: {
        lignes: [],
        objectifJourKcal: null,
      },
      examenCliniqueJour: '',
      conclusion: '',
      controlePonderal: '',
      facteursFavorisants: '',
      facteursDetail: '',
      rappelEducatif: [],
      intensification: false,
      intensificationDetail: '',
      commentaires: '',
    },
    evolutionPonderale: {
      lignes: [],
    },
    examensComplementaires: {
      imagerieTests: [],
      bilanBio: { dateFrom: '', dateTo: '', results: [] },
    },
    ordonnanceSortie: [],
  }
}
