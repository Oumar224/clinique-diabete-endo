import type {
  AdmissionData,
  ExamensComplementairesData,
  PrescriptionSortie,
} from './crc-diabete'
import type { InformationsComplementairesData } from './crc-obesite'

export type TypeConsultationGesta = 'initiale' | 'suivi' | 'post_partum' | ''
export type ModeDiagnosticGesta = 'gaj' | 'pp' | 'hgpo75'
export type DiagnosticRetenuGesta =
  | 'diabete_grossesse'
  | 'diabete_gestationnel'
  | 'suspicion_manifeste'
  | ''
export type TendanceGlycemique = 'normal' | 'hypo' | 'hyper' | ''
export type TrimestreEcho = 'T1' | 'T2' | 'T3' | ''
export type TraitementGesta = 'mhd' | 'insuline' | 'ado' | 'autre'
export type DecisionTherapeutiqueGesta =
  | 'maintien'
  | 'adaptation'
  | 'introduction_insuline'
  | 'renforcement_mhd'
  | 'autre'
  | ''
export type SuiviPrevuGesta = 'diabetologie' | 'obstetrique' | 'dietetique' | 'autre'
export type FacteurRisqueGesta =
  | 'age35'
  | 'surpoids_obesite'
  | 'atcd_dg'
  | 'atcd_macrosomie'
  | 'diabete_familial_1er'
  | 'autre'
export type VarianteProtocoleInsuline = 'insulatard' | 'lente' | ''
export type EquilibreGesta = 'satisfaisant' | 'insuffisant' | ''

export interface ParametresPregestationnels {
  gestite: number | null
  parite: number | null
  cesarienne: number | null
  fausseCouche: number | null
  ddr: string
  dpa: string
  poidsPregestationnel: number | null
}

export interface ParametresJourGesta {
  termeSa: number | null
  termeJours: number | null
  poids: number | null
  taille: number | null
  taSystolique: number | null
  taDiastolique: number | null
  frequenceCardiaque: number | null
  saO2: number | null
}

export type VitalSignsGestaEntry = ParametresJourGesta & { _key: string; date: string }

export interface BilanInitialGestaData {
  examenPhysique: ParametresJourGesta
  vitalSignsHistory: VitalSignsGestaEntry[]
}

export interface DonneesMaternellesGestaData {
  pregestationnels: ParametresPregestationnels
  facteursRisque: FacteurRisqueGesta[]
  facteursRisqueAutres: string
}

export interface MotifConsultationGestaData {
  typeConsultation: TypeConsultationGesta
  plaintes: string
}

export interface DiagnosticDiabeteGestaData {
  dateDiagnostic: string
  termeSaDiagnostic: number | null
  termeJoursDiagnostic: number | null
  modeDiagnostic: ModeDiagnosticGesta[]
  glycemieJeun: number | null
  glycemiePost1h: number | null
  glycemiePost2h: number | null
  diagnosticRetenu: DiagnosticRetenuGesta
}

export interface LigneEquilibreGesta {
  resultat: number | null
  tendance: TendanceGlycemique
}

export interface EquilibreGlycemiqueGestaData {
  autosurveillance: boolean
  lignes: { gaj: LigneEquilibreGesta; pp1h: LigneEquilibreGesta; pp2h: LigneEquilibreGesta }
  hypoglycemies: boolean
  hyperglycemies: boolean
  hba1c: number | null
  equilibre: EquilibreGesta
  observance: string
}

export interface EchoObstetricaleGestaData {
  trimestre: TrimestreEcho
  conclusion: string
}

export interface ComplicationsGestaData {
  aucun: boolean
  signes: Array<'hta_preeclampsie' | 'autre'>
  autreDetail: string
}

export interface LigneInsulineGesta {
  _key: string
  insuline: string
  dose: number | null
  horaire: string
}

export interface ProtocoleInsulineGestaData {
  variante: VarianteProtocoleInsuline
  insulatardMatin: number | null
  insulatardSoir: number | null
  lenteSoir: number | null
  dateRemise: string
  commentaires: string
}

export interface PriseEnChargeGestaData {
  traitements: TraitementGesta[]
  autreDetail: string
  insulines: LigneInsulineGesta[]
  protocole: ProtocoleInsulineGestaData
}

export interface ConclusionGestaData {
  syntheseClinique: string
  decision: DecisionTherapeutiqueGesta
  decisionAutre: string
  conseilsNutritionnels: boolean
  activitePhysique: boolean
  educationAutosurveillance: boolean
  commentaires: string
  prochainControle: string
  suiviPrevu: SuiviPrevuGesta[]
  suiviPrevuAutre: string
}

export interface CrcGestaFormData {
  admission: AdmissionData
  informationsComplementaires: InformationsComplementairesData
  motifConsultation: MotifConsultationGestaData
  donneesMaternelles: DonneesMaternellesGestaData
  bilanInitial: BilanInitialGestaData
  diagnosticDiabete: DiagnosticDiabeteGestaData
  equilibreGlycemique: EquilibreGlycemiqueGestaData
  echoObstetricale: EchoObstetricaleGestaData
  complications: ComplicationsGestaData
  priseEnCharge: PriseEnChargeGestaData
  examenCliniqueTexte: string
  conclusion: ConclusionGestaData
  examensComplementaires: ExamensComplementairesData
  ordonnanceSortie: PrescriptionSortie[]
}

// ─── Libellés lisibles (UI / PDF) ───────────────────────────────────────────

export const TYPE_CONSULTATION_LABELS: Record<'initiale' | 'suivi' | 'post_partum', string> = {
  initiale: 'Initiale',
  suivi: 'Suivi',
  post_partum: 'Post-partum',
}

export const MODE_DIAGNOSTIC_LABELS: Record<ModeDiagnosticGesta, string> = {
  gaj: 'Glycémie à jeun',
  pp: 'Glycémie en post-prandial',
  hgpo75: 'HGPO 75 g',
}

export const DIAGNOSTIC_RETENU_LABELS: Record<
  'diabete_grossesse' | 'diabete_gestationnel' | 'suspicion_manifeste',
  string
> = {
  diabete_grossesse: 'Diabète et grossesse',
  diabete_gestationnel: 'Diabète gestationnel',
  suspicion_manifeste: 'Suspicion de diabète manifeste découvert pendant la grossesse',
}

export const TENDANCE_LABELS: Record<'normal' | 'hypo' | 'hyper', string> = {
  normal: 'Normal',
  hypo: 'Hypoglycémie',
  hyper: 'Hyperglycémie',
}

export const TRIMESTRE_LABELS: Record<'T1' | 'T2' | 'T3', string> = {
  T1: 'T1',
  T2: 'T2',
  T3: 'T3',
}

export const TRAITEMENT_LABELS: Record<TraitementGesta, string> = {
  mhd: 'Mesures hygiéno-diététiques seules',
  insuline: 'Insulinothérapie',
  ado: 'Antidiabétiques oraux',
  autre: 'Autre',
}

export const DECISION_LABELS: Record<
  'maintien' | 'adaptation' | 'introduction_insuline' | 'renforcement_mhd' | 'autre',
  string
> = {
  maintien: 'Maintien du traitement',
  adaptation: 'Adaptation des doses',
  introduction_insuline: "Introduction de l'insuline",
  renforcement_mhd: 'Renforcement des mesures hygiéno-diététiques',
  autre: 'Autre',
}

export const SUIVI_LABELS: Record<SuiviPrevuGesta, string> = {
  diabetologie: 'Diabétologie',
  obstetrique: 'Obstétrique',
  dietetique: 'Diététique',
  autre: 'Autre',
}

export const FACTEUR_RISQUE_LABELS: Record<FacteurRisqueGesta, string> = {
  age35: 'Âge ≥ 35 ans',
  surpoids_obesite: 'Surpoids/obésité',
  atcd_dg: 'Antécédent de diabète gestationnel',
  atcd_macrosomie: 'Antécédent de macrosomie',
  diabete_familial_1er: 'Diabète familial au premier degré',
  autre: 'Autres',
}

export function createDefaultFormData(): CrcGestaFormData {
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
    motifConsultation: {
      typeConsultation: '',
      plaintes: '',
    },
    donneesMaternelles: {
      pregestationnels: {
        gestite: null,
        parite: null,
        cesarienne: null,
        fausseCouche: null,
        ddr: '',
        dpa: '',
        poidsPregestationnel: null,
      },
      facteursRisque: [],
      facteursRisqueAutres: '',
    },
    bilanInitial: {
      examenPhysique: {
        termeSa: null,
        termeJours: null,
        poids: null,
        taille: null,
        taSystolique: null,
        taDiastolique: null,
        frequenceCardiaque: null,
        saO2: null,
      },
      vitalSignsHistory: [],
    },
    diagnosticDiabete: {
      dateDiagnostic: '',
      termeSaDiagnostic: null,
      termeJoursDiagnostic: null,
      modeDiagnostic: [],
      glycemieJeun: null,
      glycemiePost1h: null,
      glycemiePost2h: null,
      diagnosticRetenu: '',
    },
    equilibreGlycemique: {
      autosurveillance: false,
      lignes: {
        gaj: { resultat: null, tendance: '' },
        pp1h: { resultat: null, tendance: '' },
        pp2h: { resultat: null, tendance: '' },
      },
      hypoglycemies: false,
      hyperglycemies: false,
      hba1c: null,
      equilibre: '',
      observance: '',
    },
    echoObstetricale: {
      trimestre: '',
      conclusion: '',
    },
    complications: {
      aucun: false,
      signes: [],
      autreDetail: '',
    },
    priseEnCharge: {
      traitements: [],
      autreDetail: '',
      insulines: [],
      protocole: {
        variante: '',
        insulatardMatin: null,
        insulatardSoir: null,
        lenteSoir: null,
        dateRemise: '',
        commentaires: '',
      },
    },
    examenCliniqueTexte: '',
    conclusion: {
      syntheseClinique: '',
      decision: '',
      decisionAutre: '',
      conseilsNutritionnels: false,
      activitePhysique: false,
      educationAutosurveillance: false,
      commentaires: '',
      prochainControle: '',
      suiviPrevu: [],
      suiviPrevuAutre: '',
    },
    examensComplementaires: {
      imagerieTests: [],
      bilanBio: { dateFrom: '', dateTo: '', results: [] },
    },
    ordonnanceSortie: [],
  }
}
