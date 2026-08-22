import { SignJWT } from 'jose'
import { APP_ID, APP_SECRET, TOKEN_TTL_SECONDS } from './sync-config'

export async function signSyncToken(userId: number | string, role?: string): Promise<string> {
  if (!APP_ID || !APP_SECRET) {
    throw new Error('Sync token signing requires CDE_APP_ID and CDE_SYNC_APP_SECRET')
  }
  return new SignJWT({ appId: APP_ID, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(new TextEncoder().encode(APP_SECRET))
}