import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { UserEntity } from '../entities/user.entity'
import type { UserDto } from '../dto/auth.dto'
import { PasswordService } from './auth/password.service'
import { SessionService } from './auth/session.service'

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

  async createUser(dto: UserDto): Promise<UserDto> {
    const hash = await this.passwordService.hash(dto.password || 'changeme')
    await this.db
      .insertInto('user')
      .values({
        nom: dto.nom!,
        prenom: dto.prenom!,
        email: dto.email!,
        password_hash: hash,
        role: dto.role!,
        service: dto.service || null,
        is_active: 1,
        is_validated: 0,
      } as never)
      .execute()

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

    const updates: Record<string, unknown> = {}
    if (dto.nom) updates.nom = dto.nom
    if (dto.prenom) updates.prenom = dto.prenom
    if (dto.email) updates.email = dto.email
    if (dto.role) updates.role = dto.role
    if (dto.service !== undefined) updates.service = dto.service
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
      .deleteFrom('user')
      .where('id', '=', id)
      .execute()
  }

  async getUserById(id: number): Promise<UserDto | null> {
    const user = await this.db
      .selectFrom('user')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    return user ? UserEntity.toDto(this.rowToEntity(user)) : null
  }

  private rowToEntity(row: Record<string, unknown>): UserEntity {
    const e = new UserEntity()
    e.id = row.id as number
    e.nom = row.nom as string
    e.prenom = row.prenom as string
    e.email = row.email as string
    e.role = row.role as UserEntity['role']
    e.service = row.service as string
    e.is_active = row.is_active as number
    e.is_validated = row.is_validated as number
    e.password_hash = row.password_hash as string
    return e
  }
}
