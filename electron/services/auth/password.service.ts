import { singleton } from 'tsyringe'
import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 10

@singleton()
export class PasswordService {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS)
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }
}
