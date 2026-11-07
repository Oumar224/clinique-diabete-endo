/**
 * Agrégats annuels éditables de la clinique (« Indicateurs annuels »).
 *
 * Toutes les valeurs numériques sont nullables : une année peut être
 * partiellement renseignée (saisie progressive par le gestionnaire).
 */
export interface AnnualIndicatorDto {
  id?: string
  annee?: number
  suivi_diabete_endocrino?: number | null
  soins_ambulatoires?: number | null
  nouveaux_cas_diabete?: number | null
  nouveaux_cas_thyroide_endocrino?: number | null
  nouveaux_venus_diabete?: number | null
  bilan_labo?: number | null
  hospitalisation_jour?: number | null
  hospitalisation_complete?: number | null
  autres_nouveaux_cas?: number | null
  ecg?: number | null
  hopital_de_jour?: number | null
  total_activites?: number | null
  moyenne_activites?: number | null
  updated_by?: string | null
  updated_at?: string | null
}

export interface AnnualIndicatorUpsertDto {
  annee?: number
  suivi_diabete_endocrino?: number | null
  soins_ambulatoires?: number | null
  nouveaux_cas_diabete?: number | null
  nouveaux_cas_thyroide_endocrino?: number | null
  nouveaux_venus_diabete?: number | null
  bilan_labo?: number | null
  hospitalisation_jour?: number | null
  hospitalisation_complete?: number | null
  autres_nouveaux_cas?: number | null
  ecg?: number | null
  hopital_de_jour?: number | null
  total_activites?: number | null
  moyenne_activites?: number | null
  updated_by?: string | null
}
