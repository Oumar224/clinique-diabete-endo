import { inject, singleton } from 'tsyringe'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { Kysely } from 'kysely'
import type { DB } from '../entities/database'
import { PatientEntity } from '../entities/patient.entity'
import type { PatientDto } from '../dto/patient.dto'
import { SettingsService } from './settings.service'
import { LogoService } from './logo.service'
import { TrustedPersonService } from './trusted-person.service'

export interface EnrichedPatient {
  patient: PatientDto
  trustedPerson: unknown | null
  hospital: unknown
  logo: string | null
}

@singleton()
export class PatientExportService {
  public db: Kysely<DB>

  constructor(
    @inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource,
    @inject(SettingsService) private settingsService: SettingsService,
    @inject(LogoService) private logoService: LogoService,
    @inject(TrustedPersonService) private trustedPersonService: TrustedPersonService,
  ) {
    this.db = datasource.getInstance()
  }

  async enrich(patientId: number): Promise<EnrichedPatient> {
    const row = await this.db
      .selectFrom('patient')
      .selectAll()
      .where('id', '=', patientId)
      .executeTakeFirst()

    if (!row) throw new Error('Patient introuvable')

    const patient = PatientEntity.toDto(row as any)

    const [trustedPerson, hospital, logo] = await Promise.all([
      this.trustedPersonService.getByPatientId(patientId).catch(() => null),
      this.settingsService.getHospitalInfo(),
      this.logoService.getLogoBase64(),
    ])

    return { patient, trustedPerson, hospital, logo }
  }
}
