import { container, inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import crypto from 'node:crypto'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { UserEntity } from '../entities/user.entity'
import type { UserDto } from '../dto/auth.dto'
import { PasswordService } from './auth/password.service'
import { SessionService } from './auth/session.service'
import { EmailService } from './email/email.service'

export interface LoginResult {
  token?: string
  user: UserDto
  mustChangePassword?: boolean
}

@singleton()
export class AuthService {
  public db: Kysely<DB>
  private passwordService: PasswordService
  private sessionService: SessionService

  constructor(
    @inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource,
    @inject(PasswordService) passwordService: PasswordService,
    @inject(SessionService) sessionService: SessionService,
  ) {
    this.db = datasource.getInstance()
    this.passwordService = passwordService
    this.sessionService = sessionService
  }

  async login(email: string, password: string, rememberMe = false): Promise<LoginResult> {
    const user = await this.db
      .selectFrom('user')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst()

    if (!user) throw new Error('Email ou mot de passe incorrect')

    const isValid = await this.passwordService.verify(password, user.password_hash as string)
    if (!isValid) throw new Error('Email ou mot de passe incorrect')

    const entity = this.rowToEntity(user)

    if (!entity.is_validated) {
      const token = await this.sessionService.create(user.id as number, rememberMe)
      return { token, user: UserEntity.toDto(entity), mustChangePassword: true }
    }

    if (!entity.is_active) {
      throw new Error('Compte désactivé. Contactez l\'administrateur.')
    }

    // Check contract status
    const statut = this.computeStatutContrat(user as Record<string, unknown>)
    if (statut === 'Résilié') {
      throw new Error('Contrat résilié. Contactez l\'administrateur.')
    }
    if (statut === 'Expiré') {
      throw new Error('Contrat expiré. Contactez l\'administrateur pour le renouveler.')
    }

    const token = await this.sessionService.create(user.id as number, rememberMe)
    return { token, user: UserEntity.toDto(entity), mustChangePassword: false }
  }

  async validatePassword(userId: number, oldPassword: string, newPassword: string): Promise<UserDto> {
    const user = await this.db
      .selectFrom('user')
      .selectAll()
      .where('id', '=', userId)
      .executeTakeFirst()

    if (!user) throw new Error('Utilisateur introuvable')

    const isValid = await this.passwordService.verify(oldPassword, user.password_hash as string)
    if (!isValid) throw new Error('Ancien mot de passe incorrect')

    const hash = await this.passwordService.hash(newPassword)
    await this.db
      .updateTable('user')
      .set({ password_hash: hash, is_validated: 1, is_active: 1 })
      .where('id', '=', userId)
      .execute()

    const updated = await this.db
      .selectFrom('user')
      .selectAll()
      .where('id', '=', userId)
      .executeTakeFirst()

    if (!updated) throw new Error('User not found after update')

    return UserEntity.toDto(this.rowToEntity(updated))
  }

  async listUsers(): Promise<UserDto[]> {
    const users = await this.db.selectFrom('user').selectAll().orderBy('nom', 'asc').execute()
    return users.map(u => UserEntity.toDto(this.rowToEntity(u)))
  }

  async validateEmail(email: string, excludeUserId?: number): Promise<string | null> {
    // 1. Format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return 'Format d\'email invalide'
    }

    // 2. Uniqueness check
    let query = this.db
      .selectFrom('user')
      .select(this.db.fn.countAll<number>().as('count'))
      .where('email', '=', email)

    if (excludeUserId !== undefined) {
      query = query.where('id', '!=', excludeUserId)
    }

    const row = await query.executeTakeFirst()
    const count = Number(row?.count ?? 0)
    if (count > 0) {
      return 'Cet email est déjà utilisé par un autre utilisateur'
    }

    return null
  }

  async createUser(dto: UserDto): Promise<UserDto> {
    // Validate email first
    const emailError = await this.validateEmail(dto.email!)
    if (emailError) throw new Error(emailError)

    const hash = await this.passwordService.hash(dto.password || 'changeme')
    try {
      await this.db
        .insertInto('user')
        .values({
          nom: dto.nom!,
          prenom: dto.prenom!,
          email: dto.email!,
          password_hash: hash,
          role: dto.role!,
          service: dto.service || null,
          photo: dto.photo || null,
          telephone: dto.telephone || null,
          telephone_country_code: dto.telephone_country_code || null,
          fonction: dto.fonction || null,
          fonction_id: dto.fonction_id || null,
          date_debut_contrat: dto.date_debut_contrat || null,
          date_fin_contrat: dto.date_fin_contrat || null,
          type_contrat: dto.type_contrat || 'CDI',
          is_active: 1,
          is_validated: 0,
        } as never)
        .execute()
    } catch (error) {
      if ((error as { code?: string })?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Cet email est déjà utilisé par un autre utilisateur')
      }
      throw error
    }

    const result = await this.db
      .selectFrom('user')
      .selectAll()
      .where('email', '=', dto.email!)
      .orderBy('id', 'desc')
      .limit(1)
      .executeTakeFirst()

    if (!result) throw new Error('Failed to retrieve inserted user')

    return UserEntity.toDto(this.rowToEntity(result))
  }

  async updateUser(dto: UserDto): Promise<UserDto> {
    const existing = await this.db
      .selectFrom('user')
      .selectAll()
      .where('id', '=', dto.id!)
      .executeTakeFirst()

    if (!existing) throw new Error('Utilisateur introuvable')

    // Validate email if being changed
    if (dto.email) {
      const emailError = await this.validateEmail(dto.email, dto.id)
      if (emailError) throw new Error(emailError)
    }

    const updates: Record<string, unknown> = {}
    if (dto.nom) updates.nom = dto.nom
    if (dto.prenom) updates.prenom = dto.prenom
    if (dto.email) updates.email = dto.email
    if (dto.role) updates.role = dto.role
    if (dto.service !== undefined) updates.service = dto.service
    if (dto.photo !== undefined) updates.photo = dto.photo
    if (dto.telephone !== undefined) updates.telephone = dto.telephone
    if (dto.telephone_country_code !== undefined) updates.telephone_country_code = dto.telephone_country_code
    if (dto.fonction !== undefined) updates.fonction = dto.fonction
    if (dto.fonction_id !== undefined) updates.fonction_id = dto.fonction_id
    if (dto.date_debut_contrat !== undefined) updates.date_debut_contrat = dto.date_debut_contrat
    if (dto.date_fin_contrat !== undefined) updates.date_fin_contrat = dto.date_fin_contrat
    if (dto.type_contrat !== undefined) updates.type_contrat = dto.type_contrat
    if (dto.statut_resiliation !== undefined) updates.statut_resiliation = dto.statut_resiliation
    if (dto.motif_resiliation !== undefined) updates.motif_resiliation = dto.motif_resiliation
    if (dto.date_resiliation !== undefined) updates.date_resiliation = dto.date_resiliation
    if (dto.resilie_par !== undefined) updates.resilie_par = dto.resilie_par
    if (dto.is_active !== undefined) updates.is_active = dto.is_active ? 1 : 0
    if (dto.is_validated !== undefined) updates.is_validated = dto.is_validated ? 1 : 0
    if (dto.password) {
      updates.password_hash = await this.passwordService.hash(dto.password)
    }

    if (Object.keys(updates).length === 0) return UserEntity.toDto(this.rowToEntity(existing))

    await this.db
      .updateTable('user')
      .set(updates as never)
      .where('id', '=', dto.id!)
      .execute()

    const result = await this.db
      .selectFrom('user')
      .selectAll()
      .where('id', '=', dto.id!)
      .executeTakeFirst()

    if (!result) throw new Error('User not found after update')

    return UserEntity.toDto(this.rowToEntity(result))
  }

  async deleteUser(id: number): Promise<void> {
    await this.db
      .updateTable('user')
      .set({
        is_active: 0,
        is_validated: 0,
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      } as never)
      .where('id', '=', id)
      .execute()
  }

  async sendResetPassword(email: string): Promise<void> {
    // 1. Lookup user by email — DON'T throw if not found (security: don't reveal if email exists)
    const user = await this.db
      .selectFrom('user')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst()

    if (!user) {
      console.log(`[CDE] Demande de réinitialisation pour email inconnu: ${email}`)
      return // silent return
    }

    // 2. Generate random temp password (8 chars hex)
    const tempPassword = crypto.randomBytes(4).toString('hex')

    // 3. Hash it and update
    const hash = await this.passwordService.hash(tempPassword)
    await this.db
      .updateTable('user')
      .set({ password_hash: hash, is_validated: 0 })
      .where('id', '=', user.id)
      .execute()

    // 4. Send email via EmailService (fire-and-forget)
    const emailService = container.resolve(EmailService)
    emailService
      .sendResetPasswordEmail(UserEntity.toDto(this.rowToEntity(user)), tempPassword)
      .catch((err) => console.error('[CDE] Échec envoi email reset password:', err))
  }

  async getUserById(id: number): Promise<UserDto | null> {
    const user = await this.db
      .selectFrom('user')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return user ? UserEntity.toDto(this.rowToEntity(user)) : null
  }

  private computeStatutContrat(row: Record<string, unknown>): 'Actif' | 'Expiré' | 'Résilié' {
    if (row.statut_resiliation === 'resilie') return 'Résilié'
    if (row.date_fin_contrat) {
      const end = new Date(row.date_fin_contrat as string)
      if (end < new Date()) return 'Expiré'
    }
    return 'Actif'
  }

  async enrichUserWithRelations(userId: number): Promise<{
    specialties: Array<{ id: number; name: string; code: string; title_prefix: string }>
    services: Array<{ id: number; name: string }>
    sites: Array<{ id: number; name: string }>
    medical_units: Array<{ id: number; name: string; code: string }>
    fonction: { id: number; name: string } | null
    statut_contrat?: 'Actif' | 'Expiré' | 'Résilié'
  }> {
    const user = await this.db
      .selectFrom('user')
      .selectAll()
      .where('id', '=', userId)
      .executeTakeFirst()

    if (!user) throw new Error('Utilisateur introuvable')

    const [specialties, services, sites, medicalUnits] = await Promise.all([
      this.db
        .selectFrom('user_specialties')
        .innerJoin('specialties', 'specialties.id', 'user_specialties.specialty_id')
        .select(['specialties.id', 'specialties.name', 'specialties.code', 'specialties.title_prefix'])
        .where('user_specialties.user_id', '=', userId)
        .execute(),

      this.db
        .selectFrom('user_services')
        .innerJoin('services', 'services.id', 'user_services.service_id')
        .select(['services.id', 'services.name'])
        .where('user_services.user_id', '=', userId)
        .execute(),

      this.db
        .selectFrom('user_sites')
        .innerJoin('sites', 'sites.id', 'user_sites.site_id')
        .select(['sites.id', 'sites.name'])
        .where('user_sites.user_id', '=', userId)
        .execute(),

      this.db
        .selectFrom('user_medical_units')
        .innerJoin('medical_units', 'medical_units.id', 'user_medical_units.medical_unit_id')
        .select(['medical_units.id', 'medical_units.name', 'medical_units.code'])
        .where('user_medical_units.user_id', '=', userId)
        .execute(),
    ])

    const fonctionId = (user as Record<string, unknown>).fonction_id as number | undefined
    const fonction = fonctionId
      ? await this.db
          .selectFrom('fonctions')
          .select(['id', 'name'])
          .where('id', '=', fonctionId)
          .executeTakeFirst()
      : null

    return {
      specialties: specialties as Array<{ id: number; name: string; code: string; title_prefix: string }>,
      services: services as Array<{ id: number; name: string }>,
      sites: sites as Array<{ id: number; name: string }>,
      medical_units: medicalUnits as Array<{ id: number; name: string; code: string }>,
      fonction: fonction ? { id: fonction.id!, name: fonction.name } : null,
      statut_contrat: this.computeStatutContrat(user as Record<string, unknown>),
    }
  }

  async syncUserRelations(
    userId: number,
    dto: {
      specialty_ids?: number[]
      service_ids?: number[]
      site_ids?: number[]
      medical_unit_ids?: number[]
    }
  ): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      if (dto.specialty_ids !== undefined) {
        await trx.deleteFrom('user_specialties').where('user_id', '=', userId).execute()
        if (dto.specialty_ids.length > 0) {
          const values = dto.specialty_ids.map(specialtyId => ({ user_id: userId, specialty_id: specialtyId }))
          await trx.insertInto('user_specialties').values(values).execute()
        }
      }

      if (dto.service_ids !== undefined) {
        await trx.deleteFrom('user_services').where('user_id', '=', userId).execute()
        if (dto.service_ids.length > 0) {
          const values = dto.service_ids.map(serviceId => ({ user_id: userId, service_id: serviceId }))
          await trx.insertInto('user_services').values(values).execute()
        }
      }

      if (dto.site_ids !== undefined) {
        await trx.deleteFrom('user_sites').where('user_id', '=', userId).execute()
        if (dto.site_ids.length > 0) {
          const values = dto.site_ids.map(siteId => ({ user_id: userId, site_id: siteId }))
          await trx.insertInto('user_sites').values(values).execute()
        }
      }

      if (dto.medical_unit_ids !== undefined) {
        await trx.deleteFrom('user_medical_units').where('user_id', '=', userId).execute()
        if (dto.medical_unit_ids.length > 0) {
          const values = dto.medical_unit_ids.map(medicalUnitId => ({ user_id: userId, medical_unit_id: medicalUnitId }))
          await trx.insertInto('user_medical_units').values(values).execute()
        }
      }
    })
  }

  async terminateContract(userId: number, motif: string, terminatedBy: number): Promise<void> {
    const user = await this.db
      .selectFrom('user')
      .selectAll()
      .where('id', '=', userId)
      .executeTakeFirst()

    if (!user) throw new Error('Utilisateur introuvable')

    await this.db
      .updateTable('user')
      .set({
        statut_resiliation: 'resilie',
        motif_resiliation: motif,
        date_resiliation: new Date().toISOString().slice(0, 19).replace('T', ' '),
        resilie_par: terminatedBy,
        is_active: 0,
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      } as never)
      .where('id', '=', userId)
      .execute()
  }

  async reactivateContract(userId: number): Promise<void> {
    const user = await this.db
      .selectFrom('user')
      .selectAll()
      .where('id', '=', userId)
      .executeTakeFirst()

    if (!user) throw new Error('Utilisateur introuvable')

    await this.db
      .updateTable('user')
      .set({
        statut_resiliation: null,
        motif_resiliation: null,
        date_resiliation: null,
        resilie_par: null,
        is_active: 1,
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      } as never)
      .where('id', '=', userId)
      .execute()
  }

  private rowToEntity(row: Record<string, unknown>): UserEntity {
    const e = new UserEntity()
    e.id = row.id as number
    e.nom = row.nom as string
    e.prenom = row.prenom as string
    e.email = row.email as string
    e.role = row.role as UserEntity['role']
    e.service = row.service as string
    e.photo = row.photo as string | undefined
    e.telephone = row.telephone as string | undefined
    e.telephone_country_code = row.telephone_country_code as string | undefined
    e.fonction = row.fonction as string | undefined
    e.fonction_id = row.fonction_id as number | undefined
    e.date_debut_contrat = row.date_debut_contrat as string | undefined
    e.date_fin_contrat = row.date_fin_contrat as string | undefined
    e.type_contrat = row.type_contrat as string | undefined
    e.statut_resiliation = row.statut_resiliation as string | undefined
    e.motif_resiliation = row.motif_resiliation as string | undefined
    e.date_resiliation = row.date_resiliation as string | undefined
    e.resilie_par = row.resilie_par as number | undefined
    e.is_active = row.is_active as number
    e.is_validated = row.is_validated as number
    e.password_hash = row.password_hash as string
    return e
  }
}
