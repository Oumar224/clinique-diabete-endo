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

export interface TabacHistoryEntry {
  _key: string
  date: string
  tabac: string
  tabacQuantite: number | null
  tabacUnite: string
  tabacDuree: string
  tabacDateDebut: string
  tabacCommentaire: string
}

export interface SubstanceHistoryEntry {
  _key: string
  date: string
  substance: string
  substancePrecision: string
  substanceQuantite: number | null
  substanceUnite: string
  substanceDuree: string
  substanceDateDebut: string
  substanceCommentaire: string
}

export interface MedicamentsHistoryEntry {
  _key: string
  date: string
  medicaments: string[]
  adoDateDebut: string
  adoCommentaire: string
  glp1DateDebut: string
  glp1Commentaire: string
  insulineType: string
  insulineDateDebut: string
  insulineCommentaire: string
  pompeType: string
  pompeDateDebut: string
  pompeCommentaire: string
}

export interface TraitementHabituelHistoryEntry {
  _key: string
  date: string
  traitementHabituel: string
}

export interface SurveillanceHistoryEntry {
  _key: string
  date: string
  surveillanceCapillaire: string
  surveillanceMCG: string
  surveillanceCommentaire: string
}

export interface FicheDiabeteData {
  dateDiagnostic: string
  typeDiabete: string
  typeDiabeteAutre: string
  circonstanceDecouverte: string
  anticorps: string
  typeAnticorps: string
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
  // ─── Facteurs de risque ───
  dyslipidemie: boolean
  hta: boolean
  sas: string
  tabac: string
  tabacQuantite: number | null
  tabacUnite: string
  tabacDuree: string
  tabacDateDebut: string
  tabacCommentaire: string
  tabacHistory: TabacHistoryEntry[]
  substance: string
  substancePrecision: string
  substanceQuantite: number | null
  substanceUnite: string
  substanceDuree: string
  substanceDateDebut: string
  substanceCommentaire: string
  substanceHistory: SubstanceHistoryEntry[]
  // ─── Traitement / Auto surveillance glycémique ───
  medicaments: string[]
  adoDateDebut: string
  adoCommentaire: string
  glp1DateDebut: string
  glp1Commentaire: string
  insulineType: string
  insulineDateDebut: string
  insulineCommentaire: string
  pompeType: string
  pompeDateDebut: string
  pompeCommentaire: string
  medicamentsHistory: MedicamentsHistoryEntry[]
  traitementHabituel: string
  traitementHabituelHistory: TraitementHabituelHistoryEntry[]
  surveillanceCapillaire: string
  surveillanceMCG: string
  surveillanceCommentaire: string
  surveillanceHistory: SurveillanceHistoryEntry[]
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
  /** TipTap HTML rich */
  motif: string
}

export interface EvolutionJournalEntry {
  _key: string
  /** TipTap HTML rich — the content of ONE journal line */
  content: string
  /** date as 'YYYY-MM-DD' */
  date: string
  /** time as 'HH:MM' */
  heure: string
  /** author display 'Prénom Nom' */
  user: string
}

export interface EvolutionMedicaleData {
  journalEvolution: EvolutionJournalEntry[]
  avis?: EvolutionAvisItem[]
  avisDateFrom?: string
  avisDateTo?: string
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
  /** Quantité totale en `unite` (base du décrément de stock pharmacie). */
  quantite?: number
  examen?: string
  /** Sous-type d'examen : imagerie (1 libellé) vs laboratoire (N libellés). Absent = legacy. */
  examenType?: 'imagerie' | 'laboratoire'
  /** Libellés multiples pour les demandes laboratoire (examen = join ', ' pour compat). */
  examens?: string[]
  specialite?: string
  motif?: string
  /** Nom affiché du prescripteur (alignement Demandes d'examens). Optionnel, aucune migration. */
  prescripteur?: string
  /** Date planifiée YYYY-MM-DD (alignement Demandes d'examens). Optionnel. */
  plannedDate?: string | null
  /** Heure planifiée (6,8,10,12,14,16,18,20,22). Optionnel. */
  plannedHour?: number | null
  /** Nombre de séances prévues pour le soin */
  nbSeances?: number
  /** Objectif clinique du soin (TipTap HTML rich) */
  objectifClinique?: string
  /** Consignes spécifiques du soin (TipTap HTML rich) */
  consignesSpecifiques?: string
  /** Dispositifs médicaux / voies d'abord — string joinée ', ' */
  dispositifsMedicaux?: string
  /** Professionnel cible du soin */
  professionnelCible?: string
}

export interface SortieData {
  dateSortie: string
  destinationSortie: string
  /** Précision libre pour les destinations "Transférée (à préciser)" / "Autre (à préciser)" */
  destinationPrecision?: string
  infoPatientFamille: boolean
  produitsSanguins: boolean
  bmrBhre: boolean
  conclusionSortie: string
  rdvSuivi: RdvSuivi[]
}

export interface CrcDiabeteFormData {
  admission: AdmissionData
  modeVieAtcd: ModeVieAtcdData
  ficheDiabete: FicheDiabeteData
  bilanInitial: BilanInitialData
  examensComplementaires: ExamensComplementairesData
  evolutionMedicale: EvolutionMedicaleData
  ordonnanceSortie: PrescriptionSortie[]
  sortie: SortieData
}

export function createDefaultFormData(): CrcDiabeteFormData {
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
      typeDiabete: '',
      typeDiabeteAutre: '',
      circonstanceDecouverte: '',
      anticorps: '',
      typeAnticorps: '',
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
      dyslipidemie: false,
      hta: false,
      sas: '',
      tabac: '',
      tabacQuantite: null,
      tabacUnite: '',
      tabacDuree: '',
      tabacDateDebut: '',
      tabacCommentaire: '',
      tabacHistory: [],
      substance: '',
      substancePrecision: '',
      substanceQuantite: null,
      substanceUnite: '',
      substanceDuree: '',
      substanceDateDebut: '',
      substanceCommentaire: '',
      substanceHistory: [],
      medicaments: [],
      adoDateDebut: '',
      adoCommentaire: '',
      glp1DateDebut: '',
      glp1Commentaire: '',
      insulineType: '',
      insulineDateDebut: '',
      insulineCommentaire: '',
      pompeType: '',
      pompeDateDebut: '',
      pompeCommentaire: '',
      medicamentsHistory: [],
      traitementHabituel: '',
      traitementHabituelHistory: [],
      surveillanceCapillaire: '',
      surveillanceMCG: '',
      surveillanceCommentaire: '',
      surveillanceHistory: [],
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
      journalEvolution: [],
      avis: [],
      avisDateFrom: '',
      avisDateTo: '',
    },
    ordonnanceSortie: [],
    sortie: {
      dateSortie: '',
      destinationSortie: '',
      destinationPrecision: '',
      infoPatientFamille: true,
      produitsSanguins: false,
      bmrBhre: false,
      conclusionSortie: '',
      rdvSuivi: [],
    },
  }
}
