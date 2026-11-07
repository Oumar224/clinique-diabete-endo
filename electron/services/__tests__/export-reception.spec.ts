import { describe, expect, it } from 'vitest'
import { generateBonReceptionHtml } from '../../export-templates'

describe('generateBonReceptionHtml', () => {
  const html = generateBonReceptionHtml({
    reception: {
      reference: 'BR-BC-20261024-0001',
      commandeNumero: 'BC-20261024-0001',
      dateCommande: '2026-10-24',
      dateReception: '2026-10-27',
      refBl: 'BL-2026-77',
      fournisseurNom: 'Fournisseur divers',
      notes: 'Livraison conforme',
      attachments: ['BL-2026-77.pdf', 'facture.pdf'],
      lignes: [
        {
          designation: 'Amoxicilline — Clamoxyl',
          forme: 'Gélule',
          dosage: '500 mg',
          conditionnement: 'Boîte de 30',
          unite: 'gél',
          cmm: 13,
          stockRestant: 7,
          quantiteCommandee: 20,
          quantiteLivree: 20,
          quantiteRecue: 20,
          numeroLot: 'LOT-AMOX-1',
          datePeremption: '2028-04-30',
        },
        {
          designation: 'Insuline asparte — Novorapid',
          unite: 'stylo',
          cmm: 9,
          stockRestant: 3,
          quantiteCommandee: 10,
          // Cumul des livraisons : 8 reçus au total, dont 4 sur cette réception.
          quantiteLivree: 8,
          quantiteRecue: 4,
          numeroLot: null,
          datePeremption: null,
        },
      ],
    },
    hospital: { name: 'Clinique CDE', address: 'Ratoma', city: 'Conakry', phone: '620000000' },
    logoBase64: null,
    generatedAt: '27/10/2026 09:15',
  })

  it('produit un bon de réception détaillé (lot, péremption, quantités)', () => {
    expect(html).toContain('BON DE RÉCEPTION')
    expect(html).toContain('BR-BC-20261024-0001')
    expect(html).toContain('BC-20261024-0001')
    expect(html).toContain('BL-2026-77')
    expect(html).toContain('Fournisseur divers')
    expect(html).toContain('27/10/2026')
    expect(html).toContain('Amoxicilline — Clamoxyl')
    expect(html).toContain('LOT-AMOX-1')
    expect(html).toContain('30/04/2028')
    expect(html).toContain('Livraison conforme')
    expect(html).toContain('BL-2026-77.pdf')
    expect(html).toContain('facture.pdf')

    // Colonnes détaillées attendues (CMM et SR compris).
    for (const label of ['DCI', 'Forme', 'Dosage', 'Conditionnement', 'Unité', 'CMM', 'SR', 'Qté commandée', 'Qté livrée', 'Qté reçue', 'N° lot', 'Péremption']) {
      expect(html, `colonne ${label} manquante`).toContain(label)
    }

    // Valeurs propres à chaque indicateur (CMM, SR, livrée cumulée).
    expect(html).toContain('<td class="center">13</td>')
    expect(html).toContain('<td class="center">7</td>')
    expect(html).toContain('<td class="center">20</td>')

    // Totaux : 30 commandés, 28 livrés (cumul), 24 reçus.
    expect(html).toContain('>30<')
    expect(html).toContain('>28<')
    expect(html).toContain('>24<')

    // Même socle que les autres documents, en paysage.
    expect(html).toContain('class="rep-devise"')
    expect(html).toContain('Document généré par CDE')
    expect(html).toContain('size: A4 landscape')
    expect(html).toContain('@media screen')
  })

  it('gère une réception sans lot ni pièce jointe', () => {
    const minimal = generateBonReceptionHtml({
      reception: {
        reference: 'BR-BC-2',
        dateReception: '2026-10-27',
        lignes: [{ designation: 'Metformine', quantiteCommandee: 10, quantiteRecue: 10 }],
      },
      hospital: {},
      logoBase64: null,
    })
    expect(minimal).toContain('Metformine')
    // Pas de bloc « Pièces jointes » quand la réception n'en porte aucune.
    expect(minimal).not.toContain('Pièces jointes')
    // Lot et péremption absents → tiret, jamais de cellule vide.
    expect(minimal).toContain('<td class="center">—</td>')
  })

  it('échappe les données saisies', () => {
    const malicious = generateBonReceptionHtml({
      reception: {
        reference: 'BR-1',
        dateReception: '2026-10-27',
        notes: '<script>alert(1)</script>',
        fournisseurNom: '<img src=x onerror=alert(1)>',
        lignes: [{ designation: '<b>intrus</b>', quantiteRecue: 1 }],
      },
      hospital: {},
      logoBase64: null,
    })
    expect(malicious).not.toContain('<script>alert(1)</script>')
    expect(malicious).not.toContain('<img src=x')
    expect(malicious).not.toContain('<b>intrus</b>')
    expect(malicious).toContain('&lt;script&gt;')
  })
})
