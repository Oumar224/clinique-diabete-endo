/**
 * Registry of form-data paths tracked for parameter history.
 *
 * Each entry maps a dot-separated formData path (e.g. `admission.dateEntree`)
 * to the label shown in the history popup and an optional display formatter.
 */

import { calcIMC } from '@/utils/medical-calculations'

export interface ParameterMeta {
  /** Label shown in the history dialog (e.g. "TA systolique (mmHg)"). */
  label: string
  /** Optional formatter used to render the stored value. */
  format?: (value: unknown) => string
  /** Optional extractor for values not stored verbatim (e.g. computed IMC). */
  extract?: (formData: Record<string, any>) => unknown
}

const booleanFormat = (value: unknown) => (value ? 'Oui' : 'Non')

const dateFormat = (value: unknown): string => {
  const s = String(value ?? '')
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const monthFormat = (value: unknown): string => {
  const s = String(value ?? '')
  if (!s) return '—'
  const [year, month] = s.split('-')
  if (!year || !month) return s
  return `${month}/${year}`
}

const imcExtract = (formData: Record<string, any>): unknown => {
  const ep = formData?.bilanInitial?.examenPhysique
  return calcIMC(ep?.poids ?? null, ep?.taille ?? null) ?? undefined
}

export const PARAMETER_META: Record<string, ParameterMeta> = {
  // Admission
  'admission.dateEntree': { label: "Date d'entrée", format: dateFormat },
  'admission.serviceAccueil': { label: "Service d'accueil" },
  'admission.motifHospitalisation': { label: "Motif d'hospitalisation" },
  'admission.medecinTraitantNom': { label: 'Médecin référent' },
  'admission.interneIPANom': { label: 'Responsable' },
  // Mode de vie / antécédents
  'modeVieAtcd.situationFamiliale': { label: 'Situation familiale' },
  'modeVieAtcd.isolement': { label: 'Isolement', format: booleanFormat },
  'modeVieAtcd.hebergement': { label: 'Hébergement / Logement' },
  'modeVieAtcd.commentaireVie': { label: 'Commentaire de mode de vie' },
  'modeVieAtcd.autonomieSL.alimentation': { label: 'Autonomie – Alimentation' },
  'modeVieAtcd.autonomieSL.hygiene': { label: 'Autonomie – Hygiène' },
  'modeVieAtcd.autonomieSL.habillage': { label: 'Autonomie – Habillage' },
  'modeVieAtcd.autonomieSL.deplacement': { label: 'Autonomie – Déplacement' },
  'modeVieAtcd.autonomieSL.continence': { label: 'Autonomie – Continence' },
  'modeVieAtcd.comprehensionFrancais': { label: 'Compréhension du français', format: booleanFormat },
  'modeVieAtcd.tabagisme': { label: 'Tabagisme' },
  'modeVieAtcd.tabagismeDetail': { label: 'Détail consommation tabac' },
  'modeVieAtcd.alcool': { label: 'Alcool', format: booleanFormat },
  'modeVieAtcd.alcoolDetail': { label: 'Détail consommation alcool' },
  'modeVieAtcd.cannabis': { label: 'Cannabis', format: booleanFormat },
  'modeVieAtcd.cannabisDetail': { label: 'Détail consommation cannabis' },
  // Fiche diabète
  'ficheDiabete.dateDiagnostic': { label: 'Date du diagnostic', format: monthFormat },
  'ficheDiabete.poidsForme': { label: 'Poids de forme (kg)' },
  'ficheDiabete.poidsJuillet2024': { label: 'Poids juillet 2024 (kg)' },
  'ficheDiabete.poidsDecembre2025': { label: 'Poids décembre 2025 (kg)' },
  'ficheDiabete.hba1c': { label: 'HbA1c (%)' },
  'ficheDiabete.hba1cDate': { label: "Date de l'examen", format: dateFormat },
  'ficheDiabete.hdl': { label: 'HDL (mmol/L)' },
  'ficheDiabete.ldl': { label: 'LDL (mmol/L)' },
  'ficheDiabete.triglycerides': { label: 'Triglycérides (mmol/L)' },
  'ficheDiabete.retinopathie': { label: 'Rétinopathie' },
  'ficheDiabete.creatininemie': { label: 'Créatininémie (µmol/L)' },
  'ficheDiabete.neuropathie': { label: 'Neuropathie symptomatique', format: booleanFormat },
  'ficheDiabete.podologiqueGrade': { label: 'Grade podologique' },
  'ficheDiabete.amputation': { label: 'Amputation', format: booleanFormat },
  'ficheDiabete.amputationDetail': { label: 'Détail amputation' },
  'ficheDiabete.insuffisanceCardiaque': { label: 'Insuffisance cardiaque', format: booleanFormat },
  'ficheDiabete.ntProBNP': { label: 'NT-proBNP (pg/mL)' },
  'ficheDiabete.aomi': { label: 'AOMI', format: booleanFormat },
  'ficheDiabete.ischemicCritique': { label: 'Ischémie critique' },
  // Bilan initial
  'bilanInitial.scoreDouleur': { label: 'Score de douleur (EVA)' },
  'bilanInitial.glasgow.ouvertureYeux': { label: 'Glasgow – Ouverture des yeux' },
  'bilanInitial.glasgow.reponseVerbale': { label: 'Glasgow – Réponse verbale' },
  'bilanInitial.glasgow.reponseMotrice': { label: 'Glasgow – Réponse motrice' },
  'bilanInitial.examenPhysique.taSystolique': { label: 'TA systolique (mmHg)' },
  'bilanInitial.examenPhysique.taDiastolique': { label: 'TA diastolique (mmHg)' },
  'bilanInitial.examenPhysique.frequenceCardiaque': { label: 'Fréquence cardiaque (bpm)' },
  'bilanInitial.examenPhysique.temperature': { label: 'Température (°C)' },
  'bilanInitial.examenPhysique.glycemie': { label: 'Glycémie (g/L)' },
  'bilanInitial.examenPhysique.cetonurie': { label: 'Cétominurie' },
  'bilanInitial.examenPhysique.glucosurie': { label: 'Glucosurie' },
  'bilanInitial.examenPhysique.cetonemie': { label: 'Cétonémie (mmol/L)' },
  'bilanInitial.examenPhysique.poids': { label: 'Poids (kg)' },
  'bilanInitial.examenPhysique.taille': { label: 'Taille (cm)' },
  'bilanInitial.examenPhysique.imc': { label: 'IMC (kg/m²)', extract: imcExtract },
  // Évolution
  'evolutionMedicale.infoPatientFamille': { label: 'Information du patient / famille', format: booleanFormat },
  'evolutionMedicale.produitsSanguins': { label: 'Administration de produits sanguins', format: booleanFormat },
  'evolutionMedicale.bmrBhre': { label: 'Porteur / Contact BMR ou BHRe', format: booleanFormat },
  // Sortie
  'sortie.dateSortie': { label: 'Date de sortie', format: dateFormat },
  'sortie.destinationSortie': { label: 'Destination de sortie' },
  'sortie.conclusionSortie': { label: 'Conclusion de sortie' },
}

export function getParameterMeta(path: string): ParameterMeta | undefined {
  return PARAMETER_META[path]
}

export function getFieldValue(obj: unknown, path: string): unknown {
  if (obj == null || typeof obj !== 'object') return undefined
  let current: unknown = obj
  for (const key of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

export function formatValue(path: string, value: unknown): string {
  if (value == null || value === '') return '—'
  const meta = getParameterMeta(path)
  if (meta?.format) return meta.format(value)
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  return String(value)
}
