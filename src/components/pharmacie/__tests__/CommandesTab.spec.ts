// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('CommandesTab — lignes cliquables', () => {
  const source = read('src/components/pharmacie/CommandesTab.vue')

  it('ouvre le détail au clic sur une ligne', () => {
    expect(source).toContain('@row-click="onRowClick"')
    expect(source).toMatch(/function onRowClick\(row: CommandeDto\)/)
    expect(source).toContain('detailDialogRef.value?.open(row.id)')
  })

  it('supprime le bouton Détails de la colonne Actions', () => {
    expect(source).not.toContain('Détails')
  })

  it('neutralise le clic sur la zone Actions pour ne pas ouvrir le détail', () => {
    expect(source).toContain('class="commandes-tab__actions"')
    expect(source).toContain('@click.stop')
  })
})

describe('CommandeDetailDialog — colonnes de lignes épurées', () => {
  const source = read('src/components/pharmacie/CommandeDetailDialog.vue')

  it('retire CMM, Stock, Livré et Reste', () => {
    for (const label of ['CMM', 'Stock', 'Livré', 'Reste']) {
      expect(source, `colonne ${label} encore présente`).not.toContain(`label="${label}"`)
    }
  })

  it('conserve Article, Commandé et Unité', () => {
    expect(source).toContain('label="Article"')
    expect(source).toContain('label="Commandé"')
    expect(source).toContain('label="Unité"')
  })
})
