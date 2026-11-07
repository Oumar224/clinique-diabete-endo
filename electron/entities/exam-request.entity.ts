import type { ExamRequestDto } from '../dto/exam-request.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { ExamRequestConverter } from '../automerge/converters/exam-request.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class ExamRequestEntity {
  @SchemaField() id?: number
  @SchemaField() numero?: string
  @SchemaField() patient_id?: number
  @SchemaField() encounter_id?: number
  @SchemaField() type?: string
  @SchemaField() examen_id?: number
  @SchemaField() exam_ids?: string
  @SchemaField() specialite?: string
  @SchemaField() specialty_id?: number
  specialty_name?: string
  @SchemaField() planned_hour?: number
  @SchemaField() planned_date?: string
  @SchemaField() motif?: string
  @SchemaField() statut?: string
  @SchemaField() priorite?: string
  @SchemaField() patient_externe?: number
  @SchemaField() externe_nom?: string
  @SchemaField() externe_prenom?: string
  @SchemaField() externe_sexe?: string
  @SchemaField() externe_date_naissance?: string
  @SchemaField() externe_telephone?: string
  @SchemaField() externe_adresse?: string
  @SchemaField() prescripteur_externe_nom?: string
  @SchemaField() prescripteur_externe_structure?: string
  @SchemaField() prescripteur_externe_telephone?: string
  @SchemaField() prelevement_type?: string
  @SchemaField() prelevement_at?: string
  @SchemaField() prelevement_par?: number
  @SchemaField() validated_at?: string
  @SchemaField() realized_at?: string
  @SchemaField() resultat?: string
  @SchemaField() prescripteur_id?: number
  @SchemaField() facture_id?: number
  @SchemaField() montant?: number
  @SchemaField() statut_paiement?: string
  montant_paye?: number
  @SchemaField() created_by?: number
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string
  prescripteur_nom?: string
  examen_label?: string
  patient_nom?: string
  patient_prenom?: string

  static toDto(entity: ExamRequestEntity): ExamRequestDto {
    return {
      id: entity.id,
      numero: entity.numero ?? undefined,
      patientId: entity.patient_id ?? undefined,
      encounterId: entity.encounter_id ?? undefined,
      type: entity.type as ExamRequestDto['type'],
      examenId: entity.examen_id ?? undefined,
      examIds: entity.exam_ids ? JSON.parse(entity.exam_ids) as number[] : [],
      specialite: entity.specialite ?? undefined,
      specialtyId: entity.specialty_id ?? undefined,
      plannedHour: entity.planned_hour ?? undefined,
      plannedDate: entity.planned_date ?? undefined,
      motif: entity.motif ?? undefined,
      statut: (entity.statut ?? 'en_attente') as ExamRequestDto['statut'],
      priorite: (entity.priorite ?? 'normale') as ExamRequestDto['priorite'],
      patientExterne: Boolean(entity.patient_externe),
      externeNom: entity.externe_nom ?? undefined,
      externePrenom: entity.externe_prenom ?? undefined,
      externeSexe: entity.externe_sexe ?? undefined,
      externeDateNaissance: entity.externe_date_naissance ?? undefined,
      externeTelephone: entity.externe_telephone ?? undefined,
      externeAdresse: entity.externe_adresse ?? undefined,
      prescripteurExterneNom: entity.prescripteur_externe_nom ?? undefined,
      prescripteurExterneStructure: entity.prescripteur_externe_structure ?? undefined,
      prescripteurExterneTelephone: entity.prescripteur_externe_telephone ?? undefined,
      prelevementType: entity.prelevement_type ?? undefined,
      prelevementAt: entity.prelevement_at ?? undefined,
      prelevementPar: entity.prelevement_par ?? undefined,
      validatedAt: entity.validated_at ?? undefined,
      realizedAt: entity.realized_at ?? undefined,
      resultat: entity.resultat ?? undefined,
      prescripteurId: entity.prescripteur_id ?? undefined,
      factureId: entity.facture_id ?? undefined,
      montant: entity.montant ?? undefined,
      statutPaiement: (entity.statut_paiement ?? 'non_paye') as ExamRequestDto['statutPaiement'],
      montantPaye: entity.montant_paye != null ? Number(entity.montant_paye) : undefined,
      createdBy: entity.created_by ?? undefined,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
      prescripteurNom: entity.prescripteur_nom,
      examenLabel: entity.examen_label,
      specialtyName: entity.specialty_name,
      patientNom: entity.patient_nom,
      patientPrenom: entity.patient_prenom,
    }
  }

  static toDtos(entities: ExamRequestEntity[]): ExamRequestDto[] {
    return entities.map(ExamRequestEntity.toDto)
  }

  static fromDto(dto: ExamRequestDto): ExamRequestEntity {
    const e = new ExamRequestEntity()
    if (dto.id != null) e.id = dto.id
    if (dto.numero !== undefined) e.numero = dto.numero
    e.patient_id = dto.patientId
    if (dto.encounterId !== undefined) e.encounter_id = dto.encounterId
    e.type = dto.type
    if (dto.examenId !== undefined) e.examen_id = dto.examenId
    e.exam_ids = dto.examIds && dto.examIds.length > 0 ? JSON.stringify(dto.examIds) : undefined
    e.specialite = dto.specialite ?? undefined
    e.specialty_id = dto.specialtyId ?? undefined
    e.planned_hour = dto.plannedHour ?? undefined
    e.planned_date = dto.plannedDate ?? undefined
    e.motif = dto.motif ?? undefined
    e.statut = dto.statut
    if (dto.priorite !== undefined) e.priorite = dto.priorite
    if (dto.patientExterne !== undefined) e.patient_externe = dto.patientExterne ? 1 : 0
    if (dto.externeNom !== undefined) e.externe_nom = dto.externeNom
    if (dto.externePrenom !== undefined) e.externe_prenom = dto.externePrenom
    if (dto.externeSexe !== undefined) e.externe_sexe = dto.externeSexe
    if (dto.externeDateNaissance !== undefined) e.externe_date_naissance = dto.externeDateNaissance
    if (dto.externeTelephone !== undefined) e.externe_telephone = dto.externeTelephone
    if (dto.externeAdresse !== undefined) e.externe_adresse = dto.externeAdresse
    if (dto.prescripteurExterneNom !== undefined) e.prescripteur_externe_nom = dto.prescripteurExterneNom
    if (dto.prescripteurExterneStructure !== undefined) e.prescripteur_externe_structure = dto.prescripteurExterneStructure
    if (dto.prescripteurExterneTelephone !== undefined) e.prescripteur_externe_telephone = dto.prescripteurExterneTelephone
    if (dto.prelevementType !== undefined) e.prelevement_type = dto.prelevementType
    if (dto.prelevementAt !== undefined) e.prelevement_at = dto.prelevementAt
    if (dto.prelevementPar !== undefined) e.prelevement_par = dto.prelevementPar
    if (dto.validatedAt !== undefined) e.validated_at = dto.validatedAt
    if (dto.realizedAt !== undefined) e.realized_at = dto.realizedAt
    if (dto.resultat !== undefined) e.resultat = dto.resultat
    if (dto.prescripteurId !== undefined) e.prescripteur_id = dto.prescripteurId
    if (dto.factureId !== undefined) e.facture_id = dto.factureId
    if (dto.montant !== undefined) e.montant = dto.montant
    if (dto.statutPaiement !== undefined) e.statut_paiement = dto.statutPaiement
    if (dto.createdBy !== undefined) e.created_by = dto.createdBy
    return e
  }

  static documentType(): string { return 'ExamRequest' }
  static documentSchema(): AutomergeDocument<ExamRequestEntity> {
    return buildDocumentSchema(ExamRequestEntity) as AutomergeDocument<ExamRequestEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'exam_request',
      documentSchema: this.documentSchema(),
      converter: { toDocument: ExamRequestConverter.toDocument, toEntity: ExamRequestConverter.toEntity },
    })
  }
}
