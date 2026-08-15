// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockIpcInvoke = vi.hoisted(() => vi.fn())
const mockShowLoader = vi.hoisted(() => vi.fn(() => ({ close: vi.fn() })))
const mockHideLoader = vi.hoisted(() => vi.fn())
const mockMessageBoxConfirm = vi.hoisted(() => vi.fn())

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('@/components/utils/AppLoader', () => ({
  showLoader: mockShowLoader,
  hideLoader: mockHideLoader,
}))

vi.mock('element-plus', () => ({
  ElMessageBox: {
    confirm: (...args: any[]) => mockMessageBoxConfirm(...args),
  },
}))

vi.mock('@/utils/display-name', () => ({
  formatDisplayName: (nom: string, prenom: string, titlePrefix?: string) =>
    [titlePrefix, nom?.toUpperCase(), prenom].filter(Boolean).join(' '),
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { getUserDisplayName, roleColor, roleLabel, useUsers } from '../useUsers'
import type { UserDto } from '../useUsers'

// ---------------------------------------------------------------------------
// Helper: mount composable in Vue lifecycle
// ---------------------------------------------------------------------------
function mountComposable() {
  let ctx!: ReturnType<typeof useUsers>
  mount(
    defineComponent({
      setup() {
        ctx = useUsers()
        return () => null
      },
    }),
  )
  return ctx
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------
function makeUser(overrides: Partial<UserDto> = {}): UserDto {
  return {
    id: 1,
    nom: 'Diallo',
    prenom: 'Mamadou',
    email: 'diallo@test.com',
    role: 'MEDECIN',
    is_active: true,
    ...overrides,
  }
}

describe('getUserDisplayName', () => {
  it('retourne nom et prénom en majuscules', () => {
    const user: UserDto = { nom: 'Diallo', prenom: 'Mamadou' }
    expect(getUserDisplayName(user)).toBe('DIALLO Mamadou')
  })

  it('retourne nom seul si pas de prénom', () => {
    const user: UserDto = { nom: 'Diallo' }
    expect(getUserDisplayName(user)).toBe('DIALLO')
  })

  it('retourne prénom seul si pas de nom', () => {
    const user: UserDto = { prenom: 'Mamadou' }
    expect(getUserDisplayName(user)).toBe('Mamadou')
  })

  it('retourne chaîne vide si ni nom ni prénom', () => {
    const user: UserDto = {}
    expect(getUserDisplayName(user)).toBe('')
  })

  it('inclut le title_prefix des specialties si disponible', () => {
    const user: UserDto = {
      nom: 'Diallo',
      prenom: 'Mamadou',
      specialties: [{ id: 1, name: 'Endocrinologie', code: 'ENDO', title_prefix: 'Dr' }],
    }
    expect(getUserDisplayName(user)).toBe('Dr DIALLO Mamadou')
  })

  it('ignore le title_prefix si la liste de specialties est vide', () => {
    const user: UserDto = {
      nom: 'Diallo',
      prenom: 'Mamadou',
      specialties: [],
    }
    expect(getUserDisplayName(user)).toBe('DIALLO Mamadou')
  })
})

describe('roleColor', () => {
  it('retourne primary pour MEDECIN', () => {
    expect(roleColor('MEDECIN')).toBe('primary')
  })

  it('retourne warning pour SECRETAIRE', () => {
    expect(roleColor('SECRETAIRE')).toBe('warning')
  })

  it('retourne success pour PHARMACIEN', () => {
    expect(roleColor('PHARMACIEN')).toBe('success')
  })

  it('retourne info pour COMPTABLE', () => {
    expect(roleColor('COMPTABLE')).toBe('info')
  })

  it('retourne danger pour ADMIN', () => {
    expect(roleColor('ADMIN')).toBe('danger')
  })

  it('retourne info pour INFIRMIER', () => {
    expect(roleColor('INFIRMIER')).toBe('info')
  })

  it('retourne info par défaut pour un rôle inconnu', () => {
    expect(roleColor('UNKNOWN_ROLE')).toBe('info')
  })
})

describe('roleLabel', () => {
  it('retourne le bon libellé pour MEDECIN', () => {
    expect(roleLabel('MEDECIN')).toBe('Médecin')
  })

  it('retourne le bon libellé pour SECRETAIRE', () => {
    expect(roleLabel('SECRETAIRE')).toBe('Secrétaire')
  })

  it('retourne le bon libellé pour PHARMACIEN', () => {
    expect(roleLabel('PHARMACIEN')).toBe('Pharmacien')
  })

  it('retourne le bon libellé pour COMPTABLE', () => {
    expect(roleLabel('COMPTABLE')).toBe('Comptable')
  })

  it('retourne le bon libellé pour ADMIN', () => {
    expect(roleLabel('ADMIN')).toBe('Administrateur')
  })

  it('retourne le bon libellé pour INFIRMIER', () => {
    expect(roleLabel('INFIRMIER')).toBe("Infirmier d'État")
  })

  it('retourne le rôle brut pour un rôle inconnu', () => {
    expect(roleLabel('DIRECTEUR')).toBe('DIRECTEUR')
  })
})

// ---------------------------------------------------------------------------
// useUsers composable
// ---------------------------------------------------------------------------
describe('useUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loadUsers', () => {
    it('loads users and their relations', async () => {
      const rawUsers = [makeUser({ id: 1 }), makeUser({ id: 2 })]
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'users:list') return rawUsers
        if (channel === 'users:get-relations') {
          return { specialties: [], services: [], sites: [], medical_units: [] }
        }
        return null
      })

      const ctx = mountComposable()
      await ctx.loadUsers()

      expect(ctx.users.value).toHaveLength(2)
      expect(ctx.users.value[0].id).toBe(1)
      expect(mockIpcInvoke).toHaveBeenCalledWith('users:list')
    })

    it('sets loading to true during fetch and false after', async () => {
      let resolvePromise: (v: any) => void
      mockIpcInvoke.mockReturnValueOnce(new Promise((r) => { resolvePromise = r }))

      const ctx = mountComposable()
      const promise = ctx.loadUsers()
      expect(ctx.loading.value).toBe(true)

      resolvePromise!([])
      await promise
      expect(ctx.loading.value).toBe(false)
    })

    it('sets error on failure', async () => {
      mockIpcInvoke.mockRejectedValueOnce(new Error('Network error'))

      const ctx = mountComposable()
      await ctx.loadUsers()

      expect(ctx.error.value).toBe('Network error')
    })

    it('clears error before fetch', async () => {
      mockIpcInvoke.mockRejectedValueOnce(new Error('fail'))
      const ctx = mountComposable()
      await ctx.loadUsers()
      expect(ctx.error.value).toBe('fail')

      mockIpcInvoke.mockResolvedValueOnce([])
      await ctx.loadUsers()
      expect(ctx.error.value).toBeNull()
    })

    it('fetches relations for each user with id', async () => {
      const rawUsers = [makeUser({ id: 1 }), makeUser({ id: 2 })]
      mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
        if (channel === 'users:list') return rawUsers
        if (channel === 'users:get-relations') {
          return { specialties: [{ id: 1, name: 'Endo', code: 'ENDO' }], services: [], sites: [], medical_units: [] }
        }
        return null
      })

      const ctx = mountComposable()
      await ctx.loadUsers()

      expect(mockIpcInvoke).toHaveBeenCalledWith('users:get-relations', { id: 1 })
      expect(mockIpcInvoke).toHaveBeenCalledWith('users:get-relations', { id: 2 })
      expect(ctx.users.value[0].specialties).toHaveLength(1)
    })

    it('skips relations fetch for users without id', async () => {
      const rawUsers = [makeUser({ id: undefined })]
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'users:list') return rawUsers
        return null
      })

      const ctx = mountComposable()
      await ctx.loadUsers()

      expect(mockIpcInvoke).not.toHaveBeenCalledWith('users:get-relations', expect.anything())
    })

    it('handles relations fetch failure gracefully', async () => {
      const rawUsers = [makeUser({ id: 1 })]
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'users:list') return rawUsers
        if (channel === 'users:get-relations') throw new Error('Relations fetch failed')
        return null
      })

      const ctx = mountComposable()
      await ctx.loadUsers()

      // User should still be in the list, just without relations
      expect(ctx.users.value).toHaveLength(1)
    })
  })

  describe('createUser', () => {
    it('returns early when formRef is undefined', async () => {
      const ctx = mountComposable()
      await ctx.createUser(undefined, makeUser())
      expect(mockIpcInvoke).not.toHaveBeenCalled()
    })

    it('validates form and creates user on valid', async () => {
      const mockValidate = vi.fn((cb: (valid: boolean) => void) => cb(true))
      const mockFormRef = { validate: mockValidate, resetFields: vi.fn() }
      const createdUser = makeUser({ id: 10 })

      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'users:create') return createdUser
        if (channel === 'users:sync-relations') return undefined
        if (channel === 'users:list') return []
        return null
      })

      const ctx = mountComposable()
      ctx.userFormRef.value = { close: vi.fn() }

      await ctx.createUser(mockFormRef as any, {
        ...makeUser({ id: 10 }),
        specialty_ids: [1],
        service_ids: [],
        site_ids: [],
        medical_unit_ids: [],
      })

      expect(mockIpcInvoke).toHaveBeenCalledWith('users:create', expect.objectContaining({
        password: 'changeme',
      }))
      expect(mockIpcInvoke).toHaveBeenCalledWith('users:sync-relations', expect.objectContaining({
        id: 10,
        specialty_ids: [1],
      }))
      expect(mockFormRef.resetFields).toHaveBeenCalled()
    })

    it('does not create when validation fails', async () => {
      const mockValidate = vi.fn((cb: (valid: boolean) => void) => cb(false))
      const mockFormRef = { validate: mockValidate, resetFields: vi.fn() }

      const ctx = mountComposable()
      await ctx.createUser(mockFormRef as any, makeUser())

      expect(mockIpcInvoke).not.toHaveBeenCalledWith('users:create', expect.anything())
    })

    it('returns early when formRef is undefined for updateUser', async () => {
      const ctx = mountComposable()
      await ctx.updateUser(undefined, makeUser())
      expect(mockIpcInvoke).not.toHaveBeenCalled()
    })
  })

  describe('updateUser', () => {
    it('validates form and updates user on valid', async () => {
      const mockValidate = vi.fn((cb: (valid: boolean) => void) => cb(true))
      const mockFormRef = { validate: mockValidate, resetFields: vi.fn() }

      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'users:update') return undefined
        if (channel === 'users:sync-relations') return undefined
        if (channel === 'users:list') return []
        return null
      })

      const ctx = mountComposable()
      ctx.editUserFormRef.value = { close: vi.fn() }

      await ctx.updateUser(mockFormRef as any, {
        ...makeUser({ id: 5 }),
        specialty_ids: [2],
        service_ids: [],
        site_ids: [],
        medical_unit_ids: [],
      })

      expect(mockIpcInvoke).toHaveBeenCalledWith('users:update', expect.objectContaining({
        id: 5,
      }))
      expect(mockIpcInvoke).toHaveBeenCalledWith('users:sync-relations', expect.objectContaining({
        id: 5,
        specialty_ids: [2],
      }))
      expect(mockFormRef.resetFields).toHaveBeenCalled()
    })

    it('does not update when validation fails', async () => {
      const mockValidate = vi.fn((cb: (valid: boolean) => void) => cb(false))
      const mockFormRef = { validate: mockValidate, resetFields: vi.fn() }

      const ctx = mountComposable()
      await ctx.updateUser(mockFormRef as any, makeUser())

      expect(mockIpcInvoke).not.toHaveBeenCalledWith('users:update', expect.anything())
    })
  })

  describe('deleteUser', () => {
    it('shows confirmation and deletes user', async () => {
      mockMessageBoxConfirm.mockResolvedValue(undefined)
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'users:delete') return undefined
        if (channel === 'users:list') return []
        return null
      })

      const ctx = mountComposable()
      ctx.deleteUser(3)

      // deleteUser doesn't await the confirm promise, so we need to flush
      await nextTick()
      await new Promise(r => setTimeout(r, 0))
      await nextTick()

      expect(mockMessageBoxConfirm).toHaveBeenCalledWith(
        'Supprimer cet utilisateur ?',
        'Confirmation',
        { type: 'warning' },
      )
      expect(mockIpcInvoke).toHaveBeenCalledWith('users:delete', { id: 3 })
    })

    it('does not delete when confirmation is pending', async () => {
      // Return a never-resolving promise to simulate user not clicking anything
      mockMessageBoxConfirm.mockReturnValue(new Promise(() => {}))

      const ctx = mountComposable()
      ctx.deleteUser(3)

      await nextTick()
      await new Promise(r => setTimeout(r, 0))
      await nextTick()

      expect(mockIpcInvoke).not.toHaveBeenCalledWith('users:delete', expect.anything())
    })
  })

  describe('terminateContract', () => {
    it('terminates contract and returns true', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'users:terminate-contract') return undefined
        if (channel === 'users:list') return []
        return null
      })

      const ctx = mountComposable()
      const result = await ctx.terminateContract(7, 'Fin de contrat')

      expect(result).toBe(true)
      expect(mockIpcInvoke).toHaveBeenCalledWith('users:terminate-contract', { id: 7, motif: 'Fin de contrat' })
      expect(mockShowLoader).toHaveBeenCalledWith('Résiliation...')
      expect(mockHideLoader).toHaveBeenCalled()
    })

    it('returns false on failure', async () => {
      mockIpcInvoke.mockRejectedValueOnce(new Error('Terminate failed'))

      const ctx = mountComposable()
      const result = await ctx.terminateContract(7, 'Motif')

      expect(result).toBe(false)
      expect(mockHideLoader).toHaveBeenCalled()
    })
  })

  describe('reactivateContract', () => {
    it('reactivates contract and returns true', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'users:reactivate-contract') return undefined
        if (channel === 'users:list') return []
        return null
      })

      const ctx = mountComposable()
      const result = await ctx.reactivateContract(7)

      expect(result).toBe(true)
      expect(mockIpcInvoke).toHaveBeenCalledWith('users:reactivate-contract', { id: 7 })
      expect(mockShowLoader).toHaveBeenCalledWith('Réactivation...')
      expect(mockHideLoader).toHaveBeenCalled()
    })

    it('returns false on failure', async () => {
      mockIpcInvoke.mockRejectedValueOnce(new Error('Reactivate failed'))

      const ctx = mountComposable()
      const result = await ctx.reactivateContract(7)

      expect(result).toBe(false)
      expect(mockHideLoader).toHaveBeenCalled()
    })
  })
})
