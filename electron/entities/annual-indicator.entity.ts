import type { AnnualIndicatorDto, AnnualIndicatorUpsertDto } from '../dto/annual-indicator.dto'

/**
 * Ligne d'agrégats annuels (`annual_indicator`), une par année.
 *
 * Table de reporting éditée localement : elle n'est pas synchronisée via
 * Automerge (pas de `documentType`/`register`), d'où l'absence de
 * `@SchemaField`. Le `id` est un UUID texte généré par l'appelant.
 */
export class AnnualIndicatorEntity {
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

  static toDto(entity: AnnualIndicatorEntity): AnnualIndicatorDto {
    return {
      id: entity.id,
      annee: entity.annee,
      suivi_diabete_endocrino: entity.suivi_diabete_endocrino,
      soins_ambulatoires: entity.soins_ambulatoires,
      nouveaux_cas_diabete: entity.nouveaux_cas_diabete,
      nouveaux_cas_thyroide_endocrino: entity.nouveaux_cas_thyroide_endocrino,
      nouveaux_venus_diabete: entity.nouveaux_venus_diabete,
      bilan_labo: entity.bilan_labo,
      hospitalisation_jour: entity.hospitalisation_jour,
      hospitalisation_complete: entity.hospitalisation_complete,
      autres_nouveaux_cas: entity.autres_nouveaux_cas,
      ecg: entity.ecg,
      hopital_de_jour: entity.hopital_de_jour,
      total_activites: entity.total_activites,
      moyenne_activites: entity.moyenne_activites,
      updated_by: entity.updated_by,
      updated_at: entity.updated_at,
    }
  }

  static toDtos(entities: AnnualIndicatorEntity[]): AnnualIndicatorDto[] {
    return entities.map(AnnualIndicatorEntity.toDto)
  }

  static fromDto(dto: AnnualIndicatorDto | AnnualIndicatorUpsertDto): AnnualIndicatorEntity {
    const e = new AnnualIndicatorEntity()
    if ('id' in dto) e.id = dto.id
    e.annee = dto.annee
    e.suivi_diabete_endocrino = dto.suivi_diabete_endocrino
    e.soins_ambulatoires = dto.soins_ambulatoires
    e.nouveaux_cas_diabete = dto.nouveaux_cas_diabete
    e.nouveaux_cas_thyroide_endocrino = dto.nouveaux_cas_thyroide_endocrino
    e.nouveaux_venus_diabete = dto.nouveaux_venus_diabete
    e.bilan_labo = dto.bilan_labo
    e.hospitalisation_jour = dto.hospitalisation_jour
    e.hospitalisation_complete = dto.hospitalisation_complete
    e.autres_nouveaux_cas = dto.autres_nouveaux_cas
    e.ecg = dto.ecg
    e.hopital_de_jour = dto.hopital_de_jour
    e.total_activites = dto.total_activites
    e.moyenne_activites = dto.moyenne_activites
    e.updated_by = dto.updated_by
    return e
  }
}
