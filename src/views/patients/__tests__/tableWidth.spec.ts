import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Régression — largeur des tableaux de l'espace patient.
 *
 * Element Plus pose la largeur des `<table>` internes en style inline. Quand
 * toutes les colonnes sont fixes, cette largeur vaut la somme des colonnes et
 * le tableau n'occupe plus la carte. Les assertions ci-dessous verrouillent :
 *  - le contrat CSS global (tables internes à 100 % hors scroll horizontal) ;
 *  - la colonne flexible des factures (dernière colonne absorbante) ;
 *  - les grilles matricielles qui DOIVENT continuer à défiler (`max-content`).
 *
 * jsdom ne calcule pas de layout : on vérifie donc la source CSS/markup qui
 * produit la géométrie, pas des `getBoundingClientRect()` simulés.
 */

const root = process.cwd()

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

function cssBlock(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Le sélecteur peut appartenir à une liste (`A, B, C { ... }`) : on tolère
  // les autres sélecteurs entre lui et l'accolade ouvrante.
  const match = css.match(new RegExp(`${escaped}(?![\\w-])[^{}]*\\{([^}]*)\\}`, 'm'))
  expect(match, `bloc CSS introuvable : ${selector}`).not.toBeNull()
  return match?.[1] ?? ''
}

describe('largeur des tableaux patients', () => {
  const cdeCss = read('src/styles/cde-ui.css')
  const globalCss = read('src/style.css')

  it('force les tables internes Element Plus à 100 % quand il n’y a pas de scroll horizontal', () => {
    for (const part of ['header', 'body', 'footer']) {
      const rule = cssBlock(
        cdeCss,
        `.el-table:not(.el-table--scrollable-x) .el-table__${part}`,
      )
      expect(rule).toMatch(/width:\s*100%\s*!important/)
      expect(rule).toMatch(/min-width:\s*100%/)
    }
  })

  it('ne contraint jamais un tableau scrollable horizontalement à sa carte', () => {
    // La garde :not(.el-table--scrollable-x) est la condition qui préserve
    // les matrices larges (elles gardent leur largeur intrinsèque).
    expect(cdeCss).toContain('.el-table:not(.el-table--scrollable-x)')
    expect(cdeCss).not.toMatch(/\.el-table\s*\.el-table__body\s*\{[^}]*width:\s*100%/m)
  })

  it('rend la carte de tableau et le tableau enfant pleine largeur', () => {
    const card = cssBlock(cdeCss, '.cde-table-card > .el-table')
    expect(card).toMatch(/width:\s*100%/)
    expect(card).toMatch(/max-width:\s*100%/)
  })

  it('garde le tableau natif d’historique à 100 %', () => {
    const history = cssBlock(globalCss, '#app .history-table')
    expect(history).toMatch(/width:\s*100%/)
  })

  it('laisse la dernière colonne des factures absorber l’espace restant', () => {
    const view = read('src/views/PatientFacturesView.vue')

    expect(view).toContain('<div class="cde-table-card">')
    expect(view).toMatch(/<el-table[^>]*style="width:100%"/)

    const actions = view.match(/<el-table-column label="Actions"[^>]*>/)
    expect(actions, 'colonne Actions introuvable').not.toBeNull()
    expect(actions?.[0]).toContain('min-width="150"')
    expect(actions?.[0]).not.toMatch(/(?<!min-)width="150"/)
  })

  it('préserve le défilement des grilles matricielles (max-content + overflow)', () => {
    const matrices = [
      'src/components/patients/BioMatrixTable.vue',
      'src/views/patients/soins/VitalCheckTab.vue',
      'src/views/patients/soins/PlanDistributionTab.vue',
    ]

    for (const file of matrices) {
      const source = read(file)
      expect(source, `${file} : grid doit garder min-width:max-content`).toMatch(
        /min-width:\s*max-content/,
      )
      expect(source, `${file} : le wrapper doit défiler`).toMatch(
        /overflow:\s*auto/,
      )
    }
  })
})
