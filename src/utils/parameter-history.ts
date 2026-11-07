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
  /**
   * Optional extractor for values not stored verbatim.
   * May return a scalar (single value) or an array of `{ date, value }`
   * objects representing a time-series of archived measurements.
   */
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

/**
 * Creates an extractor that reads a historical collection array and maps
 * each record to `{ date, value }` for the given field. Records without a
 * date or with a null / empty-string value are skipped.
 *
 * `collectionPath` accepts either a legacy short name resolved under
 * `formData.bilanInitial` (e.g. `vitalSignsHistory`, `glasgowHistory`,
 * `douleurHistory`) or a dotted path resolved from the form root
 * (e.g. `ficheDiabete.tabacHistory`, `ficheDiabete.substanceHistory`).
 */
function seriesExtract(
  collectionPath: string,
  field: string,
): (formData: Record<string, any>) => Array<{ date: string; value: unknown }> {
  return (formData: Record<string, any>) => {
    const collection: any[] | undefined = collectionPath.includes('.')
      ? (getFieldValue(formData, collectionPath) as any[] | undefined)
      : formData?.bilanInitial?.[collectionPath]
    if (!Array.isArray(collection)) return []
    return collection
      .filter((r) => r?.date != null && r[field] != null && r[field] !== '')
      .map((r) => ({ date: String(r.date), value: r[field] }))
  }
}

/**
 * Creates an extractor that computes IMC from `vitalSignsHistory` records.
 * Each record with both `poids` and `taille` (non-null) produces a
 * `{ date, value }` entry. Records where IMC is null/NaN are skipped.
 */
function imcSeriesExtract(): (formData: Record<string, any>) => Array<{ date: string; value: unknown }> {
  return (formData: Record<string, any>) => {
    const collection: any[] | undefined = formData?.bilanInitial?.vitalSignsHistory
    if (!Array.isArray(collection)) return []
    const result: Array<{ date: string; value: unknown }> = []
    for (const r of collection) {
      if (r?.date == null || r.poids == null || r.taille == null) continue
      const imc = calcIMC(r.poids, r.taille)
      if (imc != null && !Number.isNaN(imc)) {
        result.push({ date: String(r.date), value: imc })
      }
    }
    return result
  }
}

/**
 * Creates an extractor that computes ratio TT/TH from `vitalSignsHistory`
 * records. Each record with both `tourTaille` and `tourHanche` (non-null)
 * produces a `{ date, value }` entry rounded to 2 decimals. Records where
 * the ratio is null/NaN are skipped. Never reads a stored ratio value.
 */
function ratioTTTHSeriesExtract(): (formData: Record<string, any>) => Array<{ date: string; value: unknown }> {
  return (formData: Record<string, any>) => {
    const collection: any[] | undefined = formData?.bilanInitial?.vitalSignsHistory
    if (!Array.isArray(collection)) return []
    const result: Array<{ date: string; value: unknown }> = []
    for (const r of collection) {
      if (r?.date == null || r.tourTaille == null || r.tourHanche == null) continue
      const th = Number(r.tourHanche)
      const tt = Number(r.tourTaille)
      if (Number.isNaN(tt) || Number.isNaN(th) || th <= 0) continue
      const ratio = Math.round((tt / th) * 100) / 100
      if (ratio != null && !Number.isNaN(ratio)) {
        result.push({ date: String(r.date), value: ratio })
      }
    }
    return result
  }
}

/**
 * Creates an extractor that computes Glasgow total score from
 * `glasgowHistory` records. Same rule as `calcGlasgowScore` in
 * `useCrhDiabeteCalculations.ts`: missing component (0 / null /
 * undefined) falls back to its maximum (oy||4 + rv||5 + rm||6).
 * Records without a date are skipped.
 */
function glasgowScoreSeriesExtract(): (formData: Record<string, any>) => Array<{ date: string; value: unknown }> {
  return (formData: Record<string, any>) => {
    const collection: any[] | undefined = formData?.bilanInitial?.glasgowHistory
    if (!Array.isArray(collection)) return []
    const result: Array<{ date: string; value: unknown }> = []
    for (const r of collection) {
      if (r?.date == null || r.date === '') continue
      const oy = r.ouvertureYeux || 4
      const rv = r.reponseVerbale || 5
      const rm = r.reponseMotrice || 6
      result.push({ date: String(r.date), value: oy + rv + rm })
    }
    return result
  }
}

/**
 * Parses a `YYYY-MM` month string into `{ y, m }`. Returns null when
 * the string is missing or malformed. Accepts a longer ISO date by
 * reading its leading `YYYY-MM` prefix.
 */
function parseYearMonth(value: unknown): { y: number; m: number } | null {
  if (value == null || value === '') return null
  const parts = String(value).split('-')
  if (parts.length < 2) return null
  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) return null
  return { y, m }
}

/**
 * Computes pack-years for ONE `tabacHistory` record, mirroring
 * `facteursPAOf` in `FicheDiabeteTab.vue` but with the measurement date
 * of the record (`entry.date`) as the exposure reference instead of the
 * admission date. Returns the rounded numeric value, or null when the
 * exposure is incomplete (not 'Oui', missing quantity / unit / rythme /
 * début, zero duration, unknown unit, future start).
 */
function calcPAForEntry(entry: Record<string, any>): number | null {
  if (entry?.tabac !== 'Oui') return null
  const q = entry?.tabacQuantite
  if (q == null || q === '' || Number(q) <= 0) return null
  const qty = Number(q)
  if (!Number.isFinite(qty) || qty <= 0) return null
  let qteJour: number | null = null
  if (entry.tabacDuree === 'j') qteJour = qty
  else if (entry.tabacDuree === 'semaine') qteJour = qty / 7
  else if (entry.tabacDuree === 'mois') qteJour = qty / 30
  if (qteJour == null) return null
  const start = parseYearMonth(entry.tabacDateDebut)
  if (!start) return null
  const refDate = entry?.date ? new Date(String(entry.date)) : new Date()
  if (isNaN(refDate.getTime())) return null
  let years = refDate.getFullYear() - start.y
  // `getMonth()` is 0-based; start.m is 1-based.
  let months = refDate.getMonth() + 1 - start.m
  if (months < 0) {
    years--
    months += 12
  }
  if (years < 0) return null
  const annees = years + months / 12
  if (annees <= 0) return null
  let pa: number | null = null
  if (entry.tabacUnite === 'cigarette') pa = (qteJour / 20) * annees
  else if (entry.tabacUnite === 'paquet') pa = qteJour * annees
  if (pa == null || !Number.isFinite(pa)) return null
  return Math.round(pa * 10) / 10
}

/**
 * Creates an extractor that computes PA (paquets-année) for each
 * `ficheDiabete.tabacHistory` record via {@link calcPAForEntry}.
 * Records without a date or with an incomplete exposure are skipped.
 */
function paSeriesExtract(): (formData: Record<string, any>) => Array<{ date: string; value: unknown }> {
  return (formData: Record<string, any>) => {
    const collection = getFieldValue(formData, 'ficheDiabete.tabacHistory') as any[] | undefined
    if (!Array.isArray(collection)) return []
    const result: Array<{ date: string; value: unknown }> = []
    for (const r of collection) {
      if (r?.date == null || r.date === '') continue
      const pa = calcPAForEntry(r)
      if (pa != null) result.push({ date: String(r.date), value: pa })
    }
    return result
  }
}

const paFormat = (value: unknown): string => {
  if (value == null || value === '') return '—'
  return `${value} PA`
}

/**
 * Creates an extractor for `ficheDiabete.medicamentsHistory[].medicaments`.
 * Unlike {@link seriesExtract}, the stored field is `string[]` : each record
 * is mapped to `{ date, value }` with `value` = joined list (`', '`).
 * Records without a date or with an empty / missing list are skipped.
 */
function medicamentsSeriesExtract(): (formData: Record<string, any>) => Array<{ date: string; value: unknown }> {
  return (formData: Record<string, any>) => {
    const collection = getFieldValue(formData, 'ficheDiabete.medicamentsHistory') as any[] | undefined
    if (!Array.isArray(collection)) return []
    const result: Array<{ date: string; value: unknown }> = []
    for (const r of collection) {
      if (r?.date == null || r.date === '') continue
      const meds = r?.medicaments
      if (!Array.isArray(meds) || meds.length === 0) continue
      const joined = meds
        .map((m: unknown) => String(m ?? '').trim())
        .filter((m: string) => m !== '')
        .join(', ')
      if (!joined) continue
      result.push({ date: String(r.date), value: joined })
    }
    return result
  }
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
  'ficheDiabete.typeDiabete': { label: 'Type de diabète' },
  'ficheDiabete.typeDiabeteAutre': { label: 'Type de diabète (autre)' },
  'ficheDiabete.circonstanceDecouverte': { label: 'Circonstances de découverte' },
  'ficheDiabete.anticorps': { label: 'Anticorps' },
  'ficheDiabete.typeAnticorps': { label: "Type d'anticorps" },
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
  // Fiche diabète – Facteurs de risque
  'ficheDiabete.dyslipidemie': { label: 'Dyslipidémie', format: booleanFormat },
  'ficheDiabete.hta': { label: 'HTA (traitée ou non)', format: booleanFormat },
  'ficheDiabete.sas': { label: "SAOS (Syndrome d'apnées obstructives du sommeil)" },
  'ficheDiabete.tabac': { label: 'Tabac', extract: seriesExtract('ficheDiabete.tabacHistory', 'tabac') },
  'ficheDiabete.tabacQuantite': { label: 'Tabac – Quantité', extract: seriesExtract('ficheDiabete.tabacHistory', 'tabacQuantite') },
  'ficheDiabete.tabacUnite': { label: 'Tabac – Unité', extract: seriesExtract('ficheDiabete.tabacHistory', 'tabacUnite') },
  'ficheDiabete.tabacDuree': { label: 'Tabac – Rythme', extract: seriesExtract('ficheDiabete.tabacHistory', 'tabacDuree') },
  'ficheDiabete.tabacDateDebut': { label: 'Tabac – Début', format: monthFormat, extract: seriesExtract('ficheDiabete.tabacHistory', 'tabacDateDebut') },
  'ficheDiabete.tabacCommentaire': { label: 'Tabac – Commentaire', extract: seriesExtract('ficheDiabete.tabacHistory', 'tabacCommentaire') },
  'ficheDiabete.tabacPA': { label: 'PA (paquets-année)', format: paFormat, extract: paSeriesExtract() },
  'ficheDiabete.substance': { label: 'Substance / Alcool / Toxique', extract: seriesExtract('ficheDiabete.substanceHistory', 'substance') },
  'ficheDiabete.substancePrecision': { label: 'Précision substance', extract: seriesExtract('ficheDiabete.substanceHistory', 'substancePrecision') },
  'ficheDiabete.substanceQuantite': { label: 'Substance – Quantité', extract: seriesExtract('ficheDiabete.substanceHistory', 'substanceQuantite') },
  'ficheDiabete.substanceUnite': { label: 'Substance – Unité', extract: seriesExtract('ficheDiabete.substanceHistory', 'substanceUnite') },
  'ficheDiabete.substanceDuree': { label: 'Substance – Rythme', extract: seriesExtract('ficheDiabete.substanceHistory', 'substanceDuree') },
  'ficheDiabete.substanceDateDebut': { label: 'Substance – Début', format: monthFormat, extract: seriesExtract('ficheDiabete.substanceHistory', 'substanceDateDebut') },
  'ficheDiabete.substanceCommentaire': { label: 'Substance – Commentaire', extract: seriesExtract('ficheDiabete.substanceHistory', 'substanceCommentaire') },
  // Fiche diabète – Traitement / Auto surveillance glycémique
  'ficheDiabete.medicaments': { label: 'Médicaments', extract: medicamentsSeriesExtract() },
  'ficheDiabete.adoDateDebut': { label: 'ADO – Début', format: monthFormat, extract: seriesExtract('ficheDiabete.medicamentsHistory', 'adoDateDebut') },
  'ficheDiabete.adoCommentaire': { label: 'ADO – Commentaire', extract: seriesExtract('ficheDiabete.medicamentsHistory', 'adoCommentaire') },
  'ficheDiabete.glp1DateDebut': { label: 'aGLP-1 – Début', format: monthFormat, extract: seriesExtract('ficheDiabete.medicamentsHistory', 'glp1DateDebut') },
  'ficheDiabete.glp1Commentaire': { label: 'aGLP-1 – Commentaire', extract: seriesExtract('ficheDiabete.medicamentsHistory', 'glp1Commentaire') },
  'ficheDiabete.insulineType': { label: 'Insuline – Type', extract: seriesExtract('ficheDiabete.medicamentsHistory', 'insulineType') },
  'ficheDiabete.insulineDateDebut': { label: 'Insuline – Début', format: monthFormat, extract: seriesExtract('ficheDiabete.medicamentsHistory', 'insulineDateDebut') },
  'ficheDiabete.insulineCommentaire': { label: 'Insuline – Commentaire', extract: seriesExtract('ficheDiabete.medicamentsHistory', 'insulineCommentaire') },
  'ficheDiabete.pompeType': { label: 'Pompe – Modèle', extract: seriesExtract('ficheDiabete.medicamentsHistory', 'pompeType') },
  'ficheDiabete.pompeDateDebut': { label: 'Pompe – Début', format: monthFormat, extract: seriesExtract('ficheDiabete.medicamentsHistory', 'pompeDateDebut') },
  'ficheDiabete.pompeCommentaire': { label: 'Pompe – Commentaire', extract: seriesExtract('ficheDiabete.medicamentsHistory', 'pompeCommentaire') },
  'ficheDiabete.traitementHabituel': { label: 'Traitement habituel', extract: seriesExtract('ficheDiabete.traitementHabituelHistory', 'traitementHabituel') },
  'ficheDiabete.surveillanceCapillaire': { label: 'Autosurveillance capillaire', extract: seriesExtract('ficheDiabete.surveillanceHistory', 'surveillanceCapillaire') },
  'ficheDiabete.surveillanceMCG': { label: 'Autosurveillance MCG', extract: seriesExtract('ficheDiabete.surveillanceHistory', 'surveillanceMCG') },
  'ficheDiabete.surveillanceCommentaire': { label: 'Autosurveillance – Commentaire', extract: seriesExtract('ficheDiabete.surveillanceHistory', 'surveillanceCommentaire') },
  // Bilan initial
  'bilanInitial.scoreDouleur': { label: 'Score de douleur (EVA)', extract: seriesExtract('douleurHistory', 'score') },
  'bilanInitial.glasgow.ouvertureYeux': { label: 'Glasgow – Ouverture des yeux', extract: seriesExtract('glasgowHistory', 'ouvertureYeux') },
  'bilanInitial.glasgow.reponseVerbale': { label: 'Glasgow – Réponse verbale', extract: seriesExtract('glasgowHistory', 'reponseVerbale') },
  'bilanInitial.glasgow.reponseMotrice': { label: 'Glasgow – Réponse motrice', extract: seriesExtract('glasgowHistory', 'reponseMotrice') },
  'bilanInitial.glasgow.score': { label: 'Score de Glasgow (/15)', extract: glasgowScoreSeriesExtract() },
  'bilanInitial.examenPhysique.taSystolique': { label: 'TA systolique (mmHg)', extract: seriesExtract('vitalSignsHistory', 'taSystolique') },
  'bilanInitial.examenPhysique.taDiastolique': { label: 'TA diastolique (mmHg)', extract: seriesExtract('vitalSignsHistory', 'taDiastolique') },
  'bilanInitial.examenPhysique.frequenceCardiaque': { label: 'Fréquence cardiaque (bpm)', extract: seriesExtract('vitalSignsHistory', 'frequenceCardiaque') },
  'bilanInitial.examenPhysique.temperature': { label: 'Température (°C)', extract: seriesExtract('vitalSignsHistory', 'temperature') },
  'bilanInitial.examenPhysique.glycemie': { label: 'Glycémie (g/L)', extract: seriesExtract('vitalSignsHistory', 'glycemie') },
  'bilanInitial.examenPhysique.cetonurie': { label: 'Cétominurie', extract: seriesExtract('vitalSignsHistory', 'cetonurie') },
  'bilanInitial.examenPhysique.glucosurie': { label: 'Glucosurie', extract: seriesExtract('vitalSignsHistory', 'glucosurie') },
  'bilanInitial.examenPhysique.cetonemie': { label: 'Cétonémie (mmol/L)', extract: seriesExtract('vitalSignsHistory', 'cetonemie') },
  'bilanInitial.examenPhysique.diurese': { label: 'Diurèse (ml)', extract: seriesExtract('vitalSignsHistory', 'diurese') },
  'bilanInitial.examenPhysique.poids': { label: 'Poids (kg)', extract: seriesExtract('vitalSignsHistory', 'poids') },
  'bilanInitial.examenPhysique.saO2': { label: 'SaO2 (%)', extract: seriesExtract('vitalSignsHistory', 'saO2') },
  'bilanInitial.examenPhysique.taille': { label: 'Taille (cm)', extract: seriesExtract('vitalSignsHistory', 'taille') },
  'bilanInitial.examenPhysique.termeSa': { label: 'Terme (SA)', extract: seriesExtract('vitalSignsHistory', 'termeSa') },
  'bilanInitial.examenPhysique.imc': { label: 'IMC (kg/m²)', extract: imcSeriesExtract() },
  'bilanInitial.examenPhysique.tourTaille': { label: 'Tour de taille (cm)', extract: seriesExtract('vitalSignsHistory', 'tourTaille') },
  'bilanInitial.examenPhysique.tourHanche': { label: 'Tour de hanche (cm)', extract: seriesExtract('vitalSignsHistory', 'tourHanche') },
  'bilanInitial.examenPhysique.ratioTTTH': { label: 'Rapport TT/TH', extract: ratioTTTHSeriesExtract() },
  // Sortie
  'sortie.dateSortie': { label: 'Date de sortie', format: dateFormat },
  'sortie.destinationSortie': { label: 'Destination de sortie' },
  'sortie.infoPatientFamille': { label: 'Information du patient / famille', format: booleanFormat },
  'sortie.produitsSanguins': { label: 'Administration de produits sanguins', format: booleanFormat },
  'sortie.bmrBhre': { label: 'Porteur / Contact BMR ou BHRe', format: booleanFormat },
  'sortie.conclusionSortie': { label: 'Conclusion de sortie' },
}

export function getParameterMeta(path: string): ParameterMeta | undefined {
  return PARAMETER_META[path]
}

/**
 * Source unique des groupes de paramètres affichés ensemble dans le
 * popup multi-courbes (bouton « Voir courbes » par tableau).
 *
 * - `vitals` : les 13 paths `bilanInitial.examenPhysique.*`
 * - `glasgow` : les 3 composantes + le score total calculé
 * - `douleur` : le score EVA seul
 * - `ficheTabac` : scalaires tabac + quantité historisée + PA calculé
 * - `ficheSubstance` : scalaires substance + quantité historisée
 * - `traitementMeds` : médicaments + ADO / aGLP-1 / insuline / pompe historisés
 * - `traitementHabituel` : traitement habituel historisé
 * - `surveillance` : autosurveillance capillaire / MCG / commentaire
 */
export type ParameterGroupKey = 'vitals' | 'glasgow' | 'douleur' | 'ficheTabac' | 'ficheSubstance' | 'traitementMeds' | 'traitementHabituel' | 'surveillance'

export const PARAMETER_GROUPS: Record<ParameterGroupKey, string[]> = {
  vitals: [
    'bilanInitial.examenPhysique.taSystolique',
    'bilanInitial.examenPhysique.taDiastolique',
    'bilanInitial.examenPhysique.frequenceCardiaque',
    'bilanInitial.examenPhysique.temperature',
    'bilanInitial.examenPhysique.glycemie',
    'bilanInitial.examenPhysique.cetonurie',
    'bilanInitial.examenPhysique.glucosurie',
    'bilanInitial.examenPhysique.cetonemie',
    'bilanInitial.examenPhysique.diurese',
    'bilanInitial.examenPhysique.poids',
    'bilanInitial.examenPhysique.saO2',
    'bilanInitial.examenPhysique.taille',
    'bilanInitial.examenPhysique.imc',
  ],
  glasgow: [
    'bilanInitial.glasgow.ouvertureYeux',
    'bilanInitial.glasgow.reponseVerbale',
    'bilanInitial.glasgow.reponseMotrice',
    'bilanInitial.glasgow.score',
  ],
  douleur: ['bilanInitial.scoreDouleur'],
  ficheTabac: [
    'ficheDiabete.tabac',
    'ficheDiabete.tabacQuantite',
    'ficheDiabete.tabacUnite',
    'ficheDiabete.tabacDuree',
    'ficheDiabete.tabacDateDebut',
    'ficheDiabete.tabacPA',
    'ficheDiabete.tabacCommentaire',
  ],
  ficheSubstance: [
    'ficheDiabete.substance',
    'ficheDiabete.substancePrecision',
    'ficheDiabete.substanceQuantite',
    'ficheDiabete.substanceUnite',
    'ficheDiabete.substanceDuree',
    'ficheDiabete.substanceDateDebut',
    'ficheDiabete.substanceCommentaire',
  ],
  traitementMeds: [
    'ficheDiabete.medicaments',
    'ficheDiabete.adoDateDebut',
    'ficheDiabete.adoCommentaire',
    'ficheDiabete.glp1DateDebut',
    'ficheDiabete.glp1Commentaire',
    'ficheDiabete.insulineType',
    'ficheDiabete.insulineDateDebut',
    'ficheDiabete.insulineCommentaire',
    'ficheDiabete.pompeType',
    'ficheDiabete.pompeDateDebut',
    'ficheDiabete.pompeCommentaire',
  ],
  traitementHabituel: ['ficheDiabete.traitementHabituel'],
  surveillance: [
    'ficheDiabete.surveillanceCapillaire',
    'ficheDiabete.surveillanceMCG',
    'ficheDiabete.surveillanceCommentaire',
  ],
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
