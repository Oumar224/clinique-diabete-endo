// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import router from '../index'

describe('router — pharmacie role guards', () => {
  function routeMeta(name: string): Record<string, any> {
    const record = router.getRoutes().find((r) => r.name === name)
    expect(record, `route ${name} registered`).toBeDefined()
    return (record!.meta ?? {}) as Record<string, any>
  }

  it('restricts the pharmacie route to PHARMACIEN and ADMIN', () => {
    expect(routeMeta('pharmacie').roles).toEqual(['PHARMACIEN', 'ADMIN'])
  })

  it('allows PHARMACIEN to read patient ordonnances', () => {
    expect(routeMeta('patient-ordonnances').roles).toContain('PHARMACIEN')
  })
})

describe('router — comptabilite rename (facturation → comptabilite)', () => {
  function routeRecord(name: string) {
    const record = router.getRoutes().find((r) => r.name === name)
    expect(record, `route ${name} registered`).toBeDefined()
    return record!
  }

  it('resolves /app/comptabilite to the comptabilite route', () => {
    const resolved = router.resolve('/app/comptabilite')

    expect(resolved.name).toBe('comptabilite')
    expect(resolved.path).toBe('/app/comptabilite')
  })

  it('no longer exposes a route named facturation', () => {
    const hasLegacyRoute = router.getRoutes().some((r) => r.name === 'facturation')

    expect(hasLegacyRoute).toBe(false)
  })

  it('no longer resolves the legacy /app/facturation URL', () => {
    const legacy = router.resolve('/app/facturation')

    expect(legacy.name).toBeUndefined()
    expect(legacy.matched).toHaveLength(0)
  })

  it('resolves the ComptabiliteView component for the comptabilite route', async () => {
    const loader = (routeRecord('comptabilite').components as Record<string, any>)?.default
    expect(typeof loader).toBe('function')

    const mod = await loader()
    expect(mod.default).toBeDefined()
    expect(mod.default.name ?? mod.default.__name).toBe('ComptabiliteView')
  })

  it('allows COMPTABLE on the comptabilite route', () => {
    const meta = (routeRecord('comptabilite').meta ?? {}) as Record<string, any>

    expect(meta.roles).toContain('COMPTABLE')
  })
})

describe('router — indicateur rename (indicateurs annuels → Indicateur)', () => {
  function routeRecord(name: string) {
    const record = router.getRoutes().find((r) => r.name === name)
    expect(record, `route ${name} registered`).toBeDefined()
    return record!
  }

  it('conserve le chemin /app/indicateurs et le nom de route', () => {
    const resolved = router.resolve('/app/indicateurs')

    expect(resolved.name).toBe('indicateurs')
    expect(resolved.path).toBe('/app/indicateurs')
  })

  it('expose le titre de page « Indicateur » (singulier)', () => {
    const meta = (routeRecord('indicateurs').meta ?? {}) as Record<string, any>

    expect(meta.title).toBe('Indicateur')
    expect(meta.roles).toEqual(['ADMIN', 'COMPTABLE'])
  })
})
