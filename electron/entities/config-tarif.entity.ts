import type { TarifDto } from '../dto/settings.dto'
import { EntityRegistry } from '../automerge/entity-registry'
import { ConfigTarifConverter } from '../automerge/converters/config-tarif.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { SchemaField, buildDocumentSchema } from '../automerge/utils/schema-field'

export class ConfigTarifEntity {
  @SchemaField() id?: number
  @SchemaField() acte_id?: number
  @SchemaField() code_tarif?: string
  @SchemaField() prix_unitaire?: number
  @SchemaField() date_application?: string
  @SchemaField() created_at?: string
  @SchemaField() updated_at?: string

  static toDto(entity: ConfigTarifEntity): TarifDto {
    return {
      id: entity.id,
      acte_id: entity.acte_id as number,
      code_tarif: entity.code_tarif as string,
      prix_unitaire: entity.prix_unitaire as number,
      date_application: entity.date_application as string,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
      acte_code: (entity as any).acte_code,
      acte_label: (entity as any).acte_label,
      service_name: (entity as any).service_name,
    }
  }

  static toDtos(entities: ConfigTarifEntity[]): TarifDto[] { return entities.map(ConfigTarifEntity.toDto) }

  static fromDto(dto: TarifDto): ConfigTarifEntity {
    const e = new ConfigTarifEntity()
    e.id = dto.id
    e.acte_id = dto.acte_id
    e.code_tarif = dto.code_tarif
    e.prix_unitaire = dto.prix_unitaire
    e.date_application = dto.date_application
    e.created_at = dto.created_at
    e.updated_at = dto.updated_at
    return e
  }

  static documentType(): string { return 'ConfigTarif' }
  static documentSchema(): AutomergeDocument<ConfigTarifEntity> {
    return buildDocumentSchema(ConfigTarifEntity) as AutomergeDocument<ConfigTarifEntity>
  }
  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'config_tarif',
      documentSchema: this.documentSchema(),
      converter: { toDocument: ConfigTarifConverter.toDocument, toEntity: ConfigTarifConverter.toEntity },
    })
  }
}
